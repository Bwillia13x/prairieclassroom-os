import { afterEach, beforeEach, describe, expect, it } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { createTodayRouter } from "../routes/today.js";
import { createHistoryRouter } from "../routes/history.js";
import { createFeedbackRouter } from "../routes/feedback.js";
import { createSessionsRouter } from "../routes/sessions.js";
import { closeAll } from "../../memory/db.js";
import type { ClassroomProfile } from "../../../packages/shared/schemas/classroom.js";
import type { RouteDeps } from "../route-deps.js";
import { createAuthMiddleware, requireClassroomRole } from "../auth.js";

const PROTECTED_CLASSROOM_ID = "protected-route-classroom";
const OPEN_CLASSROOM_ID = "open-route-classroom";
const PROTECTED_CODE = "protected-route-code";

const CLASSROOMS: Record<string, ClassroomProfile> = {
  [PROTECTED_CLASSROOM_ID]: {
    classroom_id: PROTECTED_CLASSROOM_ID,
    grade_band: "3-4",
    subject_focus: "general",
    classroom_notes: [],
    routines: {},
    students: [],
    access_code: PROTECTED_CODE,
  },
  [OPEN_CLASSROOM_ID]: {
    classroom_id: OPEN_CLASSROOM_ID,
    grade_band: "K-1",
    subject_focus: "general",
    classroom_notes: [],
    routines: {},
    students: [],
  },
};

function makeDeps(): RouteDeps {
  return {
    inferenceUrl: "http://127.0.0.1:9999",
    dataDir: "/tmp/prairieclassroom-tests",
    loadClassroom: (id: string) => CLASSROOMS[id],
    loadClassrooms: () => Object.values(CLASSROOMS),
    authMiddleware: createAuthMiddleware((id: string) => CLASSROOMS[id]),
    requireClassroomRole,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const deps = makeDeps();
  app.use("/api/today", deps.authMiddleware, requireClassroomRole(["teacher", "ea"]));
  app.use("/api/today", createTodayRouter(deps));
  app.use("/api/classrooms", createHistoryRouter(deps));
  app.use("/api/feedback", createFeedbackRouter(deps));
  app.use("/api/sessions", createSessionsRouter(deps));

  const server = await new Promise<Server>((resolve) => {
    const nextServer = app.listen(0, "127.0.0.1", () => resolve(nextServer));
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to resolve test server address");
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

async function stopServer(server: Server | null) {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

describe("protected classroom routes", () => {
  let server: Server | null = null;
  let baseUrl = "";

  beforeEach(async () => {
    const running = await startServer();
    server = running.server;
    baseUrl = running.baseUrl;
  });

  afterEach(async () => {
    await stopServer(server);
    server = null;
    baseUrl = "";
    closeAll();
  });

  it("protects GET /api/today/:classroomId when an access code is required", async () => {
    const missingCode = await fetch(`${baseUrl}/api/today/${PROTECTED_CLASSROOM_ID}`);
    expect(missingCode.status).toBe(401);
    await expect(missingCode.json()).resolves.toMatchObject({
      category: "auth",
      detail_code: "classroom_code_missing",
    });

    const wrongCode = await fetch(`${baseUrl}/api/today/${PROTECTED_CLASSROOM_ID}`, {
      headers: { "X-Classroom-Code": "wrong-code" },
    });
    expect(wrongCode.status).toBe(403);
    await expect(wrongCode.json()).resolves.toMatchObject({
      category: "auth",
      detail_code: "classroom_code_invalid",
    });

    const allowed = await fetch(`${baseUrl}/api/today/${PROTECTED_CLASSROOM_ID}`, {
      headers: { "X-Classroom-Code": PROTECTED_CODE },
    });
    expect(allowed.status).toBe(200);
    await expect(allowed.json()).resolves.toMatchObject({
      student_count: 0,
      latest_plan: null,
      latest_forecast: null,
    });

    const eaAllowed = await fetch(`${baseUrl}/api/today/${PROTECTED_CLASSROOM_ID}`, {
      headers: {
        "X-Classroom-Code": PROTECTED_CODE,
        "X-Classroom-Role": "ea",
      },
    });
    expect(eaAllowed.status).toBe(200);
  });

  it("protects history endpoints mounted at /api/classrooms/:id/*", async () => {
    const missingCode = await fetch(`${baseUrl}/api/classrooms/${PROTECTED_CLASSROOM_ID}/messages`);
    expect(missingCode.status).toBe(401);
    await expect(missingCode.json()).resolves.toMatchObject({
      detail_code: "classroom_code_missing",
    });

    const wrongCode = await fetch(`${baseUrl}/api/classrooms/${PROTECTED_CLASSROOM_ID}/patterns`, {
      headers: { "X-Classroom-Code": "wrong-code" },
    });
    expect(wrongCode.status).toBe(403);
    await expect(wrongCode.json()).resolves.toMatchObject({
      detail_code: "classroom_code_invalid",
    });

    const allowed = await fetch(`${baseUrl}/api/classrooms/${PROTECTED_CLASSROOM_ID}/plans`, {
      headers: { "X-Classroom-Code": PROTECTED_CODE },
    });
    expect(allowed.status).toBe(200);
    await expect(allowed.json()).resolves.toEqual({ plans: [] });

    const eaBlocked = await fetch(`${baseUrl}/api/classrooms/${PROTECTED_CLASSROOM_ID}/plans`, {
      headers: {
        "X-Classroom-Code": PROTECTED_CODE,
        "X-Classroom-Role": "ea",
      },
    });
    expect(eaBlocked.status).toBe(403);
    await expect(eaBlocked.json()).resolves.toMatchObject({
      detail_code: "classroom_role_forbidden",
      details: {
        role: "ea",
        allowed_roles: ["teacher"],
      },
    });
  });

  it("protects feedback and session summaries for protected classrooms", async () => {
    const feedbackMissingCode = await fetch(`${baseUrl}/api/feedback/summary/${PROTECTED_CLASSROOM_ID}`);
    expect(feedbackMissingCode.status).toBe(401);
    await expect(feedbackMissingCode.json()).resolves.toMatchObject({
      detail_code: "classroom_code_missing",
    });

    const sessionWrongCode = await fetch(`${baseUrl}/api/sessions/summary/${PROTECTED_CLASSROOM_ID}`, {
      headers: { "X-Classroom-Code": "wrong-code" },
    });
    expect(sessionWrongCode.status).toBe(403);
    await expect(sessionWrongCode.json()).resolves.toMatchObject({
      detail_code: "classroom_code_invalid",
    });

    const feedbackAllowed = await fetch(`${baseUrl}/api/feedback/summary/${PROTECTED_CLASSROOM_ID}`, {
      headers: { "X-Classroom-Code": PROTECTED_CODE },
    });
    expect(feedbackAllowed.status).toBe(200);
    await expect(feedbackAllowed.json()).resolves.toMatchObject({
      total: 0,
    });

    const sessionEaAllowed = await fetch(`${baseUrl}/api/sessions/summary/${PROTECTED_CLASSROOM_ID}`, {
      headers: {
        "X-Classroom-Code": PROTECTED_CODE,
        "X-Classroom-Role": "ea",
      },
    });
    expect(sessionEaAllowed.status).toBe(200);
    await expect(sessionEaAllowed.json()).resolves.toMatchObject({
      total_sessions: 0,
    });
  });

  it("returns 404 for summary endpoints when the classroom does not exist", async () => {
    const feedbackMissingClassroom = await fetch(`${baseUrl}/api/feedback/summary/missing-classroom`);
    expect(feedbackMissingClassroom.status).toBe(404);
    await expect(feedbackMissingClassroom.json()).resolves.toMatchObject({
      detail_code: "classroom_not_found",
    });

    const sessionMissingClassroom = await fetch(`${baseUrl}/api/sessions/summary/missing-classroom`);
    expect(sessionMissingClassroom.status).toBe(404);
    await expect(sessionMissingClassroom.json()).resolves.toMatchObject({
      detail_code: "classroom_not_found",
    });
  });
});
