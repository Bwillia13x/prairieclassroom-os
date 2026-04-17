import type { ClassroomId } from "../../packages/shared/schemas/branded.js";
import type { PromptClass, ToolCallRecord, ToolDefinition } from "./types.js";
import { lookupCurriculumOutcome } from "./curriculum-registry.js";
import { getStudentInterventions } from "../memory/retrieve.js";

export interface ToolExecutionContext {
  promptClass: PromptClass;
  classroomId?: ClassroomId;
}

export interface RegisteredTool {
  definition: ToolDefinition;
  execute: (
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ) => unknown | Promise<unknown>;
}

export interface NormalizedToolCall {
  id?: string;
  thought_signature?: string;
  name: string;
  arguments: Record<string, unknown>;
}

const LOOKUP_CURRICULUM_OUTCOME: ToolDefinition = {
  name: "lookup_curriculum_outcome",
  description:
    "Look up bounded Alberta K-6 curriculum focus items from the local catalog by grade, subject, and keyword.",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["grade", "subject", "keyword"],
    properties: {
      grade: {
        type: "string",
        description: "Alberta grade to search, such as K, 1, 2, 3, 4, 5, or 6.",
      },
      subject: {
        type: "string",
        description: "Subject area, such as math, science, ELA, or social studies.",
      },
      keyword: {
        type: "string",
        description: "Curriculum concept to match, such as fractions, habitat, story, or community.",
      },
      limit: {
        type: "integer",
        description: "Maximum number of focus items to return. Defaults to 3; maximum 5.",
      },
    },
  },
};

const QUERY_INTERVENTION_HISTORY: ToolDefinition = {
  name: "query_intervention_history",
  description:
    "Retrieve recent locally stored intervention records for one student alias in the active classroom.",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["student_ref"],
    properties: {
      student_ref: {
        type: "string",
        description: "Student alias exactly as shown in the classroom profile, such as Ari or Mika.",
      },
      days: {
        type: "integer",
        description: "Lookback window in days. Defaults to 14; maximum 60.",
      },
      limit: {
        type: "integer",
        description: "Maximum number of intervention records to return. Defaults to 5; maximum 10.",
      },
    },
  },
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asPositiveInt(value: unknown, fallback: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function parseMaybeJsonObject(value: unknown): Record<string, unknown> | null {
  if (value === undefined || value === null) return null;
  const parsed = parseJsonObject(value);
  return Object.keys(parsed).length > 0 ? parsed : {};
}

function interventionHistoryTool(): RegisteredTool {
  return {
    definition: QUERY_INTERVENTION_HISTORY,
    execute(args, context) {
      if (!context.classroomId) {
        return {
          ok: false,
          error: "classroom_id_missing",
          message: "Cannot query intervention history without an active classroom.",
        };
      }

      const studentRef = asString(args.student_ref);
      if (!studentRef) {
        return {
          ok: false,
          error: "student_ref_missing",
          message: "student_ref is required.",
        };
      }

      const days = asPositiveInt(args.days, 14, 60);
      const limit = asPositiveInt(args.limit, 5, 10);
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const records = getStudentInterventions(context.classroomId, studentRef, limit)
        .filter((record) => {
          const created = Date.parse(record.created_at ?? "");
          return Number.isNaN(created) || created >= cutoff;
        })
        .slice(0, limit)
        .map((record) => ({
          record_id: record.record_id,
          student_refs: record.student_refs,
          observation: record.observation,
          action_taken: record.action_taken,
          outcome: record.outcome,
          follow_up_needed: record.follow_up_needed,
          created_at: record.created_at,
        }));

      return {
        ok: true,
        student_ref: studentRef,
        days,
        count: records.length,
        records,
      };
    },
  };
}

function curriculumLookupTool(): RegisteredTool {
  return {
    definition: LOOKUP_CURRICULUM_OUTCOME,
    execute(args) {
      return lookupCurriculumOutcome({
        grade: asString(args.grade),
        subject: asString(args.subject),
        keyword: asString(args.keyword),
        limit: args.limit === undefined ? undefined : asPositiveInt(args.limit, 3, 5),
      });
    },
  };
}

export function getToolsForPromptClass(
  promptClass: PromptClass,
  context: ToolExecutionContext,
): RegisteredTool[] {
  switch (promptClass) {
    case "differentiate_material":
      return [curriculumLookupTool()];
    case "prepare_tomorrow_plan":
      return [interventionHistoryTool()];
    default:
      return context.promptClass === promptClass ? [] : [];
  }
}

export function toolDefinitions(tools: RegisteredTool[]): ToolDefinition[] {
  return tools.map((tool) => tool.definition);
}

export function normalizeToolCall(raw: unknown): NormalizedToolCall | null {
  const call = parseJsonObject(raw);
  const functionPayload = parseJsonObject(call.function ?? call.function_call ?? call.functionCall);
  const name = asString(call.name) || asString(functionPayload.name);
  if (!name) return null;

  const args =
    parseMaybeJsonObject(call.arguments)
    ?? parseMaybeJsonObject(call.args)
    ?? parseMaybeJsonObject(functionPayload.arguments)
    ?? parseMaybeJsonObject(functionPayload.args)
    ?? {};

  const id = asString(call.id) || asString(call.tool_call_id) || undefined;
  const thoughtSignature =
    asString(call.thought_signature)
    || asString(call.thoughtSignature)
    || asString(functionPayload.thought_signature)
    || asString(functionPayload.thoughtSignature)
    || undefined;
  return {
    id,
    thought_signature: thoughtSignature,
    name,
    arguments: args,
  };
}

export async function executeToolCalls(
  rawCalls: unknown[],
  tools: RegisteredTool[],
  context: ToolExecutionContext,
): Promise<ToolCallRecord[]> {
  const byName = new Map(tools.map((tool) => [tool.definition.name, tool]));
  const records: ToolCallRecord[] = [];

  for (const raw of rawCalls) {
    const call = normalizeToolCall(raw);
    if (!call) continue;
    const toolCallId = call.id ?? `tool_call_${records.length}`;
    const signature = call.thought_signature;

    const tool = byName.get(call.name);
    if (!tool) {
      records.push({
        tool_call_id: toolCallId,
        ...(signature ? { thought_signature: signature } : {}),
        tool_name: call.name,
        arguments: call.arguments,
        result: {
          ok: false,
          error: "tool_not_registered",
          message: `Tool ${call.name} is not registered for ${context.promptClass}.`,
        },
        executed: false,
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    try {
      records.push({
        tool_call_id: toolCallId,
        ...(signature ? { thought_signature: signature } : {}),
        tool_name: call.name,
        arguments: call.arguments,
        result: await tool.execute(call.arguments, context),
        executed: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      records.push({
        tool_call_id: toolCallId,
        ...(signature ? { thought_signature: signature } : {}),
        tool_name: call.name,
        arguments: call.arguments,
        result: {
          ok: false,
          error: "tool_execution_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        executed: false,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return records;
}
