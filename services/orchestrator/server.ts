/**
 * PrairieClassroom OS — Orchestrator API Server
 *
 * Express server that:
 * 1. Serves classroom/artifact data
 * 2. Routes differentiation requests through the prompt contract
 * 3. Calls the Python inference service
 * 4. Returns structured variants to the web UI
 *
 * Usage:
 *   npx tsx services/orchestrator/server.ts
 *   INFERENCE_URL=http://localhost:3200 npx tsx services/orchestrator/server.ts
 */

import express from "express";
import cors from "cors";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { getRoute, getModelId } from "./router.js";
import { buildDifferentiationPrompt, parseVariantsResponse } from "./differentiate.js";
import { buildTomorrowPlanPrompt, parseTomorrowPlanResponse } from "./tomorrow-plan.js";
import type { TomorrowPlanInput } from "./tomorrow-plan.js";
import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import type { LessonArtifact, DifferentiatedVariant } from "../../packages/shared/schemas/artifact.js";
import type { TomorrowPlan } from "../../packages/shared/schemas/plan.js";

const PORT = parseInt(process.env.PORT ?? "3100", 10);
const INFERENCE_URL = process.env.INFERENCE_URL ?? "http://127.0.0.1:3200";
const DATA_DIR = resolve(import.meta.dirname ?? ".", "../../data/synthetic_classrooms");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ----- Data loading -----

function loadClassrooms(): ClassroomProfile[] {
  const files = readdirSync(DATA_DIR).filter((f) => f.startsWith("classroom_") && f.endsWith(".json"));
  return files.map((f) => JSON.parse(readFileSync(join(DATA_DIR, f), "utf-8")));
}

function loadClassroom(id: string): ClassroomProfile | undefined {
  const classrooms = loadClassrooms();
  return classrooms.find((c) => c.classroom_id === id);
}

// ----- Routes -----

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "orchestrator" });
});

app.get("/api/classrooms", (_req, res) => {
  const classrooms = loadClassrooms();
  res.json(
    classrooms.map((c) => ({
      classroom_id: c.classroom_id,
      grade_band: c.grade_band,
      subject_focus: c.subject_focus,
      classroom_notes: c.classroom_notes,
    })),
  );
});

app.post("/api/differentiate", async (req, res) => {
  try {
    const { artifact, classroom_id, teacher_goal } = req.body as {
      artifact: LessonArtifact;
      classroom_id: string;
      teacher_goal?: string;
    };

    if (!artifact || !classroom_id) {
      res.status(400).json({ error: "Missing artifact or classroom_id" });
      return;
    }

    // Load classroom profile
    const classroom = loadClassroom(classroom_id);
    if (!classroom) {
      res.status(404).json({ error: `Classroom '${classroom_id}' not found` });
      return;
    }

    // Get route config
    const route = getRoute("differentiate_material");
    const modelId = getModelId(route.model_tier);

    // Build prompt
    const prompt = buildDifferentiationPrompt(artifact, classroom, teacher_goal);

    // Call inference service
    const inferenceResp = await fetch(`${INFERENCE_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `${prompt.system}\n\n${prompt.user}`,
        model_tier: route.model_tier,
        thinking: route.thinking_enabled,
        max_tokens: 4096,
      }),
    });

    if (!inferenceResp.ok) {
      const errText = await inferenceResp.text();
      res.status(502).json({ error: `Inference service error: ${errText}` });
      return;
    }

    const inferenceData = (await inferenceResp.json()) as {
      text: string;
      model_id: string;
      latency_ms: number;
    };

    // Parse variants from model output
    let variants: DifferentiatedVariant[];
    try {
      variants = parseVariantsResponse(inferenceData.text, artifact.artifact_id);
    } catch (parseErr) {
      res.status(422).json({
        error: "Failed to parse model output as variants",
        raw_output: inferenceData.text,
        parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
      return;
    }

    res.json({
      artifact_id: artifact.artifact_id,
      variants,
      model_id: inferenceData.model_id || modelId,
      latency_ms: inferenceData.latency_ms,
    });
  } catch (err) {
    console.error("Differentiation error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// ----- Tomorrow Plan Route -----

app.post("/api/tomorrow-plan", async (req, res) => {
  try {
    const { classroom_id, teacher_reflection, artifacts, teacher_goal } = req.body as {
      classroom_id: string;
      teacher_reflection: string;
      artifacts?: LessonArtifact[];
      teacher_goal?: string;
    };

    if (!classroom_id || !teacher_reflection) {
      res.status(400).json({ error: "Missing classroom_id or teacher_reflection" });
      return;
    }

    // Load classroom profile
    const classroom = loadClassroom(classroom_id);
    if (!classroom) {
      res.status(404).json({ error: `Classroom '${classroom_id}' not found` });
      return;
    }

    // Get route config (planning tier, thinking enabled)
    const route = getRoute("prepare_tomorrow_plan");
    const modelId = getModelId(route.model_tier);

    // Build prompt
    const planInput: TomorrowPlanInput = {
      classroom_id,
      teacher_reflection,
      artifacts,
      teacher_goal,
    };
    const prompt = buildTomorrowPlanPrompt(classroom, planInput);

    // Call inference service
    const inferenceResp = await fetch(`${INFERENCE_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `${prompt.system}\n\n${prompt.user}`,
        model_tier: route.model_tier,
        thinking: route.thinking_enabled,
        max_tokens: 4096,
      }),
    });

    if (!inferenceResp.ok) {
      const errText = await inferenceResp.text();
      res.status(502).json({ error: `Inference service error: ${errText}` });
      return;
    }

    const inferenceData = (await inferenceResp.json()) as {
      text: string;
      thinking_text: string | null;
      model_id: string;
      latency_ms: number;
    };

    // Parse plan from model output
    let plan: TomorrowPlan;
    try {
      const artifactIds = (artifacts ?? []).map((a) => a.artifact_id);
      plan = parseTomorrowPlanResponse(inferenceData.text, classroom_id, artifactIds);
    } catch (parseErr) {
      res.status(422).json({
        error: "Failed to parse model output as tomorrow plan",
        raw_output: inferenceData.text,
        parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
      return;
    }

    res.json({
      plan,
      thinking_summary: inferenceData.thinking_text ?? null,
      model_id: inferenceData.model_id || modelId,
      latency_ms: inferenceData.latency_ms,
    });
  } catch (err) {
    console.error("Tomorrow plan error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// ----- Start -----

app.listen(PORT, () => {
  console.log(`Orchestrator API running on http://localhost:${PORT}`);
  console.log(`Inference service expected at ${INFERENCE_URL}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
