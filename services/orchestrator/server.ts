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
import { checkpointAll } from "../memory/db.js";
import { createAuthMiddleware } from "./auth.js";
import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import type { RouteDeps } from "./route-deps.js";

// ----- Middleware -----
import { requestLogger } from "./middleware/requestLogger.js";
import { inputSanitizer } from "./middleware/inputSanitizer.js";

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
import { createDebtRegisterRouter } from "./routes/debt-register.js";
import { createTodayRouter } from "./routes/today.js";
import { createHistoryRouter } from "./routes/history.js";
import { createScaffoldDecayRouter } from "./routes/scaffold-decay.js";
import { createSurvivalPacketRouter } from "./routes/survival-packet.js";

// ----- Config -----

const PORT = parseInt(process.env.PORT ?? "3100", 10);
const INFERENCE_URL = process.env.INFERENCE_URL ?? "http://127.0.0.1:3200";
const DATA_DIR = resolve(import.meta.dirname ?? ".", "../../data/synthetic_classrooms");

// ----- Data loading -----

function loadClassrooms(): ClassroomProfile[] {
  const files = readdirSync(DATA_DIR).filter((f) => f.startsWith("classroom_") && f.endsWith(".json"));
  return files.map((f) => JSON.parse(readFileSync(join(DATA_DIR, f), "utf-8")));
}

function loadClassroom(id: string): ClassroomProfile | undefined {
  const classrooms = loadClassrooms();
  return classrooms.find((c) => c.classroom_id === id);
}

// ----- App setup -----

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));
app.use(requestLogger);
app.use(inputSanitizer);

const deps: RouteDeps = { inferenceUrl: INFERENCE_URL, dataDir: DATA_DIR, loadClassroom, loadClassrooms };

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
app.use("/api/debt-register", authMiddleware);
app.use("/api/scaffold-decay", authMiddleware);
app.use("/api/survival-packet", authMiddleware);

// ----- Mount routes -----

app.use("/", createHealthRouter(deps));
app.use("/api/classrooms", createClassroomsRouter(deps));
app.use("/api/differentiate", createDifferentiateRouter(deps));
app.use("/api/tomorrow-plan", createTomorrowPlanRouter(deps));
app.use("/api/family-message", createFamilyMessageRouter(deps));
app.use("/api/intervention", createInterventionRouter(deps));
app.use("/api", createLanguageToolsRouter(deps));
app.use("/api/support-patterns", createSupportPatternsRouter(deps));
app.use("/api/ea-briefing", createEABriefingRouter(deps));
app.use("/api/complexity-forecast", createForecastRouter(deps));
app.use("/api/debt-register", createDebtRegisterRouter(deps));
app.use("/api/today", createTodayRouter(deps));
app.use("/api/classrooms", createHistoryRouter(deps));
app.use("/api/scaffold-decay", createScaffoldDecayRouter(deps));
app.use("/api/survival-packet", createSurvivalPacketRouter(deps));

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
