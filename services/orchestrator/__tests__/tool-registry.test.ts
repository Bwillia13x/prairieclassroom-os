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
});
