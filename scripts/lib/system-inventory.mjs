import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const CANONICAL_DOCS = [
  "README.md",
  "CLAUDE.md",
  "docs/architecture.md",
  "docs/prompt-contracts.md",
  "docs/development-gaps.md",
  "docs/api-surface.md",
];

function extractConstObject(source, constName) {
  const markerPattern = new RegExp(`(?:export\\s+)?const\\s+${constName}\\b`);
  const markerMatch = source.match(markerPattern);
  const markerIndex = markerMatch?.index ?? -1;
  if (markerIndex === -1) {
    throw new Error(`Could not find ${constName}`);
  }

  const assignmentIndex = source.indexOf("=", markerIndex);
  if (assignmentIndex === -1) {
    throw new Error(`Could not find assignment for ${constName}`);
  }

  const start = source.indexOf("{", assignmentIndex);
  if (start === -1) {
    throw new Error(`Could not find object body for ${constName}`);
  }

  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) {
      return source.slice(start, index + 1);
    }
  }

  throw new Error(`Could not parse object body for ${constName}`);
}

function parseTabMeta(source) {
  const body = extractConstObject(source, "TAB_META");
  const tabs = [];
  const pattern = /^\s*(?:"([^"]+)"|([a-zA-Z0-9_-]+)):\s*\{\s*label:\s*"([^"]+)",\s*shortLabel:\s*"[^"]+",\s*group:\s*"([^"]+)"/gm;

  for (const match of body.matchAll(pattern)) {
    tabs.push({
      id: match[1] ?? match[2],
      label: match[3],
      group: match[4],
    });
  }

  return tabs;
}

function parseRoutingTable(source) {
  const body = extractConstObject(source, "ROUTING_TABLE");
  const classes = [];
  const entryPattern = /^ {2}([a-zA-Z0-9_]+):\s*\{/gm;

  for (const match of body.matchAll(entryPattern)) {
    const name = match[1];
    const entryStart = match.index ?? 0;
    const nextMatch = body.slice(entryStart + match[0].length).match(/\n {2}[a-zA-Z0-9_]+:\s*\{/);
    const entryEnd = nextMatch ? entryStart + match[0].length + (nextMatch.index ?? 0) : body.length;
    const entry = body.slice(entryStart, entryEnd);
    classes.push({
      name,
      model_tier: entry.match(/model_tier:\s*"([^"]+)"/)?.[1] ?? "unknown",
      thinking_enabled: entry.match(/thinking_enabled:\s*(true|false)/)?.[1] === "true",
      retrieval_required: entry.match(/retrieval_required:\s*(true|false)/)?.[1] === "true",
      tool_call_capable: entry.match(/tool_call_capable:\s*(true|false)/)?.[1] === "true",
    });
  }

  return classes;
}

function parseServerMounts(source) {
  const mounts = [];
  const pattern = /app\.use\("([^"]+)"/g;

  for (const match of source.matchAll(pattern)) {
    mounts.push(match[1]);
  }

  return [...new Set(mounts)];
}

function parseRoleList(rawRoles) {
  return [...rawRoles.matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
}

function parseRoleScopeVars(source) {
  const scopes = new Map();
  const directPattern = /const\s+([A-Za-z0-9_]+)\s*=\s*(?:deps\.)?requireClassroomRole(?:\?\.)?\(\s*\[([^\]]*)\]\s*\)/g;
  for (const match of source.matchAll(directPattern)) {
    scopes.set(match[1], parseRoleList(match[2]));
  }

  const helperPattern = /const\s+([A-Za-z0-9_]+)\s*=\s*requireRoles\(\s*deps\s*,\s*\[([^\]]*)\]\s*\)/g;
  for (const match of source.matchAll(helperPattern)) {
    scopes.set(match[1], parseRoleList(match[2]));
  }
  return scopes;
}

function parseServerRouteMounts(source) {
  const importsByFactory = new Map();
  const importPattern = /import\s+\{\s*(create[A-Za-z0-9]+Router)\s*\}\s+from\s+"\.\/routes\/([^"]+)\.js";/g;
  for (const match of source.matchAll(importPattern)) {
    importsByFactory.set(match[1], `services/orchestrator/routes/${match[2]}.ts`);
  }

  const roleScopes = parseRoleScopeVars(source);
  const authProtectedMounts = new Map();
  const authPattern = /app\.use\("([^"]+)",\s*authLimiter,\s*authMiddleware(?:,\s*([A-Za-z0-9_]+))?\)/g;
  for (const match of source.matchAll(authPattern)) {
    authProtectedMounts.set(match[1], match[2] ? roleScopes.get(match[2]) ?? [] : []);
  }

  const mounts = [];
  const mountPattern = /app\.use\("([^"]+)",\s*(create[A-Za-z0-9]+Router)\(([^)]*)\)\)/g;
  for (const match of source.matchAll(mountPattern)) {
    const factory = match[2];
    const routeFile = importsByFactory.get(factory);
    if (!routeFile) continue;
    mounts.push({
      mount: match[1],
      factory,
      route_file: routeFile,
      auth_limited_mount: authProtectedMounts.has(match[1]),
      role_scope: authProtectedMounts.get(match[1]) ?? null,
      auth_protected_mounts: [...authProtectedMounts.keys()],
      auth_protected_mount_roles: Object.fromEntries(authProtectedMounts.entries()),
    });
  }

  return mounts;
}

function joinRoutePath(mount, routePath) {
  const raw = `${mount === "/" ? "" : mount}/${routePath === "/" ? "" : routePath}`;
  const normalized = raw.replace(/\/+/g, "/");
  return normalized === "" ? "/" : normalized.replace(/\/$/, "") || "/";
}

function routeLineHasAuth(source, index) {
  const end = source.indexOf("=>", index);
  const snippet = source.slice(index, end === -1 ? index + 240 : end);
  return /\bauthMiddleware\b|\bdeps\.authMiddleware\b/.test(snippet);
}

function routeLineRoleScope(source, index, roleScopes) {
  const end = source.indexOf("=>", index);
  const snippet = source.slice(index, end === -1 ? index + 240 : end);
  for (const [name, roles] of roleScopes.entries()) {
    if (new RegExp(`\\b${name}\\b`).test(snippet)) return roles;
  }
  return null;
}

function parseRouteEndpoints(source, mountInfo) {
  const endpoints = [];
  const roleScopes = parseRoleScopeVars(source);
  const pattern = /router\.(get|post|put|delete|patch)\(\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) {
    const fullPath = joinRoutePath(mountInfo.mount, match[2]);
    endpoints.push({
      method: match[1].toUpperCase(),
      path: fullPath,
      route_file: mountInfo.route_file,
      mount: mountInfo.mount,
      handler: mountInfo.factory,
      auth_limited_mount: mountInfo.auth_limited_mount,
      auth_limited_endpoint: mountInfo.auth_protected_mounts.some((protectedMount) => (
        fullPath === protectedMount || fullPath.startsWith(`${protectedMount}/`)
      )),
      route_auth: routeLineHasAuth(source, match.index ?? 0),
      role_scope: routeLineRoleScope(source, match.index ?? 0, roleScopes)
        ?? endpointProtectedMountRoleScope(fullPath, mountInfo)
        ?? mountInfo.role_scope,
    });
  }
  return endpoints;
}

function endpointProtectedMountRoleScope(fullPath, mountInfo) {
  const match = mountInfo.auth_protected_mounts
    .filter((protectedMount) => fullPath === protectedMount || fullPath.startsWith(`${protectedMount}/`))
    .sort((left, right) => right.length - left.length)[0];
  return match ? mountInfo.auth_protected_mount_roles[match] ?? null : null;
}

async function countEvalCases(rootDir) {
  const dir = path.join(rootDir, "evals", "cases");
  if (!existsSync(dir)) return 0;
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).length;
}

async function latestMtime(rootDir, relativePath) {
  const filePath = path.join(rootDir, relativePath);
  if (!existsSync(filePath)) return null;
  const stats = await stat(filePath);
  return stats.mtime.toISOString();
}

function parseClaudePromptBullets(content) {
  const section = content.match(/### Model-routed prompt classes\n\n([\s\S]*?)\n\n### Additional deterministic/m)?.[1] ?? "";
  return section
    .split("\n")
    .map((line) => line.match(/^- `([^`]+)`/)?.[1])
    .filter(Boolean);
}

function parseClaudePanelBullets(content) {
  const section = content.match(/### Primary UI panels\n\n([\s\S]*?)\n\n`extract_worksheet`/m)?.[1] ?? "";
  return section
    .split("\n")
    .map((line) => line.match(/^- (.+)$/)?.[1])
    .filter(Boolean);
}

function compareSets(label, expected, actual) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = [...expectedSet].filter((item) => !actualSet.has(item));
  const extra = [...actualSet].filter((item) => !expectedSet.has(item));
  const issues = [];
  if (missing.length > 0) issues.push(`${label} missing: ${missing.join(", ")}`);
  if (extra.length > 0) issues.push(`${label} extra: ${extra.join(", ")}`);
  return issues;
}

export async function buildSystemInventory(rootDir) {
  const [appReducerSource, routerSource, serverSource] = await Promise.all([
    readFile(path.join(rootDir, "apps/web/src/appReducer.ts"), "utf8"),
    readFile(path.join(rootDir, "services/orchestrator/router.ts"), "utf8"),
    readFile(path.join(rootDir, "services/orchestrator/server.ts"), "utf8"),
  ]);

  const tabs = parseTabMeta(appReducerSource);
  const promptClasses = parseRoutingTable(routerSource);
  const apiMounts = parseServerMounts(serverSource);
  const routeMounts = parseServerRouteMounts(serverSource);
  const apiEndpoints = (
    await Promise.all(routeMounts.map(async (mountInfo) => {
      const routeSource = await readFile(path.join(rootDir, mountInfo.route_file), "utf8");
      return parseRouteEndpoints(routeSource, mountInfo);
    }))
  ).flat();
  const evalCaseCount = await countEvalCases(rootDir);

  return {
    generated_at: new Date().toISOString(),
    ui: {
      panel_count: tabs.length,
      panels: tabs,
      groups: Object.fromEntries(
        [...new Set(tabs.map((tab) => tab.group))].map((group) => [
          group,
          tabs.filter((tab) => tab.group === group).map((tab) => tab.label),
        ]),
      ),
    },
    prompts: {
      prompt_class_count: promptClasses.length,
      classes: promptClasses,
      live_count: promptClasses.filter((entry) => entry.model_tier === "live").length,
      planning_count: promptClasses.filter((entry) => entry.model_tier === "planning").length,
      retrieval_count: promptClasses.filter((entry) => entry.retrieval_required).length,
    },
    api: {
      mount_count: apiMounts.length,
      mounts: apiMounts,
      endpoint_count: apiEndpoints.length,
      endpoints: apiEndpoints,
    },
    evals: {
      case_count: evalCaseCount,
    },
    docs: {
      canonical_docs: CANONICAL_DOCS,
      latest_mtimes: Object.fromEntries(
        await Promise.all(CANONICAL_DOCS.map(async (docPath) => [docPath, await latestMtime(rootDir, docPath)])),
      ),
    },
  };
}

export async function validateCanonicalInventoryClaims(rootDir, inventory) {
  const issues = [];
  const surfaces = Object.fromEntries(
    await Promise.all(CANONICAL_DOCS.map(async (docPath) => [docPath, await readFile(path.join(rootDir, docPath), "utf8")])),
  );

  const readmePanelClaim = surfaces["README.md"].match(/teacher command center with (\d+) primary panels/i)?.[1];
  if (Number(readmePanelClaim) !== inventory.ui.panel_count) {
    issues.push(`README.md primary panel count is ${readmePanelClaim ?? "missing"}; code has ${inventory.ui.panel_count}`);
  }

  const claudePanelClaim = surfaces["CLAUDE.md"].match(/web UI with (\d+) teacher-facing panels/i)?.[1];
  if (Number(claudePanelClaim) !== inventory.ui.panel_count) {
    issues.push(`CLAUDE.md teacher-facing panel count is ${claudePanelClaim ?? "missing"}; code has ${inventory.ui.panel_count}`);
  }

  const claudePromptClaim = surfaces["CLAUDE.md"].match(/repo has (\d+) model-routed prompt classes/i)?.[1];
  if (Number(claudePromptClaim) !== inventory.prompts.prompt_class_count) {
    issues.push(`CLAUDE.md prompt class count is ${claudePromptClaim ?? "missing"}; routing table has ${inventory.prompts.prompt_class_count}`);
  }

  const claudePromptBullets = parseClaudePromptBullets(surfaces["CLAUDE.md"]);
  issues.push(...compareSets(
    "CLAUDE.md prompt-class list",
    inventory.prompts.classes.map((entry) => entry.name),
    claudePromptBullets,
  ));

  const claudePanelBullets = parseClaudePanelBullets(surfaces["CLAUDE.md"]);
  issues.push(...compareSets(
    "CLAUDE.md panel list",
    inventory.ui.panels.map((entry) => entry.label),
    claudePanelBullets,
  ));

  const architectureLiveClaim = surfaces["docs/architecture.md"].match(/\*\*Live tier \((\d+) classes\)/i)?.[1];
  if (Number(architectureLiveClaim) !== inventory.prompts.live_count) {
    issues.push(`docs/architecture.md live-tier count is ${architectureLiveClaim ?? "missing"}; routing table has ${inventory.prompts.live_count}`);
  }

  const architecturePlanningClaim = surfaces["docs/architecture.md"].match(/\*\*Planning tier \((\d+) classes\)/i)?.[1];
  if (Number(architecturePlanningClaim) !== inventory.prompts.planning_count) {
    issues.push(`docs/architecture.md planning-tier count is ${architecturePlanningClaim ?? "missing"}; routing table has ${inventory.prompts.planning_count}`);
  }

  const expectedApiSurface = formatApiSurfaceMarkdown(inventory).trim();
  const actualApiSurface = surfaces["docs/api-surface.md"].trim();
  if (actualApiSurface !== expectedApiSurface) {
    issues.push("docs/api-surface.md is out of sync with Express route files; run `npm run system:inventory`");
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

export function formatApiSurfaceMarkdown(inventory) {
  const lines = [
    "# API Surface Inventory",
    "",
    "_Generated from `services/orchestrator/server.ts` and `services/orchestrator/routes/*.ts`. Do not edit endpoint rows by hand; run `npm run system:inventory`._",
    "",
    `- Mounted Express route bases: ${inventory.api.mount_count}`,
    `- Exact endpoints: ${inventory.api.endpoint_count}`,
    "",
    "| Method | Endpoint | Route file | Auth boundary | Role scope |",
    "|---|---|---|---|---|",
  ];

  for (const endpoint of inventory.api.endpoints) {
    const authBoundary = endpoint.auth_limited_endpoint || endpoint.auth_limited_mount || endpoint.route_auth ? "classroom-code" : "open/demo metadata";
    const roleScope = endpoint.role_scope?.length ? endpoint.role_scope.join(", ") : "none";
    lines.push(`| ${endpoint.method} | \`${endpoint.path}\` | \`${endpoint.route_file}\` | ${authBoundary} | ${roleScope} |`);
  }

  return `${lines.join("\n")}\n`;
}

export function formatInventoryMarkdown(inventory) {
  const lines = [
    "# System Inventory",
    "",
    "_Generated from code-level inventory sources. Do not update counts by hand without running `npm run system:inventory`._",
    "",
    "## UI Surface",
    "",
    `- Primary panels: ${inventory.ui.panel_count}`,
    `- Navigation groups: ${Object.keys(inventory.ui.groups).join(", ")}`,
    "",
  ];

  for (const [group, labels] of Object.entries(inventory.ui.groups)) {
    lines.push(`### ${group}`);
    for (const label of labels) {
      lines.push(`- ${label}`);
    }
    lines.push("");
  }

  lines.push("## Prompt Routing");
  lines.push("");
  lines.push(`- Model-routed prompt classes: ${inventory.prompts.prompt_class_count}`);
  lines.push(`- Live tier: ${inventory.prompts.live_count}`);
  lines.push(`- Planning tier: ${inventory.prompts.planning_count}`);
  lines.push(`- Retrieval-backed classes: ${inventory.prompts.retrieval_count}`);
  lines.push("");
  lines.push("| Prompt class | Tier | Thinking | Retrieval | Tool capable |");
  lines.push("|---|---|---:|---:|---:|");
  for (const entry of inventory.prompts.classes) {
    lines.push(`| \`${entry.name}\` | ${entry.model_tier} | ${entry.thinking_enabled ? "yes" : "no"} | ${entry.retrieval_required ? "yes" : "no"} | ${entry.tool_call_capable ? "yes" : "no"} |`);
  }

  lines.push("");
  lines.push("## API Mounts");
  lines.push("");
  lines.push(`- Mounted Express route bases: ${inventory.api.mount_count}`);
  lines.push(`- Exact endpoints: ${inventory.api.endpoint_count}`);
  for (const mount of inventory.api.mounts) {
    lines.push(`- \`${mount}\``);
  }

  lines.push("");
  lines.push("## API Endpoints");
  lines.push("");
  lines.push("| Method | Endpoint | Route file | Auth boundary | Role scope |");
  lines.push("|---|---|---|---|---|");
  for (const endpoint of inventory.api.endpoints) {
    const authBoundary = endpoint.auth_limited_endpoint || endpoint.auth_limited_mount || endpoint.route_auth ? "classroom-code" : "open/demo metadata";
    const roleScope = endpoint.role_scope?.length ? endpoint.role_scope.join(", ") : "none";
    lines.push(`| ${endpoint.method} | \`${endpoint.path}\` | \`${endpoint.route_file}\` | ${authBoundary} | ${roleScope} |`);
  }

  lines.push("");
  lines.push("## Eval Corpus");
  lines.push("");
  lines.push(`- Eval case files: ${inventory.evals.case_count}`);
  lines.push("");
  lines.push("## Canonical Docs");
  lines.push("");
  for (const docPath of inventory.docs.canonical_docs) {
    lines.push(`- \`${docPath}\``);
  }

  return `${lines.join("\n")}\n`;
}
