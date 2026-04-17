import { describe, it, expect } from "vitest";
import { estimateGradeLevel, describeGradeLevel } from "../readingLevel";

describe("estimateGradeLevel", () => {
  it("returns null for empty input", () => {
    expect(estimateGradeLevel("")).toBeNull();
    expect(estimateGradeLevel("   ")).toBeNull();
  });

  it("returns a low grade for short, simple sentences", () => {
    const grade = estimateGradeLevel("The cat sat. The dog ran. We saw the sun.");
    expect(grade).not.toBeNull();
    expect(grade!).toBeLessThan(4);
  });

  it("returns a higher grade for longer, polysyllabic sentences", () => {
    const grade = estimateGradeLevel(
      "The implementation of differentiated instruction requires substantial pedagogical preparation and individualized assessment of student readiness profiles.",
    );
    expect(grade).not.toBeNull();
    expect(grade!).toBeGreaterThan(10);
  });

  it("clamps absurdly high values to 16", () => {
    const grade = estimateGradeLevel(
      "Antidisestablishmentarianism characterizes inherently complicated multidisciplinary methodological investigations.",
    );
    expect(grade).not.toBeNull();
    expect(grade!).toBeLessThanOrEqual(16);
  });

  it("handles fragments without terminal punctuation", () => {
    const grade = estimateGradeLevel("kids run fast");
    expect(grade).not.toBeNull();
    expect(grade!).toBeGreaterThanOrEqual(0);
  });
});

describe("describeGradeLevel", () => {
  it("classifies grade bands", () => {
    expect(describeGradeLevel(0.5)).toMatch(/pre-k/i);
    expect(describeGradeLevel(2)).toMatch(/early/i);
    expect(describeGradeLevel(4)).toMatch(/mid/i);
    expect(describeGradeLevel(7)).toMatch(/middle/i);
    expect(describeGradeLevel(11)).toMatch(/high-school/i);
  });
});
