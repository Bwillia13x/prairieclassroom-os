import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDb, closeAll } from "../../memory/db.js";
import { getClassroomHealth } from "../../memory/health.js";
import { unsafeCastClassroomId } from "../../../packages/shared/schemas/branded.js";

const TEST_CLASSROOM = unsafeCastClassroomId("test-health-classroom");

function dayOffset(daysAgo: number): string {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
}

describe("getClassroomHealth", () => {
  beforeEach(() => {
    const db = getDb(TEST_CLASSROOM);
    db.exec("DELETE FROM generated_plans");
    db.exec("DELETE FROM interventions");
    db.exec("DELETE FROM family_messages");
    db.exec("DELETE FROM complexity_forecasts");
  });

  afterEach(() => {
    closeAll();
  });

  it("returns zeroed health for empty classroom", () => {
    const health = getClassroomHealth(TEST_CLASSROOM);

    expect(health.streak_days).toBe(0);
    expect(health.plans_last_7).toHaveLength(7);
    expect(health.plans_last_7.every((v) => v === false)).toBe(true);
    expect(health.messages_approved).toBe(0);
    expect(health.messages_total).toBe(0);
    expect(health.trends.debt_total_14d).toHaveLength(14);
    expect(health.trends.plans_14d).toHaveLength(14);
    expect(health.trends.peak_complexity_14d).toHaveLength(14);
    expect(health.trends.debt_total_14d.every((v) => v === 0)).toBe(true);
    expect(health.trends.plans_14d.every((v) => v === 0)).toBe(true);
    expect(health.trends.peak_complexity_14d.every((v) => v === 0)).toBe(true);
  });

  it("counts streak_days — stale intervention 2 days ago breaks streak", () => {
    const db = getDb(TEST_CLASSROOM);
    // Insert a follow_up_needed intervention created 8 days ago (stale on day 2 ago)
    // "stale" = follow_up_needed=true, created more than 5 days before the day being checked
    // On the day "2 days ago" we check: any intervention created before (2dAgo - 5d) = 7dAgo
    // So creating one 8 days ago makes it stale on the 2-days-ago day check
    const createdAt = dayOffset(8);
    const record = {
      record_id: "rec-stale-001",
      classroom_id: TEST_CLASSROOM,
      student_refs: ["Ari"],
      observation: "test observation",
      action_taken: "test action",
      follow_up_needed: true,
      created_at: createdAt,
      schema_version: "0.1.0",
    };
    db.prepare(`
      INSERT INTO interventions (record_id, classroom_id, student_refs, record_json, model_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      record.record_id,
      TEST_CLASSROOM,
      JSON.stringify(record.student_refs),
      JSON.stringify(record),
      "test-model",
      createdAt,
    );

    const health = getClassroomHealth(TEST_CLASSROOM);
    // streak should be less than 2 because day 2 ago has a stale follow-up
    expect(health.streak_days).toBeLessThan(2);
  });

  it("counts plans_last_7 correctly", () => {
    const db = getDb(TEST_CLASSROOM);

    // Insert a plan for today
    const todayTs = dayOffset(0);
    db.prepare(`
      INSERT INTO generated_plans (plan_id, classroom_id, plan_json, teacher_reflection, model_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run("plan-today", TEST_CLASSROOM, '{"plan_id":"plan-today"}', null, "test-model", todayTs);

    // Insert a plan for yesterday
    const yesterdayTs = dayOffset(1);
    db.prepare(`
      INSERT INTO generated_plans (plan_id, classroom_id, plan_json, teacher_reflection, model_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run("plan-yesterday", TEST_CLASSROOM, '{"plan_id":"plan-yesterday"}', null, "test-model", yesterdayTs);

    const health = getClassroomHealth(TEST_CLASSROOM);

    expect(health.plans_last_7[0]).toBe(true);  // today
    expect(health.plans_last_7[1]).toBe(true);  // yesterday
    expect(health.plans_last_7[2]).toBe(false); // 2 days ago
  });

  it("counts messages_approved and messages_total", () => {
    const db = getDb(TEST_CLASSROOM);

    const recentTs = dayOffset(3); // 3 days ago — within 14 day window

    // Insert 3 messages: 2 approved, 1 not
    db.prepare(`
      INSERT INTO family_messages (draft_id, classroom_id, student_refs, message_json, teacher_approved, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run("msg-001", TEST_CLASSROOM, '["Ari"]', '{"draft_id":"msg-001"}', 1, recentTs);

    db.prepare(`
      INSERT INTO family_messages (draft_id, classroom_id, student_refs, message_json, teacher_approved, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run("msg-002", TEST_CLASSROOM, '["Mika"]', '{"draft_id":"msg-002"}', 1, recentTs);

    db.prepare(`
      INSERT INTO family_messages (draft_id, classroom_id, student_refs, message_json, teacher_approved, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run("msg-003", TEST_CLASSROOM, '["Leo"]', '{"draft_id":"msg-003"}', 0, recentTs);

    const health = getClassroomHealth(TEST_CLASSROOM);

    expect(health.messages_total).toBe(3);
    expect(health.messages_approved).toBe(2);
  });
});
