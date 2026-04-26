/**
 * ClassroomPanel.helpers.test.ts — unit tests for the actionable-thread
 * count helper used by Classroom Pulse.
 *
 * Locks behavior in QA finding T5: the THREADS stat must NOT equal the
 * STUDENTS stat when the roster contains strength-only or otherwise
 * inactive entries. The orchestrator returns one student_threads entry
 * per roster student, so the helper has to filter to threads that
 * actually carry signal.
 */
import { describe, it, expect } from "vitest";
import {
  countActionableThreads,
  isActionableThread,
} from "../ClassroomPanel.helpers";
import type { StudentThread } from "../../types";

function makeThread(overrides: Partial<StudentThread> = {}): StudentThread {
  return {
    alias: "Anon",
    priority_reason: null,
    last_intervention_days: null,
    pending_action_count: 0,
    pending_message_count: 0,
    active_pattern_count: 0,
    thread_count: 0,
    actions: [],
    ...overrides,
  };
}

describe("countActionableThreads", () => {
  it("returns null when threads is undefined (snapshot still loading)", () => {
    expect(countActionableThreads(undefined)).toBeNull();
  });

  it("returns 0 for an empty array", () => {
    expect(countActionableThreads([])).toBe(0);
  });

  it("excludes strength-only roster entries with no signal", () => {
    // Mirrors the demo seed pattern: Liam, Violet, Zayn — full-roster
    // entries with thread_count: 0 and no actions. They are valid
    // students but should not appear in the THREADS stat.
    const threads = [
      makeThread({ alias: "Liam" }),
      makeThread({ alias: "Violet" }),
      makeThread({ alias: "Zayn" }),
    ];
    expect(countActionableThreads(threads)).toBe(0);
  });

  it("counts only threads that carry signal, not the full roster", () => {
    // Three actionable students out of five — matches the seed contract
    // shape (active threads + watchlist + strength-only).
    const threads = [
      makeThread({ alias: "Amira", thread_count: 1, actions: [{
        category: "approaching_review",
        label: "Pattern review",
        count: 1,
        target_tab: "support-patterns",
        state: "needs_action",
      }]}),
      makeThread({ alias: "Brody", pending_action_count: 2 }),
      makeThread({ alias: "Chantal", active_pattern_count: 1 }),
      makeThread({ alias: "Liam" }),    // strength-only
      makeThread({ alias: "Violet" }),  // strength-only
    ];
    expect(countActionableThreads(threads)).toBe(3);
  });

  it("counts threads with a pending message but no other signal", () => {
    const threads = [makeThread({ pending_message_count: 1 })];
    expect(countActionableThreads(threads)).toBe(1);
  });
});

describe("isActionableThread", () => {
  it.each<[keyof StudentThread, number]>([
    ["thread_count", 1],
    ["pending_action_count", 1],
    ["pending_message_count", 1],
    ["active_pattern_count", 1],
  ])("treats %s > 0 as actionable", (field, value) => {
    expect(isActionableThread(makeThread({ [field]: value } as Partial<StudentThread>))).toBe(true);
  });

  it("treats a non-empty actions array as actionable even when all numeric counts are 0", () => {
    expect(
      isActionableThread(
        makeThread({
          actions: [{
            category: "approaching_review",
            label: "Pattern review",
            count: 1,
            target_tab: "support-patterns",
            state: "needs_action",
          }],
        }),
      ),
    ).toBe(true);
  });

  it("treats a thread with all zero signals and no actions as not actionable", () => {
    expect(isActionableThread(makeThread())).toBe(false);
  });
});
