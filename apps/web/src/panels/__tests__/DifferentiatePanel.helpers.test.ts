import { describe, it, expect } from "vitest";
import {
  serializeVariantsToPlainText,
  serializeVariantsToMarkdown,
  summarizeVariantsForTomorrow,
} from "../DifferentiatePanel.helpers";
import type { DifferentiatedVariant } from "../../types";

const VARIANTS: DifferentiatedVariant[] = [
  {
    variant_id: "v1",
    artifact_id: "a1",
    variant_type: "core",
    title: "Core variant",
    student_facing_instructions: "Core content here",
    teacher_notes: "Note",
    required_materials: [],
    estimated_minutes: 20,
    schema_version: "1",
  },
  {
    variant_id: "v2",
    artifact_id: "a1",
    variant_type: "chunked",
    title: "Chunked variant",
    student_facing_instructions: "Chunked content",
    teacher_notes: "Note",
    required_materials: [],
    estimated_minutes: 25,
    schema_version: "1",
  },
  {
    variant_id: "v3",
    artifact_id: "a1",
    variant_type: "extension",
    title: "Extension variant",
    student_facing_instructions: "Extension content",
    teacher_notes: "Note",
    required_materials: [],
    estimated_minutes: 30,
    schema_version: "1",
  },
];

describe("DifferentiatePanel.helpers", () => {
  it("serializeVariantsToPlainText includes title and divider", () => {
    const out = serializeVariantsToPlainText("Test Lesson", VARIANTS);
    expect(out).toContain("Test Lesson");
    expect(out).toContain("— Variant: core —");
    expect(out).toContain("---");
  });

  it("serializeVariantsToMarkdown produces h1 + h2 sections", () => {
    const out = serializeVariantsToMarkdown("Test Lesson", VARIANTS);
    expect(out).toMatch(/^# Test Lesson/);
    expect(out).toContain("## Variant: core");
    expect(out).toContain("## Variant: chunked");
  });

  it("summarizeVariantsForTomorrow reports counts by variant_type", () => {
    const summary = summarizeVariantsForTomorrow("Test Lesson", VARIANTS);
    expect(summary).toContain("3 variants");
    expect(summary).toContain("Test Lesson");
    expect(summary).toContain("core: 1");
  });
});
