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
import { assertMemoryBackendReady, checkpointAll } from "../memory/db.js";
import { createAuthMiddleware, isDemoClassroom, requireClassroomRole } from "./auth.js";
import { isValidClassroomId } from "./validate.js";
import { ClassroomProfileSchema, type ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import type { RouteDeps } from "./route-deps.js";

// ----- Middleware -----
import { requestLogger } from "./middleware/requestLogger.js";
import { inputSanitizer } from "./middleware/inputSanitizer.js";
import { globalLimiter, authLimiter } from "./middleware/rateLimiter.js";

// ----- Route modules -----
import { createHealthRouter } from "./routes/health.js";
import { createClassroomsRouter } from "./routes/classrooms.js";
import { createDifferentiateRouter } from "./routes/differentiate.js";
import { createTomorrowPlanRouter } from "./routes/tomorrow-plan.js";
import { createFamilyMessageRouter } from "./routes/family-message.js";
import { createInterventionRouter } from "./routes/intervention.js";
import { createLanguageToolsRouter } from "./routes/language-tools.js";
import { createSupportPatternsRouter } from "./routes/support-patterns.js";
import { createEABriefingRouter } from "./routes/ea-briefing.js";
import { createForecastRouter } from "./routes/forecast.js";
import { createEALoadRouter } from "./routes/ea-load.js";
import { createDebtRegisterRouter } from "./routes/debt-register.js";
import { createTodayRouter } from "./routes/today.js";
import { createHistoryRouter } from "./routes/history.js";
import { createScaffoldDecayRouter } from "./routes/scaffold-decay.js";
import { createSurvivalPacketRouter } from "./routes/survival-packet.js";
import { createExtractWorksheetRouter } from "./routes/extract-worksheet.js";
import { createClassroomHealthRouter } from "./routes/classroom-health.js";
import { createStudentSummaryRouter } from "./routes/student-summary.js";
import { createFeedbackRouter } from "./routes/feedback.js";
import { createSessionsRouter } from "./routes/sessions.js";
import { createCurriculumRouter } from "./routes/curriculum.js";
import { createRunsRouter } from "./routes/runs.js";

// ----- Config -----

const PORT = parseInt(process.env.PORT ?? "3100", 10);
if (Number.isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`Invalid PORT: ${process.env.PORT}. Must be a number between 1 and 65535.`);
  process.exit(1);
}

const INFERENCE_URL = process.env.INFERENCE_URL ?? "http://127.0.0.1:3200";
try {
  new URL(INFERENCE_URL);
} catch {
  console.error(`Invalid INFERENCE_URL: ${INFERENCE_URL}. Must be a valid URL (e.g. http://127.0.0.1:3200).`);
  process.exit(1);
}

const DEFAULT_DATA_DIR = resolve(import.meta.dirname ?? ".", "../../data/synthetic_classrooms");
const DATA_DIR = process.env.PRAIRIE_DATA_DIR
  ? resolve(process.env.PRAIRIE_DATA_DIR)
  : DEFAULT_DATA_DIR;

// ----- Data loading -----

/**
 * Load classroom profiles from JSON on disk. Each profile is validated against
 * `ClassroomProfileSchema`. Invalid profiles are logged and skipped rather than
 * silently typed — this prevents malformed roster data from flowing into the
 * inference client, where a missing `students[]` would previously disable the
 * `query_intervention_history` roster check (P0 hallucination risk).
 */
function loadClassrooms(): ClassroomProfile[] {
  const files = readdirSync(DATA_DIR).filter((f) => f.startsWith("classroom_") && f.endsWith(".json"));
  const profiles: ClassroomProfile[] = [];
  for (const file of files) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(join(DATA_DIR, file), "utf-8"));
    } catch (err) {
      console.error(`[classroom-load] ${file}: invalid JSON — skipping`, err);
      continue;
    }
    const parsed = ClassroomProfileSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(
        `[classroom-load] ${file}: failed schema validation — skipping.`,
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      );
      continue;
    }
    profiles.push(parsed.data);
  }
  return profiles;
}

function loadClassroom(id: string): ClassroomProfile | undefined {
  if (!isValidClassroomId(id)) return undefined;
  const classrooms = loadClassrooms();
  return classrooms.find((c) => c.classroom_id === id);
}

// ----- App setup -----

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json({ limit: "10mb" }));

// Security headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use(requestLogger);
app.use(inputSanitizer);
app.use(globalLimiter);

// ----- Auth middleware -----
//
// Role scope matrix (authoritative):
// Each mount's middleware is the UNION of roles allowed on any route under
// that prefix. Routes with narrower scopes add a route-level
// `requireRoles(deps, [...])` gate (see individual route files + history.ts,
// today.ts, debt-register.ts, feedback.ts, sessions.ts,
// support-patterns.ts, forecast.ts). Mount-level checks only enforce role on
// routes with `classroom_id` in the body because URL params aren't resolved
// until the sub-router's route handler runs.

const authMiddleware = createAuthMiddleware(loadClassroom);
const teacherOnly = requireClassroomRole(["teacher"]);
const teacherOrEa = requireClassroomRole(["teacher", "ea"]);
const teacherEaOrSubstitute = requireClassroomRole(["teacher", "ea", "substitute"]);
const teacherOrReviewer = requireClassroomRole(["teacher", "reviewer"]);
const teacherSubstituteOrReviewer = requireClassroomRole(["teacher", "substitute", "reviewer"]);
const teacherEaOrReviewer = requireClassroomRole(["teacher", "ea", "reviewer"]);
const teacherEaSubstituteOrReviewer = requireClassroomRole(["teacher", "ea", "substitute", "reviewer"]);

const deps: RouteDeps = {
  inferenceUrl: INFERENCE_URL,
  dataDir: DATA_DIR,
  loadClassroom,
  loadClassrooms,
  authMiddleware,
  requireClassroomRole,
};

try {
  assertMemoryBackendReady();
} catch (error) {
  console.error("Memory backend preflight failed. Ensure the repo is running on the supported Node version and rebuild better-sqlite3.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

app.use("/api/differentiate", authLimiter, authMiddleware, teacherOnly);
app.use("/api/tomorrow-plan", authLimiter, authMiddleware, teacherOnly);
app.use("/api/family-message", authLimiter, authMiddleware, teacherOnly);
app.use("/api/intervention", authLimiter, authMiddleware, teacherEaOrSubstitute);
app.use("/api/simplify", authLimiter, authMiddleware, teacherOnly);
app.use("/api/vocab-cards", authLimiter, authMiddleware, teacherOnly);
app.use("/api/support-patterns", authLimiter, authMiddleware, teacherOrReviewer);
app.use("/api/ea-briefing", authLimiter, authMiddleware, teacherEaOrSubstitute);
app.use("/api/complexity-forecast", authLimiter, authMiddleware, teacherSubstituteOrReviewer);
app.use("/api/ea-load", authLimiter, authMiddleware, teacherOrEa);
app.use("/api/debt-register", authLimiter, authMiddleware, teacherEaSubstituteOrReviewer);
app.use("/api/today", authLimiter, authMiddleware, teacherEaOrSubstitute);
app.use("/api/scaffold-decay", authLimiter, authMiddleware, teacherOnly);
app.use("/api/survival-packet", authLimiter, authMiddleware, teacherOnly);
app.use("/api/extract-worksheet", authLimiter, authMiddleware, teacherOnly);
app.use("/api/feedback", authLimiter, authMiddleware, teacherEaOrReviewer);
app.use("/api/sessions", authLimiter, authMiddleware, teacherEaSubstituteOrReviewer);

// ----- Mount routes -----

app.use("/", createHealthRouter(deps));
app.use("/api/classrooms", createClassroomsRouter(deps));
app.use("/api/curriculum", createCurriculumRouter());
app.use("/api/differentiate", createDifferentiateRouter(deps));
app.use("/api/tomorrow-plan", createTomorrowPlanRouter(deps));
app.use("/api/family-message", createFamilyMessageRouter(deps));
app.use("/api/intervention", createInterventionRouter(deps));
app.use("/api", createLanguageToolsRouter(deps));
app.use("/api/support-patterns", createSupportPatternsRouter(deps));
app.use("/api/ea-briefing", createEABriefingRouter(deps));
app.use("/api/complexity-forecast", createForecastRouter(deps));
app.use("/api/ea-load", createEALoadRouter(deps));
app.use("/api/debt-register", createDebtRegisterRouter(deps));
app.use("/api/today", createTodayRouter(deps));
app.use("/api/classrooms", createHistoryRouter(deps));
app.use("/api/classrooms", createClassroomHealthRouter(deps));
app.use("/api/classrooms", createStudentSummaryRouter(deps));
app.use("/api/classrooms", createRunsRouter(deps));
app.use("/api/scaffold-decay", createScaffoldDecayRouter(deps));
app.use("/api/survival-packet", createSurvivalPacketRouter(deps));
app.use("/api/extract-worksheet", createExtractWorksheetRouter(deps));
app.use("/api/feedback", createFeedbackRouter(deps));
app.use("/api/sessions", createSessionsRouter(deps));

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
  const demo = classrooms.find((c) => isDemoClassroom(c));
  if (demo) {
    console.log(`Demo classroom available: ${demo.classroom_id} (${demo.grade_band}, ${demo.students.length} students)`);
    console.log(`  → Visit http://localhost:5173/?demo=true for demo mode`);
  }
});
