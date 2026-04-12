import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadProofSurfaces, validateProofSurfaces } from "./lib/hackathon-proof.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

async function main() {
  const surfaces = await loadProofSurfaces(ROOT);
  const result = validateProofSurfaces(surfaces);

  if (!result.ok) {
    throw new Error(`Proof surfaces drifted:\n- ${result.issues.join("\n- ")}`);
  }

  console.log("Proof surfaces are internally consistent.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
