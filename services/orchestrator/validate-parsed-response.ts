/**
 * Route-boundary validator for model responses.
 *
 * Each prompt-class parser coerces raw model text into a typed object with
 * `JSON.parse` + `String(v.foo ?? "")` / `Array.isArray(...)` guards. That
 * is defensive but not validating — a model returning `variant_type: "honours"`
 * still flows through as a typed `VariantType`. This helper pipes the coerced
 * output through the shared Zod schema so residual shape, enum, or bound
 * violations produce a structured 502 instead of silently propagating.
 */

import type { z } from "zod";
import { RouteError } from "./errors.js";

interface ValidateOptions {
  promptClass: string;
  /** Optional raw model text — truncated to 300 chars in the error payload. */
  rawText?: string;
}

export function validateParsedResponse<S extends z.ZodType>(
  schema: S,
  parsed: unknown,
  options: ValidateOptions,
): z.infer<S> {
  const result = schema.safeParse(parsed);
  if (result.success) {
    return result.data;
  }

  // Cap the issue list so a catastrophic schema violation doesn't blow up
  // the 502 body.
  const issues = result.error.issues.slice(0, 8).map((issue) => ({
    path: issue.path.join("."),
    code: issue.code,
    message: issue.message,
  }));

  throw new RouteError(
    502,
    {
      error: `Inference response failed schema validation for ${options.promptClass}`,
      category: "inference",
      retryable: false,
      detail_code: "inference_parse_error",
    },
    {
      prompt_class: options.promptClass,
      issues,
      issue_count: result.error.issues.length,
      ...(options.rawText ? { raw_text_sample: options.rawText.slice(0, 300) } : {}),
    },
  );
}
