import { describe, it, expect } from "vitest";
import {
  INTERVENTION_CHIP_DEFS,
  formatAliasList,
  type InterventionChipKey,
} from "../interventionChipDefs";

describe("formatAliasList", () => {
  it("returns 'the student' for an empty array", () => {
    expect(formatAliasList([])).toBe("the student");
  });

  it("returns the single alias unchanged", () => {
    expect(formatAliasList(["Ari"])).toBe("Ari");
  });

  it("joins two aliases with 'and' and no Oxford comma", () => {
    expect(formatAliasList(["Ari", "Bea"])).toBe("Ari and Bea");
  });

  it("joins three aliases with Oxford comma and final 'and'", () => {
    expect(formatAliasList(["Ari", "Bea", "Cal"])).toBe("Ari, Bea, and Cal");
  });
});

describe("INTERVENTION_CHIP_DEFS", () => {
  it("has exactly 6 entries with unique keys", () => {
    expect(INTERVENTION_CHIP_DEFS).toHaveLength(6);
    const keys = INTERVENTION_CHIP_DEFS.map((c) => c.key);
    expect(new Set<InterventionChipKey>(keys).size).toBe(6);
  });

  it("every chip's starterNote substitutes a single alias correctly", () => {
    for (const chip of INTERVENTION_CHIP_DEFS) {
      const note = chip.starterNote(["Ari"]);
      expect(note).toContain("Ari");
      expect(note).not.toContain("{names}");
      expect(note).not.toContain("undefined");
    }
  });

  it("the redirect chip's starterNote joins two aliases with 'and'", () => {
    const redirect = INTERVENTION_CHIP_DEFS.find((c) => c.key === "redirect");
    expect(redirect).toBeDefined();
    const note = redirect!.starterNote(["Ari", "Bea"]);
    expect(note).toContain("Ari and Bea");
  });

  it("every chip has a truthy icon and label", () => {
    for (const chip of INTERVENTION_CHIP_DEFS) {
      expect(chip.icon).toBeTruthy();
      expect(chip.label).toBeTruthy();
      expect(chip.label.length).toBeGreaterThan(0);
    }
  });
});
