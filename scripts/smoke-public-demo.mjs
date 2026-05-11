/**
 * Public demo smoke wrapper.
 *
 * Resolves the public live-demo URL from `--url`, PRAIRIE_PUBLIC_DEMO_URL, or
 * submission docs, rejects placeholders/local URLs, then runs the existing
 * browser smoke suite against that deployed base.
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_TIMEOUT_MS = "180000";

function cliUrl() {
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--url=")) return arg.slice("--url=".length);
  }
  return "";
}

function extractUrlFromLine(content, pattern) {
  const line = content.split(/\r?\n/).find((entry) => pattern.test(entry));
  if (!line) return "";
  return line.match(/https?:\/\/[^\s)`\]]+/)?.[0]?.replace(/[.,;:]+$/, "") ?? "";
}

function docsUrl() {
  const copyPack = readFileSync(path.join(ROOT, "docs", "submission-copy-pack.md"), "utf8");
  const pasteBlock = readFileSync(path.join(ROOT, "docs", "kaggle-paste-block.md"), "utf8");
  return extractUrlFromLine(copyPack, /^-\s*Live demo:/i)
    || extractUrlFromLine(pasteBlock, /^-\s*Public live demo:/i);
}

function normalizePublicBase(rawUrl) {
  if (!rawUrl || /\badd public deployed URL\b/i.test(rawUrl)) {
    throw new Error("Public demo URL is missing. Set PRAIRIE_PUBLIC_DEMO_URL or fill the live demo URL in submission docs.");
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Public demo URL is invalid: ${rawUrl}`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Public demo URL must use http/https: ${rawUrl}`);
  }

  const host = parsed.hostname.toLowerCase();
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(host) || host.endsWith(".local")) {
    throw new Error(`Public demo URL must be externally reachable, not local: ${rawUrl}`);
  }

  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function runBrowserSmoke(publicBase) {
  return new Promise((resolve) => {
    const child = spawn("npm", ["run", "smoke:browser"], {
      cwd: ROOT,
      stdio: "inherit",
      env: {
        ...process.env,
        PRAIRIE_WEB_BASE: publicBase,
        PRAIRIE_BROWSER_SMOKE_TIMEOUT_MS: process.env.PRAIRIE_BROWSER_SMOKE_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS,
      },
    });
    child.on("error", (error) => {
      console.error(error.message);
      resolve(1);
    });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function main() {
  const publicBase = normalizePublicBase(cliUrl() || process.env.PRAIRIE_PUBLIC_DEMO_URL || docsUrl());
  console.log(`Public demo smoke target: ${publicBase}`);
  const code = await runBrowserSmoke(publicBase);
  process.exitCode = code;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
