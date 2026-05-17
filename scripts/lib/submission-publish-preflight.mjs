import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const REQUIRED_PUBLISH_FILES = [
  "render.yaml",
  "apps/web/vercel.json",
  "qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11.mp4",
];

function result(label, ok, detail) {
  return { label, ok, detail };
}

function readText(rootDir, relPath) {
  return readFileSync(path.join(rootDir, relPath), "utf8");
}

export function extractUrlFromLine(content, pattern) {
  const line = content.split(/\r?\n/).find((entry) => pattern.test(entry));
  if (!line) return "";
  return line.match(/https?:\/\/[^\s)`\]]+/)?.[0]?.replace(/[.,;:]+$/, "") ?? "";
}

function defaultCommandResolver(command, rootDir) {
  const check = spawnSync("zsh", ["-lc", `command -v ${command}`], {
    cwd: rootDir,
    encoding: "utf8",
  });
  return check.status === 0 ? check.stdout.trim() : "";
}

function defaultCommandRunner(command, args, rootDir) {
  return spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
  });
}

export function isPublicUrl(value) {
  if (!value) return false;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  return ["http:", "https:"].includes(parsed.protocol)
    && !["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(host)
    && !host.endsWith(".local");
}

export function isKaggleUrl(value) {
  if (!isPublicUrl(value)) return false;
  const host = new URL(value).hostname.toLowerCase();
  return host === "kaggle.com" || host.endsWith(".kaggle.com");
}

export function isYouTubeUrl(value) {
  if (!isPublicUrl(value)) return false;
  const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  return host === "youtube.com" || host === "youtu.be";
}

function fileChecks(rootDir, requiredFiles = REQUIRED_PUBLISH_FILES) {
  return requiredFiles.map((relPath) => result(
    `file:${relPath}`,
    existsSync(path.join(rootDir, relPath)),
    existsSync(path.join(rootDir, relPath)) ? "present" : "missing",
  ));
}

function nodeMajor(version) {
  return String(version ?? "").trim().replace(/^v/, "").split(".")[0] ?? "";
}

function nodeVersionChecks(rootDir, nodeVersion) {
  let expected;
  try {
    expected = readText(rootDir, ".nvmrc").trim();
  } catch {
    return [result("node version", false, "missing .nvmrc")];
  }
  const ok = nodeMajor(expected) === nodeMajor(nodeVersion);
  return [result("node version", ok, ok ? `${nodeVersion} matches ${expected}` : `${nodeVersion} does not match ${expected}`)];
}

function vercelChecks(rootDir, commandResolver) {
  const cli = commandResolver("vercel", rootDir);
  const projectFile = "apps/web/.vercel/project.json";
  const projectLinked = existsSync(path.join(rootDir, projectFile));
  return [
    result("vercel cli", Boolean(cli), cli || "missing"),
    result("vercel project link", projectLinked, projectLinked ? projectFile : "missing apps/web/.vercel/project.json"),
  ];
}

function renderChecks(rootDir, env, commandResolver) {
  const cli = commandResolver("render", rootDir);
  const hasToken = Boolean(env.RENDER_API_KEY || env.RENDER_API_TOKEN);
  return [
    result("render cli or api token", Boolean(cli || hasToken), cli || (hasToken ? "token present" : "missing Render CLI/API token")),
  ];
}

function hostedGemmaChecks(env) {
  const hasKey = Boolean(env.PRAIRIE_GEMINI_API_KEY);
  const guardEnabled = /^(1|true|yes)$/i.test(env.PRAIRIE_ENABLE_GEMINI_RUNS ?? "");
  return [
    result("hosted gemma api key", hasKey, hasKey ? "present in environment" : "missing PRAIRIE_GEMINI_API_KEY"),
    result("hosted gemma guard", guardEnabled, guardEnabled ? "enabled" : "PRAIRIE_ENABLE_GEMINI_RUNS is not enabled"),
  ];
}

function publicLinkChecks(rootDir) {
  const copyPack = readText(rootDir, "docs/submission-copy-pack.md");
  const pasteBlock = readText(rootDir, "docs/kaggle-paste-block.md");
  const demoUrl = extractUrlFromLine(copyPack, /^-\s*Live demo:/i)
    || extractUrlFromLine(pasteBlock, /^-\s*Public live demo:/i);
  const videoUrl = extractUrlFromLine(pasteBlock, /^-\s*Public video:/i);
  const kaggleUrl = extractUrlFromLine(copyPack, /^-\s*Kaggle writeup:/i);
  return [
    result("public live demo url", isPublicUrl(demoUrl), demoUrl || "missing"),
    result("public video url", isYouTubeUrl(videoUrl), videoUrl || "missing"),
    result("kaggle writeup url", isKaggleUrl(kaggleUrl), kaggleUrl || "missing"),
  ];
}

function gitChecks(rootDir, commandRunner) {
  const status = commandRunner("git", ["status", "--porcelain"], rootDir);
  if (status.status !== 0) {
    return [
      result("git worktree clean", false, "git status failed"),
      result("git upstream configured", false, "not checked"),
      result("git branch synced", false, "not checked"),
    ];
  }

  const statusLines = status.stdout.trim().split(/\r?\n/).filter(Boolean);
  const upstream = commandRunner("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], rootDir);
  const upstreamName = upstream.status === 0 ? upstream.stdout.trim() : "";
  const divergence = upstreamName
    ? commandRunner("git", ["rev-list", "--left-right", "--count", `HEAD...${upstreamName}`], rootDir)
    : null;
  const [ahead = "?", behind = "?"] = divergence?.status === 0
    ? divergence.stdout.trim().split(/\s+/)
    : [];

  return [
    result("git worktree clean", statusLines.length === 0, statusLines.length === 0 ? "clean" : `${statusLines.length} uncommitted path(s)`),
    result("git upstream configured", Boolean(upstreamName), upstreamName || "missing upstream"),
    result("git branch synced", Boolean(upstreamName) && ahead === "0" && behind === "0", upstreamName ? `ahead ${ahead}, behind ${behind}` : "missing upstream"),
  ];
}

export function collectSubmissionPublishPreflight({
  rootDir = process.cwd(),
  env = process.env,
  commandResolver = defaultCommandResolver,
  commandRunner = defaultCommandRunner,
  requiredFiles = REQUIRED_PUBLISH_FILES,
  nodeVersion = process.version,
} = {}) {
  return [
    ...fileChecks(rootDir, requiredFiles),
    ...nodeVersionChecks(rootDir, nodeVersion),
    ...gitChecks(rootDir, commandRunner),
    ...vercelChecks(rootDir, commandResolver),
    ...renderChecks(rootDir, env, commandResolver),
    ...hostedGemmaChecks(env),
    ...publicLinkChecks(rootDir),
  ];
}

export function formatSubmissionPublishPreflight(results) {
  const lines = ["Submission publish preflight"];
  for (const item of results) {
    lines.push(`${item.ok ? "✓" : "✗"} ${item.label}: ${item.detail}`);
  }
  const failures = results.filter((item) => !item.ok);
  if (failures.length > 0) {
    lines.push("", `${failures.length} blocker${failures.length === 1 ? "" : "s"} remain before public publishing.`);
  } else {
    lines.push("", "Publish preflight passed. Continue with deploy, public smoke, and final no-skip submission gate.");
  }
  return lines.join("\n");
}
