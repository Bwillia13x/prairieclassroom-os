/**
 * Recent-run history schemas — lightweight metadata about recent teacher
 * generations (differentiate, simplify, vocab). Payloads are NOT persisted
 * here — the full response stays in sessionStorage on the teacher's browser.
 * These records exist so the chip row above the result canvas survives a
 * page reload or a switch between devices within retention.
 */
import { z } from "zod";

export const RUN_TOOLS = ["differentiate", "simplify", "vocab"] as const;
export const RunToolSchema = z.enum(RUN_TOOLS);
export type RunTool = z.infer<typeof RunToolSchema>;

/**
 * Write contract: the web hook posts one of these every time a generation
 * succeeds. `run_id` is a client-supplied stable id so the same run is never
 * double-counted on retry; the server upserts on that id.
 */
export const SaveRunRequestSchema = z.object({
  run_id: z.string().min(1).max(120),
  tool: RunToolSchema,
  label: z.string().min(1).max(160),
  created_at: z.string().min(1).max(64),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type SaveRunRequest = z.infer<typeof SaveRunRequestSchema>;

/**
 * Read contract: one record per persisted run, ordered newest-first.
 */
export const RunRecordSchema = z.object({
  run_id: z.string(),
  classroom_id: z.string(),
  tool: RunToolSchema,
  label: z.string(),
  created_at: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type RunRecord = z.infer<typeof RunRecordSchema>;

export const RunListResponseSchema = z.object({
  runs: z.array(RunRecordSchema),
});
export type RunListResponse = z.infer<typeof RunListResponseSchema>;

export const SaveRunResponseSchema = z.object({
  run_id: z.string(),
  created_at: z.string(),
});
export type SaveRunResponse = z.infer<typeof SaveRunResponseSchema>;

/**
 * Retention policy — keep the most recent N runs per (classroom, tool).
 * Exposed as a constant so the memory layer and the docs stay in lockstep.
 */
export const RUN_RETENTION_LIMIT = 30;
