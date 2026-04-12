import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildGeminiReadycheck,
  extractHostedProofRunDir,
  formatGeminiReadycheckReport,
  loadProofSurfaces,
  readHostedProofSummary,
} from "./lib/hackathon-proof.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

async function main() {
  const surfaces = await loadProofSurfaces(ROOT);
  const hostedProofRunDir = extractHostedProofRunDir(surfaces);
  const hostedProofSummary = await readHostedProofSummary(ROOT, hostedProofRunDir);
  const report = buildGeminiReadycheck({
    env: process.env,
    surfaces,
    hostedProofSummary,
  });

  console.log(formatGeminiReadycheckReport(report));
  process.exitCode = report.exitCode;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
