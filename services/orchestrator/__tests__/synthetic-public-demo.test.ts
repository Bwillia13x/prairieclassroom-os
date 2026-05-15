import { afterEach, describe, expect, it } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createAuthMiddleware, requireClassroomRole } from "../auth.js";
import { createClassroomsRouter } from "../routes/classrooms.js";
import { createTodayRouter } from "../routes/today.js";
import { closeAll } from "../../memory/db.js";
import { ClassroomProfileSchema, type ClassroomProfile } from "../../../packages/shared/schemas/classroom.js";
import type { RouteDeps } from "../route-deps.js";

const DATA_DIR = resolve(import.meta.dirname, "../../../data/synthetic_classrooms");

function loadBundledSyntheticClassrooms(): ClassroomProfile[] {
  return readdirSync(DATA_DIR)
    .filter((file) => file.startsWith("classroom_") && file.endsWith(".json"))
    .sort()
    .map((file) => {
      const parsed = ClassroomProfileSchema.safeParse(
        JSON.parse(readFileSync(resolve(DATA_DIR, file), "utf-8")),
      );
      if (!parsed.success) {
        throw new Error(`${file} failed classroom schema validation: ${parsed.error.message}`);
      }
      return parsed.data;
    });
}

const BUNDLED_SYNTHETIC_CLASSROOMS = loadBundledSyntheticClassrooms();

const NON_DEMO_NO_CODE_CLASSROOM: ClassroomProfile = {
  classroom_id: "future-real-no-code-room",
  grade_band: "4",
  subject_focus: "math",
  classroom_notes: [],
  routines: {},
  students: [],
};

const ACCESS_CODE_CLASSROOM: ClassroomProfile = {
  classroom_id: "future-real-coded-room",
  grade_band: "5",
  subject_focus: "science",
  classroom_notes: [],
  routines: {},
  students: [],
  access_code: "future-real-code",
};

function makeClassroomMap() {
  return new Map<string, ClassroomProfile>(
    [
      ...BUNDLED_SYNTHETIC_CLASSROOMS,
      NON_DEMO_NO_CODE_CLASSROOM,
      ACCESS_CODE_CLASSROOM,
    ].map((classroom) => [classroom.classroom_id, classroom]),
  );
}

function makeDeps(classrooms: Map<string, ClassroomProfile>): RouteDeps {
  const loadClassroom = (id: string) => classrooms.get(id);
  return {
    inferenceUrl: "http://127.0.0.1:9999",
    dataDir: DATA_DIR,
    loadClassroom,
    loadClassrooms: () => [...classrooms.values()],
    authMiddleware: createAuthMiddleware(loadClassroom, { requireClassroomAccessCodes: true }),
    requireClassroomAccessCodes: true,
    requireClassroomRole,
  };
}

async function startServer() {
  const classrooms = makeClassroomMap();
  const app = express();
  app.use(express.json());
  const deps = makeDeps(classrooms);
  app.use("/api/classrooms", createClassroomsRouter(deps));
  app.use("/api/today", createTodayRouter(deps));

  const server = await new Promise<Server>((resolveServer) => {
    const nextServer = app.listen(0, "127.0.0.1", () => resolveServer(nextServer));
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to resolve test server address");
  }
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function stopServer(server: Server | null) {
  if (!server) return;
  await new Promise<void>((resolveStop, reject) => {
    server.close((error) => (error ? reject(error) : resolveStop()));
  });
}

describe("bundled synthetic classroom public-demo access", () => {
  let server: Server | null = null;

  afterEach(async () => {
    await stopServer(server);
    server = null;
    closeAll();
  });

  it("reports every bundled synthetic classroom as public demo metadata when hosted codes are required", async () => {
    const running = await startServer();
    server = running.server;

    const res = await fetch(`${running.baseUrl}/api/classrooms`);
    expect(res.status).toBe(200);
    const list = (await res.json()) as Array<Record<string, unknown>>;

    for (const classroom of BUNDLED_SYNTHETIC_CLASSROOMS) {
      const entry = list.find((item) => item.classroom_id === classroom.classroom_id);
      expect(entry, `${classroom.classroom_id} should appear in /api/classrooms`).toBeDefined();
      expect(entry).not.toHaveProperty("access_code");
      expect(entry).toMatchObject({
        classroom_id: classroom.classroom_id,
        requires_access_code: false,
        is_demo: true,
        classroom_notes: [],
        students: [],
      });
    }
  });

  it("opens every bundled synthetic classroom profile, schedule, and today route without X-Classroom-Code", async () => {
    const running = await startServer();
    server = running.server;

    for (const classroom of BUNDLED_SYNTHETIC_CLASSROOMS) {
      const profile = await fetch(`${running.baseUrl}/api/classrooms/${classroom.classroom_id}/profile`);
      expect(profile.status, `${classroom.classroom_id} profile`).toBe(200);
      await expect(profile.json()).resolves.toMatchObject({
        classroom_id: classroom.classroom_id,
        requires_access_code: false,
        is_demo: true,
      });

      const schedule = await fetch(`${running.baseUrl}/api/classrooms/${classroom.classroom_id}/schedule`);
      expect(schedule.status, `${classroom.classroom_id} schedule`).toBe(200);
      await expect(schedule.json()).resolves.toMatchObject({
        classroom_id: classroom.classroom_id,
      });

      const today = await fetch(`${running.baseUrl}/api/today/${classroom.classroom_id}`);
      expect(today.status, `${classroom.classroom_id} today`).toBe(200);
      await expect(today.json()).resolves.toMatchObject({
        student_count: classroom.students.length,
      });
    }
  });

  it("still fails closed for a future real no-code classroom when hosted codes are required", async () => {
    const running = await startServer();
    server = running.server;

    const res = await fetch(`${running.baseUrl}/api/classrooms/${NON_DEMO_NO_CODE_CLASSROOM.classroom_id}/profile`);
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      category: "auth",
      detail_code: "classroom_code_not_configured",
    });
  });

  it("still requires the correct X-Classroom-Code for a coded future real classroom", async () => {
    const running = await startServer();
    server = running.server;

    const missing = await fetch(`${running.baseUrl}/api/classrooms/${ACCESS_CODE_CLASSROOM.classroom_id}/profile`);
    expect(missing.status).toBe(401);
    await expect(missing.json()).resolves.toMatchObject({
      category: "auth",
      detail_code: "classroom_code_missing",
    });

    const wrong = await fetch(`${running.baseUrl}/api/classrooms/${ACCESS_CODE_CLASSROOM.classroom_id}/profile`, {
      headers: { "X-Classroom-Code": "wrong-code" },
    });
    expect(wrong.status).toBe(403);
    await expect(wrong.json()).resolves.toMatchObject({
      category: "auth",
      detail_code: "classroom_code_invalid",
    });

    const allowed = await fetch(`${running.baseUrl}/api/classrooms/${ACCESS_CODE_CLASSROOM.classroom_id}/profile`, {
      headers: { "X-Classroom-Code": ACCESS_CODE_CLASSROOM.access_code! },
    });
    expect(allowed.status).toBe(200);
    const body = await allowed.json();
    expect(body).toMatchObject({
      classroom_id: ACCESS_CODE_CLASSROOM.classroom_id,
      requires_access_code: true,
      is_demo: false,
    });
    expect(body).not.toHaveProperty("access_code");
  });
});
