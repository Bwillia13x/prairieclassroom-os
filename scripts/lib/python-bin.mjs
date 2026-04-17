import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export function resolvePrairiePythonBin(rootDir) {
  const configured = process.env.PRAIRIE_PYTHON?.trim();
  if (configured) {
    return configured;
  }

  const inferenceDir = path.join(rootDir, "services", "inference");
  const candidatePaths = [
    path.join(
      inferenceDir,
      ".venv",
      process.platform === "win32" ? "Scripts" : "bin",
      process.platform === "win32" ? "python.exe" : "python",
    ),
    path.join(
      inferenceDir,
      ".venv311",
      process.platform === "win32" ? "Scripts" : "bin",
      process.platform === "win32" ? "python.exe" : "python",
    ),
    "python3.11",
    "python3",
  ];

  for (const candidate of candidatePaths) {
    if (candidate.includes(path.sep) && !existsSync(candidate)) {
      continue;
    }

    const version = pythonVersion(candidate);
    if (version === "3.11") {
      return candidate;
    }
  }

  return "python3";
}

export function pythonVersion(pythonBin) {
  const versionCheck = spawnSync(pythonBin, ["-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"], {
    encoding: "utf8",
  });

  if (versionCheck.status !== 0) {
    return null;
  }

  return versionCheck.stdout.trim();
}
