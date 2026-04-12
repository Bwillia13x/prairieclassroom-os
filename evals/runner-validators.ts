/**
 * Pure validation functions for the eval harness.
 * No I/O, no side effects — suitable for unit testing.
 */

import type { EvalCase, EvalResult, ExpectedOutput } from "./runner-types";

export function validateContent(text: string, expected: ExpectedOutput): string[] {
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
  const aliases = (expected as Record<string, unknown>).does_not_contain as string[] | undefined;
  if (aliases) {
    for (const substr of aliases) {
      if (text.includes(substr)) {
        failures.push(`Output contains forbidden content: "${substr}"`);
      }
    }
  }
  const forbiddenTerms = (expected as Record<string, unknown>).forbidden_terms_absent as string[] | undefined;
  if (forbiddenTerms) {
    for (const term of forbiddenTerms) {
      if (text.toLowerCase().includes(term.toLowerCase())) {
        failures.push(`Output contains forbidden term: "${term}"`);
      }
    }
  }
  return failures;
}

export function uniqueNormalized(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim().replace(/\s+/g, " ").toLowerCase()).filter(Boolean))];
}

export function checkRequiredKeys(value: Record<string, unknown>, keys: string[], label: string): string[] {
  const failures: string[] = [];
  for (const key of keys) {
    if (!(key in value)) {
      failures.push(`${label} missing required key: ${key}`);
    }
  }
  return failures;
}

export function inferEndpoint(evalCase: EvalCase): string {
  if (evalCase.endpoint) {
    return evalCase.endpoint;
  }
  switch (evalCase.prompt_class) {
    case "prepare_tomorrow_plan":
      return "POST /api/tomorrow-plan";
    case "draft_family_message":
      return "POST /api/family-message";
    case "log_intervention":
      return "POST /api/intervention";
    case "simplify_for_student":
      return "POST /api/simplify";
    case "generate_vocab_cards":
      return "POST /api/vocab-cards";
    case "detect_support_patterns":
      return "POST /api/support-patterns";
    case "retrieve_latest_pattern":
      return "POST /api/support-patterns/latest";
    case "generate_ea_briefing":
      return "POST /api/ea-briefing";
    case "forecast_complexity":
      return "POST /api/complexity-forecast";
    case "complexity_debt_register":
      return "GET /api/debt-register/:classroom_id";
    case "detect_scaffold_decay":
      return "POST /api/scaffold-decay";
    case "generate_survival_packet":
      return "POST /api/survival-packet";
    case "extract_worksheet":
      return "POST /api/extract-worksheet";
    case "roundtrip_plan_persistence":
      return "POST /api/tomorrow-plan → GET /api/classrooms/:id/plans";
    case "roundtrip_intervention_persistence":
      return "POST /api/intervention → GET /api/classrooms/:id/interventions";
    case "roundtrip_message_persistence":
      return "POST /api/family-message → GET /api/classrooms/:id/messages";
    default:
      return "POST /api/differentiate";
  }
}

export function validateModelTier(modelId: string | undefined, expected: ExpectedOutput): string[] {
  const expectedTier = (expected as Record<string, unknown>).model_tier as string | undefined;
  if (!expectedTier) {
    return [];
  }
  if (!modelId) {
    return [`Expected model tier ${expectedTier}, but no model_id was returned`];
  }
  const normalized = modelId.toLowerCase();
  if (expectedTier === "planning" && !normalized.includes("27b")) {
    return [`Expected planning-tier model_id to include 27b, got ${modelId}`];
  }
  if (expectedTier === "live" && normalized.includes("27b")) {
    return [`Expected live-tier model_id, got planning-tier model_id ${modelId}`];
  }
  return [];
}

export async function maybeHandleExpectedStatus(
  resp: Response,
  evalCase: EvalCase,
  latencyMs: number,
): Promise<EvalResult | null> {
  const expectedStatus = evalCase.expected.expected_status;
  if (!resp.ok) {
    const rawBody = await resp.text();
    const failures: string[] = [];

    if (expectedStatus === undefined) {
      failures.push(`API returned ${resp.status}: ${rawBody}`);
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    if (resp.status !== expectedStatus) {
      failures.push(`Expected status ${expectedStatus}, got ${resp.status}`);
    }

    const parsed = (() => {
      try {
        return JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        return null;
      }
    })();

    if (evalCase.expected.expected_error_category) {
      const category = parsed?.category;
      if (category !== evalCase.expected.expected_error_category) {
        failures.push(`Expected error category ${evalCase.expected.expected_error_category}, got ${category ?? "missing"}`);
      }
    }
    if (evalCase.expected.expected_detail_code) {
      const detailCode = parsed?.detail_code;
      if (detailCode !== evalCase.expected.expected_detail_code) {
        failures.push(`Expected detail_code ${evalCase.expected.expected_detail_code}, got ${detailCode ?? "missing"}`);
      }
    }
    if (typeof evalCase.expected.expected_retryable === "boolean") {
      const retryable = parsed?.retryable;
      if (retryable !== evalCase.expected.expected_retryable) {
        failures.push(`Expected retryable=${evalCase.expected.expected_retryable}, got ${retryable ?? "missing"}`);
      }
    }
    if (evalCase.expected.expected_error_substring && !rawBody.includes(evalCase.expected.expected_error_substring)) {
      failures.push(`Expected error body to contain "${evalCase.expected.expected_error_substring}"`);
    }

    return {
      case_id: evalCase.id,
      passed: failures.length === 0,
      failures,
      latency_ms: latencyMs,
    };
  }

  if (expectedStatus !== undefined && expectedStatus >= 400) {
    return {
      case_id: evalCase.id,
      passed: false,
      failures: [`Expected status ${expectedStatus}, but request succeeded with 200`],
      latency_ms: latencyMs,
    };
  }

  return null;
}
