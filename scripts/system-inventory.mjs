import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSystemInventory,
  formatApiSurfaceMarkdown,
  formatInventoryMarkdown,
  validateCanonicalInventoryClaims,
} from "./lib/system-inventory.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const INVENTORY_DOC = path.join(ROOT, "docs", "system-inventory.md");
const API_SURFACE_DOC = path.join(ROOT, "docs", "api-surface.md");

function hasFlag(name) {
  return process.argv.includes(name);
}

function printSummary(inventory) {
  console.log("System Inventory");
  console.log(`Primary panels: ${inventory.ui.panel_count}`);
  console.log(`Prompt classes: ${inventory.prompts.prompt_class_count}`);
  console.log(`Live/planning split: ${inventory.prompts.live_count}/${inventory.prompts.planning_count}`);
  console.log(`Retrieval-backed prompt classes: ${inventory.prompts.retrieval_count}`);
  console.log(`API route bases: ${inventory.api.mount_count}`);
  console.log(`API endpoints: ${inventory.api.endpoint_count}`);
  console.log(`Eval case files: ${inventory.evals.case_count}`);
}

async function main() {
  const inventory = await buildSystemInventory(ROOT);
  const markdown = formatInventoryMarkdown(inventory);
  const apiMarkdown = formatApiSurfaceMarkdown(inventory);

  if (hasFlag("--write")) {
    await writeFile(INVENTORY_DOC, markdown, "utf8");
    await writeFile(API_SURFACE_DOC, apiMarkdown, "utf8");
    console.log(`Wrote ${path.relative(ROOT, INVENTORY_DOC)}`);
    console.log(`Wrote ${path.relative(ROOT, API_SURFACE_DOC)}`);
  }

  const validation = await validateCanonicalInventoryClaims(ROOT, inventory);

  if (hasFlag("--json")) {
    console.log(JSON.stringify(inventory, null, 2));
  } else {
    printSummary(inventory);
  }

  if (!validation.ok) {
    console.error("");
    console.error("Canonical inventory claims drifted:");
    for (const issue of validation.issues) {
      console.error(`- ${issue}`);
    }
    process.exitCode = 1;
    return;
  }

  if (hasFlag("--check")) {
    console.log("");
    console.log("Canonical inventory claims are in sync.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
