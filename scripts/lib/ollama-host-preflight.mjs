import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync, statfsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const REQUIRED_OLLAMA_MODELS = ["gemma4:4b", "gemma4:27b"];

function bin(name) {
  return process.platform === "win32" ? `${name}.cmd` : name;
}

export function parseOllamaListOutput(output) {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^name\s+/i.test(line))
    .map((line) => line.split(/\s+/)[0])
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index);
}

export function categorizeOllamaPreflight(details) {
  if (!details || details.status === "ok") {
    return null;
  }
  return "host_preflight";
}

function safeStatFs(targetDir) {
  try {
    const stats = statfsSync(targetDir);
    const totalBytes = Number(stats.blocks) * Number(stats.bsize);
    const availableBytes = Number(stats.bavail) * Number(stats.bsize);
    return {
      total_bytes: Number.isFinite(totalBytes) ? totalBytes : null,
      available_bytes: Number.isFinite(availableBytes) ? availableBytes : null,
    };
  } catch {
    return {
      total_bytes: null,
      available_bytes: null,
    };
  }
}

function formatBytes(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const gb = value / (1024 ** 3);
  return `${gb.toFixed(2)} GiB`;
}

export function buildHostSummary(rootDir) {
  const cpus = os.cpus();
  const memoryTotal = os.totalmem();
  const memoryFree = os.freemem();
  const disk = safeStatFs(rootDir);

  return {
    os: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
    },
    hardware: {
      cpu_model: cpus[0]?.model ?? "unknown",
      cpu_count: cpus.length,
      total_memory_bytes: memoryTotal,
      total_memory_human: formatBytes(memoryTotal),
      free_memory_bytes: memoryFree,
      free_memory_human: formatBytes(memoryFree),
    },
    disk: {
      path: rootDir,
      total_bytes: disk.total_bytes,
      total_human: formatBytes(disk.total_bytes),
      available_bytes: disk.available_bytes,
      available_human: formatBytes(disk.available_bytes),
    },
  };
}

export async function readLatestHostPreflight(outputDir) {
  if (!existsSync(outputDir)) {
    return null;
  }

  const files = (await readdir(outputDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort()
    .reverse();

  if (files.length === 0) {
    return null;
  }

  const artifactPath = path.join(outputDir, files[0]);
  const details = JSON.parse(await readFile(artifactPath, "utf8"));
  return { ...details, artifact_path: artifactPath };
}

export async function runOllamaHostPreflight({
  rootDir,
  outputDir,
  requiredModels = REQUIRED_OLLAMA_MODELS,
  now = new Date(),
} = {}) {
  const resolvedRoot = rootDir ? path.resolve(rootDir) : process.cwd();
  const resolvedOutput = path.resolve(outputDir ?? path.join(resolvedRoot, "output", "host-preflight"));
  const runId = now.toISOString().replace(/[:.]/g, "-");
  const artifactPath = path.join(resolvedOutput, `${runId}.json`);
  const host = buildHostSummary(resolvedRoot);

  const listResult = spawnSync(bin("ollama"), ["list"], {
    encoding: "utf8",
  });

  let details;
  if (listResult.error || listResult.status !== 0) {
    details = {
      status: "ollama_unavailable",
      category: "host_preflight",
      summary: "Ollama CLI is not available or `ollama list` failed.",
      command: "ollama list",
      cli_available: false,
      required_models: requiredModels,
      available_models: [],
      stdout: listResult.stdout ?? "",
      stderr: listResult.stderr ?? "",
      host,
    };
  } else {
    const output = `${listResult.stdout ?? ""}\n${listResult.stderr ?? ""}`;
    const availableModels = parseOllamaListOutput(output);
    const missingModels = requiredModels.filter((model) => !availableModels.includes(model));
    details = {
      status: missingModels.length === 0 ? "ok" : "missing_models",
      category: missingModels.length === 0 ? null : "host_preflight",
      summary:
        missingModels.length === 0
          ? "Required Ollama Gemma 4 models are available locally."
          : `Missing required Ollama models: ${missingModels.join(", ")}`,
      command: "ollama list",
      cli_available: true,
      required_models: requiredModels,
      available_models: availableModels,
      missing_models: missingModels,
      stdout: listResult.stdout ?? "",
      stderr: listResult.stderr ?? "",
      host,
    };
  }

  const artifact = {
    generated_at: now.toISOString(),
    artifact_path: artifactPath,
    ...details,
  };

  await mkdir(resolvedOutput, { recursive: true });
  await writeFile(artifactPath, JSON.stringify(artifact, null, 2), "utf8");
  return artifact;
}
