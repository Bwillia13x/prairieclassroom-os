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
import { buildFamilyMessagePrompt, parseFamilyMessageResponse } from "./family-message.js";
import type { FamilyMessageInput } from "./family-message.js";
import { buildInterventionPrompt, parseInterventionResponse } from "./intervention.js";
import type { InterventionInput } from "./intervention.js";
import { buildSimplifyPrompt, parseSimplifyResponse } from "./simplify.js";
import type { SimplifyInput } from "./simplify.js";
import { buildVocabCardsPrompt, parseVocabCardsResponse } from "./vocab-cards.js";
import type { VocabCardsInput } from "./vocab-cards.js";
import { buildSupportPatternsPrompt, parseSupportPatternsResponse } from "./support-patterns.js";
import type { SupportPatternsInput } from "./support-patterns.js";
import { buildEABriefingPrompt, parseEABriefingResponse } from "./ea-briefing.js";
import type { EABriefingInput } from "./ea-briefing.js";
import { buildComplexityForecastPrompt, parseComplexityForecastResponse } from "./complexity-forecast.js";
import type { ComplexityForecastInput } from "./complexity-forecast.js";
import { savePlan, saveVariants, saveFamilyMessage, approveFamilyMessage, saveIntervention, savePatternReport, saveForecast } from "../memory/store.js";
import { checkpointAll } from "../memory/db.js";
import { createAuthMiddleware } from "./auth.js";
import { z } from "zod";
import {
  validateBody,
  DifferentiateRequestSchema,
  TomorrowPlanRequestSchema,
  FamilyMessageRequestSchema,
  ApproveMessageRequestSchema,
  InterventionRequestSchema,
  SimplifyRequestSchema,
  VocabCardsRequestSchema,
  SupportPatternsRequestSchema,
  EABriefingRequestSchema,
  ComplexityForecastRequestSchema,
} from "./validate.js";
import { getRecentPlans, summarizeRecentPlans, getRecentInterventions, summarizeRecentInterventions, buildPatternContext, getLatestPatternReport, summarizePatternInsights, buildEABriefingContext, getLatestForecast, buildForecastContext } from "../memory/retrieve.js";
import type { InterventionRecord } from "../../packages/shared/schemas/intervention.js";
import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import type { LessonArtifact, DifferentiatedVariant } from "../../packages/shared/schemas/artifact.js";
import type { TomorrowPlan } from "../../packages/shared/schemas/plan.js";
import type { FamilyMessageDraft } from "../../packages/shared/schemas/message.js";
import type { SupportPatternReport } from "../../packages/shared/schemas/pattern.js";
import type { EABriefing } from "../../packages/shared/schemas/briefing.js";
import type { ComplexityForecast } from "../../packages/shared/schemas/forecast.js";

const PORT = parseInt(process.env.PORT ?? "3100", 10);
const INFERENCE_URL = process.env.INFERENCE_URL ?? "http://127.0.0.1:3200";
const DATA_DIR = resolve(import.meta.dirname ?? ".", "../../data/synthetic_classrooms");

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
}));
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

// ----- Auth middleware -----

const authMiddleware = createAuthMiddleware(loadClassroom);
app.use("/api/differentiate", authMiddleware);
app.use("/api/tomorrow-plan", authMiddleware);
app.use("/api/family-message", authMiddleware);
app.use("/api/intervention", authMiddleware);
app.use("/api/simplify", authMiddleware);
app.use("/api/vocab-cards", authMiddleware);
app.use("/api/support-patterns", authMiddleware);
app.use("/api/ea-briefing", authMiddleware);
app.use("/api/complexity-forecast", authMiddleware);

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
      students: (c.students ?? []).map((s) => ({ alias: s.alias })),
    })),
  );
});

app.post("/api/differentiate", validateBody(DifferentiateRequestSchema), async (req, res) => {
  try {
    const { artifact, classroom_id, teacher_goal } = req.body;

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

    // Persist variants to classroom memory
    try {
      saveVariants(classroom_id, variants, inferenceData.model_id || modelId);
    } catch (memErr) {
      console.warn("Memory save failed (variants):", memErr);
    }
  } catch (err) {
    console.error("Differentiation error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// ----- Tomorrow Plan Route -----

app.post("/api/tomorrow-plan", validateBody(TomorrowPlanRequestSchema), async (req, res) => {
  try {
    const { classroom_id, teacher_reflection, artifacts, teacher_goal } = req.body as z.infer<typeof TomorrowPlanRequestSchema>;

    // Load classroom profile
    const classroom = loadClassroom(classroom_id);
    if (!classroom) {
      res.status(404).json({ error: `Classroom '${classroom_id}' not found` });
      return;
    }

    // Get route config (planning tier, thinking enabled)
    const route = getRoute("prepare_tomorrow_plan");
    const modelId = getModelId(route.model_tier);

    // Retrieve recent plans for memory injection
    let memorySummary = "";
    try {
      const recentPlans = getRecentPlans(classroom_id, 3);
      memorySummary = summarizeRecentPlans(recentPlans);
    } catch (memErr) {
      console.warn("Memory retrieval failed (plans):", memErr);
    }

    // Retrieve recent interventions for memory injection
    let interventionSummary = "";
    try {
      const recentInterventions = getRecentInterventions(classroom_id, 5);
      interventionSummary = summarizeRecentInterventions(recentInterventions);
    } catch (memErr) {
      console.warn("Memory retrieval failed (interventions):", memErr);
    }

    // Retrieve latest pattern report for pattern-informed planning
    let patternInsightsSummary = "";
    let patternInformed = false;
    try {
      const latestPattern = getLatestPatternReport(classroom_id);
      if (latestPattern) {
        patternInsightsSummary = summarizePatternInsights(latestPattern);
        patternInformed = true;
      }
    } catch (memErr) {
      console.warn("Memory retrieval failed (patterns):", memErr);
    }

    // Build prompt
    const planInput: TomorrowPlanInput = {
      classroom_id,
      teacher_reflection,
      artifacts,
      teacher_goal,
    };
    const prompt = buildTomorrowPlanPrompt(classroom, planInput, memorySummary, interventionSummary, patternInsightsSummary || undefined);

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
      pattern_informed: patternInformed,
      model_id: inferenceData.model_id || modelId,
      latency_ms: inferenceData.latency_ms,
    });

    // Persist plan to classroom memory
    try {
      savePlan(classroom_id, plan, teacher_reflection, inferenceData.model_id || modelId);
    } catch (memErr) {
      console.warn("Memory save failed (plan):", memErr);
    }
  } catch (err) {
    console.error("Tomorrow plan error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// ----- Family Message Route -----

app.post("/api/family-message", validateBody(FamilyMessageRequestSchema), async (req, res) => {
  try {
    const { classroom_id, student_refs, message_type, target_language, context } = req.body;

    const classroom = loadClassroom(classroom_id);
    if (!classroom) {
      res.status(404).json({ error: `Classroom '${classroom_id}' not found` });
      return;
    }

    const route = getRoute("draft_family_message");
    const modelId = getModelId(route.model_tier);

    const msgInput: FamilyMessageInput = {
      classroom_id,
      student_refs,
      message_type,
      target_language,
      context,
    };
    const prompt = buildFamilyMessagePrompt(classroom, msgInput);

    const inferenceResp = await fetch(`${INFERENCE_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `${prompt.system}\n\n${prompt.user}`,
        model_tier: route.model_tier,
        thinking: route.thinking_enabled,
        prompt_class: "draft_family_message",
        max_tokens: 2048,
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

    let draft: FamilyMessageDraft;
    try {
      draft = parseFamilyMessageResponse(inferenceData.text, classroom_id, msgInput);
    } catch (parseErr) {
      res.status(422).json({
        error: "Failed to parse model output as family message",
        raw_output: inferenceData.text,
        parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
      return;
    }

    // Persist to classroom memory
    try {
      saveFamilyMessage(classroom_id, draft, inferenceData.model_id || modelId);
    } catch (memErr) {
      console.warn("Memory save failed (family message):", memErr);
    }

    res.json({
      draft,
      model_id: inferenceData.model_id || modelId,
      latency_ms: inferenceData.latency_ms,
    });
  } catch (err) {
    console.error("Family message error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

app.post("/api/family-message/approve", validateBody(ApproveMessageRequestSchema), async (req, res) => {
  try {
    const { classroom_id, draft_id } = req.body;

    approveFamilyMessage(classroom_id, draft_id);
    res.json({ approved: true, draft_id });
  } catch (err) {
    console.error("Approval error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// ----- Intervention Logging Route -----

app.post("/api/intervention", validateBody(InterventionRequestSchema), async (req, res) => {
  try {
    const { classroom_id, student_refs, teacher_note, context } = req.body;

    const classroom = loadClassroom(classroom_id);
    if (!classroom) {
      res.status(404).json({ error: `Classroom '${classroom_id}' not found` });
      return;
    }

    const route = getRoute("log_intervention");
    const modelId = getModelId(route.model_tier);

    const intInput: InterventionInput = {
      classroom_id,
      student_refs,
      teacher_note,
      context,
    };
    const prompt = buildInterventionPrompt(classroom, intInput);

    const inferenceResp = await fetch(`${INFERENCE_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `${prompt.system}\n\n${prompt.user}`,
        model_tier: route.model_tier,
        thinking: route.thinking_enabled,
        prompt_class: "log_intervention",
        max_tokens: 1024,
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

    let record: InterventionRecord;
    try {
      record = parseInterventionResponse(inferenceData.text, classroom_id, intInput);
    } catch (parseErr) {
      res.status(422).json({
        error: "Failed to parse model output as intervention record",
        raw_output: inferenceData.text,
        parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
      return;
    }

    // Persist to classroom memory
    try {
      saveIntervention(classroom_id, record, inferenceData.model_id || modelId);
    } catch (memErr) {
      console.warn("Memory save failed (intervention):", memErr);
    }

    res.json({
      record,
      model_id: inferenceData.model_id || modelId,
      latency_ms: inferenceData.latency_ms,
    });
  } catch (err) {
    console.error("Intervention logging error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// ----- Simplify for Student Route -----

app.post("/api/simplify", validateBody(SimplifyRequestSchema), async (req, res) => {
  try {
    const { source_text, grade_band, eal_level } = req.body;

    const route = getRoute("simplify_for_student");
    const modelId = getModelId(route.model_tier);

    const simplifyInput: SimplifyInput = { source_text, grade_band, eal_level };
    const prompt = buildSimplifyPrompt(simplifyInput);

    const inferenceResp = await fetch(`${INFERENCE_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `${prompt.system}\n\n${prompt.user}`,
        model_tier: route.model_tier,
        thinking: route.thinking_enabled,
        prompt_class: "simplify_for_student",
        max_tokens: 2048,
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

    let simplified;
    try {
      simplified = parseSimplifyResponse(inferenceData.text, simplifyInput);
    } catch (parseErr) {
      res.status(422).json({
        error: "Failed to parse model output as simplified text",
        raw_output: inferenceData.text,
        parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
      return;
    }

    res.json({
      simplified,
      model_id: inferenceData.model_id || modelId,
      latency_ms: inferenceData.latency_ms,
    });
  } catch (err) {
    console.error("Simplify error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// ----- Vocab Cards Route -----

app.post("/api/vocab-cards", validateBody(VocabCardsRequestSchema), async (req, res) => {
  try {
    const { artifact_id, artifact_text, subject, target_language, grade_band } = req.body;

    const route = getRoute("generate_vocab_cards");
    const modelId = getModelId(route.model_tier);

    const vocabInput: VocabCardsInput = {
      artifact_id: artifact_id || "unknown",
      artifact_text,
      subject,
      target_language,
      grade_band,
    };
    const prompt = buildVocabCardsPrompt(vocabInput);

    const inferenceResp = await fetch(`${INFERENCE_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `${prompt.system}\n\n${prompt.user}`,
        model_tier: route.model_tier,
        thinking: route.thinking_enabled,
        prompt_class: "generate_vocab_cards",
        max_tokens: 2048,
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

    let cardSet;
    try {
      cardSet = parseVocabCardsResponse(inferenceData.text, vocabInput);
    } catch (parseErr) {
      res.status(422).json({
        error: "Failed to parse model output as vocab cards",
        raw_output: inferenceData.text,
        parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
      return;
    }

    res.json({
      card_set: cardSet,
      model_id: inferenceData.model_id || modelId,
      latency_ms: inferenceData.latency_ms,
    });
  } catch (err) {
    console.error("Vocab cards error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// ----- Support Patterns Route -----

app.post("/api/support-patterns", validateBody(SupportPatternsRequestSchema), async (req, res) => {
  try {
    const { classroom_id, student_filter, time_window } = req.body;

    const classroom = loadClassroom(classroom_id);
    if (!classroom) {
      res.status(404).json({ error: `Classroom '${classroom_id}' not found` });
      return;
    }

    const route = getRoute("detect_support_patterns");
    const modelId = getModelId(route.model_tier);

    const window = time_window ?? 10;
    const patternInput: SupportPatternsInput = {
      classroom_id,
      student_filter,
      time_window: window,
    };

    let patternCtx = "";
    try {
      patternCtx = buildPatternContext(classroom_id, student_filter, window);
    } catch (memErr) {
      console.warn("Memory retrieval failed (patterns):", memErr);
    }

    const prompt = buildSupportPatternsPrompt(classroom, patternInput, patternCtx);

    const inferenceResp = await fetch(`${INFERENCE_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `${prompt.system}\n\n${prompt.user}`,
        model_tier: route.model_tier,
        thinking: route.thinking_enabled,
        prompt_class: "detect_support_patterns",
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

    let report: SupportPatternReport;
    try {
      report = parseSupportPatternsResponse(
        inferenceData.text,
        classroom_id,
        patternInput,
      );
    } catch (parseErr) {
      res.status(422).json({
        error: "Failed to parse model output as support pattern report",
        raw_output: inferenceData.text,
        parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
      return;
    }

    // Persist pattern report to classroom memory
    try {
      savePatternReport(classroom_id, report, inferenceData.model_id || modelId);
    } catch (memErr) {
      console.warn("Memory save failed (pattern report):", memErr);
    }

    res.json({
      report,
      thinking_summary: inferenceData.thinking_text ?? null,
      model_id: inferenceData.model_id || modelId,
      latency_ms: inferenceData.latency_ms,
    });
  } catch (err) {
    console.error("Support patterns error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// ----- Latest Pattern Report Retrieval -----

app.get("/api/support-patterns/latest/:classroomId", (req, res) => {
  try {
    const classroomId = req.params.classroomId as string;
    const report = getLatestPatternReport(classroomId);
    if (!report) {
      res.json({ report: null });
      return;
    }
    res.json({ report });
  } catch (err) {
    console.error("Pattern retrieval error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// ----- EA Daily Briefing Route -----

app.post("/api/ea-briefing", validateBody(EABriefingRequestSchema), async (req, res) => {
  try {
    const { classroom_id, ea_name } = req.body;

    const classroom = loadClassroom(classroom_id);
    if (!classroom) {
      res.status(404).json({ error: `Classroom '${classroom_id}' not found` });
      return;
    }

    const route = getRoute("generate_ea_briefing");
    const modelId = getModelId(route.model_tier);

    const briefingInput: EABriefingInput = { classroom_id, ea_name };

    let briefingCtx = "";
    try {
      briefingCtx = buildEABriefingContext(classroom_id);
    } catch (memErr) {
      console.warn("Memory retrieval failed (ea briefing):", memErr);
    }

    const prompt = buildEABriefingPrompt(classroom, briefingInput, briefingCtx);

    const inferenceResp = await fetch(`${INFERENCE_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `${prompt.system}\n\n${prompt.user}`,
        model_tier: route.model_tier,
        thinking: route.thinking_enabled,
        prompt_class: "generate_ea_briefing",
        max_tokens: 2048,
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

    let briefing: EABriefing;
    try {
      briefing = parseEABriefingResponse(inferenceData.text, classroom_id);
    } catch (parseErr) {
      res.status(422).json({
        error: "Failed to parse model output as EA briefing",
        raw_output: inferenceData.text,
        parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
      return;
    }

    // No persistence — briefings are ephemeral synthesis views

    res.json({
      briefing,
      model_id: inferenceData.model_id || modelId,
      latency_ms: inferenceData.latency_ms,
    });
  } catch (err) {
    console.error("EA briefing error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// ----- Complexity Forecast Route -----

app.post("/api/complexity-forecast", validateBody(ComplexityForecastRequestSchema), async (req, res) => {
  try {
    const { classroom_id, forecast_date, teacher_notes } = req.body;

    const classroom = loadClassroom(classroom_id);
    if (!classroom) {
      res.status(404).json({ error: `Classroom '${classroom_id}' not found` });
      return;
    }

    const route = getRoute("forecast_complexity");
    const modelId = getModelId(route.model_tier);

    const forecastInput: ComplexityForecastInput = {
      classroom_id,
      forecast_date,
      teacher_notes,
    };

    let forecastCtx = "";
    try {
      forecastCtx = buildForecastContext(classroom_id);
    } catch (memErr) {
      console.warn("Memory retrieval failed (forecast context):", memErr);
    }

    const prompt = buildComplexityForecastPrompt(classroom, forecastInput, forecastCtx || undefined);

    const inferenceResp = await fetch(`${INFERENCE_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `${prompt.system}\n\n${prompt.user}`,
        model_tier: route.model_tier,
        thinking: route.thinking_enabled,
        prompt_class: "forecast_complexity",
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

    let forecast: ComplexityForecast;
    try {
      forecast = parseComplexityForecastResponse(inferenceData.text, classroom_id, forecast_date);
    } catch (parseErr) {
      res.status(422).json({
        error: "Failed to parse model output as complexity forecast",
        raw_output: inferenceData.text,
        parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
      return;
    }

    // Persist forecast to classroom memory
    try {
      saveForecast(classroom_id, forecast, inferenceData.model_id || modelId);
    } catch (memErr) {
      console.warn("Memory save failed (forecast):", memErr);
    }

    res.json({
      forecast,
      thinking_summary: inferenceData.thinking_text ?? null,
      model_id: inferenceData.model_id || modelId,
      latency_ms: inferenceData.latency_ms,
    });
  } catch (err) {
    console.error("Complexity forecast error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// ----- Latest Forecast Retrieval -----

app.get("/api/complexity-forecast/latest/:classroomId", (req, res) => {
  try {
    const classroomId = req.params.classroomId as string;
    const forecast = getLatestForecast(classroomId);
    if (!forecast) {
      res.json({ forecast: null });
      return;
    }
    res.json({ forecast });
  } catch (err) {
    console.error("Forecast retrieval error:", err);
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

  // Checkpoint WAL files on startup and every 5 minutes
  checkpointAll();
  setInterval(checkpointAll, 5 * 60 * 1000);

  // Check for demo classroom
  const classrooms = loadClassrooms();
  const demo = classrooms.find((c) => c.classroom_id === "demo-okafor-grade34");
  if (demo) {
    console.log(`Demo classroom available: ${demo.classroom_id} (${demo.grade_band}, ${demo.students.length} students)`);
    console.log(`  → Visit http://localhost:5173/?demo=true for demo mode`);
  }
});
