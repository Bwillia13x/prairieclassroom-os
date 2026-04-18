import { describe, expect, it } from "vitest";
import { parseCaseIdList, selectEvalCases } from "../../../evals/case-selection";

describe("parseCaseIdList", () => {
  it("parses comma and newline separated case ids while ignoring comments and blanks", () => {
    expect(parseCaseIdList(`
      # hosted suite
      diff-001-reading-schema,
      plan-001-alpha-schema

      msg-001-alpha-schema
    `)).toEqual([
      "diff-001-reading-schema",
      "plan-001-alpha-schema",
      "msg-001-alpha-schema",
    ]);
  });

  it("ignores comma-bearing prose comments in suite files", () => {
    expect(parseCaseIdList(`
      # extract_worksheet is the only multimodal route. Without this case the hosted
      # lane never proves that image-input through Gemini's inline_data path actually
      # works end-to-end, even though extract_worksheet ships in production.
      extract-001-schema
    `)).toEqual(["extract-001-schema"]);
  });
});

describe("selectEvalCases", () => {
  it("keeps requested order and reports missing ids", () => {
    const cases = [
      { id: "diff-001-reading-schema" },
      { id: "plan-001-alpha-schema" },
      { id: "msg-001-alpha-schema" },
    ];

    expect(selectEvalCases(cases, [
      "plan-001-alpha-schema",
      "missing-case",
      "diff-001-reading-schema",
    ])).toEqual({
      selected: [
        { id: "plan-001-alpha-schema" },
        { id: "diff-001-reading-schema" },
      ],
      missingIds: ["missing-case"],
    });
  });
});
