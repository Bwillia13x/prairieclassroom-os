#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const includeHistory = process.argv.includes("--history");

const binaryExtensions = new Set([
  ".avif",
  ".db",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".mov",
  ".mp3",
  ".mp4",
  ".pdf",
  ".png",
  ".sqlite",
  ".webm",
  ".zip",
]);

const allowedSensitiveFiles = new Set([".env.example"]);
const sensitiveFilePattern = /(^|\/)(\.env($|\.)|\.npmrc$|\.netrc$|\.vercel\/|credentials\.json$|.*credentials.*\.json$|.*service-account.*\.json$|application_default_credentials\.json$|.*\.(pem|key|p8|p12|pfx)$|secrets\/)/i;

const secretPatterns = [
  ["google_api_key", /AIza[0-9A-Za-z_-]{35}/g],
  ["openai_api_key", /sk-proj-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{32,}/g],
  ["github_token", /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}/g],
  ["aws_access_key", /(?:AKIA|ASIA)[0-9A-Z]{16}/g],
  ["slack_token", /xox[baprs]-[A-Za-z0-9-]{20,}/g],
  ["sendgrid_api_key", /SG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g],
  ["private_key", /-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g],
  ["database_url", /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?):\/\/[A-Za-z0-9._~:/?#\[\]@!$&()*+,;=%-]{16,}/g],
  [
    "sensitive_env_assignment",
    /\b(?:PRAIRIE_GEMINI_API_KEY|GEMINI_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_API_KEY|RESEND_API_KEY|STRIPE_SECRET_KEY|VERCEL_TOKEN|RENDER_API_KEY|RENDER_API_TOKEN|PRAIRIE_INFERENCE_AUTH_TOKEN|DATABASE_URL)\s*[:=]\s*["']?([^"'\s#]+)/g,
  ],
];

const placeholderValue = /^(?:$|<|your-|test-|demo-|mock|dummy|example|placeholder|redacted|false|true|null|undefined|sync:|process\.env|env\.|[A-Z0-9_]+$|(?:test|render|internal|prairie|fallback)-(?:key|token|secret)$)/i;

function gitList(args) {
  const output = execFileSync("git", args, { cwd: ROOT });
  return output
    .toString("utf8")
    .split("\0")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function shouldSkipFile(file) {
  return binaryExtensions.has(path.extname(file).toLowerCase());
}

function lineNumberAt(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function scanFiles(files) {
  const findings = [];

  for (const file of files) {
    if (shouldSkipFile(file)) continue;

    if (sensitiveFilePattern.test(file) && !allowedSensitiveFiles.has(file)) {
      findings.push({ file, line: 1, rule: "sensitive_file_tracked_or_unignored" });
    }

    let text;
    try {
      const bytes = readFileSync(path.join(ROOT, file));
      if (bytes.includes(0)) continue;
      text = bytes.toString("utf8");
    } catch {
      continue;
    }

    for (const [rule, pattern] of secretPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (rule === "sensitive_env_assignment") {
          const value = (match[1] ?? "").replace(/[,\]}).;]+$/, "");
          if (value.length < 12 || placeholderValue.test(value)) continue;
        }
        findings.push({ file, line: lineNumberAt(text, match.index), rule });
      }
    }
  }

  return findings;
}

function scanHistory() {
  const historyPattern = secretPatterns
    .filter(([rule]) => rule !== "sensitive_env_assignment")
    .map(([, pattern]) => pattern.source)
    .join("|");
  const commits = execFileSync("git", ["rev-list", "--all"], { cwd: ROOT, encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);

  const findings = [];
  for (const commit of commits) {
    let output = "";
    try {
      output = execFileSync("git", ["grep", "-l", "-I", "-P", historyPattern, commit, "--"], {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      continue;
    }

    for (const line of output.split("\n").filter(Boolean)) {
      findings.push({ file: line, line: 1, rule: "history_high_signal_secret" });
    }
  }
  return findings;
}

const files = [
  ...new Set([
    ...gitList(["ls-files", "-z"]),
    ...gitList(["ls-files", "-o", "--exclude-standard", "-z"]),
  ]),
];

const findings = scanFiles(files);
if (includeHistory) findings.push(...scanHistory());

if (findings.length > 0) {
  console.error("Potential secrets found. Values are intentionally not printed.");
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} ${finding.rule}`);
  }
  process.exit(1);
}

console.log(`Secret scan passed (${files.length} current tracked/nonignored files${includeHistory ? ", history included" : ""}).`);
