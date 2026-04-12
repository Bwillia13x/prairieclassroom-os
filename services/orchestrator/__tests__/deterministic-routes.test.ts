import { afterEach, beforeEach, describe, expect, it } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { createTodayRouter } from "../routes/today.js";
import { createStudentSummaryRouter } from "../routes/student-summary.js";
import { createDebtRegisterRouter } from "../routes/debt-register.js";
import { closeAll } from "../../memory/db.js";
import type { ClassroomProfile } from "../../../packages/shared/schemas/classroom.js";
import type { RouteDeps } from "../route-deps.js";
import { createAuthMiddleware } from "../auth.js";

// ----- Test classrooms -----

const DEMO_CLASSROOM_ID = "demo-okafor-grade34";
const PROTECTED_CLASSROOM_ID = "protected-det-classroom";
const PROTECTED_CODE = "secret-det-code";

const CLASSROOMS: Record<string, ClassroomProfile> = {
  [DEMO_CLASSROOM_ID]: {
    classroom_id: DEMO_CLASSROOM_ID,
    grade_band: "3-4",
    subject_focus: "general",
    classroom_notes: ["Ms Okafor's split 3/4 class"],
    routines: { morning: "calendar math" },
    students: [
      {
        student_id: "s1",
        alias: "Ari",
        eal_flag: false,
        support_tags: ["reading"],
        known_successful_scaffolds: ["visual schedule"],
      },
      {
        student_id: "s2",
        alias: "Priya",
        eal_flag: true,
        support_tags: ["eal-beginner"],
        known_successful_scaffolds: ["sentence starters"],
        family_language: "Punjabi",
      },
    ],
  },
  [PROTECTED_CLASSROOM_ID]: {
    classroom_id: PROTECTED_CLASSROOM_ID,
    grade_band: "5-6",
    subject_focus: "general",
    classroom_notes: [],
    routines: {},
    students: [
      {
        student_id: "s3",
        alias: "Jordan",
        eal_flag: false,
        support_tags: [],
        known_successful_scaffolds: [],
      },
    ],
    access_code: PROTECTED_CODE,
  },
};

// ----- Deps and server helpers -----

function makeDeps(): RouteDeps {
  return {
    inferenceUrl: "http://127.0.0.1:9999",
    dataDir: "/tmp/prairieclassroom-det-tests",
    loadClassroom: (id: string) => CLASSROOMS[id],
    loadClassrooms: () => Object.values(CLASSROOMS),
    authMiddleware: createAuthMiddleware((id: string) => CLASSROOMS[id]),
  };
}

async function startServer() {
  const deps = makeDeps();
  const app = express();
  app.use(express.json());

  // Mount auth middleware on debt-register path before the router,
  // matching the server.ts pattern where authMiddleware is applied
  // as prefix middleware for /api/debt-register.
  app.use("/api/debt-register", deps.authMiddleware);

  // Mount routers at the same paths as server.ts
  app.use("/api/today", createTodayRouter(deps));
  app.use("/api/classrooms", createStudentSummaryRouter(deps));
  app.use("/api/debt-register", createDebtRegisterRouter(deps));

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

// ----- Tests -----

describe("deterministic / retrieval routes", () => {
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

  // ── GET /api/today/:classroomId ──────────────────────────────────────

  it("returns today snapshot for known demo classroom", async () => {
    const res = await fetch(`${baseUrl}/api/today/${DEMO_CLASSROOM_ID}`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("debt_register");
    expect(body).toHaveProperty("latest_plan");
    expect(body).toHaveProperty("latest_forecast");
    expect(body).toHaveProperty("student_count");
    expect(body.student_count).toBe(2);
  });

  it("returns 404 with classroom_not_found for unknown classroom on today", async () => {
    const res = await fetch(`${baseUrl}/api/today/nonexistent-classroom99`);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.category).toBe("validation");
    expect(body.detail_code).toBe("classroom_not_found");
  });

  it("returns 401 for protected classroom without code on today", async () => {
    const res = await fetch(`${baseUrl}/api/today/${PROTECTED_CLASSROOM_ID}`);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.category).toBe("auth");
    expect(body.detail_code).toBe("classroom_code_missing");
  });

  // ── GET /api/classrooms/:id/student-summary ─────────────────────────

  it("returns summaries array for known demo classroom", async () => {
    const res = await fetch(
      `${baseUrl}/api/classrooms/${DEMO_CLASSROOM_ID}/student-summary`,
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("summaries");
    expect(Array.isArray(body.summaries)).toBe(true);
    expect(body.summaries).toHaveLength(2);

    const aliases = body.summaries.map((s: { alias: string }) => s.alias);
    expect(aliases).toContain("Ari");
    expect(aliases).toContain("Priya");
  });

  it("returns 404 for unknown classroom on student-summary", async () => {
    const res = await fetch(
      `${baseUrl}/api/classrooms/nonexistent-classroom99/student-summary`,
    );
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.category).toBe("validation");
    expect(body.detail_code).toBe("classroom_not_found");
  });

  it("supports ?student= filter param on student-summary", async () => {
    const res = await fetch(
      `${baseUrl}/api/classrooms/${DEMO_CLASSROOM_ID}/student-summary?student=Priya`,
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.summaries).toHaveLength(1);
    expect(body.summaries[0].alias).toBe("Priya");
  });

  // ── GET /api/debt-register/:classroomId ─────────────────────────────

  it("returns register object for known demo classroom", async () => {
    const res = await fetch(
      `${baseUrl}/api/debt-register/${DEMO_CLASSROOM_ID}`,
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("register");
    expect(body.register).toHaveProperty("items");
    expect(body.register).toHaveProperty("generated_at");
  });

  it("returns 400 with invalid_classroom_id for path-traversal classroomId", async () => {
    const res = await fetch(
      `${baseUrl}/api/debt-register/${encodeURIComponent("../../../etc")}`,
    );
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.category).toBe("validation");
    expect(body.detail_code).toBe("invalid_classroom_id");
  });

  it("returns 404 for valid format but nonexistent classroom on debt-register", async () => {
    const res = await fetch(
      `${baseUrl}/api/debt-register/valid-but-missing-id`,
    );
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.category).toBe("validation");
    expect(body.detail_code).toBe("classroom_not_found");
  });

  it("allows protected classroom on debt-register with correct code", async () => {
    const res = await fetch(
      `${baseUrl}/api/debt-register/${PROTECTED_CLASSROOM_ID}`,
      { headers: { "X-Classroom-Code": PROTECTED_CODE } },
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("register");
  });
});
