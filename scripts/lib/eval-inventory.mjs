import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const EVAL_INVENTORY_DOC = path.join("docs", "eval-inventory.md");

export const CASE_FAMILIES = [
  {
    key: "diff",
    title: "diff -- differentiate_material",
    route: "differentiate_material",
    prefixes: ["diff"],
  },
  {
    key: "plan",
    title: "plan -- prepare_tomorrow_plan",
    route: "prepare_tomorrow_plan + plan persistence",
    prefixes: ["plan"],
  },
  {
    key: "msg",
    title: "msg -- draft_family_message",
    route: "draft_family_message + message persistence",
    prefixes: ["msg"],
    note: "Bilingual expansion cases (`msg-lang-*`) cover Punjabi, Tagalog, Mandarin, French, Arabic, and Ukrainian across routine_update, praise, and low_stakes_concern message types.",
  },
  {
    key: "int",
    title: "int -- log_intervention",
    route: "log_intervention + intervention persistence",
    prefixes: ["int"],
  },
  {
    key: "ea",
    title: "ea -- generate_ea_briefing",
    route: "generate_ea_briefing",
    prefixes: ["ea"],
  },
  {
    key: "pat",
    title: "pat -- detect_support_patterns",
    route: "detect_support_patterns + retrieve_latest_pattern",
    prefixes: ["pat"],
    note: "`pat-007` and `pat-010` use `retrieve_latest_pattern` as their prompt class, which is the retrieval sub-route for support-pattern history.",
  },
  {
    key: "fcst",
    title: "fcst -- forecast_complexity",
    route: "forecast_complexity",
    prefixes: ["fcst"],
  },
  {
    key: "decay",
    title: "decay/scaff -- detect_scaffold_decay",
    route: "detect_scaffold_decay",
    prefixes: ["decay", "scaff"],
    note: "`scaff-001` is a retrieval-relevance case for the scaffold-decay route; it uses a separate prefix so it is easy to distinguish from the original decay suite.",
  },
  {
    key: "surv",
    title: "surv -- generate_survival_packet",
    route: "generate_survival_packet",
    prefixes: ["surv"],
  },
  {
    key: "debt",
    title: "debt -- complexity_debt_register",
    route: "complexity_debt_register",
    prefixes: ["debt"],
  },
  {
    key: "sched",
    title: "sched -- schedule endpoints",
    route: "deterministic schedule CRUD",
    prefixes: ["sched"],
    note: "`sched-*` cases have `prompt_class: null` and exercise schedule endpoints directly.",
  },
  {
    key: "simp",
    title: "simp -- simplify_for_student",
    route: "simplify_for_student",
    prefixes: ["simp"],
  },
  {
    key: "vocab",
    title: "vocab -- generate_vocab_cards",
    route: "generate_vocab_cards",
    prefixes: ["vocab"],
  },
  {
    key: "extract",
    title: "extract -- extract_worksheet",
    route: "extract_worksheet",
    prefixes: ["extract"],
    note: "`extract-*` cases use an `assertions` array with typed assertion objects rather than the `expected` object used by the other route families.",
  },
  {
    key: "eal",
    title: "eal -- balance_ea_load",
    route: "balance_ea_load",
    prefixes: ["eal"],
  },
  {
    key: "synth",
    title: "synth -- cross-feature synthesis",
    route: "cross-feature retrieval and synthesis",
    prefixes: ["synth"],
    note: "`synth-*` cases intentionally span routes to prove generated outputs use retrieved pattern and intervention history rather than static profile data alone.",
  },
];

function casePrefix(file) {
  return file.split("-")[0];
}

function normalizeLine(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replaceAll("|", "\\|")
    .trim();
}

function sortEntries(entries) {
  return entries.sort((left, right) => left.file.localeCompare(right.file, undefined, { numeric: true }));
}

export async function loadEvalCases(rootDir) {
  const casesDir = path.join(rootDir, "evals", "cases");
  if (!existsSync(casesDir)) return [];

  const entries = await readdir(casesDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  const cases = [];
  for (const file of files) {
    const absolutePath = path.join(casesDir, file);
    const data = JSON.parse(await readFile(absolutePath, "utf8"));
    cases.push({
      file,
      prefix: casePrefix(file),
      id: data.id ?? file.replace(/\.json$/, ""),
      category: data.category ?? "uncategorized",
      description: data.description ?? "",
      prompt_class: data.prompt_class ?? null,
    });
  }

  return cases;
}

export function buildEvalInventory(cases) {
  const familyRows = CASE_FAMILIES.map((family) => ({
    ...family,
    cases: sortEntries(cases.filter((entry) => family.prefixes.includes(entry.prefix))),
  }));
  const mappedFiles = new Set(familyRows.flatMap((family) => family.cases.map((entry) => entry.file)));
  const unmapped = sortEntries(cases.filter((entry) => !mappedFiles.has(entry.file)));

  const categoryCounts = new Map();
  for (const entry of cases) {
    categoryCounts.set(entry.category, (categoryCounts.get(entry.category) ?? 0) + 1);
  }

  return {
    totalCases: cases.length,
    familyRows,
    categoryRows: [...categoryCounts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category)),
    unmapped,
  };
}

function formatFamilyTable(inventory) {
  const lines = [
    "### Cases per Route Family",
    "",
    "| Route family | Route / prompt class | Prefixes | Cases |",
    "|---|---|---|---:|",
  ];

  for (const family of inventory.familyRows) {
    lines.push(`| \`${family.key}\` | ${family.route} | ${family.prefixes.map((prefix) => `\`${prefix}\``).join(", ")} | ${family.cases.length} |`);
  }

  lines.push(`| **Total** | | | **${inventory.totalCases}** |`);
  lines.push("");
  lines.push("Note: route families are grouped by eval filename prefix because several persistence and retrieval cases intentionally use sub-route prompt classes while still validating the same teacher-facing workflow.");

  if (inventory.unmapped.length > 0) {
    lines.push("");
    lines.push(`Unmapped case files: ${inventory.unmapped.map((entry) => `\`${entry.file}\``).join(", ")}`);
  }

  return lines;
}

function formatCategoryTable(inventory) {
  const lines = [
    "### Cases per Category",
    "",
    "| Category | Cases |",
    "|---|---:|",
  ];

  for (const row of inventory.categoryRows) {
    lines.push(`| \`${row.category}\` | ${row.count} |`);
  }

  lines.push("");
  lines.push("Note: category counts reflect the exact `category` values in the JSON case files.");

  return lines;
}

function formatCaseInventory(inventory) {
  const lines = ["## Case Inventory by Route Family", ""];

  for (const family of inventory.familyRows) {
    lines.push(`### ${family.title} (${family.cases.length} cases)`);
    lines.push("");
    lines.push("| Filename | Category | Purpose |");
    lines.push("|---|---|---|");
    for (const entry of family.cases) {
      lines.push(`| \`${entry.file}\` | ${entry.category} | ${normalizeLine(entry.description)} |`);
    }
    if (family.note) {
      lines.push("");
      lines.push(family.note);
    }
    lines.push("");
  }

  return lines;
}

function getFamilyCount(inventory, key) {
  return inventory.familyRows.find((family) => family.key === key)?.cases.length ?? 0;
}

function getCategoryCount(inventory, category) {
  return inventory.categoryRows.find((row) => row.category === category)?.count ?? 0;
}

function formatCoverageGaps(inventory) {
  return [
    "## Coverage Gaps",
    "",
    "### Route Families with the Fewest Cases",
    "",
    "| Route family | Cases | Notes |",
    "|---|---:|---|",
    `| Schedule endpoints | ${getFamilyCount(inventory, "sched")} | Deterministic CRUD coverage is intentionally smaller; no safety, latency, or prompt-injection cases are needed unless the route becomes model-routed. |`,
    `| Cross-feature synthesis | ${getFamilyCount(inventory, "synth")} | Useful high-signal coverage exists, but only two dedicated cross-route synthesis cases are present outside the survival-packet suite. |`,
    `| \`complexity_debt_register\` | ${getFamilyCount(inventory, "debt")} | Deterministic debt computation has schema/staleness/recurrence coverage; no safety-specific or latency case. |`,
    `| \`extract_worksheet\` | ${getFamilyCount(inventory, "extract")} | Has schema, content, safety, latency, and MIME-tolerance coverage. Still missing prompt injection and multilingual/degraded-OCR cases. |`,
    `| \`balance_ea_load\` | ${getFamilyCount(inventory, "eal")} | Has schema, safety, prompt-injection, no-EA-window, and minimal-roster coverage. No latency-only case. |`,
    `| \`generate_vocab_cards\` | ${getFamilyCount(inventory, "vocab")} | Has schema, safety, non-Latin, prompt-injection, and thin-artifact coverage. Still no latency-only case. |`,
    "",
    "### Categories That Are Underrepresented",
    "",
    "| Category / slice | Cases | Notes |",
    "|---|---:|---|",
    `| \`tool_calling\` | ${getCategoryCount(inventory, "tool_calling")} | Only \`diff-015-tool-calling-curriculum\`; add more cases if additional routes become tool-capable. |`,
    `| \`content_quality\` | ${getCategoryCount(inventory, "content_quality")} | Only survival-packet and worksheet-extraction cases use this exact category; most qualitative checks are tagged as \`differentiation_quality\` or \`planning_usefulness\`. |`,
    `| \`cross_feature_synthesis\` | ${getCategoryCount(inventory, "cross_feature_synthesis")} | Covers survival-packet plus two synthetic cross-route cases; no direct forecast+intervention or EA+debt synthesis case yet. |`,
    `| \`planning_usefulness\` | ${getCategoryCount(inventory, "planning_usefulness")} | Concentrated in tomorrow-plan and forecast cases. |`,
    `| Prompt injection | 12 | Present for diff, plan, msg, pat, surv, int, ea, fcst, decay, simp, vocab, and eal. Missing for extract, debt, and schedule. |`,
    `| Multilingual / non-Latin | 26 | Includes 18 \`msg-lang-*\` cases plus diff, plan, msg, int, fcst, simp, and vocab non-Latin/multilingual cases. Missing for ea, pat, decay, surv, debt, schedule, and extract. |`,
    `| Persistence / round-trip | 4 | Explicit persistence coverage exists for pattern reports, family messages, interventions, and tomorrow plans. |`,
    "",
    "### Structural Observations",
    "",
    "1. **Category naming is now standardized**: all live case files use `safety_correctness` rather than the older `safety_boundaries` category name.",
    "",
    "2. **Extract cases use a different format**: the `extract-*` cases use `assertions` arrays with typed objects plus `request`/`route` fields, while the other cases use the `expected` object with `input` fields. The runner has a dedicated `extract_worksheet` dispatch path, so these cases execute against `/api/extract-worksheet` rather than falling through to differentiation.",
    "",
    "3. **No eval cases exist for**: `generate_schedule` as a model-routed class. Schedule is tested as deterministic CRUD only.",
    "",
    "4. **Debt register is deterministic**: all 4 debt cases test schema/staleness/recurrence behavior. Since the debt register is computed from stored data, the lack of model safety and latency cases is by design.",
  ];
}

const RUNNER_ASSERTIONS = [
  "## Runner Assertion Types",
  "",
  "The eval runner (`evals/runner.ts`) supports the following assertion mechanisms:",
  "",
  "### Content Validators",
  "",
  "| Assertion | Description |",
  "|---|---|",
  "| `must_contain` | Output text must include all listed substrings |",
  "| `must_not_contain` | Output text must NOT include any listed substrings |",
  "| `does_not_contain` | Alias for `must_not_contain` |",
  "| `forbidden_terms_absent` | Case-insensitive check that output does not contain any listed terms |",
  "",
  "### Schema Validators",
  "",
  "| Assertion | Description |",
  "|---|---|",
  "| `required_keys` | Output object must contain all listed keys |",
  "| `required_plan_keys` | Plan object must contain listed keys |",
  "| `required_message_keys` | Draft object must contain listed keys |",
  "| `required_intervention_keys` | Record object must contain listed keys |",
  "| `required_simplified_keys` | Simplified object must contain listed keys |",
  "| `required_cardset_keys` | Card set object must contain listed keys |",
  "| `required_card_keys` | Each vocab card must contain listed keys |",
  "| `required_report_keys` | Support-pattern report object must contain listed keys |",
  "| `required_forecast_keys` | Forecast object must contain listed keys |",
  "| `required_briefing_keys` | EA briefing object must contain listed keys |",
  "| `required_packet_keys` | Survival-packet object must contain listed keys |",
  "| `ea_coordination_required_keys` | EA coordination sub-object must contain listed keys |",
  "| `schedule_block_required_keys` | Each schedule block must contain listed keys |",
  "| `schema_version` | Schema version field must match expected value |",
  "",
  "### Count / Threshold Validators",
  "",
  "| Assertion | Description |",
  "|---|---|",
  "| `variant_count` | Number of differentiation variants must match |",
  "| `required_variant_types` | Variant type set must include all listed types |",
  "| `min_distinct_instructions` | Minimum number of unique student-facing instruction texts |",
  "| `min_watchpoints` | Minimum transition watchpoints in plan |",
  "| `min_priorities` | Minimum support priorities in plan |",
  "| `min_ea_actions` | Minimum EA actions in plan |",
  "| `min_prep_items` | Minimum prep checklist items in plan |",
  "| `min_vocabulary` | Minimum key vocabulary items |",
  "| `min_visual_cues` | Minimum visual cue suggestions |",
  "| `min_cards` / `max_cards` | Card count bounds |",
  "| `min_themes` | Minimum recurring themes |",
  "| `min_gaps` | Minimum follow-up gaps |",
  "| `min_focus` | Minimum suggested focus items |",
  "| `min_blocks` | Minimum forecast blocks |",
  "| `min_schedule_blocks` | Minimum schedule blocks |",
  "| `min_watch_items` | Minimum watch-list items |",
  "| `min_routines` | Minimum routines |",
  "| `min_student_support` | Minimum student-support entries |",
  "| `min_simplified_day_plan` | Minimum day-plan entries |",
  "| `min_complexity_peaks` | Minimum complexity peaks |",
  "| `min_heads_up` | Minimum heads-up entries |",
  "",
  "### Latency and Model-Tier Validators",
  "",
  "| Assertion | Description |",
  "|---|---|",
  "| `max_latency_ms` | Response must complete within this many milliseconds |",
  "| `model_tier` | Expected model tier (`planning` requires the planning model; `live` requires the live model) |",
  "",
  "### Error / Status Validators",
  "",
  "| Assertion | Description |",
  "|---|---|",
  "| `expected_status` | API must respond with this HTTP status code |",
  "| `expected_error_category` | Error response must include this category |",
  "| `expected_detail_code` | Error response must include this detail code |",
  "| `expected_retryable` | Error response `retryable` field must match |",
  "| `expected_error_substring` | Error response body must contain this substring |",
  "| `expected_report_null` | Report should be null for latest-pattern retrieval |",
  "",
  "### Boolean / Qualitative Validators",
  "",
  "| Assertion | Description |",
  "|---|---|",
  "| `teacher_approved_must_be_false` | Draft `teacher_approved` must be `false` |",
  "| `contains_actionable_instructions` | Packet contains multiple action verbs |",
  "| `uses_observational_language` | Packet uses observational language patterns |",
  "| `family_comms_respects_boundaries` | Family comms entries include boundary-respecting notes |",
  "| `references_intervention_history` | Output references recent intervention history keywords |",
  "| `references_schedule_data` | Output includes time-slot references |",
  "| `student_support_informed_by_scaffolds` | Student support entries include current scaffolds |",
  "| `complexity_peaks_present` | Output includes complexity peaks |",
  "| `student_refs_mentioned` | Listed student names appear in output |",
  "| `ea_name_mentioned` | EA name appears in output |",
  "",
  "### Extract-Specific Assertions",
  "",
  "The extract cases use a different structure with an `assertions` array. Types include:",
  "",
  "| Type | Description |",
  "|---|---|",
  "| `status` | HTTP status matches expected value |",
  "| `has_key` | Response contains the specified key |",
  "| `typeof` | Value at key matches expected type |",
  "| `is_array` | Value at key is an array |",
  "| `min_length` | String value at key meets minimum length |",
  "| `not_contains` | Value at key does not contain the specified substring |",
  "| `max_latency_ms` | Response latency must not exceed the expected millisecond threshold |",
];

export function formatEvalInventoryMarkdown(cases, { generatedDate = new Date().toISOString().slice(0, 10) } = {}) {
  const inventory = buildEvalInventory(cases);
  const lines = [
    "# Eval Inventory",
    "",
    "Reference document for all eval cases in `evals/cases/`.",
    "",
    "_Generated from `evals/cases/*.json`. Do not edit counts or case rows by hand; run `npm run eval:inventory`._",
    "",
    `Generated: ${generatedDate}`,
    "",
    "---",
    "",
    "## Summary Statistics",
    "",
    `**Total eval case files:** ${inventory.totalCases} JSON cases (plus 1 README)`,
    "",
    "*Updated 2026-05-03: inventory is generated from the case files and includes the tool-calling curriculum case, persistence round-trips, retrieval-relevance cases, and cross-feature synthesis checks added after the April 24 worksheet-extraction pass.*",
    "",
    ...formatFamilyTable(inventory),
    "",
    ...formatCategoryTable(inventory),
    "",
    "---",
    "",
    ...formatCaseInventory(inventory),
    "---",
    "",
    ...RUNNER_ASSERTIONS,
    "",
    "---",
    "",
    ...formatCoverageGaps(inventory),
  ];

  return `${lines.join("\n")}\n`;
}

