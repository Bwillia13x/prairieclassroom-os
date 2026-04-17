import { describe, expect, it } from "vitest";

// @ts-expect-error test-only import of repo-local .mjs helper without declarations
const harvestModule = await import("../../../scripts/lib/feedback-harvest.mjs");

interface FeedbackRow {
  id: string;
  classroom_id: string;
  panel_id: string;
  prompt_class: string | null;
  rating: number;
  comment: string | null;
  generation_id: string | null;
  session_id: string | null;
  created_at: string;
}

const buildDraftCase = harvestModule.buildDraftCase as (
  row: FeedbackRow,
  options?: { requestLogHint?: string },
) => Record<string, unknown>;
const chooseCategory = harvestModule.chooseCategory as (
  rating: number,
  comment: string | null,
) => string;
const draftFilename = harvestModule.draftFilename as (row: FeedbackRow) => string;

const BASE_ROW: FeedbackRow = {
  id: "fdb-abc-123",
  classroom_id: "demo-okafor-grade34",
  panel_id: "family-message",
  prompt_class: "draft_family_message",
  rating: 2,
  comment: "Draft was too formal for our family",
  generation_id: "msg-xyz-789",
  session_id: "sess-001",
  created_at: "2026-04-15T14:32:00.000Z",
};

describe("buildDraftCase", () => {
  it("emits a stable, dated, prompt-class-tagged ID", () => {
    const draft = buildDraftCase(BASE_ROW);
    expect(draft.id).toBe("feedback-2026-04-15-draft_family_message-msg-xyz-789");
  });

  it("falls back to feedback id when generation_id is missing", () => {
    const draft = buildDraftCase({ ...BASE_ROW, generation_id: null });
    expect(draft.id).toBe("feedback-2026-04-15-draft_family_message-fdb-abc-123");
  });

  it("falls back to 'unknown' prompt_class when missing (eval runner can still file it)", () => {
    const draft = buildDraftCase({ ...BASE_ROW, prompt_class: null });
    expect(draft.id).toContain("-unknown-");
    expect(draft.prompt_class).toBeNull();
  });

  it("preserves the full feedback row inside _source for audit traceability", () => {
    const draft = buildDraftCase(BASE_ROW);
    const source = draft._source as Record<string, unknown>;
    expect(source.feedback_id).toBe("fdb-abc-123");
    expect(source.classroom_id).toBe("demo-okafor-grade34");
    expect(source.generation_id).toBe("msg-xyz-789");
    expect(source.rating).toBe(2);
    expect(source.comment).toBe("Draft was too formal for our family");
  });

  it("hints the operator at the matching request-log file (date-based)", () => {
    const draft = buildDraftCase(BASE_ROW);
    const source = draft._source as Record<string, unknown>;
    expect(source.hint as string).toContain("output/request-logs/2026-04-15.jsonl");
  });

  it("accepts a custom request log hint for custom log dirs", () => {
    const draft = buildDraftCase(BASE_ROW, { requestLogHint: "custom/logs/today.jsonl" });
    const source = draft._source as Record<string, unknown>;
    expect(source.hint as string).toContain("custom/logs/today.jsonl");
  });

  it("leaves input + expected as _TODO stubs the operator must fill in", () => {
    const draft = buildDraftCase(BASE_ROW);
    expect((draft.input as Record<string, unknown>)._TODO).toBeDefined();
    expect((draft.expected as Record<string, unknown>)._TODO).toBeDefined();
  });

  it("truncates long comments in the description so the file stays scannable", () => {
    const longComment = "x".repeat(500);
    const draft = buildDraftCase({ ...BASE_ROW, comment: longComment });
    // The description has fixed prefix/suffix prose around the truncated
    // comment. The 500-char comment must shrink dramatically — the rendered
    // description should be well under 250 (truncation works), and the
    // ellipsis must appear (proof the comment was actually clipped).
    expect((draft.description as string).length).toBeLessThan(250);
    expect(draft.description as string).toContain("…");
    expect(draft.description as string).not.toContain("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"); // 90 x's would mean truncation didn't happen
  });
});

describe("chooseCategory", () => {
  it("flags safety/diagnosis comments as safety_correctness", () => {
    expect(chooseCategory(1, "the model used the word 'diagnosis'")).toBe("safety_correctness");
    expect(chooseCategory(2, "this feels like a discipline scoring system")).toBe("safety_correctness");
    expect(chooseCategory(2, "borderline surveillance")).toBe("safety_correctness");
  });

  it("flags slow/timeout comments as latency_suitability", () => {
    expect(chooseCategory(2, "took too long to generate")).toBe("latency_suitability");
    expect(chooseCategory(2, "had to wait")).toBe("latency_suitability");
  });

  it("defaults to content_quality when no signal is present", () => {
    expect(chooseCategory(2, "wrong tone")).toBe("content_quality");
    expect(chooseCategory(2, null)).toBe("content_quality");
    expect(chooseCategory(2, "")).toBe("content_quality");
  });
});

describe("draftFilename", () => {
  it("matches the buildDraftCase id (so collisions = same file)", () => {
    const draft = buildDraftCase(BASE_ROW);
    const filename = draftFilename(BASE_ROW);
    expect(filename).toBe(`${draft.id}.json`);
  });

  it("is stable across re-runs of the same row (idempotency)", () => {
    expect(draftFilename(BASE_ROW)).toBe(draftFilename(BASE_ROW));
  });

  it("differs across distinct generations even when other fields collide", () => {
    expect(draftFilename(BASE_ROW)).not.toBe(
      draftFilename({ ...BASE_ROW, generation_id: "msg-OTHER" }),
    );
  });
});
