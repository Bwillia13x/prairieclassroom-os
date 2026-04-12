import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const COMMANDS = [
  "npm run host:preflight:ollama",
  "npm run release:gate",
  "npm run release:gate:ollama",
  "npm run eval:summary",
  "npm run logs:summary",
];

function safeIso(value) {
  if (typeof value !== "string") {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function sortNewest(items, pickDate) {
  return [...items].sort((left, right) => {
    const leftDate = safeIso(pickDate(left)) ?? "";
    const rightDate = safeIso(pickDate(right)) ?? "";
    return rightDate.localeCompare(leftDate);
  });
}

function relativePath(rootDir, targetPath) {
  if (!targetPath) {
    return null;
  }
  return path.relative(rootDir, targetPath);
}

function hostKey(host) {
  if (!host) {
    return "unknown-host";
  }
  return [
    host.os?.hostname ?? "unknown",
    host.os?.platform ?? "unknown",
    host.os?.arch ?? "unknown",
    host.hardware?.cpu_model ?? "unknown",
    host.hardware?.total_memory_bytes ?? "unknown",
  ].join("::");
}

function hostLabel(host) {
  if (!host) {
    return "Unknown host";
  }
  const hostname = host.os?.hostname ?? "unknown";
  const platform = host.os?.platform ?? "unknown";
  const arch = host.os?.arch ?? "unknown";
  const cpu = host.hardware?.cpu_model ?? "unknown CPU";
  const memory = host.hardware?.total_memory_human ?? "unknown memory";
  return `${hostname} (${platform} ${arch}, ${cpu}, ${memory})`;
}

function ensureGroup(groups, key, label) {
  if (!groups.has(key)) {
    groups.set(key, { key, label, latestPreflight: null, latestOllamaPass: null, latestOllamaFailure: null });
  }
  return groups.get(key);
}

function tableOrNone(headers, rows) {
  if (rows.length === 0) {
    return "_None recorded_";
  }
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function escapeCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
}

export async function listHostPreflightArtifacts(hostPreflightDir) {
  if (!existsSync(hostPreflightDir)) {
    return [];
  }

  const entries = await readdir(hostPreflightDir, { withFileTypes: true });
  const artifacts = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json") || entry.name.endsWith("-failure-summary.json")) {
      continue;
    }
    const artifactPath = path.join(hostPreflightDir, entry.name);
    const details = JSON.parse(await readFile(artifactPath, "utf8"));
    artifacts.push({
      ...details,
      artifact_path: details.artifact_path ?? artifactPath,
    });
  }

  return sortNewest(artifacts, (artifact) => artifact.generated_at);
}

export async function listReleaseGateRunSummaries(releaseGateDir) {
  if (!existsSync(releaseGateDir)) {
    return [];
  }

  const entries = await readdir(releaseGateDir, { withFileTypes: true });
  const runs = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const summaryPath = path.join(releaseGateDir, entry.name, "summary.json");
    if (!existsSync(summaryPath)) {
      continue;
    }
    const details = JSON.parse(await readFile(summaryPath, "utf8"));
    runs.push({
      ...details,
      summary_path: summaryPath,
    });
  }

  return sortNewest(runs, (run) => run.completed_at ?? run.failed_at ?? run.generated_at);
}

export function buildProofStatusMarkdown({ rootDir, preflights, runSummaries }) {
  const latestMockPass = runSummaries.find((run) => run.inference_mode === "mock" && run.status === "passed") ?? null;
  const latestOllamaPass = runSummaries.find((run) => run.inference_mode === "ollama" && run.status === "passed") ?? null;
  const hostGroups = new Map();

  for (const preflight of preflights) {
    const key = hostKey(preflight.host);
    const group = ensureGroup(hostGroups, key, hostLabel(preflight.host));
    if (!group.latestPreflight) {
      group.latestPreflight = preflight;
    }
  }

  for (const run of runSummaries.filter((candidate) => candidate.inference_mode === "ollama")) {
    const key = hostKey(run.host);
    const group = ensureGroup(hostGroups, key, hostLabel(run.host));
    if (run.status === "passed" && !group.latestOllamaPass) {
      group.latestOllamaPass = run;
    }
    if (run.status === "failed" && !group.latestOllamaFailure) {
      group.latestOllamaFailure = run;
    }
  }

  const provenHosts = [];
  const qualifiedPendingHosts = [];
  const blockedHosts = [];

  for (const group of hostGroups.values()) {
    if (group.latestOllamaPass) {
      provenHosts.push(group);
      continue;
    }

    if (group.latestOllamaFailure) {
      const failedBeforeGate =
        typeof group.latestOllamaFailure.host_preflight_status === "string"
        && group.latestOllamaFailure.host_preflight_status !== "ok";
      blockedHosts.push({
        ...group,
        blockedReason: group.latestOllamaFailure.error_message ?? "Ollama gate failed",
        blockedArtifact: failedBeforeGate && group.latestOllamaFailure.ollama_preflight_artifact
          ? path.join(rootDir, group.latestOllamaFailure.ollama_preflight_artifact)
          : group.latestOllamaFailure.summary_path,
      });
      continue;
    }

    if (group.latestPreflight?.status === "ok") {
      qualifiedPendingHosts.push(group);
      continue;
    }

    blockedHosts.push({
      ...group,
      blockedReason: group.latestPreflight?.summary ?? "Host preflight failed",
      blockedArtifact: group.latestPreflight?.artifact_path ?? null,
    });
  }

  const verdict = latestOllamaPass
    ? "Proven on at least one zero-cost host."
    : blockedHosts.length > 0
      ? "Blocked pending a viable zero-cost Ollama host."
      : "Pending host evidence.";

  const mockArtifact = latestMockPass ? relativePath(rootDir, path.join(rootDir, latestMockPass.run_dir ?? "")) : null;
  const ollamaArtifact = latestOllamaPass ? relativePath(rootDir, path.join(rootDir, latestOllamaPass.run_dir ?? "")) : null;

  return [
    "# Live-Model Proof Status",
    "",
    "_This document is generated from zero-cost host-preflight and release-gate artifacts._",
    "",
    "## Verdict",
    "",
    `- Live-model proof: ${verdict}`,
    `- Zero-cost enforcement: mock and Ollama only; no paid fallback recorded`,
    `- Latest passed mock gate: ${mockArtifact ? `\`${mockArtifact}\`` : "_none recorded_"}`,
    `- Latest passed Ollama gate: ${ollamaArtifact ? `\`${ollamaArtifact}\`` : "_none recorded_"}`,
    "",
    "## Commands",
    "",
    "```bash",
    ...COMMANDS,
    "```",
    "",
    "## Proven Hosts",
    "",
    tableOrNone(
      ["Host", "Latest Ollama Gate", "Artifacts"],
      provenHosts.map((group) => [
        escapeCell(group.label),
        escapeCell(group.latestOllamaPass.completed_at ?? group.latestOllamaPass.generated_at ?? "unknown"),
        escapeCell(`\`${relativePath(rootDir, path.join(rootDir, group.latestOllamaPass.run_dir ?? "")) ?? "unknown"}\``),
      ]),
    ),
    "",
    "## Qualified Pending Hosts",
    "",
    tableOrNone(
      ["Host", "Latest Preflight", "Artifacts"],
      qualifiedPendingHosts.map((group) => [
        escapeCell(group.label),
        escapeCell(group.latestPreflight.generated_at ?? "unknown"),
        escapeCell(`\`${relativePath(rootDir, group.latestPreflight.artifact_path) ?? "unknown"}\``),
      ]),
    ),
    "",
    "## Blocked Reference Hosts",
    "",
    tableOrNone(
      ["Host", "Block", "Artifacts"],
      blockedHosts.map((group) => [
        escapeCell(group.label),
        escapeCell(group.blockedReason),
        escapeCell(`\`${relativePath(rootDir, group.blockedArtifact) ?? "unknown"}\``),
      ]),
    ),
    "",
    "## Artifact Locations",
    "",
    "- Host preflight: `output/host-preflight/`",
    "- Release gates: `output/release-gate/`",
    "- Eval summaries: `output/evals/`",
    "- Request logs: `output/request-logs/`",
  ].join("\n");
}

export async function updateProofStatusDoc({
  rootDir,
  docPath = path.join(rootDir, "docs", "live-model-proof-status.md"),
} = {}) {
  const resolvedRoot = path.resolve(rootDir ?? process.cwd());
  const hostPreflights = await listHostPreflightArtifacts(path.join(resolvedRoot, "output", "host-preflight"));
  const runSummaries = await listReleaseGateRunSummaries(path.join(resolvedRoot, "output", "release-gate"));
  const markdown = buildProofStatusMarkdown({
    rootDir: resolvedRoot,
    preflights: hostPreflights,
    runSummaries,
  });

  await mkdir(path.dirname(docPath), { recursive: true });
  await writeFile(docPath, `${markdown}\n`, "utf8");
  return docPath;
}
