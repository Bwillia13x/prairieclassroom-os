import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildEvalInventory,
  formatEvalInventoryMarkdown,
  loadEvalCases,
} from "../eval-inventory.mjs";

async function seedCase(rootDir, file, data) {
  const casesDir = path.join(rootDir, "evals", "cases");
  await mkdir(casesDir, { recursive: true });
  await writeFile(path.join(casesDir, file), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

describe("eval inventory", () => {
  it("loads cases and groups route-family counts from filenames", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "eval-inventory-"));
    try {
      await seedCase(rootDir, "diff-001-schema.json", {
        id: "diff-001-schema",
        category: "schema_reliability",
        description: "Differentiation schema",
      });
      await seedCase(rootDir, "plan-014-persistence.json", {
        id: "plan-014-persistence",
        category: "retrieval_relevance",
        description: "Plan persistence",
        prompt_class: "roundtrip_plan_persistence",
      });
      await seedCase(rootDir, "scaff-001-retrieval-relevance.json", {
        id: "scaff-001-retrieval-relevance",
        category: "retrieval_relevance",
        description: "Scaffold retrieval",
        prompt_class: "detect_scaffold_decay",
      });

      const cases = await loadEvalCases(rootDir);
      const inventory = buildEvalInventory(cases);

      assert.equal(inventory.totalCases, 3);
      assert.equal(inventory.familyRows.find((row) => row.key === "diff").cases.length, 1);
      assert.equal(inventory.familyRows.find((row) => row.key === "plan").cases.length, 1);
      assert.equal(inventory.familyRows.find((row) => row.key === "decay").cases.length, 1);
      assert.deepEqual(inventory.unmapped, []);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("formats totals, categories, and case rows in markdown", () => {
    const markdown = formatEvalInventoryMarkdown([
      {
        file: "diff-015-tool-calling-curriculum.json",
        prefix: "diff",
        category: "tool_calling",
        description: "Tool path | schema-valid variants",
      },
      {
        file: "synth-001-plan-references-demo-pattern.json",
        prefix: "synth",
        category: "cross_feature_synthesis",
        description: "Plan references pattern history",
      },
    ], { generatedDate: "2026-05-03" });

    assert.match(markdown, /\*\*Total eval case files:\*\* 2 JSON cases/);
    assert.match(markdown, /\| `diff` \| differentiate_material \| `diff` \| 1 \|/);
    assert.match(markdown, /\| `synth` \| cross-feature retrieval and synthesis \| `synth` \| 1 \|/);
    assert.match(markdown, /\| `tool_calling` \| 1 \|/);
    assert.match(markdown, /Tool path \\| schema-valid variants/);
  });
});

