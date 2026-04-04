/**
 * PrairieClassroom OS — Eval Runner
 *
 * Executes evaluation suites against the system and produces
 * structured pass/fail results. Sprint 0 version provides
 * the framework; actual test cases are added per feature.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

// ----- Types -----

interface EvalCase {
  id: string;
  category: EvalCategory;
  description: string;
  prompt_class?: string;
  input: Record<string, unknown>;
  expected: ExpectedOutput;
}

type EvalCategory =
  | "differentiation_quality"
  | "planning_usefulness"
  | "retrieval_relevance"
  | "schema_reliability"
  | "safety_correctness"
  | "latency_suitability";

interface ExpectedOutput {
  /** If set, output must contain all of these keys. */
  required_keys?: string[];
  /** If set, output text must contain all of these substrings. */
  must_contain?: string[];
  /** If set, output text must NOT contain any of these. */
  must_not_contain?: string[];
  /** Schema version must match. */
  schema_version?: string;
  /** Max acceptable latency in ms. */
  max_latency_ms?: number;
  /** For tomorrow-plan: required top-level keys in plan object. */
  required_plan_keys?: string[];
  /** Minimum transition watchpoints. */
  min_watchpoints?: number;
  /** Minimum support priorities. */
  min_priorities?: number;
  /** Minimum EA actions. */
  min_ea_actions?: number;
  /** Minimum prep checklist items. */
  min_prep_items?: number;
  /** For family-message: required keys in draft object. */
  required_message_keys?: string[];
  /** For family-message: teacher_approved must be false on generation. */
  teacher_approved_must_be_false?: boolean;
  /** For intervention: required keys in record object. */
  required_intervention_keys?: string[];
  /** For simplification: required keys in simplified object. */
  required_simplified_keys?: string[];
  /** Minimum key vocabulary items. */
  min_vocabulary?: number;
  /** Minimum visual cue suggestions. */
  min_visual_cues?: number;
  /** For vocab cards: required keys in card set object. */
  required_cardset_keys?: string[];
  /** For vocab cards: required keys on each card. */
  required_card_keys?: string[];
  /** Minimum number of vocab cards. */
  min_cards?: number;
  /** Maximum number of vocab cards. */
  max_cards?: number;
  /** For support patterns: required keys in report object. */
  required_report_keys?: string[];
  /** Minimum recurring themes. */
  min_themes?: number;
  /** Minimum follow-up gaps. */
  min_gaps?: number;
  /** Minimum suggested focus items. */
  min_focus?: number;
}

interface EvalResult {
  case_id: string;
  passed: boolean;
  failures: string[];
  latency_ms?: number;
}

// ----- Loader -----

function loadFixturesDir(dir: string): Record<string, unknown>[] {
  const absDir = resolve(dir);
  if (!existsSync(absDir)) return [];
  return readdirSync(absDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(absDir, f), "utf-8")));
}

// ----- Validators -----

function validateSchema(output: Record<string, unknown>, expected: ExpectedOutput): string[] {
  const failures: string[] = [];
  if (expected.required_keys) {
    for (const key of expected.required_keys) {
      if (!(key in output)) {
        failures.push(`Missing required key: ${key}`);
      }
    }
  }
  if (expected.schema_version && output.schema_version !== expected.schema_version) {
    failures.push(
      `Schema version mismatch: expected ${expected.schema_version}, got ${output.schema_version}`
    );
  }
  return failures;
}

function validateContent(text: string, expected: ExpectedOutput): string[] {
  const failures: string[] = [];
  if (expected.must_contain) {
    for (const substr of expected.must_contain) {
      if (!text.includes(substr)) {
        failures.push(`Output missing expected content: "${substr}"`);
      }
    }
  }
  if (expected.must_not_contain) {
    for (const substr of expected.must_not_contain) {
      if (text.includes(substr)) {
        failures.push(`Output contains forbidden content: "${substr}"`);
      }
    }
  }
  return failures;
}

// ----- Runner -----

function runEval(evalCase: EvalCase, output: Record<string, unknown>, rawText: string, latencyMs: number): EvalResult {
  const failures: string[] = [
    ...validateSchema(output, evalCase.expected),
    ...validateContent(rawText, evalCase.expected),
  ];

  if (evalCase.expected.max_latency_ms && latencyMs > evalCase.expected.max_latency_ms) {
    failures.push(
      `Latency ${latencyMs}ms exceeds max ${evalCase.expected.max_latency_ms}ms`
    );
  }

  return {
    case_id: evalCase.id,
    passed: failures.length === 0,
    failures,
    latency_ms: latencyMs,
  };
}

// ----- Main -----

const API_BASE = process.env.API_BASE ?? "http://localhost:3100";

// Classroom access codes for auth — must match data/synthetic_classrooms/*.json
const CLASSROOM_CODES: Record<string, string> = {
  "alpha-grade4": "prairie-alpha-2026",
  "bravo-grade2": "prairie-bravo-2026",
};

function authHeaders(classroomId?: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (classroomId && CLASSROOM_CODES[classroomId]) {
    headers["X-Classroom-Code"] = CLASSROOM_CODES[classroomId];
  }
  return headers;
}

async function loadEvalCases(dir: string): Promise<EvalCase[]> {
  const absDir = resolve(dir);
  if (!existsSync(absDir)) return [];
  return readdirSync(absDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(absDir, f), "utf-8")) as EvalCase);
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
      headers: authHeaders(input.classroom_id as string),
      body: JSON.stringify({
        artifact,
        classroom_id: input.classroom_id,
        teacher_goal: input.teacher_goal,
      }),
    });

    const latencyMs = performance.now() - start;

    if (!resp.ok) {
      failures.push(`API returned ${resp.status}: ${await resp.text()}`);
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
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

    return { case_id: evalCase.id, passed: failures.length === 0, failures, latency_ms: latencyMs };
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
      headers: authHeaders(input.classroom_id as string),
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

    return { case_id: evalCase.id, passed: failures.length === 0, failures, latency_ms: latencyMs };
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
      headers: authHeaders(input.classroom_id as string),
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
      headers: authHeaders(input.classroom_id as string),
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
      headers: authHeaders(input.classroom_id as string),
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
      headers: authHeaders(input.classroom_id as string),
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
      headers: authHeaders(input.classroom_id as string),
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

// ─── Latest pattern retrieval evaluation ─────────────────────────────────────

async function runLatestPatternEval(evalCase: EvalCase): Promise<EvalResult> {
  const failures: string[] = [];
  const input = evalCase.input as Record<string, unknown>;
  const start = performance.now();

  try {
    const resp = await fetch(
      `${API_BASE}/api/support-patterns/latest/${input.classroom_id}`,
    );

    const latencyMs = performance.now() - start;

    if (!resp.ok) {
      failures.push(`API returned ${resp.status}: ${await resp.text()}`);
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    const data = (await resp.json()) as { report: Record<string, unknown> | null };

    if (!data.report) {
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
      headers: authHeaders(input.classroom_id as string),
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

async function main(): Promise<void> {
  const casesDir = resolve(import.meta.dirname ?? ".", "cases");
  const evalCases = await loadEvalCases(casesDir);

  console.log(`Loaded ${evalCases.length} eval case(s) from ${casesDir}`);
  console.log(`API target: ${API_BASE}\n`);

  if (evalCases.length === 0) {
    console.log("No eval cases found.");
    return;
  }

  const results: EvalResult[] = [];

  for (const ec of evalCases) {
    console.log(`[${ec.id}] ${ec.description}`);
    let result: EvalResult;
    if (ec.prompt_class === "prepare_tomorrow_plan") {
      result = await runTomorrowPlanEval(ec);
    } else if (ec.prompt_class === "draft_family_message") {
      result = await runFamilyMessageEval(ec);
    } else if (ec.prompt_class === "log_intervention") {
      result = await runInterventionEval(ec);
    } else if (ec.prompt_class === "simplify_for_student") {
      result = await runSimplifyEval(ec);
    } else if (ec.prompt_class === "generate_vocab_cards") {
      result = await runVocabCardsEval(ec);
    } else if (ec.prompt_class === "detect_support_patterns") {
      result = await runSupportPatternsEval(ec);
    } else if (ec.prompt_class === "retrieve_latest_pattern") {
      result = await runLatestPatternEval(ec);
    } else if (ec.prompt_class === "generate_ea_briefing") {
      result = await runEABriefingEval(ec);
    } else {
      result = await runDifferentiationEval(ec);
    }
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

  const passed = results.filter((r) => r.passed).length;
  console.log(`\nResults: ${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
}

main();
