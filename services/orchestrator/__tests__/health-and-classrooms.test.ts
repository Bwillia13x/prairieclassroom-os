import { afterEach, beforeEach, describe, expect, it } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { createHealthRouter } from "../routes/health.js";
import { createClassroomsRouter } from "../routes/classrooms.js";
import { closeAll } from "../../memory/db.js";
import type { ClassroomProfile } from "../../../packages/shared/schemas/classroom.js";
import type { RouteDeps } from "../route-deps.js";
import { createAuthMiddleware } from "../auth.js";

/* ---------- test fixtures ---------- */

const OPEN_CLASSROOM: ClassroomProfile = {
  classroom_id: "hc-open-room",
  grade_band: "3-4",
  subject_focus: "science",
  classroom_notes: ["Loves frogs"],
  routines: { morning: "calendar" },
  students: [
    {
      student_id: "s1",
      alias: "Fern",
      eal_flag: false,
      support_tags: [],
      known_successful_scaffolds: [],
      family_language: "English",
    },
  ],
  schedule: [{ time_slot: "09:00", activity: "Math block", ea_available: false }],
  upcoming_events: [{ event_date: "2026-04-15", description: "Field trip" }],
  sub_ready: true,
};

const PROTECTED_CLASSROOM: ClassroomProfile = {
  classroom_id: "hc-protected-room",
  grade_band: "K-1",
  subject_focus: "general",
  classroom_notes: [],
  routines: {},
  students: [],
  access_code: "secret-hc-code",
};

const CLASSROOMS: Record<string, ClassroomProfile> = {
  [OPEN_CLASSROOM.classroom_id]: OPEN_CLASSROOM,
  [PROTECTED_CLASSROOM.classroom_id]: PROTECTED_CLASSROOM,
};

/* ---------- fake inference server ---------- */

function startFakeInference(healthy: boolean): Promise<{ server: Server; url: string }> {
  const app = express();
  app.get("/health", (_req, res) => {
    if (healthy) {
      res.json({ status: "ok" });
    } else {
      res.status(503).json({ status: "down" });
    }
  });
  return new Promise((resolve) => {
    const srv = app.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (!addr || typeof addr === "string") throw new Error("bad address");
      resolve({ server: srv, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

/* ---------- test server ---------- */

function makeDeps(inferenceUrl: string): RouteDeps {
  return {
    inferenceUrl,
    dataDir: "/tmp/prairieclassroom-hc-tests",
    loadClassroom: (id: string) => CLASSROOMS[id],
    loadClassrooms: () => Object.values(CLASSROOMS),
    authMiddleware: createAuthMiddleware((id: string) => CLASSROOMS[id]),
  };
}

async function startServer(inferenceUrl: string) {
  const deps = makeDeps(inferenceUrl);
  const app = express();
  app.use(express.json());
  // Mount health at "/" (same as server.ts)
  app.use("/", createHealthRouter(deps));
  // Mount classrooms at "/api/classrooms" (same as server.ts)
  app.use("/api/classrooms", createClassroomsRouter(deps));

  const server = await new Promise<Server>((resolve) => {
    const srv = app.listen(0, "127.0.0.1", () => resolve(srv));
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to resolve test server address");
  }

  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function stopServer(server: Server | null) {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

/* ========== health route tests ========== */

describe("GET /health and /api/health", () => {
  let server: Server | null = null;
  let baseUrl = "";
  let fakeInference: Server | null = null;

  afterEach(async () => {
    await stopServer(server);
    await stopServer(fakeInference);
    server = null;
    fakeInference = null;
    baseUrl = "";
    closeAll();
  });

  it("returns status ok when inference is healthy", async () => {
    const inf = await startFakeInference(true);
    fakeInference = inf.server;

    const running = await startServer(inf.url);
    server = running.server;
    baseUrl = running.baseUrl;

    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({
      status: "ok",
      inference_url: inf.url,
      ready: true,
    });
  });

  it("returns status degraded when inference is unreachable", async () => {
    // Point at a port where nothing is listening
    const running = await startServer("http://127.0.0.1:19999");
    server = running.server;
    baseUrl = running.baseUrl;

    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({
      status: "degraded",
      ready: false,
    });
  });

  it("returns status degraded when inference returns non-ok", async () => {
    const inf = await startFakeInference(false);
    fakeInference = inf.server;

    const running = await startServer(inf.url);
    server = running.server;
    baseUrl = running.baseUrl;

    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({
      status: "degraded",
      inference_url: inf.url,
      ready: false,
    });
  });
});

/* ========== classrooms route tests ========== */

describe("GET /api/classrooms", () => {
  let server: Server | null = null;
  let baseUrl = "";

  beforeEach(async () => {
    const running = await startServer("http://127.0.0.1:19999");
    server = running.server;
    baseUrl = running.baseUrl;
  });

  afterEach(async () => {
    await stopServer(server);
    server = null;
    baseUrl = "";
    closeAll();
  });

  it("returns sanitized classroom list without access_code", async () => {
    const res = await fetch(`${baseUrl}/api/classrooms`);
    expect(res.status).toBe(200);

    const list = (await res.json()) as Array<Record<string, unknown>>;
    expect(list).toHaveLength(2);

    // No raw access_code should ever appear
    for (const entry of list) {
      expect(entry).not.toHaveProperty("access_code");
    }

    // The protected classroom should expose requires_access_code: true
    const protectedEntry = list.find((c) => c.classroom_id === PROTECTED_CLASSROOM.classroom_id);
    expect(protectedEntry).toBeDefined();
    expect(protectedEntry!.requires_access_code).toBe(true);

    // The open classroom should expose requires_access_code: false
    const openEntry = list.find((c) => c.classroom_id === OPEN_CLASSROOM.classroom_id);
    expect(openEntry).toBeDefined();
    expect(openEntry!.requires_access_code).toBe(false);

    // Students should be sanitized — no student_id or internal fields
    const students = openEntry!.students as Array<Record<string, unknown>>;
    expect(students).toHaveLength(1);
    expect(students[0]).toEqual({ alias: "Fern", family_language: "English", eal_flag: false, support_tags: [] });
    expect(students[0]).not.toHaveProperty("student_id");
  });
});

describe("GET /api/classrooms/:id/schedule", () => {
  let server: Server | null = null;
  let baseUrl = "";

  beforeEach(async () => {
    const running = await startServer("http://127.0.0.1:19999");
    server = running.server;
    baseUrl = running.baseUrl;
  });

  afterEach(async () => {
    await stopServer(server);
    server = null;
    baseUrl = "";
    closeAll();
  });

  it("returns 404 with classroom_not_found for unknown classroom", async () => {
    const res = await fetch(`${baseUrl}/api/classrooms/nonexistent-room/schedule`);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body).toMatchObject({
      category: "validation",
      detail_code: "classroom_not_found",
      retryable: false,
    });
    expect(body.error).toContain("nonexistent-room");
  });

  it("returns schedule data for a known classroom", async () => {
    const res = await fetch(`${baseUrl}/api/classrooms/${OPEN_CLASSROOM.classroom_id}/schedule`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({
      classroom_id: OPEN_CLASSROOM.classroom_id,
      sub_ready: true,
    });
    expect(body.schedule).toEqual([{ time_slot: "09:00", activity: "Math block", ea_available: false }]);
    expect(body.upcoming_events).toEqual([{ event_date: "2026-04-15", description: "Field trip" }]);
  });
});
