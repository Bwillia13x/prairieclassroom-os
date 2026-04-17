#!/usr/bin/env node
/**
 * scripts/pilot-start.mjs — One-command pilot bootstrap.
 *
 * Brings up the inference (Python Flask, mock), orchestrator (Express), and
 * web (Vite) servers in parallel and waits until all three are healthy. The
 * pilot coordinator then opens http://localhost:5173/?demo=true and the
 * teacher walks in cold.
 *
 * Why this exists: the structured walkthrough's "Setup preconditions" lists
 * three separate commands across three terminal windows. That's enough
 * friction to slip during a real session. This script collapses it.
 *
 * Usage:
 *   npm run pilot:start
 *   npm run pilot:start -- --no-web              (servers only, no Vite)
 *   npm run pilot:start -- --inference ollama    (override the inference lane)
 *
 * Stop everything with Ctrl-C — child processes are killed cleanly.
 *
 * What this does NOT do:
 *   - It does not reset memory. Run `npm run pilot:reset` first.
 *   - It does not open a browser. Open http://localhost:5173/?demo=true yourself.
 *   - It does not run validation. Run `npm run release:gate` separately.
 */

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");

const HEALTH_CHECKS = {
  inference: { port: 3200, path: "/health", label: "Inference (Flask)" },
  orchestrator: { port: 3100, path: "/health", label: "Orchestrator (Express)" },
  web: { port: 5173, path: "/", label: "Web (Vite)" },
};

const HEALTH_TIMEOUT_MS = 60_000;

function parseArgs(argv) {
  const opts = { startWeb: true, inferenceLane: "mock" };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--no-web":
        opts.startWeb = false;
        break;
      case "--inference":
        opts.inferenceLane = argv[++i];
        break;
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${argv[i]}`);
    }
  }
  if (!["mock", "ollama"].includes(opts.inferenceLane)) {
    throw new Error(
      `--inference must be 'mock' or 'ollama' (got '${opts.inferenceLane}'). ` +
      `Hosted lanes are not bootstrapped by pilot:start because they require ` +
      `explicit credentials and are budget-gated.`,
    );
  }
  return opts;
}

function printUsage() {
  console.log(`
Usage: npm run pilot:start [-- --no-web] [--inference <mock|ollama>]

Starts the inference, orchestrator, and (optionally) web servers in parallel
and waits until each is healthy. Designed for the start of a pilot session.

Options:
  --no-web                Skip the Vite dev server (servers only)
  --inference <lane>      mock (default) or ollama
  --help                  Show this message

Stop with Ctrl-C — all child processes are cleaned up.
`.trim());
}

function spawnChild(label, command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const tag = `[${label}]`;
  child.stdout.on("data", (chunk) => {
    process.stdout.write(`${tag} ${chunk.toString()}`);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(`${tag} ${chunk.toString()}`);
  });
  child.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.error(`${tag} exited with code ${code}`);
    }
  });
  return child;
}

async function pollHealth({ port, path: healthPath, label }) {
  const url = `http://localhost:${port}${healthPath}`;
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  let lastError = null;

  while (Date.now() < deadline) {
    const ok = await new Promise((resolve) => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(res.statusCode !== undefined && res.statusCode < 500);
      });
      req.on("error", (err) => {
        lastError = err;
        resolve(false);
      });
      req.setTimeout(2_000, () => {
        req.destroy(new Error("health probe timed out"));
        resolve(false);
      });
    });
    if (ok) return true;
    await sleep(500);
  }
  throw new Error(
    `${label} did not become healthy at ${url} within ${HEALTH_TIMEOUT_MS}ms` +
    (lastError ? ` (last error: ${lastError.message})` : ""),
  );
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  console.log("Pilot bootstrap starting.");
  console.log(`  inference: ${opts.inferenceLane}`);
  console.log(`  web:       ${opts.startWeb ? "yes (Vite on 5173)" : "no"}`);
  console.log("");

  const children = [];

  // Inference (Flask)
  children.push(spawnChild(
    "inference",
    "python",
    ["services/inference/server.py", "--mode", opts.inferenceLane, "--port", "3200"],
  ));

  // Orchestrator (Express)
  children.push(spawnChild(
    "orchestrator",
    "npx",
    ["tsx", "services/orchestrator/server.ts"],
    { INFERENCE_URL: "http://localhost:3200", PORT: "3100" },
  ));

  // Web (Vite) — optional
  if (opts.startWeb) {
    children.push(spawnChild(
      "web",
      "npm",
      ["run", "dev", "-w", "apps/web", "--", "--port", "5173"],
    ));
  }

  // Cleanly tear down children on Ctrl-C / SIGTERM
  const shutdown = (signal) => {
    console.log(`\nReceived ${signal} — shutting down pilot servers...`);
    for (const child of children) {
      if (!child.killed) child.kill("SIGTERM");
    }
    setTimeout(() => process.exit(0), 1_000);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Health-poll each in parallel
  const checks = [HEALTH_CHECKS.inference, HEALTH_CHECKS.orchestrator];
  if (opts.startWeb) checks.push(HEALTH_CHECKS.web);
  try {
    await Promise.all(checks.map(pollHealth));
  } catch (err) {
    console.error("\nPilot bootstrap failed: " + (err instanceof Error ? err.message : String(err)));
    shutdown("HEALTH_FAIL");
    process.exitCode = 1;
    return;
  }

  console.log("\n────────────────────────────────────────");
  console.log("Pilot servers ready.");
  console.log("  Inference:    http://localhost:3200/health");
  console.log("  Orchestrator: http://localhost:3100/health");
  if (opts.startWeb) {
    console.log("  Web:          http://localhost:5173/?demo=true");
  }
  console.log("");
  console.log("Open the web URL in your browser. Press Ctrl-C here to stop.");
  console.log("────────────────────────────────────────\n");
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
