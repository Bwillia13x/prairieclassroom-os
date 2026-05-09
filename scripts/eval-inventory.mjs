import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EVAL_INVENTORY_DOC,
  formatEvalInventoryMarkdown,
  loadEvalCases,
} from "./lib/eval-inventory.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DOC_PATH = path.join(ROOT, EVAL_INVENTORY_DOC);

function hasFlag(name) {
  return process.argv.includes(name);
}

async function main() {
  const cases = await loadEvalCases(ROOT);
  let existing = hasFlag("--check") ? await readFile(DOC_PATH, "utf8").catch(() => "") : "";
  const existingGeneratedDate = existing.match(/^Generated: (\d{4}-\d{2}-\d{2})$/m)?.[1];
  const markdown = formatEvalInventoryMarkdown(cases, {
    generatedDate: existingGeneratedDate && !hasFlag("--write")
      ? existingGeneratedDate
      : new Date().toISOString().slice(0, 10),
  });

  if (hasFlag("--write")) {
    await writeFile(DOC_PATH, markdown, "utf8");
    existing = markdown;
    console.log(`Wrote ${EVAL_INVENTORY_DOC}`);
  }

  if (hasFlag("--check")) {
    if (existing !== markdown) {
      throw new Error(`${EVAL_INVENTORY_DOC} is out of sync with evals/cases; run \`npm run eval:inventory\`.`);
    }
    console.log("Eval inventory is in sync.");
  } else {
    console.log(`Eval cases: ${cases.length}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
