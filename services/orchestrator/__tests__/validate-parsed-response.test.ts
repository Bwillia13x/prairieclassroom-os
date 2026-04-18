import { describe, expect, it } from "vitest";
import { z } from "zod";
import { validateParsedResponse } from "../validate-parsed-response.js";
import { RouteError } from "../errors.js";

const SampleSchema = z.object({
  name: z.string().max(10),
  count: z.number().int().nonnegative().max(100),
  kind: z.enum(["a", "b"]),
});

describe("validateParsedResponse", () => {
  it("returns the parsed value unchanged when it matches the schema", () => {
    const valid = { name: "ok", count: 3, kind: "a" };
    const result = validateParsedResponse(SampleSchema, valid, {
      promptClass: "test_class",
    });
    expect(result).toEqual(valid);
  });

  it("throws a RouteError with detail_code 'inference_parse_error' when the shape is wrong", () => {
    const bad = { name: "ok", count: 3 }; // missing kind
    try {
      validateParsedResponse(SampleSchema, bad, { promptClass: "test_class" });
      throw new Error("expected validator to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(RouteError);
      const re = err as RouteError;
      expect(re.statusCode).toBe(502);
      expect(re.detailCode).toBe("inference_parse_error");
      expect(re.category).toBe("inference");
      expect(re.retryable).toBe(false);
      expect(re.extra).toMatchObject({ prompt_class: "test_class" });
      expect(Array.isArray(re.extra?.issues)).toBe(true);
    }
  });

  it("rejects values that violate numeric bounds", () => {
    const bad = { name: "ok", count: 999, kind: "a" };
    expect(() =>
      validateParsedResponse(SampleSchema, bad, { promptClass: "test_class" }),
    ).toThrow(RouteError);
  });

  it("rejects values that violate string bounds", () => {
    const bad = { name: "this_name_is_far_too_long", count: 3, kind: "a" };
    expect(() =>
      validateParsedResponse(SampleSchema, bad, { promptClass: "test_class" }),
    ).toThrow(RouteError);
  });

  it("rejects values with an enum violation (the variant_type class of bug)", () => {
    const bad = { name: "ok", count: 3, kind: "honours" };
    try {
      validateParsedResponse(SampleSchema, bad, { promptClass: "differentiate_material" });
      throw new Error("expected validator to throw");
    } catch (err) {
      const re = err as RouteError;
      const issues = re.extra?.issues as Array<{ path: string }> | undefined;
      expect(issues?.some((i) => i.path === "kind")).toBe(true);
    }
  });

  it("truncates raw_text_sample and issue list on catastrophic failures", () => {
    const manyFields = Object.fromEntries(
      Array.from({ length: 25 }, (_, i) => [`field_${i}`, 42]),
    );
    try {
      validateParsedResponse(SampleSchema.strict(), manyFields, {
        promptClass: "test_class",
        rawText: "a".repeat(5000),
      });
      throw new Error("expected validator to throw");
    } catch (err) {
      const re = err as RouteError;
      const extra = re.extra ?? {};
      expect((extra.issues as unknown[]).length).toBeLessThanOrEqual(8);
      expect(typeof extra.issue_count).toBe("number");
      expect((extra.raw_text_sample as string).length).toBeLessThanOrEqual(300);
    }
  });
});
