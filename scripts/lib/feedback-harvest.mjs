/**
 * Pure helpers for the feedback-harvest script (F14).
 * Kept in a sibling module so vitest can import them without touching the
 * filesystem or any SQLite database.
 */

/**
 * Build a draft eval-case skeleton from a low-rated feedback row.
 *
 * The output is intentionally INCOMPLETE: it captures what the harvest can
 * see (panel, prompt_class, rating, comment, generation_id, classroom_id)
 * and leaves `input` and `expected` as `_TODO` stubs the operator must fill
 * in before the file can be promoted to a real eval case.
 *
 * The `_source` block preserves the link back to the original feedback row
 * so the operator can find the prompt body in `output/request-logs/` by
 * grepping for the generation_id.
 */
export function buildDraftCase(row, options = {}) {
  const { id, classroom_id, panel_id, prompt_class, rating, comment,
          generation_id, session_id, created_at } = row;
  const dateSlug = created_at.slice(0, 10);
  const safePromptClass = prompt_class ?? "unknown";
  const slugPart = generation_id ?? id;
  const draftId = `feedback-${dateSlug}-${safePromptClass}-${slugPart}`;

  const requestLogPath = options.requestLogHint
    ?? `output/request-logs/${dateSlug}.jsonl`;

  return {
    id: draftId,
    category: chooseCategory(rating, comment),
    description:
      `Drafted from teacher feedback (rating=${rating}` +
      (comment ? `, "${truncate(comment, 80)}"` : "") +
      `) on panel "${panel_id}". Operator must fill in input + expected before promoting.`,
    prompt_class,
    _source: {
      feedback_id: id,
      classroom_id,
      generation_id,
      session_id,
      panel_id,
      rating,
      comment,
      created_at,
      hint: `Look up generation_id in ${requestLogPath} (or the matching dated file) to recover the original prompt body and raw response.`,
    },
    input: {
      _TODO:
        "Replace with the original generation request body. The harvester " +
        "doesn't see the prompt — only the feedback. Match by generation_id " +
        "in the request log to recover it.",
    },
    expected: {
      _TODO:
        "Define what 'good' looks like for this case. The teacher rated the " +
        "model output low — describe the assertions a successful model output " +
        "would satisfy (must_contain / must_not_contain / forbidden_terms_absent " +
        "/ required_keys / etc.) so this case can re-run as a regression guard.",
    },
  };
}

/**
 * Choose an eval category for the draft case from the feedback signal.
 * Heuristic: comments mentioning safety/diagnosis/discipline → safety_correctness,
 * comments mentioning slow/timeout → latency_suitability,
 * everything else falls into content_quality.
 */
export function chooseCategory(_rating, comment) {
  const text = (comment ?? "").toLowerCase();
  if (/diagnos|discipline|risk\s*scor|surveill|behavior(al)?\s*issue|safety/.test(text)) {
    return "safety_correctness";
  }
  if (/slow|timeout|too\s*long|wait/.test(text)) {
    return "latency_suitability";
  }
  return "content_quality";
}

/**
 * Stable filename for a draft case, used by the harvester's "skip if exists"
 * idempotency check. Returns just the file BASENAME — the harvester chooses
 * the directory.
 */
export function draftFilename(row) {
  const dateSlug = (row.created_at ?? "1970-01-01").slice(0, 10);
  const safePromptClass = row.prompt_class ?? "unknown";
  const slugPart = row.generation_id ?? row.id;
  return `feedback-${dateSlug}-${safePromptClass}-${slugPart}.json`;
}

function truncate(s, n) {
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1)}…`;
}
