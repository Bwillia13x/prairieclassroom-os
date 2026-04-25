import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { getInterventionHistoryByStudent } from "../intervention-history.js";
import { getDb, closeDb } from "../db.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";

const TEST_CLASSROOM = "test-history-classroom" as ClassroomId;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function insertIntervention(alias: string, daysAgo: number) {
  const db = getDb(TEST_CLASSROOM);
  db.prepare(`
    INSERT INTO interventions (record_id, classroom_id, student_refs, record_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `int-${alias}-${daysAgo}-${Math.random().toString(36).slice(2, 8)}`,
    TEST_CLASSROOM,
    JSON.stringify([alias]),
    "{}",
    isoDaysAgo(daysAgo),
  );
}

function clearInterventions() {
  const db = getDb(TEST_CLASSROOM);
  db.prepare("DELETE FROM interventions").run();
}

describe("getInterventionHistoryByStudent", () => {
  afterAll(() => {
    closeDb(TEST_CLASSROOM);
  });

  beforeEach(() => {
    closeDb(TEST_CLASSROOM);
    clearInterventions();
  });

  it("returns a length-14 zero array when no interventions exist", () => {
    const result = getInterventionHistoryByStudent(TEST_CLASSROOM, ["A1"]);
    expect(result.get("A1")).toEqual(new Array(14).fill(0));
  });

  it("places today's intervention at index 13", () => {
    insertIntervention("A1", 0);
    const result = getInterventionHistoryByStudent(TEST_CLASSROOM, ["A1"]);
    const series = result.get("A1")!;
    expect(series).toHaveLength(14);
    expect(series[13]).toBe(1);
    expect(series.slice(0, 13).every((n) => n === 0)).toBe(true);
  });

  it("places a 13-days-ago intervention at index 0", () => {
    insertIntervention("A1", 13);
    const result = getInterventionHistoryByStudent(TEST_CLASSROOM, ["A1"]);
    expect(result.get("A1")![0]).toBe(1);
  });

  it("ignores interventions older than 14 days", () => {
    insertIntervention("A1", 14);
    insertIntervention("A1", 30);
    const result = getInterventionHistoryByStudent(TEST_CLASSROOM, ["A1"]);
    expect(result.get("A1")).toEqual(new Array(14).fill(0));
  });

  it("counts multiple interventions on the same day", () => {
    insertIntervention("A1", 2);
    insertIntervention("A1", 2);
    insertIntervention("A1", 2);
    const result = getInterventionHistoryByStudent(TEST_CLASSROOM, ["A1"]);
    expect(result.get("A1")![11]).toBe(3);
  });

  it("returns separate series for each student", () => {
    insertIntervention("A1", 0);
    insertIntervention("A2", 5);
    const result = getInterventionHistoryByStudent(TEST_CLASSROOM, ["A1", "A2"]);
    expect(result.get("A1")![13]).toBe(1);
    expect(result.get("A2")![8]).toBe(1);
    expect(result.get("A1")![8]).toBe(0);
    expect(result.get("A2")![13]).toBe(0);
  });

  it("returns a zero series for students with no interventions in the window", () => {
    insertIntervention("A1", 5);
    const result = getInterventionHistoryByStudent(TEST_CLASSROOM, ["A1", "ghost"]);
    expect(result.get("ghost")).toEqual(new Array(14).fill(0));
  });
});
