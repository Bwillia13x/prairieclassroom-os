/**
 * DataVisualizationsA11y.test.tsx
 *
 * Dedicated accessibility regression test suite for the 10 newly-clickable
 * charts from Tasks 5a / 5b / 5c. This file focuses on gaps not already
 * covered by DataVisualizationsClicks.test.tsx:
 *
 *  - Keyboard reachability (tabIndex=0 + role="button" or native <button>)
 *  - Enter-key and Space-key activation for charts missing those tests
 *  - Non-empty aria-label on every hit target
 *
 * Charts already having comprehensive Enter + Space coverage in the Clicks
 * file (ComplexityDebtGauge, PlanStreakCalendar, InterventionTimeline) get
 * only an aria-label assertion here to avoid duplication.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ComplexityDebtGauge,
  DebtTrendSparkline,
  ComplexityTrendCalendar,
  PlanStreakCalendar,
  VariantSummaryStrip,
  PlanCoverageRadar,
  ClassroomCompositionRings,
  SupportPatternRadar,
  FollowUpSuccessRate,
  InterventionTimeline,
} from "../DataVisualizations";
import type { DebtItem, InterventionRecord, RecurringTheme } from "../../types";

// ----------------------------------------------------------------
// Shared fixtures — reuse patterns from DataVisualizationsClicks.test.tsx
// ----------------------------------------------------------------

function makeDebtItem(category: DebtItem["category"], i: number): DebtItem {
  return {
    category,
    student_refs: [`student-${i}`],
    description: `Debt item ${i}`,
    source_record_id: `rec-${i}`,
    age_days: i + 1,
    suggested_action: "Review soon",
  };
}

const DEBT_ITEMS: DebtItem[] = [
  makeDebtItem("stale_followup", 0),
  makeDebtItem("stale_followup", 1),
  makeDebtItem("stale_followup", 2),
  makeDebtItem("stale_followup", 3),
  makeDebtItem("stale_followup", 4),
];

const TREND_DATA = [2, 3, 4, 5, 6, 7, 8];

const CAL_DATA = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1];

const PLANS_14D: (0 | 1)[] = [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1];

const VARIANTS = [
  { variant_type: "core", estimated_minutes: 25, title: "Original lesson" },
  { variant_type: "eal_supported", estimated_minutes: 20, title: "EAL scaffolded" },
  { variant_type: "eal_supported", estimated_minutes: 18, title: "EAL vocab cards" },
] as const;

const RADAR_SECTION_ITEMS = {
  watchpoints: ["a", "b", "c", "d", "e"],
  priorities: ["p1", "p2", "p3"],
  eaActions: ["e1", "e2"],
  prepItems: ["pr1", "pr2", "pr3", "pr4"],
  familyFollowups: ["f1"],
};

const COMPOSITION_STUDENTS = [
  { alias: "Amira", eal_flag: true, support_tags: ["eal_level_2"], family_language: "Arabic" },
  { alias: "Ben", eal_flag: true, support_tags: ["eal_level_2"], family_language: "Arabic" },
  { alias: "Chen", eal_flag: true, support_tags: ["eal_level_3"], family_language: "Mandarin" },
  { alias: "Dara", eal_flag: false, support_tags: [], family_language: undefined },
  { alias: "Evie", eal_flag: true, support_tags: ["eal_level_1"], family_language: "Mandarin" },
  { alias: "Farah", eal_flag: true, support_tags: ["eal_level_2"], family_language: "Arabic" },
];

const PATTERN_THEMES: RecurringTheme[] = [
  { theme: "transition routine", student_refs: ["Amira", "Ben", "Chen"], evidence_count: 3, example_observations: ["obs1"] },
  { theme: "focus and attention issues", student_refs: ["Dara", "Evie"], evidence_count: 2, example_observations: ["obs2"] },
  { theme: "reading comprehension", student_refs: ["Amira", "Farah"], evidence_count: 4, example_observations: ["obs3"] },
  { theme: "math difficulties", student_refs: ["Ben"], evidence_count: 1, example_observations: ["obs4"] },
  { theme: "social peer conflict", student_refs: ["Chen", "Dara"], evidence_count: 2, example_observations: ["obs5"] },
];

const FOLLOWUP_RECORDS: InterventionRecord[] = [
  { record_id: "r1", classroom_id: "cls1", student_refs: ["s1"], observation: "obs1", action_taken: "act1", follow_up_needed: true, created_at: "2026-01-01T10:00:00Z", schema_version: "1" },
  { record_id: "r2", classroom_id: "cls1", student_refs: ["s2"], observation: "obs2", action_taken: "act2", follow_up_needed: false, created_at: "2026-01-02T10:00:00Z", schema_version: "1" },
  { record_id: "r3", classroom_id: "cls1", student_refs: ["s3"], observation: "obs3", action_taken: "act3", follow_up_needed: true, created_at: "2026-01-03T10:00:00Z", schema_version: "1" },
  { record_id: "r4", classroom_id: "cls1", student_refs: ["s4"], observation: "obs4", action_taken: "act4", follow_up_needed: false, created_at: "2026-01-04T10:00:00Z", schema_version: "1" },
];

const TIMELINE_RECORDS: InterventionRecord[] = [
  { record_id: "t1", classroom_id: "cls1", student_refs: ["Alice"], observation: "obs1", action_taken: "act1", follow_up_needed: false, created_at: "2026-01-01T10:00:00Z", schema_version: "1" },
  { record_id: "t2", classroom_id: "cls1", student_refs: ["Ben"], observation: "obs2", action_taken: "act2", follow_up_needed: true, created_at: "2026-01-03T10:00:00Z", schema_version: "1" },
  { record_id: "t3", classroom_id: "cls1", student_refs: ["Chen"], observation: "obs3", action_taken: "act3", follow_up_needed: false, created_at: "2026-01-05T10:00:00Z", schema_version: "1" },
];

// ================================================================
// describe("A11y — chart click affordances", …)
// ================================================================

describe("A11y — chart click affordances", () => {

  // ── Task 5a: ComplexityDebtGauge ──────────────────────────────

  describe("ComplexityDebtGauge", () => {
    // Enter + Space already tested in DataVisualizationsClicks.test.tsx.
    // Confirmed: tabIndex=0 + role=button + aria-label also covered there.
    // This describe exists to maintain the canonical inventory; no new gaps.

    it("has non-empty aria-label on hit target (regression guard)", () => {
      const spy = vi.fn();
      render(
        <ComplexityDebtGauge
          debtItems={DEBT_ITEMS}
          previousTotal={3}
          onSegmentClick={spy}
        />
      );
      const hit = screen.getByTestId("viz-debt-gauge-hit");
      const label = hit.getAttribute("aria-label");
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(0);
    });
  });

  // ── Task 5a: DebtTrendSparkline ───────────────────────────────

  describe("DebtTrendSparkline", () => {
    // Clicks test has: click payload + aria-label.
    // Gap: no Enter or Space keyboard tests; no explicit tabIndex/role assertion.

    it("has keyboard-focusable hit target (tabIndex=0 and role=button)", () => {
      const spy = vi.fn();
      render(<DebtTrendSparkline data={TREND_DATA} onSegmentClick={spy} />);
      const hit = screen.getByTestId("viz-debt-trend-hit");
      expect(hit).toHaveAttribute("tabindex", "0");
      expect(hit).toHaveAttribute("role", "button");
    });

    it("fires callback on Enter keydown", () => {
      const spy = vi.fn();
      render(<DebtTrendSparkline data={TREND_DATA} onSegmentClick={spy} />);
      const hit = screen.getByTestId("viz-debt-trend-hit");
      fireEvent.keyDown(hit, { key: "Enter" });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("fires callback on Space keydown", () => {
      const spy = vi.fn();
      render(<DebtTrendSparkline data={TREND_DATA} onSegmentClick={spy} />);
      const hit = screen.getByTestId("viz-debt-trend-hit");
      fireEvent.keyDown(hit, { key: " " });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("has non-empty aria-label", () => {
      const spy = vi.fn();
      render(<DebtTrendSparkline data={TREND_DATA} onSegmentClick={spy} />);
      const hit = screen.getByTestId("viz-debt-trend-hit");
      const label = hit.getAttribute("aria-label");
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(0);
    });
  });

  // ── Task 5a: ComplexityTrendCalendar ─────────────────────────

  describe("ComplexityTrendCalendar", () => {
    // Clicks test has: click payload + tabIndex check (via tagName "button") + aria-label.
    // Cells are rendered as native <button> elements with only an onClick handler (no
    // explicit onKeyDown). In real browsers, native buttons fire click on Enter/Space
    // automatically. JSDOM's fireEvent.keyDown does NOT replicate that browser bridge.
    // We use fireEvent.click as the proxy for "the handler path keyboard-activated
    // buttons go through," consistent with the approach used for VariantSummaryStrip
    // in DataVisualizationsClicks.test.tsx.

    it("fires callback on click (keyboard activation path — native button behavior)", () => {
      const spy = vi.fn();
      render(<ComplexityTrendCalendar data={CAL_DATA} onSegmentClick={spy} />);
      const cells = screen.getAllByTestId("viz-complexity-cell");
      // Verify click handler (the underlying activation path for Enter/Space on native buttons)
      fireEvent.click(cells[3]);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({
        trendKey: "complexity",
        label: "Peak complexity",
        data: CAL_DATA,
        highlightIndex: 3,
      });
    });

    it("cells are native <button> elements (keyboard-focusable and activatable by default)", () => {
      const spy = vi.fn();
      render(<ComplexityTrendCalendar data={CAL_DATA} onSegmentClick={spy} />);
      const cells = screen.getAllByTestId("viz-complexity-cell");
      for (const cell of cells) {
        // Native button: keyboard-focusable with Enter/Space handled by the browser,
        // not requiring explicit onKeyDown handlers.
        expect(cell.tagName.toLowerCase()).toBe("button");
        expect(cell).toHaveAttribute("tabindex", "0");
      }
    });

    it("each cell has a non-empty aria-label", () => {
      const spy = vi.fn();
      render(<ComplexityTrendCalendar data={CAL_DATA} onSegmentClick={spy} />);
      const cells = screen.getAllByTestId("viz-complexity-cell");
      for (const cell of cells) {
        const label = cell.getAttribute("aria-label");
        expect(label).toBeTruthy();
        expect(label!.length).toBeGreaterThan(0);
      }
    });
  });

  // ── Task 5b: PlanStreakCalendar ───────────────────────────────

  describe("PlanStreakCalendar", () => {
    // Clicks test has: click, tabIndex/role, aria-label, Enter, Space — fully covered.
    // This describe is a regression guard for aria-label only.

    it("has non-empty aria-label on a streak cell (regression guard)", () => {
      const spy = vi.fn();
      render(<PlanStreakCalendar plans14d={PLANS_14D} onSegmentClick={spy} />);
      const cell = screen.getByTestId("viz-plan-streak-cell-10");
      const label = cell.getAttribute("aria-label");
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(0);
    });
  });

  // ── Task 5b: VariantSummaryStrip ─────────────────────────────

  describe("VariantSummaryStrip", () => {
    // Clicks test has: click payload, aria-label, Enter proxy via fireEvent.click.
    // Gap: no Space test; no explicit tabIndex/focusability assertion for native button.
    // Native <button> elements are natively focusable (tabIndex=0 by default).

    it("hit target is a native button (keyboard-focusable by default)", () => {
      const spy = vi.fn();
      render(<VariantSummaryStrip variants={[...VARIANTS]} onSegmentClick={spy} />);
      const buttons = screen.getAllByRole("button");
      // Each item is a native button — natively focusable, no tabIndex attribute required.
      expect(buttons.length).toBeGreaterThan(0);
      for (const btn of buttons) {
        expect(btn.tagName.toLowerCase()).toBe("button");
      }
    });

    it("fires callback on Space keydown via click path (native button behavior)", () => {
      // JSDOM does not replicate the full browser keyboard-to-click bridge for native buttons
      // via fireEvent.keyDown alone. Using fireEvent.click as the proxy for the handler path
      // that keyboard-activated buttons go through, since onClick is the shared activation path.
      const spy = vi.fn();
      render(<VariantSummaryStrip variants={[...VARIANTS]} onSegmentClick={spy} />);
      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("each button has a non-empty aria-label", () => {
      const spy = vi.fn();
      render(<VariantSummaryStrip variants={[...VARIANTS]} onSegmentClick={spy} />);
      const buttons = screen.getAllByRole("button");
      for (const btn of buttons) {
        const label = btn.getAttribute("aria-label");
        expect(label).toBeTruthy();
        expect(label!.length).toBeGreaterThan(0);
      }
    });
  });

  // ── Task 5b: PlanCoverageRadar ────────────────────────────────

  describe("PlanCoverageRadar", () => {
    // Clicks test has: click payload, Enter, aria-label.
    // Gap: no Space test; no explicit tabIndex/role assertion.

    it("has keyboard-focusable hit target (tabIndex=0 and role=button)", () => {
      const spy = vi.fn();
      render(
        <PlanCoverageRadar
          watchpoints={5}
          priorities={3}
          eaActions={2}
          prepItems={4}
          familyFollowups={1}
          onSegmentClick={spy}
          sectionItems={RADAR_SECTION_ITEMS}
        />
      );
      const hit = screen.getByTestId("viz-plan-radar-axis-watchpoints");
      expect(hit).toHaveAttribute("tabindex", "0");
      expect(hit).toHaveAttribute("role", "button");
    });

    it("fires callback on Space keydown", () => {
      const spy = vi.fn();
      render(
        <PlanCoverageRadar
          watchpoints={5}
          priorities={3}
          eaActions={2}
          prepItems={4}
          familyFollowups={1}
          onSegmentClick={spy}
          sectionItems={RADAR_SECTION_ITEMS}
        />
      );
      const hit = screen.getByTestId("viz-plan-radar-axis-watchpoints");
      fireEvent.keyDown(hit, { key: " " });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("has non-empty aria-label on watchpoints axis hit target", () => {
      const spy = vi.fn();
      render(
        <PlanCoverageRadar
          watchpoints={5}
          priorities={3}
          eaActions={2}
          prepItems={4}
          familyFollowups={1}
          onSegmentClick={spy}
          sectionItems={RADAR_SECTION_ITEMS}
        />
      );
      const hit = screen.getByTestId("viz-plan-radar-axis-watchpoints");
      const label = hit.getAttribute("aria-label");
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(0);
    });
  });

  // ── Task 5c: ClassroomCompositionRings ───────────────────────

  describe("ClassroomCompositionRings", () => {
    // Clicks test has: click payload, aria-label, Enter.
    // Gap: no Space test; no explicit tabIndex/role assertion.

    it("has keyboard-focusable hit target (tabIndex=0 and role=button)", () => {
      const spy = vi.fn();
      render(<ClassroomCompositionRings students={COMPOSITION_STUDENTS} onSegmentClick={spy} />);
      const seg = screen.getByTestId("viz-composition-segment-eal-eal_level_2");
      expect(seg).toHaveAttribute("tabindex", "0");
      expect(seg).toHaveAttribute("role", "button");
    });

    it("fires callback on Space keydown", () => {
      const spy = vi.fn();
      render(<ClassroomCompositionRings students={COMPOSITION_STUDENTS} onSegmentClick={spy} />);
      const seg = screen.getByTestId("viz-composition-segment-eal-eal_level_2");
      fireEvent.keyDown(seg, { key: " " });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("has non-empty aria-label containing tag label", () => {
      const spy = vi.fn();
      render(<ClassroomCompositionRings students={COMPOSITION_STUDENTS} onSegmentClick={spy} />);
      const seg = screen.getByTestId("viz-composition-segment-eal-eal_level_2");
      const label = seg.getAttribute("aria-label");
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(0);
      expect(label).toContain("EAL Level 2");
    });
  });

  // ── Task 5c: SupportPatternRadar ─────────────────────────────

  describe("SupportPatternRadar", () => {
    // Clicks test has: click payload, Enter, aria-label.
    // Gap: no Space test; no explicit tabIndex/role assertion.

    it("has keyboard-focusable hit target (tabIndex=0 and role=button)", () => {
      const spy = vi.fn();
      render(<SupportPatternRadar themes={PATTERN_THEMES} onSegmentClick={spy} />);
      const hit = screen.getByTestId("viz-pattern-radar-axis-transition");
      expect(hit).toHaveAttribute("tabindex", "0");
      expect(hit).toHaveAttribute("role", "button");
    });

    it("fires callback on Space keydown", () => {
      const spy = vi.fn();
      render(<SupportPatternRadar themes={PATTERN_THEMES} onSegmentClick={spy} />);
      const hit = screen.getByTestId("viz-pattern-radar-axis-transition");
      fireEvent.keyDown(hit, { key: " " });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("has non-empty aria-label on axis hit target", () => {
      const spy = vi.fn();
      render(<SupportPatternRadar themes={PATTERN_THEMES} onSegmentClick={spy} />);
      const hit = screen.getByTestId("viz-pattern-radar-axis-transition");
      const label = hit.getAttribute("aria-label");
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(0);
    });
  });

  // ── Task 5c: FollowUpSuccessRate ─────────────────────────────

  describe("FollowUpSuccessRate", () => {
    // Clicks test has: click payload, Enter, aria-label.
    // Gap: no Space test; no explicit tabIndex/role assertion.

    it("has keyboard-focusable hit target (tabIndex=0 and role=button)", () => {
      const spy = vi.fn();
      render(<FollowUpSuccessRate records={FOLLOWUP_RECORDS} onSegmentClick={spy} />);
      const hit = screen.getByTestId("viz-followup-rate-hit");
      expect(hit).toHaveAttribute("tabindex", "0");
      expect(hit).toHaveAttribute("role", "button");
    });

    it("fires callback on Space keydown", () => {
      const spy = vi.fn();
      render(<FollowUpSuccessRate records={FOLLOWUP_RECORDS} onSegmentClick={spy} />);
      const hit = screen.getByTestId("viz-followup-rate-hit");
      fireEvent.keyDown(hit, { key: " " });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("has non-empty aria-label", () => {
      const spy = vi.fn();
      render(<FollowUpSuccessRate records={FOLLOWUP_RECORDS} onSegmentClick={spy} />);
      const hit = screen.getByTestId("viz-followup-rate-hit");
      const label = hit.getAttribute("aria-label");
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(0);
    });
  });

  // ── Task 5c: InterventionTimeline ────────────────────────────

  describe("InterventionTimeline", () => {
    // Clicks test has: click payload, role/tabIndex/aria-label for all dots, Enter.
    // Fully covered. This describe is a regression guard for aria-label.

    it("each dot has a non-empty aria-label (regression guard)", () => {
      const spy = vi.fn();
      render(<InterventionTimeline records={TIMELINE_RECORDS} onDotClick={spy} />);
      for (const record of TIMELINE_RECORDS) {
        const dot = screen.getByTestId(`viz-int-timeline-dot-${record.record_id}`);
        const label = dot.getAttribute("aria-label");
        expect(label).toBeTruthy();
        expect(label!.length).toBeGreaterThan(0);
      }
    });
  });
});
