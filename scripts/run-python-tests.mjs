import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pythonVersion, resolvePrairiePythonBin } from "./lib/python-bin.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const INFERENCE_DIR = path.join(ROOT, "services", "inference");
const PYTHON_BIN = resolvePrairiePythonBin(ROOT);
const VERSION = pythonVersion(PYTHON_BIN);

if (VERSION !== "3.11") {
  console.error(
    `Python 3.11 is required for inference tests. Resolved ${PYTHON_BIN} to ${VERSION ?? "unknown"}. ` +
      "Set PRAIRIE_PYTHON=/abs/path/to/python3.11 or create services/inference/.venv311.",
  );
  process.exit(1);
}

const child = spawn(PYTHON_BIN, ["-m", "pytest", "tests/", "-v"], {
  cwd: INFERENCE_DIR,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(`Failed to start Python test runner with ${PYTHON_BIN}: ${error.message}`);
  process.exit(1);
});

child.on("close", (code, signal) => {
  if (signal) {
    console.error(`Python test runner terminated by signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
