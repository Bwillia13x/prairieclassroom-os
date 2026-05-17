import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

export const SUBMISSION_VIDEO = {
  relPath: "qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11.mp4",
  sha256: "2fbd0bd1b48ef1aefd7c82f612f9fecdf0dfafd273a80454a26b2bb59b796da6",
};
export const KAGGLE_WRITEUP = {
  relPath: "docs/kaggle-writeup.md",
  maxWords: 1500,
};

export const REQUIRED_PUBLISH_FILES = [
  "render.yaml",
  "apps/web/vercel.json",
  SUBMISSION_VIDEO.relPath,
  KAGGLE_WRITEUP.relPath,
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

function parseRate(rate) {
  const [num, den] = String(rate ?? "0/1").split("/").map(Number);
  return den ? num / den : num;
}

function sha256File(rootDir, relPath) {
  const hash = createHash("sha256");
  hash.update(readFileSync(path.join(rootDir, relPath)));
  return hash.digest("hex");
}

function videoShaCheck(rootDir, video = SUBMISSION_VIDEO) {
  if (!existsSync(path.join(rootDir, video.relPath))) {
    return [result("submission video sha256", false, `${video.relPath} missing`)];
  }
  const actual = sha256File(rootDir, video.relPath);
  return [
    result(
      "submission video sha256",
      actual === video.sha256,
      actual === video.sha256 ? actual : `expected ${video.sha256}, got ${actual}`,
    ),
  ];
}

function videoMetadataChecks(rootDir, commandRunner, video = SUBMISSION_VIDEO) {
  if (!existsSync(path.join(rootDir, video.relPath))) {
    return [result("submission video metadata", false, `${video.relPath} missing`)];
  }

  const probe = commandRunner("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration,size,bit_rate",
    "-show_streams",
    "-of",
    "json",
    video.relPath,
  ], rootDir);
  if (probe.status !== 0) {
    return [result("submission video metadata", false, summarizeCommandOutput(probe))];
  }

  let parsed;
  try {
    parsed = JSON.parse(probe.stdout);
  } catch {
    return [result("submission video metadata", false, "ffprobe returned invalid JSON")];
  }

  const videoStream = parsed.streams?.find((stream) => stream.codec_type === "video");
  const audioStream = parsed.streams?.find((stream) => stream.codec_type === "audio");
  const duration = Number(parsed.format?.duration);
  const fps = parseRate(videoStream?.avg_frame_rate);
  const ok = Boolean(
    videoStream
    && audioStream
    && videoStream.width === 1920
    && videoStream.height === 1080
    && Math.abs(fps - 30) < 0.01
    && duration >= 119.8
    && duration <= 120.3
    && videoStream.codec_name === "h264"
    && audioStream.codec_name === "aac",
  );
  const detail = ok
    ? `${duration.toFixed(3)}s ${fps.toFixed(2)}fps ${videoStream.width}x${videoStream.height} h264/aac`
    : [
      `duration=${Number.isFinite(duration) ? duration.toFixed(3) : "unknown"}s`,
      `fps=${Number.isFinite(fps) ? fps.toFixed(2) : "unknown"}`,
      `size=${videoStream?.width ?? "?"}x${videoStream?.height ?? "?"}`,
      `codecs=${videoStream?.codec_name ?? "missing"}/${audioStream?.codec_name ?? "missing"}`,
    ].join(" ");
  return [result("submission video metadata", ok, detail)];
}

function countWords(content) {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

function kaggleWriteupChecks(rootDir, writeup = KAGGLE_WRITEUP) {
  if (!existsSync(path.join(rootDir, writeup.relPath))) {
    return [result("kaggle writeup word count", false, `${writeup.relPath} missing`)];
  }
  const words = countWords(readText(rootDir, writeup.relPath));
  const headroom = writeup.maxWords - words;
  return [
    result(
      "kaggle writeup word count",
      words <= writeup.maxWords,
      words <= writeup.maxWords
        ? `${words}/${writeup.maxWords} words (${headroom} spare)`
        : `${words}/${writeup.maxWords} words (${Math.abs(headroom)} over)`,
    ),
  ];
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

function summarizeCommandOutput(commandResult) {
  return [
    commandResult.stdout,
    commandResult.stderr,
  ].join("\n").split(/\r?\n/).map((line) => line.trim()).filter(Boolean)[0] ?? "command failed";
}

function dependencyAuditCheck(rootDir, commandRunner) {
  const audit = commandRunner("npm", ["audit", "--omit=dev"], rootDir);
  return [
    result(
      "production dependency audit",
      audit.status === 0,
      audit.status === 0 ? "found 0 vulnerabilities" : summarizeCommandOutput(audit),
    ),
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
  submissionVideo = SUBMISSION_VIDEO,
  kaggleWriteup = KAGGLE_WRITEUP,
} = {}) {
  return [
    ...fileChecks(rootDir, requiredFiles),
    ...videoShaCheck(rootDir, submissionVideo),
    ...videoMetadataChecks(rootDir, commandRunner, submissionVideo),
    ...kaggleWriteupChecks(rootDir, kaggleWriteup),
    ...nodeVersionChecks(rootDir, nodeVersion),
    ...gitChecks(rootDir, commandRunner),
    ...dependencyAuditCheck(rootDir, commandRunner),
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
