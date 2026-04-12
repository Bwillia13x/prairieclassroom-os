import assert from "node:assert/strict";
import { assertGeminiRunsAllowed } from "./lib/gemini-api-preflight.mjs";
import { parseSmokeCaseSelection } from "./lib/smoke-api-cases.mjs";

const API_BASE = process.env.PRAIRIE_API_BASE ?? "http://127.0.0.1:3100";
const DEMO_CLASSROOM_ID = "demo-okafor-grade34";
const INFERENCE_PROVIDER = (process.env.PRAIRIE_INFERENCE_PROVIDER ?? "").trim().toLowerCase();

function isoTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

async function getJson(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch (error) {
    throw new Error(
      `Request to ${API_BASE}${path} failed. Is the orchestrator running?\n${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }

  const raw = await response.text();
  let payload;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = raw;
  }

  if (!response.ok) {
    throw new Error(`Request to ${path} failed with ${response.status}: ${typeof payload === "string" ? payload : JSON.stringify(payload)}`);
  }

  return payload;
}

function assertNoAlphaAliases(value, label) {
  const haystack = typeof value === "string" ? value : JSON.stringify(value);
  const match = haystack.match(/\b(Ari|Mika|Jae)\b/);
  assert.equal(match, null, `${label} leaked alpha alias ${match?.[1]}`);
}

function assertRosterReferences(value, roster, path = "root") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertRosterReferences(item, roster, `${path}[${index}]`));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (key === "student_ref") {
      assert.ok(typeof child === "string" && roster.has(child), `${nextPath} expected demo roster alias, got ${JSON.stringify(child)}`);
      continue;
    }
    if (key === "student_refs" || key === "primary_students") {
      assert.ok(Array.isArray(child), `${nextPath} must be an array`);
      child.forEach((alias, index) => {
        assert.ok(typeof alias === "string" && roster.has(alias), `${nextPath}[${index}] expected demo roster alias, got ${JSON.stringify(alias)}`);
      });
      continue;
    }
    assertRosterReferences(child, roster, nextPath);
  }
}

async function postJson(path, body) {
  return getJson(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function main() {
  if (INFERENCE_PROVIDER === "gemini") {
    assertGeminiRunsAllowed(process.env, "Hosted Gemini API smoke");
  }

  const classrooms = await getJson("/api/classrooms");
  const demo = classrooms.find((classroom) => classroom.classroom_id === DEMO_CLASSROOM_ID);
  assert.ok(demo, `Expected ${DEMO_CLASSROOM_ID} in /api/classrooms`);

  const roster = new Set((demo.students ?? []).map((student) => student.alias));
  assert.ok(roster.size > 0, "Demo classroom roster must not be empty");

  const smokeCases = {
    "tomorrow-plan": async () => {
      const tomorrowPlan = await postJson("/api/tomorrow-plan", {
        classroom_id: DEMO_CLASSROOM_ID,
        teacher_reflection: "Brody needed transition support after lunch, and Amira still needed language support before writing.",
        teacher_goal: "Keep transitions predictable and reduce language load in math writing.",
      });
      assert.equal(tomorrowPlan.plan.classroom_id, DEMO_CLASSROOM_ID);
      assertRosterReferences(tomorrowPlan.plan, roster, "tomorrowPlan.plan");
      assertNoAlphaAliases(tomorrowPlan, "Tomorrow plan");
      console.log("PASS tomorrow-plan");
    },
    "family-message": async () => {
      const familyMessage = await postJson("/api/family-message", {
        classroom_id: DEMO_CLASSROOM_ID,
        student_refs: ["Amira"],
        message_type: "praise",
        target_language: "en",
        context: "Prairie hardening smoke test",
      });
      assert.deepEqual(familyMessage.draft.student_refs, ["Amira"]);
      assert.equal(familyMessage.draft.message_type, "praise");
      assertRosterReferences(familyMessage.draft, roster, "familyMessage.draft");
      assertNoAlphaAliases(familyMessage, "Family message");
      console.log("PASS family-message");
    },
    "support-patterns": async () => {
      const supportPatterns = await postJson("/api/support-patterns", {
        classroom_id: DEMO_CLASSROOM_ID,
        time_window: 10,
      });
      assert.equal(supportPatterns.report.classroom_id, DEMO_CLASSROOM_ID);
      assertRosterReferences(supportPatterns.report, roster, "supportPatterns.report");
      assertNoAlphaAliases(supportPatterns, "Support patterns");
      console.log("PASS support-patterns");
    },
    "ea-briefing": async () => {
      const eaBriefing = await postJson("/api/ea-briefing", {
        classroom_id: DEMO_CLASSROOM_ID,
        ea_name: "Ms. Fehr",
      });
      assert.equal(eaBriefing.briefing.classroom_id, DEMO_CLASSROOM_ID);
      assertRosterReferences(eaBriefing.briefing, roster, "eaBriefing.briefing");
      assertNoAlphaAliases(eaBriefing, "EA briefing");
      console.log("PASS ea-briefing");
    },
    "complexity-forecast": async () => {
      const complexityForecast = await postJson("/api/complexity-forecast", {
        classroom_id: DEMO_CLASSROOM_ID,
        forecast_date: isoTomorrow(),
        teacher_notes: "Assembly at 10am",
      });
      assert.equal(complexityForecast.forecast.classroom_id, DEMO_CLASSROOM_ID);
      assert.ok(complexityForecast.forecast.blocks.length > 0, "Complexity forecast must include blocks");
      assertNoAlphaAliases(complexityForecast, "Complexity forecast");
      console.log("PASS complexity-forecast");
    },
    "survival-packet": async () => {
      const survivalPacket = await postJson("/api/survival-packet", {
        classroom_id: DEMO_CLASSROOM_ID,
        target_date: isoTomorrow(),
        teacher_notes: "Smoke-test packet generation",
      });
      assert.equal(survivalPacket.packet.classroom_id, DEMO_CLASSROOM_ID);
      assert.ok(survivalPacket.packet.routines.length > 0, "Survival packet routines must not be empty");
      assert.ok(survivalPacket.packet.student_support.length > 0, "Survival packet student_support must not be empty");
      assert.ok(survivalPacket.packet.heads_up.length > 0, "Survival packet heads_up must not be empty");
      assertRosterReferences(survivalPacket.packet, roster, "survivalPacket.packet");
      assertNoAlphaAliases(survivalPacket, "Survival packet");
      console.log("PASS survival-packet");
    },
  };

  for (const caseName of parseSmokeCaseSelection(process.env)) {
    await smokeCases[caseName]();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
