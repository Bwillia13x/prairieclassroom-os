import { describe, expect, it } from "vitest";
import {
  executeToolCalls,
  getToolsForPromptClass,
  normalizeToolCall,
  toolDefinitions,
} from "../tool-registry.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";

describe("tool registry", () => {
  it("registers curriculum lookup for differentiation", () => {
    const tools = getToolsForPromptClass("differentiate_material", {
      promptClass: "differentiate_material",
      classroomId: "demo-okafor-grade34" as ClassroomId,
    });

    expect(toolDefinitions(tools).map((tool) => tool.name)).toEqual([
      "lookup_curriculum_outcome",
    ]);
  });

  it("registers intervention history lookup for tomorrow planning", () => {
    const tools = getToolsForPromptClass("prepare_tomorrow_plan", {
      promptClass: "prepare_tomorrow_plan",
      classroomId: "demo-okafor-grade34" as ClassroomId,
    });

    expect(toolDefinitions(tools).map((tool) => tool.name)).toEqual([
      "query_intervention_history",
    ]);
  });

  it("normalizes Gemini and OpenAI style tool calls", () => {
    expect(normalizeToolCall({
      function_call: { name: "lookup_curriculum_outcome", args: { grade: "3" } },
      thought_signature: "opaque-signature",
    })).toMatchObject({
      thought_signature: "opaque-signature",
      name: "lookup_curriculum_outcome",
      arguments: { grade: "3" },
    });

    expect(normalizeToolCall({
      id: "call-1",
      type: "function",
      function: {
        name: "query_intervention_history",
        arguments: "{\"student_ref\":\"Ari\"}",
      },
    })).toMatchObject({
      id: "call-1",
      name: "query_intervention_history",
      arguments: { student_ref: "Ari" },
    });
  });

  it("executes the curriculum lookup tool", async () => {
    const tools = getToolsForPromptClass("differentiate_material", {
      promptClass: "differentiate_material",
    });

    const records = await executeToolCalls([
      {
        name: "lookup_curriculum_outcome",
        arguments: { grade: "3", subject: "math", keyword: "multiplication" },
      },
    ], tools, { promptClass: "differentiate_material" });

    expect(records).toHaveLength(1);
    expect(records[0]?.executed).toBe(true);
    expect(records[0]?.result).toMatchObject({
      matched: true,
      matches: expect.arrayContaining([expect.objectContaining({ entry_id: "ab-math-3" })]),
    });
  });

  it("query_intervention_history rejects unknown student aliases when a roster is supplied", async () => {
    // Safety check: when the model hallucinates a student name (e.g. asks for
    // "Jamal" in a classroom that has "Ari, Mika, Tavi"), the tool must
    // return ok:false with known_aliases — NOT ok:true with count:0, which
    // would let the model confidently invent a nonexistent student.
    const tools = getToolsForPromptClass("prepare_tomorrow_plan", {
      promptClass: "prepare_tomorrow_plan",
      classroomId: "demo-okafor-grade34" as ClassroomId,
      knownAliases: ["Ari", "Mika", "Tavi"],
    });

    const records = await executeToolCalls([
      { name: "query_intervention_history", arguments: { student_ref: "Jamal" } },
    ], tools, {
      promptClass: "prepare_tomorrow_plan",
      classroomId: "demo-okafor-grade34" as ClassroomId,
      knownAliases: ["Ari", "Mika", "Tavi"],
    });

    expect(records).toHaveLength(1);
    expect(records[0]?.result).toMatchObject({
      ok: false,
      error: "unknown_student_ref",
      known_aliases: ["Ari", "Mika", "Tavi"],
    });
  });

  it("query_intervention_history accepts a known alias (case-insensitive)", async () => {
    const tools = getToolsForPromptClass("prepare_tomorrow_plan", {
      promptClass: "prepare_tomorrow_plan",
      classroomId: "demo-okafor-grade34" as ClassroomId,
      knownAliases: ["Ari", "Mika", "Tavi"],
    });

    const records = await executeToolCalls([
      { name: "query_intervention_history", arguments: { student_ref: "ari" } },
    ], tools, {
      promptClass: "prepare_tomorrow_plan",
      classroomId: "demo-okafor-grade34" as ClassroomId,
      knownAliases: ["Ari", "Mika", "Tavi"],
    });

    expect(records).toHaveLength(1);
    // Should have attempted the real lookup; count may be 0 for a fresh DB
    // but the key signal is the shape doesn't include an "unknown_student_ref" error.
    expect(records[0]?.result).not.toMatchObject({ error: "unknown_student_ref" });
  });
});
