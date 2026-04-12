import path from "node:path";
import { fileURLToPath } from "node:url";
import { runOllamaHostPreflight } from "./lib/ollama-host-preflight.mjs";
import { updateProofStatusDoc } from "./lib/proof-status.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

async function main() {
  const artifact = await runOllamaHostPreflight({
    rootDir: ROOT,
    outputDir: path.join(ROOT, "output", "host-preflight"),
  });
  await updateProofStatusDoc({ rootDir: ROOT });

  console.log(JSON.stringify(artifact, null, 2));
  if (artifact.status !== "ok") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
