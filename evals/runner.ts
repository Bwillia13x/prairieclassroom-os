/**
 * PrairieClassroom OS — Eval Runner
 *
 * Executes evaluation suites against the system and produces
 * structured pass/fail results. Sprint 0 version provides
 * the framework; actual test cases are added per feature.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseCaseIdList, selectEvalCases } from "./case-selection";
import type { EvalCase, EvalResult } from "./runner-types";
import {
  validateContent,
  uniqueNormalized,
  checkRequiredKeys,
  inferEndpoint,
  validateModelTier,
  maybeHandleExpectedStatus,
} from "./runner-validators";
import { API_BASE, authHeaders, evalHeaders } from "./runner-config";

// ----- Main -----

const EVAL_OUTPUT_DIR = process.env.EVAL_OUTPUT_DIR;
const EVAL_OUTPUT_BASENAME = process.env.EVAL_OUTPUT_BASENAME ?? new Date().toISOString().replace(/[:.]/g, "-");
const EVAL_SUITE_LABEL = process.env.EVAL_SUITE_LABEL?.trim() || null;
const EVAL_CASE_IDS = parseCaseIdList(process.env.EVAL_CASE_IDS ?? "");
const EVAL_CASE_IDS_FILE = process.env.EVAL_CASE_IDS_FILE?.trim() || "";

async function loadEvalCases(dir: string): Promise<EvalCase[]> {
  const absDir = resolve(dir);
  if (!existsSync(absDir)) return [];
  return readdirSync(absDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const parsed = JSON.parse(readFileSync(join(absDir, f), "utf-8")) as EvalCase;
      return { ...parsed, source_file: join(absDir, f) };
    });
}

async function writeEvalArtifacts(
  results: EvalResult[],
  options: {
    suiteLabel?: string | null;
    selectedCaseIds?: string[];
    availableCaseCount?: number;
  } = {},
): Promise<void> {
  if (!EVAL_OUTPUT_DIR) {
    return;
  }

  const finishedAt = new Date().toISOString();
  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;
  const models = [...new Set(results.map((result) => result.model_id).filter((value): value is string => Boolean(value)))];
  const artifact = {
    generated_at: finishedAt,
    api_base: API_BASE,
    suite_label: options.suiteLabel ?? null,
    selected_case_ids: options.selectedCaseIds ?? [],
    selected_case_count: options.selectedCaseIds?.length ?? results.length,
    available_case_count: options.availableCaseCount ?? results.length,
    total_cases: results.length,
    passed_cases: passed,
    failed_cases: failed,
    models,
    results,
  };
  const summary = {
    generated_at: finishedAt,
    api_base: API_BASE,
    suite_label: options.suiteLabel ?? null,
    selected_case_ids: options.selectedCaseIds ?? [],
    selected_case_count: options.selectedCaseIds?.length ?? results.length,
    available_case_count: options.availableCaseCount ?? results.length,
    total_cases: results.length,
    passed_cases: passed,
    failed_cases: failed,
    models,
    failing_cases: results
      .filter((result) => !result.passed)
      .map((result) => ({
        case_id: result.case_id,
        source_file: result.source_file,
        endpoint: result.endpoint,
        prompt_class: result.prompt_class,
        failures: result.failures,
      })),
  };

  await mkdir(EVAL_OUTPUT_DIR, { recursive: true });
  await writeFile(
    join(EVAL_OUTPUT_DIR, `${EVAL_OUTPUT_BASENAME}-results.json`),
    JSON.stringify(artifact, null, 2),
  );
  await writeFile(
    join(EVAL_OUTPUT_DIR, `${EVAL_OUTPUT_BASENAME}-summary.json`),
    JSON.stringify(summary, null, 2),
  );
}

function resolveSelectedCaseIds(): string[] {
  const combined = [...EVAL_CASE_IDS];
  if (!EVAL_CASE_IDS_FILE) {
    return combined;
  }

  const caseFile = resolve(EVAL_CASE_IDS_FILE);
  if (!existsSync(caseFile)) {
    throw new Error(`EVAL_CASE_IDS_FILE not found: ${caseFile}`);
  }

  return [...new Set([
    ...combined,
    ...parseCaseIdList(readFileSync(caseFile, "utf-8")),
  ])];
}

async function runDifferentiationEval(evalCase: EvalCase): Promise<EvalResult> {
  const failures: string[] = [];
  const input = evalCase.input as Record<string, unknown>;

  const artifact = {
    artifact_id: input.artifact_id as string,
    title: input.artifact_title as string,
    subject: input.artifact_subject as string,
    source_type: "text",
    raw_text: input.artifact_text as string,
    teacher_goal: input.teacher_goal as string | undefined,
  };

  const start = performance.now();

  try {
    const resp = await fetch(`${API_BASE}/api/differentiate`, {
      method: "POST",
      headers: evalHeaders(evalCase, input.classroom_id as string),
      body: JSON.stringify({
        artifact,
        classroom_id: input.classroom_id,
        teacher_goal: input.teacher_goal,
      }),
    });

    const latencyMs = performance.now() - start;

    {
      const expectedResult = await maybeHandleExpectedStatus(resp, evalCase, latencyMs);
      if (expectedResult) {
        return expectedResult;
      }
    }

    const data = await resp.json() as { variants: Record<string, unknown>[]; model_id: string; latency_ms: number };
    const variants = data.variants;

    // Check variant count
    const expectedCount = (evalCase.expected as Record<string, unknown>).variant_count;
    if (expectedCount && variants.length !== expectedCount) {
      failures.push(`Expected ${expectedCount} variants, got ${variants.length}`);
    }

    // Check required variant types
    const expectedTypes = (evalCase.expected as Record<string, unknown>).required_variant_types as string[] | undefined;
    if (expectedTypes) {
      const gotTypes = variants.map((v) => v.variant_type as string);
      for (const t of expectedTypes) {
        if (!gotTypes.includes(t)) failures.push(`Missing variant type: ${t}`);
      }
    }

    const minDistinctInstructions = (evalCase.expected as Record<string, unknown>).min_distinct_instructions as number | undefined;
    if (minDistinctInstructions) {
      const instructions = variants
        .map((variant) => variant.student_facing_instructions)
        .filter((value): value is string => typeof value === "string");
      const distinctInstructions = uniqueNormalized(instructions).length;
      if (distinctInstructions < minDistinctInstructions) {
        failures.push(`Expected at least ${minDistinctInstructions} distinct instruction sets, got ${distinctInstructions}`);
      }
    }

    // Check required keys on each variant
    if (evalCase.expected.required_keys) {
      for (const variant of variants) {
        for (const key of evalCase.expected.required_keys) {
          if (!(key in variant)) {
            failures.push(`Variant ${variant.variant_type} missing key: ${key}`);
          }
        }
      }
    }

    // Check schema version
    if (evalCase.expected.schema_version) {
      for (const variant of variants) {
        if (variant.schema_version !== evalCase.expected.schema_version) {
          failures.push(`Variant ${variant.variant_type} schema_version: expected ${evalCase.expected.schema_version}, got ${variant.schema_version}`);
        }
      }
    }

    // Content checks across all variant text
    const allText = variants.map((v) => JSON.stringify(v)).join(" ");
    failures.push(...validateContent(allText, evalCase.expected));

    // Latency check
    if (evalCase.expected.max_latency_ms && latencyMs > evalCase.expected.max_latency_ms) {
      failures.push(`Latency ${Math.round(latencyMs)}ms exceeds max ${evalCase.expected.max_latency_ms}ms`);
    }

    failures.push(...validateModelTier(data.model_id, evalCase.expected));

    return { case_id: evalCase.id, passed: failures.length === 0, failures, latency_ms: latencyMs, model_id: data.model_id };
  } catch (err) {
    const latencyMs = performance.now() - start;
    failures.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
  }
}

async function runTomorrowPlanEval(evalCase: EvalCase): Promise<EvalResult> {
  const failures: string[] = [];
  const input = evalCase.input as Record<string, unknown>;

  const start = performance.now();

  try {
    const resp = await fetch(`${API_BASE}/api/tomorrow-plan`, {
      method: "POST",
      headers: evalHeaders(evalCase, input.classroom_id as string),
      body: JSON.stringify({
        classroom_id: input.classroom_id,
        teacher_reflection: input.teacher_reflection,
        teacher_goal: input.teacher_goal,
      }),
    });

    const latencyMs = performance.now() - start;

    if (!resp.ok) {
      failures.push(`API returned ${resp.status}: ${await resp.text()}`);
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    const data = await resp.json() as { plan: Record<string, unknown>; thinking_summary: string | null; model_id: string; latency_ms: number };
    const plan = data.plan;

    // Check required plan keys
    if (evalCase.expected.required_plan_keys) {
      for (const key of evalCase.expected.required_plan_keys) {
        if (!(key in plan)) {
          failures.push(`Plan missing required key: ${key}`);
        }
      }
    }

    // Check schema version
    if (evalCase.expected.schema_version && plan.schema_version !== evalCase.expected.schema_version) {
      failures.push(`Schema version mismatch: expected ${evalCase.expected.schema_version}, got ${plan.schema_version}`);
    }

    // Check minimum counts
    const checkMinArray = (field: string, min: number | undefined, label: string) => {
      if (min === undefined) return;
      const arr = plan[field];
      const len = Array.isArray(arr) ? arr.length : 0;
      if (len < min) {
        failures.push(`Expected at least ${min} ${label}, got ${len}`);
      }
    };

    checkMinArray("transition_watchpoints", evalCase.expected.min_watchpoints, "transition watchpoints");
    checkMinArray("support_priorities", evalCase.expected.min_priorities, "support priorities");
    checkMinArray("ea_actions", evalCase.expected.min_ea_actions, "EA actions");
    checkMinArray("prep_checklist", evalCase.expected.min_prep_items, "prep checklist items");

    // Content checks across all plan text
    const allText = JSON.stringify(plan);
    failures.push(...validateContent(allText, evalCase.expected));

    // Latency check
    if (evalCase.expected.max_latency_ms && latencyMs > evalCase.expected.max_latency_ms) {
      failures.push(`Latency ${Math.round(latencyMs)}ms exceeds max ${evalCase.expected.max_latency_ms}ms`);
    }

    failures.push(...validateModelTier(data.model_id, evalCase.expected));

    return { case_id: evalCase.id, passed: failures.length === 0, failures, latency_ms: latencyMs, model_id: data.model_id };
  } catch (err) {
    const latencyMs = performance.now() - start;
    failures.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
  }
}

async function runFamilyMessageEval(evalCase: EvalCase): Promise<EvalResult> {
  const failures: string[] = [];
  const input = evalCase.input as Record<string, unknown>;

  const start = performance.now();

  try {
    const resp = await fetch(`${API_BASE}/api/family-message`, {
      method: "POST",
      headers: evalHeaders(evalCase, input.classroom_id as string),
      body: JSON.stringify({
        classroom_id: input.classroom_id,
        student_refs: input.student_refs,
        message_type: input.message_type,
        target_language: input.target_language,
        context: input.context,
      }),
    });

    const latencyMs = performance.now() - start;

    if (!resp.ok) {
      failures.push(`API returned ${resp.status}: ${await resp.text()}`);
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    const data = (await resp.json()) as {
      draft: Record<string, unknown>;
      model_id: string;
      latency_ms: number;
    };
    const draft = data.draft;

    // Check required message keys
    const requiredKeys = (evalCase.expected as Record<string, unknown>)
      .required_message_keys as string[] | undefined;
    if (requiredKeys) {
      for (const key of requiredKeys) {
        if (!(key in draft)) {
          failures.push(`Draft missing required key: ${key}`);
        }
      }
    }

    // Check schema version
    if (evalCase.expected.schema_version && draft.schema_version !== evalCase.expected.schema_version) {
      failures.push(
        `Schema version mismatch: expected ${evalCase.expected.schema_version}, got ${draft.schema_version}`,
      );
    }

    // Check teacher_approved is false
    if (
      (evalCase.expected as Record<string, unknown>).teacher_approved_must_be_false &&
      draft.teacher_approved !== false
    ) {
      failures.push(`teacher_approved should be false, got ${draft.teacher_approved}`);
    }

    // Content checks
    const allText = JSON.stringify(draft);
    failures.push(...validateContent(allText, evalCase.expected));

    // Latency check
    if (evalCase.expected.max_latency_ms && latencyMs > evalCase.expected.max_latency_ms) {
      failures.push(
        `Latency ${Math.round(latencyMs)}ms exceeds max ${evalCase.expected.max_latency_ms}ms`,
      );
    }

    return {
      case_id: evalCase.id,
      passed: failures.length === 0,
      failures,
      latency_ms: latencyMs,
    };
  } catch (err) {
    const latencyMs = performance.now() - start;
    failures.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
  }
}

async function runInterventionEval(evalCase: EvalCase): Promise<EvalResult> {
  const failures: string[] = [];
  const input = evalCase.input as Record<string, unknown>;

  const start = performance.now();

  try {
    const resp = await fetch(`${API_BASE}/api/intervention`, {
      method: "POST",
      headers: evalHeaders(evalCase, input.classroom_id as string),
      body: JSON.stringify({
        classroom_id: input.classroom_id,
        student_refs: input.student_refs,
        teacher_note: input.teacher_note,
        context: input.context,
      }),
    });

    const latencyMs = performance.now() - start;

    if (!resp.ok) {
      failures.push(`API returned ${resp.status}: ${await resp.text()}`);
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    const data = (await resp.json()) as {
      record: Record<string, unknown>;
      model_id: string;
      latency_ms: number;
    };
    const record = data.record;

    // Check required intervention keys
    const requiredKeys = (evalCase.expected as Record<string, unknown>)
      .required_intervention_keys as string[] | undefined;
    if (requiredKeys) {
      for (const key of requiredKeys) {
        if (!(key in record)) {
          failures.push(`Record missing required key: ${key}`);
        }
      }
    }

    // Check schema version
    if (evalCase.expected.schema_version && record.schema_version !== evalCase.expected.schema_version) {
      failures.push(
        `Schema version mismatch: expected ${evalCase.expected.schema_version}, got ${record.schema_version}`,
      );
    }

    // Content checks
    const allText = JSON.stringify(record);
    failures.push(...validateContent(allText, evalCase.expected));

    // Latency check
    if (evalCase.expected.max_latency_ms && latencyMs > evalCase.expected.max_latency_ms) {
      failures.push(
        `Latency ${Math.round(latencyMs)}ms exceeds max ${evalCase.expected.max_latency_ms}ms`,
      );
    }

    return {
      case_id: evalCase.id,
      passed: failures.length === 0,
      failures,
      latency_ms: latencyMs,
    };
  } catch (err) {
    const latencyMs = performance.now() - start;
    failures.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
  }
}

// ─── Simplify evaluation ────────────────────────────────────────────────────

async function runSimplifyEval(evalCase: EvalCase): Promise<EvalResult> {
  const failures: string[] = [];
  const input = evalCase.input as Record<string, unknown>;
  const start = performance.now();

  try {
    const resp = await fetch(`${API_BASE}/api/simplify`, {
      method: "POST",
      headers: evalHeaders(evalCase, input.classroom_id as string),
      body: JSON.stringify({
        source_text: input.source_text,
        grade_band: input.grade_band,
        eal_level: input.eal_level,
      }),
    });

    const latencyMs = performance.now() - start;

    if (!resp.ok) {
      failures.push(`API returned ${resp.status}: ${await resp.text()}`);
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    const data = (await resp.json()) as {
      simplified: Record<string, unknown>;
      model_id: string;
      latency_ms: number;
    };
    const simplified = data.simplified;

    // Check required simplified keys
    const requiredKeys = (evalCase.expected as Record<string, unknown>)
      .required_simplified_keys as string[] | undefined;
    if (requiredKeys) {
      for (const key of requiredKeys) {
        if (!(key in simplified)) {
          failures.push(`Simplified output missing required key: ${key}`);
        }
      }
    }

    // Check schema version
    if (evalCase.expected.schema_version && simplified.schema_version !== evalCase.expected.schema_version) {
      failures.push(
        `Schema version mismatch: expected ${evalCase.expected.schema_version}, got ${simplified.schema_version}`,
      );
    }

    // Check min vocabulary
    const minVocab = (evalCase.expected as Record<string, unknown>).min_vocabulary as number | undefined;
    if (minVocab && Array.isArray(simplified.key_vocabulary)) {
      if (simplified.key_vocabulary.length < minVocab) {
        failures.push(
          `key_vocabulary has ${simplified.key_vocabulary.length} items, expected at least ${minVocab}`,
        );
      }
    }

    // Check min visual cues
    const minCues = (evalCase.expected as Record<string, unknown>).min_visual_cues as number | undefined;
    if (minCues && Array.isArray(simplified.visual_cue_suggestions)) {
      if (simplified.visual_cue_suggestions.length < minCues) {
        failures.push(
          `visual_cue_suggestions has ${simplified.visual_cue_suggestions.length} items, expected at least ${minCues}`,
        );
      }
    }

    // Content safety checks
    const allText = JSON.stringify(simplified);
    failures.push(...validateContent(allText, evalCase.expected));

    // Latency check
    if (evalCase.expected.max_latency_ms && latencyMs > evalCase.expected.max_latency_ms) {
      failures.push(
        `Latency ${Math.round(latencyMs)}ms exceeds max ${evalCase.expected.max_latency_ms}ms`,
      );
    }

    return {
      case_id: evalCase.id,
      passed: failures.length === 0,
      failures,
      latency_ms: latencyMs,
    };
  } catch (err) {
    const latencyMs = performance.now() - start;
    failures.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
  }
}

// ─── Vocab cards evaluation ─────────────────────────────────────────────────

async function runVocabCardsEval(evalCase: EvalCase): Promise<EvalResult> {
  const failures: string[] = [];
  const input = evalCase.input as Record<string, unknown>;
  const start = performance.now();

  try {
    const resp = await fetch(`${API_BASE}/api/vocab-cards`, {
      method: "POST",
      headers: evalHeaders(evalCase, input.classroom_id as string),
      body: JSON.stringify({
        artifact_id: input.artifact_id,
        artifact_text: input.artifact_text,
        subject: input.subject,
        target_language: input.target_language,
        grade_band: input.grade_band,
      }),
    });

    const latencyMs = performance.now() - start;

    if (!resp.ok) {
      failures.push(`API returned ${resp.status}: ${await resp.text()}`);
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    const data = (await resp.json()) as {
      card_set: Record<string, unknown>;
      model_id: string;
      latency_ms: number;
    };
    const cardSet = data.card_set;

    // Check required card set keys
    const requiredSetKeys = (evalCase.expected as Record<string, unknown>)
      .required_cardset_keys as string[] | undefined;
    if (requiredSetKeys) {
      for (const key of requiredSetKeys) {
        if (!(key in cardSet)) {
          failures.push(`Card set missing required key: ${key}`);
        }
      }
    }

    // Check schema version
    if (evalCase.expected.schema_version && cardSet.schema_version !== evalCase.expected.schema_version) {
      failures.push(
        `Schema version mismatch: expected ${evalCase.expected.schema_version}, got ${cardSet.schema_version}`,
      );
    }

    // Check card count and required card keys
    const cards = Array.isArray(cardSet.cards) ? cardSet.cards as Record<string, unknown>[] : [];

    const minCards = (evalCase.expected as Record<string, unknown>).min_cards as number | undefined;
    if (minCards && cards.length < minCards) {
      failures.push(`Card set has ${cards.length} cards, expected at least ${minCards}`);
    }

    const maxCards = (evalCase.expected as Record<string, unknown>).max_cards as number | undefined;
    if (maxCards && cards.length > maxCards) {
      failures.push(`Card set has ${cards.length} cards, expected at most ${maxCards}`);
    }

    const requiredCardKeys = (evalCase.expected as Record<string, unknown>)
      .required_card_keys as string[] | undefined;
    if (requiredCardKeys) {
      for (let i = 0; i < cards.length; i++) {
        for (const key of requiredCardKeys) {
          if (!(key in cards[i])) {
            failures.push(`Card ${i} missing required key: ${key}`);
          }
        }
      }
    }

    // Content safety checks
    const allText = JSON.stringify(cardSet);
    failures.push(...validateContent(allText, evalCase.expected));

    // Latency check
    if (evalCase.expected.max_latency_ms && latencyMs > evalCase.expected.max_latency_ms) {
      failures.push(
        `Latency ${Math.round(latencyMs)}ms exceeds max ${evalCase.expected.max_latency_ms}ms`,
      );
    }

    return {
      case_id: evalCase.id,
      passed: failures.length === 0,
      failures,
      latency_ms: latencyMs,
    };
  } catch (err) {
    const latencyMs = performance.now() - start;
    failures.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
  }
}

// ─── Support patterns evaluation ──────────────────────────────────────────────

async function runSupportPatternsEval(evalCase: EvalCase): Promise<EvalResult> {
  const failures: string[] = [];
  const input = evalCase.input as Record<string, unknown>;
  const start = performance.now();

  try {
    const resp = await fetch(`${API_BASE}/api/support-patterns`, {
      method: "POST",
      headers: evalHeaders(evalCase, input.classroom_id as string),
      body: JSON.stringify({
        classroom_id: input.classroom_id,
        student_filter: input.student_filter,
        time_window: input.time_window,
      }),
    });

    const latencyMs = performance.now() - start;

    if (!resp.ok) {
      failures.push(`API returned ${resp.status}: ${await resp.text()}`);
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    const data = (await resp.json()) as {
      report: Record<string, unknown>;
      thinking_summary: string | null;
      model_id: string;
      latency_ms: number;
    };
    const report = data.report;

    // Check required report keys
    const requiredKeys = (evalCase.expected as Record<string, unknown>)
      .required_report_keys as string[] | undefined;
    if (requiredKeys) {
      for (const key of requiredKeys) {
        if (!(key in report)) {
          failures.push(`Report missing required key: ${key}`);
        }
      }
    }

    // Check schema version
    if (evalCase.expected.schema_version && report.schema_version !== evalCase.expected.schema_version) {
      failures.push(
        `Schema version mismatch: expected ${evalCase.expected.schema_version}, got ${report.schema_version}`,
      );
    }

    // Check minimum counts
    const checkMinArray = (field: string, min: number | undefined, label: string) => {
      if (min === undefined) return;
      const arr = report[field];
      const len = Array.isArray(arr) ? arr.length : 0;
      if (len < min) {
        failures.push(`Expected at least ${min} ${label}, got ${len}`);
      }
    };

    checkMinArray("recurring_themes", (evalCase.expected as Record<string, unknown>).min_themes as number | undefined, "recurring themes");
    checkMinArray("follow_up_gaps", (evalCase.expected as Record<string, unknown>).min_gaps as number | undefined, "follow-up gaps");
    checkMinArray("suggested_focus", (evalCase.expected as Record<string, unknown>).min_focus as number | undefined, "suggested focus items");

    // Content checks
    const allText = JSON.stringify(report);
    failures.push(...validateContent(allText, evalCase.expected));

    // Latency check
    if (evalCase.expected.max_latency_ms && latencyMs > evalCase.expected.max_latency_ms) {
      failures.push(
        `Latency ${Math.round(latencyMs)}ms exceeds max ${evalCase.expected.max_latency_ms}ms`,
      );
    }

    failures.push(...validateModelTier(data.model_id, evalCase.expected));

    return {
      case_id: evalCase.id,
      passed: failures.length === 0,
      failures,
      latency_ms: latencyMs,
      model_id: data.model_id,
    };
  } catch (err) {
    const latencyMs = performance.now() - start;
    failures.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
  }
}

// ─── Latest pattern retrieval evaluation ─────────────────────────────────────

async function runLatestPatternEval(evalCase: EvalCase): Promise<EvalResult> {
  const failures: string[] = [];
  const input = evalCase.input as Record<string, unknown>;
  const start = performance.now();

  try {
    const resp = await fetch(
      `${API_BASE}/api/support-patterns/latest/${input.classroom_id}`,
      { headers: evalHeaders(evalCase, input.classroom_id as string) },
    );

    const latencyMs = performance.now() - start;

    {
      const expectedResult = await maybeHandleExpectedStatus(resp, evalCase, latencyMs);
      if (expectedResult) {
        return expectedResult;
      }
    }

    const data = (await resp.json()) as { report: Record<string, unknown> | null };

    if (!data.report) {
      if (evalCase.expected.expected_report_null) {
        return { case_id: evalCase.id, passed: true, failures, latency_ms: latencyMs };
      }
      failures.push("No pattern report found — expected a persisted report from earlier eval");
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    const report = data.report;

    // Check required report keys
    const requiredKeys = (evalCase.expected as Record<string, unknown>)
      .required_report_keys as string[] | undefined;
    if (requiredKeys) {
      for (const key of requiredKeys) {
        if (!(key in report)) {
          failures.push(`Report missing required key: ${key}`);
        }
      }
    }

    // Check schema version
    if (evalCase.expected.schema_version && report.schema_version !== evalCase.expected.schema_version) {
      failures.push(
        `Schema version mismatch: expected ${evalCase.expected.schema_version}, got ${report.schema_version}`,
      );
    }

    // Latency check
    if (evalCase.expected.max_latency_ms && latencyMs > evalCase.expected.max_latency_ms) {
      failures.push(
        `Latency ${Math.round(latencyMs)}ms exceeds max ${evalCase.expected.max_latency_ms}ms`,
      );
    }

    return {
      case_id: evalCase.id,
      passed: failures.length === 0,
      failures,
      latency_ms: latencyMs,
    };
  } catch (err) {
    const latencyMs = performance.now() - start;
    failures.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
  }
}

// ─── EA briefing evaluation ────────────────────────────────────────────────

async function runEABriefingEval(evalCase: EvalCase): Promise<EvalResult> {
  const failures: string[] = [];
  const input = evalCase.input as Record<string, unknown>;
  const start = performance.now();

  try {
    const resp = await fetch(`${API_BASE}/api/ea-briefing`, {
      method: "POST",
      headers: evalHeaders(evalCase, input.classroom_id as string),
      body: JSON.stringify({
        classroom_id: input.classroom_id,
        ea_name: input.ea_name,
      }),
    });

    const latencyMs = performance.now() - start;

    if (!resp.ok) {
      failures.push(`API returned ${resp.status}: ${await resp.text()}`);
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    const data = (await resp.json()) as {
      briefing: Record<string, unknown>;
      model_id: string;
      latency_ms: number;
    };
    const briefing = data.briefing;

    // Check required briefing keys
    const requiredKeys = (evalCase.expected as Record<string, unknown>)
      .required_briefing_keys as string[] | undefined;
    if (requiredKeys) {
      for (const key of requiredKeys) {
        if (!(key in briefing)) {
          failures.push(`Briefing missing required key: ${key}`);
        }
      }
    }

    // Check schema version
    if (evalCase.expected.schema_version && briefing.schema_version !== evalCase.expected.schema_version) {
      failures.push(
        `Schema version mismatch: expected ${evalCase.expected.schema_version}, got ${briefing.schema_version}`,
      );
    }

    // Check minimum counts
    const minBlocks = (evalCase.expected as Record<string, unknown>).min_schedule_blocks as number | undefined;
    if (minBlocks) {
      const blocks = Array.isArray(briefing.schedule_blocks) ? briefing.schedule_blocks.length : 0;
      if (blocks < minBlocks) {
        failures.push(`Expected at least ${minBlocks} schedule blocks, got ${blocks}`);
      }
    }

    const minWatch = (evalCase.expected as Record<string, unknown>).min_watch_items as number | undefined;
    if (minWatch) {
      const items = Array.isArray(briefing.student_watch_list) ? briefing.student_watch_list.length : 0;
      if (items < minWatch) {
        failures.push(`Expected at least ${minWatch} watch list items, got ${items}`);
      }
    }

    // Content checks
    const allText = JSON.stringify(briefing);
    failures.push(...validateContent(allText, evalCase.expected));

    // Latency check
    if (evalCase.expected.max_latency_ms && latencyMs > evalCase.expected.max_latency_ms) {
      failures.push(
        `Latency ${Math.round(latencyMs)}ms exceeds max ${evalCase.expected.max_latency_ms}ms`,
      );
    }

    failures.push(...validateModelTier(data.model_id, evalCase.expected));

    return {
      case_id: evalCase.id,
      passed: failures.length === 0,
      failures,
      latency_ms: latencyMs,
      model_id: data.model_id,
    };
  } catch (err) {
    const latencyMs = performance.now() - start;
    failures.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
  }
}

// --- Complexity forecast evaluation ---

async function runComplexityForecastEval(evalCase: EvalCase): Promise<EvalResult> {
  const failures: string[] = [];
  const input = evalCase.input as Record<string, unknown>;
  const start = performance.now();

  try {
    const resp = await fetch(`${API_BASE}/api/complexity-forecast`, {
      method: "POST",
      headers: evalHeaders(evalCase, input.classroom_id as string),
      body: JSON.stringify({
        classroom_id: input.classroom_id,
        forecast_date: input.forecast_date,
        teacher_notes: input.teacher_notes,
      }),
    });

    const latencyMs = performance.now() - start;

    if (!resp.ok) {
      failures.push(`API returned ${resp.status}: ${await resp.text()}`);
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    const data = (await resp.json()) as {
      forecast: Record<string, unknown>;
      thinking_summary: string | null;
      model_id: string;
      latency_ms: number;
    };
    const forecast = data.forecast;

    // Check required forecast keys
    const requiredKeys = (evalCase.expected as Record<string, unknown>)
      .required_forecast_keys as string[] | undefined;
    if (requiredKeys) {
      for (const key of requiredKeys) {
        if (!(key in forecast)) {
          failures.push(`Forecast missing required key: ${key}`);
        }
      }
    }

    // Check schema version
    if (evalCase.expected.schema_version && forecast.schema_version !== evalCase.expected.schema_version) {
      failures.push(
        `Schema version mismatch: expected ${evalCase.expected.schema_version}, got ${forecast.schema_version}`,
      );
    }

    // Check minimum blocks
    const minBlocks = (evalCase.expected as Record<string, unknown>).min_blocks as number | undefined;
    if (minBlocks) {
      const blocks = Array.isArray(forecast.blocks) ? forecast.blocks.length : 0;
      if (blocks < minBlocks) {
        failures.push(`Expected at least ${minBlocks} forecast blocks, got ${blocks}`);
      }
    }

    // Content checks
    const allText = JSON.stringify(forecast);
    failures.push(...validateContent(allText, evalCase.expected));

    // Latency check
    if (evalCase.expected.max_latency_ms && latencyMs > evalCase.expected.max_latency_ms) {
      failures.push(
        `Latency ${Math.round(latencyMs)}ms exceeds max ${evalCase.expected.max_latency_ms}ms`,
      );
    }

    return {
      case_id: evalCase.id,
      passed: failures.length === 0,
      failures,
      latency_ms: latencyMs,
      model_id: data.model_id,
    };
  } catch (err) {
    const latencyMs = performance.now() - start;
    failures.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
  }
}

// --- Debt register evaluation ---

async function runDebtRegisterEval(evalCase: EvalCase): Promise<EvalResult> {
  const failures: string[] = [];
  const input = evalCase.input as Record<string, unknown>;
  const classroomId = input.classroom_id as string;
  const start = performance.now();

  try {
    // Build query string from optional threshold overrides in the eval input
    const queryParams = new URLSearchParams();
    for (const key of ["stale_followup_days", "unapproved_message_days", "recurring_plan_min", "review_window_days", "review_min_records"]) {
      if (input[key] !== undefined) queryParams.set(key, String(input[key]));
    }
    const qs = queryParams.toString();
    const url = `${API_BASE}/api/debt-register/${classroomId}${qs ? `?${qs}` : ""}`;

    const resp = await fetch(url, {
      method: "GET",
      headers: evalHeaders(evalCase, classroomId),
    });

    const latencyMs = performance.now() - start;

    if (!resp.ok) {
      failures.push(`API returned ${resp.status}: ${await resp.text()}`);
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    const data = (await resp.json()) as {
      register: Record<string, unknown>;
    };
    const register = data.register;

    // Check required keys
    if (evalCase.expected.required_keys) {
      for (const key of evalCase.expected.required_keys) {
        if (!(key in register)) {
          failures.push(`Register missing required key: ${key}`);
        }
      }
    }

    // Check schema version
    if (evalCase.expected.schema_version && register.schema_version !== evalCase.expected.schema_version) {
      failures.push(
        `Schema version mismatch: expected ${evalCase.expected.schema_version}, got ${register.schema_version}`,
      );
    }

    // Content checks
    const allText = JSON.stringify(register);
    failures.push(...validateContent(allText, evalCase.expected));

    // Latency check
    if (evalCase.expected.max_latency_ms && latencyMs > evalCase.expected.max_latency_ms) {
      failures.push(
        `Latency ${Math.round(latencyMs)}ms exceeds max ${evalCase.expected.max_latency_ms}ms`,
      );
    }

    return {
      case_id: evalCase.id,
      passed: failures.length === 0,
      failures,
      latency_ms: latencyMs,
    };
  } catch (err) {
    const latencyMs = performance.now() - start;
    failures.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
  }
}

// --- Scaffold decay evaluation ---

async function runScaffoldDecayEval(evalCase: EvalCase): Promise<EvalResult> {
  const failures: string[] = [];
  const input = evalCase.input as Record<string, unknown>;
  const start = performance.now();

  try {
    const resp = await fetch(`${API_BASE}/api/scaffold-decay`, {
      method: "POST",
      headers: evalHeaders(evalCase, input.classroom_id as string),
      body: JSON.stringify({
        classroom_id: input.classroom_id,
        student_ref: input.student_ref,
        time_window: input.time_window ?? 20,
      }),
    });

    const latencyMs = performance.now() - start;

    if (!resp.ok) {
      failures.push(`API returned ${resp.status}: ${await resp.text()}`);
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    const data = (await resp.json()) as {
      report: Record<string, unknown> | null;
      insufficient_records?: boolean;
      record_count?: number;
      message?: string;
      thinking_summary?: string | null;
      model_id?: string;
      latency_ms?: number;
    };

    // For insufficient records, check against message content
    if (data.insufficient_records) {
      const allText = JSON.stringify(data);
      failures.push(...validateContent(allText, evalCase.expected));

      // If the eval expected schema keys on a report, that's a mismatch
      // (unless the eval specifically tests the insufficient case)
      if (evalCase.expected.required_keys && !evalCase.expected.must_contain?.some((s) => s.includes("Not enough"))) {
        failures.push(`Got insufficient_records response (${data.record_count} records) — expected a full report`);
      }
    } else if (data.report) {
      const report = data.report;

      // Check required keys
      if (evalCase.expected.required_keys) {
        for (const key of evalCase.expected.required_keys) {
          if (!(key in report)) {
            failures.push(`Report missing required key: ${key}`);
          }
        }
      }

      // Check schema version
      if (evalCase.expected.schema_version && report.schema_version !== evalCase.expected.schema_version) {
        failures.push(
          `Schema version mismatch: expected ${evalCase.expected.schema_version}, got ${report.schema_version}`,
        );
      }

      // Content checks
      const allText = JSON.stringify(report);
      failures.push(...validateContent(allText, evalCase.expected));
    }

    // Latency check
    if (evalCase.expected.max_latency_ms && latencyMs > evalCase.expected.max_latency_ms) {
      failures.push(
        `Latency ${Math.round(latencyMs)}ms exceeds max ${evalCase.expected.max_latency_ms}ms`,
      );
    }

    return {
      case_id: evalCase.id,
      passed: failures.length === 0,
      failures,
      latency_ms: latencyMs,
    };
  } catch (err) {
    const latencyMs = performance.now() - start;
    failures.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
  }
}

// --- Schedule evaluation ---

async function runScheduleEval(evalCase: EvalCase): Promise<EvalResult> {
  const failures: string[] = [];
  const input = evalCase.input as Record<string, unknown>;
  const classroomId = input.classroom_id as string;
  const endpoint = evalCase.endpoint ?? "GET /api/classrooms/:id/schedule";
  const method = endpoint.startsWith("PUT ") ? "PUT" : "GET";
  const start = performance.now();
  let originalState: Record<string, unknown> | null = null;

  try {
    if (method === "PUT") {
      const restoreResp = await fetch(`${API_BASE}/api/classrooms/${classroomId}/schedule`, {
        method: "GET",
      });
      if (restoreResp.ok) {
        originalState = (await restoreResp.json()) as Record<string, unknown>;
      }
    }

    const response = await fetch(`${API_BASE}/api/classrooms/${classroomId}/schedule`, {
      method,
      headers: evalHeaders(evalCase, classroomId),
      body: method === "PUT" ? JSON.stringify(input.body ?? {}) : undefined,
    });

    const latencyMs = performance.now() - start;
    const raw = await response.text();
    const data = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    const expectedStatus = (evalCase.expected as Record<string, unknown>).status as number | undefined;

    if (expectedStatus !== undefined && response.status !== expectedStatus) {
      failures.push(`Expected status ${expectedStatus}, got ${response.status}`);
    }

    if (!response.ok) {
      failures.push(`API returned ${response.status}: ${raw}`);
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    if (evalCase.expected.required_keys) {
      failures.push(...checkRequiredKeys(data, evalCase.expected.required_keys, "Schedule response"));
    }

    const updated = (evalCase.expected as Record<string, unknown>).updated as boolean | undefined;
    if (updated !== undefined && data.updated !== updated) {
      failures.push(`Expected updated=${updated}, got ${JSON.stringify(data.updated)}`);
    }

    const schedule = Array.isArray(data.schedule) ? data.schedule : [];
    const minBlocks = (evalCase.expected as Record<string, unknown>).schedule_min_blocks as number | undefined;
    if (minBlocks !== undefined && schedule.length < minBlocks) {
      failures.push(`Expected at least ${minBlocks} schedule blocks, got ${schedule.length}`);
    }

    const blockRequiredKeys = (evalCase.expected as Record<string, unknown>).schedule_block_required_keys as string[] | undefined;
    if (blockRequiredKeys) {
      schedule.forEach((block, index) => {
        if (!block || typeof block !== "object") {
          failures.push(`Schedule block ${index} is not an object`);
          return;
        }
        failures.push(...checkRequiredKeys(block as Record<string, unknown>, blockRequiredKeys, `Schedule block ${index}`));
      });
    }

    const subReadyType = (evalCase.expected as Record<string, unknown>).sub_ready_type as string | undefined;
    if (subReadyType && typeof data.sub_ready !== subReadyType) {
      failures.push(`Expected sub_ready to be ${subReadyType}, got ${typeof data.sub_ready}`);
    }

    const allText = JSON.stringify(data);
    failures.push(...validateContent(allText, evalCase.expected));

    if (evalCase.expected.max_latency_ms && latencyMs > evalCase.expected.max_latency_ms) {
      failures.push(`Latency ${Math.round(latencyMs)}ms exceeds max ${evalCase.expected.max_latency_ms}ms`);
    }

    return {
      case_id: evalCase.id,
      passed: failures.length === 0,
      failures,
      latency_ms: latencyMs,
    };
  } catch (err) {
    const latencyMs = performance.now() - start;
    failures.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
  } finally {
    if (method === "PUT" && originalState) {
      const restorePayload: Record<string, unknown> = {
        schedule: originalState.schedule,
      };
      if ("upcoming_events" in originalState) {
        restorePayload.upcoming_events = originalState.upcoming_events;
      }
      await fetch(`${API_BASE}/api/classrooms/${classroomId}/schedule`, {
        method: "PUT",
        headers: {
          ...evalHeaders(evalCase, classroomId),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(restorePayload),
      }).catch(() => undefined);
    }
  }
}

// --- Survival packet evaluation ---

async function runSurvivalPacketEval(evalCase: EvalCase): Promise<EvalResult> {
  const failures: string[] = [];
  const input = evalCase.input as Record<string, unknown>;
  const start = performance.now();

  try {
    const resp = await fetch(`${API_BASE}/api/survival-packet`, {
      method: "POST",
      headers: evalHeaders(evalCase, input.classroom_id as string),
      body: JSON.stringify({
        classroom_id: input.classroom_id,
        target_date: input.target_date,
        teacher_notes: input.teacher_notes,
      }),
    });

    const latencyMs = performance.now() - start;

    if (!resp.ok) {
      failures.push(`API returned ${resp.status}: ${await resp.text()}`);
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    const data = (await resp.json()) as {
      packet: Record<string, unknown>;
      thinking_summary: string | null;
      model_id: string;
      latency_ms: number;
    };
    const packet = data.packet;
    const allText = JSON.stringify(packet);

    const requiredPacketKeys = (evalCase.expected as Record<string, unknown>).required_packet_keys as string[] | undefined;
    if (requiredPacketKeys) {
      failures.push(...checkRequiredKeys(packet, requiredPacketKeys, "Survival packet"));
    }

    if (evalCase.expected.schema_version && packet.schema_version !== evalCase.expected.schema_version) {
      failures.push(`Schema version mismatch: expected ${evalCase.expected.schema_version}, got ${packet.schema_version}`);
    }

    const minRoutines = (evalCase.expected as Record<string, unknown>).min_routines as number | undefined;
    if (minRoutines !== undefined) {
      const routines = Array.isArray(packet.routines) ? packet.routines : [];
      if (routines.length < minRoutines) {
        failures.push(`Expected at least ${minRoutines} routines, got ${routines.length}`);
      }
    }

    const minStudentSupport = (evalCase.expected as Record<string, unknown>).min_student_support as number | undefined;
    if (minStudentSupport !== undefined) {
      const studentSupport = Array.isArray(packet.student_support) ? packet.student_support : [];
      if (studentSupport.length < minStudentSupport) {
        failures.push(`Expected at least ${minStudentSupport} student_support entries, got ${studentSupport.length}`);
      }
    }

    const eaCoordinationRequiredKeys = (evalCase.expected as Record<string, unknown>).ea_coordination_required_keys as string[] | undefined;
    if (eaCoordinationRequiredKeys) {
      if (!packet.ea_coordination || typeof packet.ea_coordination !== "object") {
        failures.push("Survival packet missing ea_coordination object");
      } else {
        failures.push(...checkRequiredKeys(packet.ea_coordination as Record<string, unknown>, eaCoordinationRequiredKeys, "ea_coordination"));
      }
    }

    const minSimplifiedDayPlan = (evalCase.expected as Record<string, unknown>).min_simplified_day_plan as number | undefined;
    if (minSimplifiedDayPlan !== undefined) {
      const dayPlan = Array.isArray(packet.simplified_day_plan) ? packet.simplified_day_plan : [];
      if (dayPlan.length < minSimplifiedDayPlan) {
        failures.push(`Expected at least ${minSimplifiedDayPlan} simplified_day_plan entries, got ${dayPlan.length}`);
      }
    }

    const minComplexityPeaks = (evalCase.expected as Record<string, unknown>).min_complexity_peaks as number | undefined;
    if (minComplexityPeaks !== undefined) {
      const peaks = Array.isArray(packet.complexity_peaks) ? packet.complexity_peaks : [];
      if (peaks.length < minComplexityPeaks) {
        failures.push(`Expected at least ${minComplexityPeaks} complexity_peaks, got ${peaks.length}`);
      }
    }

    const minHeadsUp = (evalCase.expected as Record<string, unknown>).min_heads_up as number | undefined;
    if (minHeadsUp !== undefined) {
      const headsUp = Array.isArray(packet.heads_up) ? packet.heads_up : [];
      if (headsUp.length < minHeadsUp) {
        failures.push(`Expected at least ${minHeadsUp} heads_up entries, got ${headsUp.length}`);
      }
    }

    const studentRefsMentioned = (evalCase.expected as Record<string, unknown>).student_refs_mentioned as string[] | undefined;
    if (studentRefsMentioned) {
      for (const studentRef of studentRefsMentioned) {
        if (!allText.includes(studentRef)) {
          failures.push(`Expected survival packet to mention ${studentRef}`);
        }
      }
    }

    const eaNameMentioned = (evalCase.expected as Record<string, unknown>).ea_name_mentioned as string | undefined;
    if (eaNameMentioned && !allText.includes(eaNameMentioned)) {
      failures.push(`Expected survival packet to mention EA name ${eaNameMentioned}`);
    }

    const containsActionableInstructions = (evalCase.expected as Record<string, unknown>).contains_actionable_instructions as boolean | undefined;
    if (containsActionableInstructions) {
      const actionVerbMatches = allText.match(/\b(use|give|keep|set|provide|post|check|offer|meet|point|let|clip|brief|avoid|prepare|have)\b/gi) ?? [];
      if (actionVerbMatches.length < 3) {
        failures.push("Expected substitute packet to contain multiple actionable instructions");
      }
    }

    const usesObservationalLanguage = (evalCase.expected as Record<string, unknown>).uses_observational_language as boolean | undefined;
    if (usesObservationalLanguage) {
      const observationalPatterns = [
        "benefits from",
        "needs",
        "works best",
        "responds to",
        "when",
        "during",
      ];
      if (!observationalPatterns.some((pattern) => allText.toLowerCase().includes(pattern))) {
        failures.push("Expected observational language markers in survival packet");
      }
    }

    const familyCommsRespectsBoundaries = (evalCase.expected as Record<string, unknown>).family_comms_respects_boundaries as boolean | undefined;
    if (familyCommsRespectsBoundaries) {
      const familyComms = Array.isArray(packet.family_comms) ? packet.family_comms : [];
      if (familyComms.length === 0) {
        failures.push("Expected family_comms entries in survival packet");
      } else {
        for (const [index, entry] of familyComms.entries()) {
          if (!entry || typeof entry !== "object") {
            failures.push(`family_comms[${index}] is not an object`);
            continue;
          }
          if (typeof (entry as Record<string, unknown>).notes !== "string" || !(entry as Record<string, unknown>).notes) {
            failures.push(`family_comms[${index}] must include notes`);
          }
        }
      }
    }

    const referencesInterventionHistory = (evalCase.expected as Record<string, unknown>).references_intervention_history as boolean | undefined;
    if (referencesInterventionHistory) {
      const historyPatterns = ["recent", "history", "follow-up", "records show", "this week", "last"];
      if (!historyPatterns.some((pattern) => allText.toLowerCase().includes(pattern))) {
        failures.push("Expected survival packet to reference recent history or follow-up context");
      }
    }

    const referencesScheduleData = (evalCase.expected as Record<string, unknown>).references_schedule_data as boolean | undefined;
    if (referencesScheduleData) {
      const dayPlan = Array.isArray(packet.simplified_day_plan) ? packet.simplified_day_plan : [];
      const hasTimeSlots = dayPlan.some((entry) => typeof entry?.time_slot === "string" && entry.time_slot.includes(":"));
      if (!hasTimeSlots) {
        failures.push("Expected survival packet to reference schedule time slots");
      }
    }

    const studentSupportInformedByScaffolds = (evalCase.expected as Record<string, unknown>).student_support_informed_by_scaffolds as boolean | undefined;
    if (studentSupportInformedByScaffolds) {
      const studentSupport = Array.isArray(packet.student_support) ? packet.student_support : [];
      const scaffoldCount = studentSupport.filter((entry) => Array.isArray(entry?.current_scaffolds) && entry.current_scaffolds.length > 0).length;
      if (scaffoldCount === 0) {
        failures.push("Expected survival packet student_support to include known scaffolds");
      }
    }

    const complexityPeaksPresent = (evalCase.expected as Record<string, unknown>).complexity_peaks_present as boolean | undefined;
    if (complexityPeaksPresent) {
      const peaks = Array.isArray(packet.complexity_peaks) ? packet.complexity_peaks : [];
      if (peaks.length === 0) {
        failures.push("Expected survival packet to include complexity_peaks");
      }
    }

    failures.push(...validateContent(allText, evalCase.expected));

    if (evalCase.expected.max_latency_ms && latencyMs > evalCase.expected.max_latency_ms) {
      failures.push(`Latency ${Math.round(latencyMs)}ms exceeds max ${evalCase.expected.max_latency_ms}ms`);
    }

    failures.push(...validateModelTier(data.model_id, evalCase.expected));

    return {
      case_id: evalCase.id,
      passed: failures.length === 0,
      failures,
      latency_ms: latencyMs,
      model_id: data.model_id,
    };
  } catch (err) {
    const latencyMs = performance.now() - start;
    failures.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
  }
}

// ─── Persistence round-trip: plan ──────────────────────────────────────────

async function runPlanPersistenceRoundtrip(evalCase: EvalCase): Promise<EvalResult> {
  const failures: string[] = [];
  const input = evalCase.input as Record<string, unknown>;
  const classroomId = input.classroom_id as string;
  const start = performance.now();

  try {
    // Step 1: POST to generate a plan
    const genResp = await fetch(`${API_BASE}/api/tomorrow-plan`, {
      method: "POST",
      headers: evalHeaders(evalCase, classroomId),
      body: JSON.stringify({
        classroom_id: classroomId,
        teacher_reflection: input.teacher_reflection,
        teacher_goal: input.teacher_goal,
      }),
    });

    if (!genResp.ok) {
      failures.push(`Generation POST returned ${genResp.status}: ${await genResp.text()}`);
      const latencyMs = performance.now() - start;
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    const genData = (await genResp.json()) as { plan: Record<string, unknown>; model_id: string };
    const plan = genData.plan;

    // Validate generation schema
    if (evalCase.expected.required_plan_keys) {
      for (const key of evalCase.expected.required_plan_keys) {
        if (!(key in plan)) {
          failures.push(`Generated plan missing required key: ${key}`);
        }
      }
    }

    if (evalCase.expected.schema_version && plan.schema_version !== evalCase.expected.schema_version) {
      failures.push(`Schema version mismatch: expected ${evalCase.expected.schema_version}, got ${plan.schema_version}`);
    }

    const planId = plan.plan_id as string | undefined;
    if (!planId) {
      failures.push("Generated plan has no plan_id — cannot verify persistence");
      const latencyMs = performance.now() - start;
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    // Step 2: GET history and verify the plan appears
    const histResp = await fetch(
      `${API_BASE}/api/classrooms/${classroomId}/plans?limit=10`,
      { headers: authHeaders(classroomId) },
    );

    const latencyMs = performance.now() - start;

    if (!histResp.ok) {
      failures.push(`History GET returned ${histResp.status}: ${await histResp.text()}`);
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    const histData = (await histResp.json()) as { plans: Record<string, unknown>[] };
    const found = histData.plans.find((p) => p.plan_id === planId);

    if (!found) {
      failures.push(`Plan ${planId} not found in history — persistence failed`);
    } else {
      if ((evalCase.expected as Record<string, unknown>).history_must_match_classroom_id && found.classroom_id !== classroomId) {
        failures.push(`Persisted plan classroom_id mismatch: expected ${classroomId}, got ${found.classroom_id}`);
      }
    }

    return {
      case_id: evalCase.id,
      passed: failures.length === 0,
      failures,
      latency_ms: latencyMs,
      model_id: genData.model_id,
    };
  } catch (err) {
    const latencyMs = performance.now() - start;
    failures.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
  }
}

// ─── Persistence round-trip: intervention ──────────────────────────────────

async function runInterventionPersistenceRoundtrip(evalCase: EvalCase): Promise<EvalResult> {
  const failures: string[] = [];
  const input = evalCase.input as Record<string, unknown>;
  const classroomId = input.classroom_id as string;
  const start = performance.now();

  try {
    // Step 1: POST to log an intervention
    const genResp = await fetch(`${API_BASE}/api/intervention`, {
      method: "POST",
      headers: evalHeaders(evalCase, classroomId),
      body: JSON.stringify({
        classroom_id: classroomId,
        student_refs: input.student_refs,
        teacher_note: input.teacher_note,
        context: input.context,
      }),
    });

    if (!genResp.ok) {
      failures.push(`Generation POST returned ${genResp.status}: ${await genResp.text()}`);
      const latencyMs = performance.now() - start;
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    const genData = (await genResp.json()) as { record: Record<string, unknown>; model_id: string };
    const record = genData.record;

    // Validate generation schema
    const requiredKeys = (evalCase.expected as Record<string, unknown>).required_intervention_keys as string[] | undefined;
    if (requiredKeys) {
      for (const key of requiredKeys) {
        if (!(key in record)) {
          failures.push(`Generated intervention missing required key: ${key}`);
        }
      }
    }

    if (evalCase.expected.schema_version && record.schema_version !== evalCase.expected.schema_version) {
      failures.push(`Schema version mismatch: expected ${evalCase.expected.schema_version}, got ${record.schema_version}`);
    }

    const recordId = record.record_id as string | undefined;
    if (!recordId) {
      failures.push("Generated intervention has no record_id — cannot verify persistence");
      const latencyMs = performance.now() - start;
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    // Step 2: GET history and verify the intervention appears
    const histResp = await fetch(
      `${API_BASE}/api/classrooms/${classroomId}/interventions?limit=20`,
      { headers: authHeaders(classroomId) },
    );

    const latencyMs = performance.now() - start;

    if (!histResp.ok) {
      failures.push(`History GET returned ${histResp.status}: ${await histResp.text()}`);
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    const histData = (await histResp.json()) as { interventions: Record<string, unknown>[] };
    const found = histData.interventions.find((r) => r.record_id === recordId);

    if (!found) {
      failures.push(`Intervention ${recordId} not found in history — persistence failed`);
    } else {
      if ((evalCase.expected as Record<string, unknown>).history_must_match_classroom_id && found.classroom_id !== classroomId) {
        failures.push(`Persisted intervention classroom_id mismatch: expected ${classroomId}, got ${found.classroom_id}`);
      }
      const expectedStudentRef = (evalCase.expected as Record<string, unknown>).history_must_include_student_ref as string | undefined;
      if (expectedStudentRef) {
        const refs = found.student_refs;
        if (!Array.isArray(refs) || !refs.includes(expectedStudentRef)) {
          failures.push(`Persisted intervention student_refs does not include "${expectedStudentRef}"`);
        }
      }
    }

    return {
      case_id: evalCase.id,
      passed: failures.length === 0,
      failures,
      latency_ms: latencyMs,
      model_id: genData.model_id,
    };
  } catch (err) {
    const latencyMs = performance.now() - start;
    failures.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
  }
}

// ─── Persistence round-trip: family message ────────────────────────────────

async function runMessagePersistenceRoundtrip(evalCase: EvalCase): Promise<EvalResult> {
  const failures: string[] = [];
  const input = evalCase.input as Record<string, unknown>;
  const classroomId = input.classroom_id as string;
  const start = performance.now();

  try {
    // Step 1: POST to draft a family message
    const genResp = await fetch(`${API_BASE}/api/family-message`, {
      method: "POST",
      headers: evalHeaders(evalCase, classroomId),
      body: JSON.stringify({
        classroom_id: classroomId,
        student_refs: input.student_refs,
        message_type: input.message_type,
        target_language: input.target_language,
        context: input.context,
      }),
    });

    if (!genResp.ok) {
      failures.push(`Generation POST returned ${genResp.status}: ${await genResp.text()}`);
      const latencyMs = performance.now() - start;
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    const genData = (await genResp.json()) as { draft: Record<string, unknown>; model_id: string };
    const draft = genData.draft;

    // Validate generation schema
    const requiredKeys = (evalCase.expected as Record<string, unknown>).required_message_keys as string[] | undefined;
    if (requiredKeys) {
      for (const key of requiredKeys) {
        if (!(key in draft)) {
          failures.push(`Generated draft missing required key: ${key}`);
        }
      }
    }

    if (evalCase.expected.schema_version && draft.schema_version !== evalCase.expected.schema_version) {
      failures.push(`Schema version mismatch: expected ${evalCase.expected.schema_version}, got ${draft.schema_version}`);
    }

    // Verify teacher_approved is false on generation
    if (
      (evalCase.expected as Record<string, unknown>).teacher_approved_must_be_false &&
      draft.teacher_approved !== false
    ) {
      failures.push(`Generated draft teacher_approved should be false, got ${draft.teacher_approved}`);
    }

    const draftId = draft.draft_id as string | undefined;
    if (!draftId) {
      failures.push("Generated draft has no draft_id — cannot verify persistence");
      const latencyMs = performance.now() - start;
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    // Step 2: GET history and verify the message appears
    const histResp = await fetch(
      `${API_BASE}/api/classrooms/${classroomId}/messages?limit=10`,
      { headers: authHeaders(classroomId) },
    );

    const latencyMs = performance.now() - start;

    if (!histResp.ok) {
      failures.push(`History GET returned ${histResp.status}: ${await histResp.text()}`);
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    const histData = (await histResp.json()) as { messages: Record<string, unknown>[] };
    const found = histData.messages.find((m) => m.draft_id === draftId);

    if (!found) {
      failures.push(`Message ${draftId} not found in history — persistence failed`);
    } else {
      if ((evalCase.expected as Record<string, unknown>).history_must_match_classroom_id && found.classroom_id !== classroomId) {
        failures.push(`Persisted message classroom_id mismatch: expected ${classroomId}, got ${found.classroom_id}`);
      }
      // Verify persisted message also has teacher_approved: false
      if (
        (evalCase.expected as Record<string, unknown>).teacher_approved_must_be_false &&
        found.teacher_approved !== false
      ) {
        failures.push(`Persisted message teacher_approved should be false, got ${found.teacher_approved}`);
      }
    }

    return {
      case_id: evalCase.id,
      passed: failures.length === 0,
      failures,
      latency_ms: latencyMs,
      model_id: genData.model_id,
    };
  } catch (err) {
    const latencyMs = performance.now() - start;
    failures.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
  }
}

// --- Extract worksheet evaluation ---

interface ExtractAssertion {
  type: "status" | "has_key" | "typeof" | "is_array" | "min_length" | "not_contains" | "max_latency_ms";
  key?: string;
  expected?: unknown;
  value?: string;
}

async function runExtractWorksheetEval(evalCase: EvalCase): Promise<EvalResult> {
  const failures: string[] = [];
  const request = (evalCase as unknown as Record<string, unknown>).request as Record<string, unknown> | undefined;
  const assertions = (evalCase as unknown as Record<string, unknown>).assertions as ExtractAssertion[] | undefined;
  const classroomId = request?.classroom_id as string | undefined;
  const start = performance.now();

  try {
    const resp = await fetch(`${API_BASE}/api/extract-worksheet`, {
      method: "POST",
      headers: authHeaders(classroomId),
      body: JSON.stringify(request ?? {}),
    });

    const latencyMs = performance.now() - start;

    if (!assertions || assertions.length === 0) {
      if (!resp.ok) {
        failures.push(`API returned ${resp.status}: ${await resp.text()}`);
        return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
      }
      return { case_id: evalCase.id, passed: true, failures, latency_ms: latencyMs };
    }

    let data: Record<string, unknown> | null = null;

    for (const assertion of assertions) {
      switch (assertion.type) {
        case "status": {
          if (resp.status !== assertion.expected) {
            failures.push(`Expected status ${assertion.expected}, got ${resp.status}`);
          }
          break;
        }
        case "has_key": {
          if (!data && resp.ok) data = (await resp.json()) as Record<string, unknown>;
          if (data && assertion.key && !(assertion.key in data)) {
            failures.push(`Response missing required key: ${assertion.key}`);
          }
          break;
        }
        case "typeof": {
          if (!data && resp.ok) data = (await resp.json()) as Record<string, unknown>;
          if (data && assertion.key) {
            const actual = typeof data[assertion.key];
            if (actual !== assertion.expected) {
              failures.push(`Expected typeof ${assertion.key} to be ${assertion.expected}, got ${actual}`);
            }
          }
          break;
        }
        case "is_array": {
          if (!data && resp.ok) data = (await resp.json()) as Record<string, unknown>;
          if (data && assertion.key && !Array.isArray(data[assertion.key])) {
            failures.push(`Expected ${assertion.key} to be an array`);
          }
          break;
        }
        case "min_length": {
          if (!data && resp.ok) data = (await resp.json()) as Record<string, unknown>;
          if (data && assertion.key) {
            const val = data[assertion.key];
            const len = typeof val === "string" ? val.length : 0;
            if (len < (assertion.expected as number)) {
              failures.push(`Expected ${assertion.key} length >= ${assertion.expected}, got ${len}`);
            }
          }
          break;
        }
        case "not_contains": {
          if (!data && resp.ok) data = (await resp.json()) as Record<string, unknown>;
          if (data && assertion.key && assertion.value) {
            const val = data[assertion.key];
            if (typeof val === "string" && val.toLowerCase().includes(assertion.value.toLowerCase())) {
              failures.push(`${assertion.key} contains forbidden content: "${assertion.value}"`);
            }
          }
          break;
        }
        case "max_latency_ms": {
          if (typeof assertion.expected === "number" && latencyMs > assertion.expected) {
            failures.push(`Latency ${Math.round(latencyMs)}ms exceeds max ${assertion.expected}ms`);
          }
          break;
        }
        default:
          failures.push(`Unknown assertion type: ${String((assertion as unknown as Record<string, unknown>).type)}`);
      }
    }

    return { case_id: evalCase.id, passed: failures.length === 0, failures, latency_ms: latencyMs };
  } catch (err) {
    const latencyMs = performance.now() - start;
    failures.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
  }
}

async function main(): Promise<void> {
  const casesDir = resolve(import.meta.dirname ?? ".", "cases");
  const allEvalCases = await loadEvalCases(casesDir);
  const selectedCaseIds = resolveSelectedCaseIds();
  const { selected: evalCases, missingIds } = selectEvalCases(allEvalCases, selectedCaseIds);

  if (missingIds.length > 0) {
    throw new Error(`Unknown eval case ids requested: ${missingIds.join(", ")}`);
  }

  console.log(`Loaded ${allEvalCases.length} eval case(s) from ${casesDir}`);
  if (selectedCaseIds.length > 0) {
    console.log(`Selected ${evalCases.length} eval case(s) for suite${EVAL_SUITE_LABEL ? ` "${EVAL_SUITE_LABEL}"` : ""}.`);
  }
  console.log(`API target: ${API_BASE}\n`);

  if (evalCases.length === 0) {
    console.log("No eval cases found.");
    return;
  }

  const results: EvalResult[] = [];

  for (const ec of evalCases) {
    console.log(`[${ec.id}] ${ec.description}`);
    let rawResult: EvalResult;
    if (ec.endpoint?.includes("/api/classrooms/") && ec.endpoint.includes("/schedule")) {
      rawResult = await runScheduleEval(ec);
    } else if (ec.prompt_class === "prepare_tomorrow_plan") {
      rawResult = await runTomorrowPlanEval(ec);
    } else if (ec.prompt_class === "draft_family_message") {
      rawResult = await runFamilyMessageEval(ec);
    } else if (ec.prompt_class === "log_intervention") {
      rawResult = await runInterventionEval(ec);
    } else if (ec.prompt_class === "simplify_for_student") {
      rawResult = await runSimplifyEval(ec);
    } else if (ec.prompt_class === "generate_vocab_cards") {
      rawResult = await runVocabCardsEval(ec);
    } else if (ec.prompt_class === "detect_support_patterns") {
      rawResult = await runSupportPatternsEval(ec);
    } else if (ec.prompt_class === "retrieve_latest_pattern") {
      rawResult = await runLatestPatternEval(ec);
    } else if (ec.prompt_class === "generate_ea_briefing") {
      rawResult = await runEABriefingEval(ec);
    } else if (ec.prompt_class === "forecast_complexity") {
      rawResult = await runComplexityForecastEval(ec);
    } else if (ec.prompt_class === "complexity_debt_register") {
      rawResult = await runDebtRegisterEval(ec);
    } else if (ec.prompt_class === "detect_scaffold_decay") {
      rawResult = await runScaffoldDecayEval(ec);
    } else if (ec.prompt_class === "generate_survival_packet") {
      rawResult = await runSurvivalPacketEval(ec);
    } else if (ec.prompt_class === "extract_worksheet") {
      rawResult = await runExtractWorksheetEval(ec);
    } else if (ec.prompt_class === "roundtrip_plan_persistence") {
      rawResult = await runPlanPersistenceRoundtrip(ec);
    } else if (ec.prompt_class === "roundtrip_intervention_persistence") {
      rawResult = await runInterventionPersistenceRoundtrip(ec);
    } else if (ec.prompt_class === "roundtrip_message_persistence") {
      rawResult = await runMessagePersistenceRoundtrip(ec);
    } else {
      rawResult = await runDifferentiationEval(ec);
    }

    const result: EvalResult = {
      ...rawResult,
      category: ec.category,
      description: ec.description,
      prompt_class: ec.prompt_class ?? null,
      endpoint: inferEndpoint(ec),
      source_file: ec.source_file,
    };

    results.push(result);

    if (result.passed) {
      console.log(`  ✓ PASS (${Math.round(result.latency_ms ?? 0)}ms)`);
    } else {
      console.log(`  ✗ FAIL`);
      for (const f of result.failures) {
        console.log(`    - ${f}`);
      }
    }
  }

  await writeEvalArtifacts(results, {
    suiteLabel: EVAL_SUITE_LABEL,
    selectedCaseIds,
    availableCaseCount: allEvalCases.length,
  });

  const passed = results.filter((r) => r.passed).length;
  console.log(`\nResults: ${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
