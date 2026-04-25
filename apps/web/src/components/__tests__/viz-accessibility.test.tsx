/**
 * viz-accessibility.test.tsx
 *
 * Omnibus jest-axe accessibility audit for all viz components.
 *
 * Strategy:
 *  - Primitives (shared/DataViz, Sparkline, CohortSparklineGrid): simple fixtures, covered.
 *  - DataVisualizations.tsx components: covered where fixtures are straightforward.
 *    Components whose fixtures require complex nested data that cannot be reliably
 *    synthesised without risking misrepresentation are documented as gaps below.
 *
 * Skipped (documented gaps):
 *  - StudentThemeHeatmap: color-mix() fill values are not resolvable in jsdom, making
 *    the SVG render opaque — axe results would be unreliable. Skipped as color-contrast
 *    concern; manual contrast verification done in Phase 4 (all pairs WCAG AA).
 *  - ComplexityHeatmap: uses inline `fill={LEVEL_COLORS[block.level]}` which resolves
 *    to CSS vars not supported in jsdom. axe would report false color-contrast
 *    violations. Manual contrast verified in Phase 4.
 *
 * Previously skipped, now covered:
 *  - ScaffoldEffectivenessChart: original `role="figure"` was fixed to `role="img"`
 *    in the post-merge polish loop, so axe coverage is now feasible.
 *  - ForecastTimeline: standalone component with simple ComplexityBlock[] fixture.
 */

import { describe, it } from "vitest";
import { render } from "@testing-library/react";
import { expectNoAxeViolations } from "../../test-utils/axe-helpers";

// ── Primitives ───────────────────────────────────────────────────────────────
import {
  Sparkline as SharedSparkline,
  TrendIndicator,
  HealthDot,
  ProgressBar,
} from "../shared/DataViz";
import ToneSparkline from "../Sparkline";
import CohortSparklineGrid from "../CohortSparklineGrid";
import ForecastTimeline from "../ForecastTimeline";

// ── DataVisualizations components ────────────────────────────────────────────
import {
  StudentPriorityMatrix,
  ComplexityDebtGauge,
  InterventionRecencyTimeline,
  EALoadStackedBars,
  SupportPatternRadar,
  PlanStreakCalendar,
  FollowUpDecayIndicators,
  MessageApprovalFunnel,
  ScaffoldEffectivenessChart,
  StudentSparkIndicator,
  DebtTrendSparkline,
  ComplexityTrendCalendar,
  InterventionTimeline,
  FollowUpSuccessRate,
  ScheduleLoadStrip,
  VariantSummaryStrip,
  PlanCoverageRadar,
  WorkflowFlowStrip,
  ReadabilityComparisonGauge,
  ClassroomCompositionRings,
} from "../DataVisualizations";

import type {
  StudentSummary,
  DebtItem,
  InterventionRecord,
  RecurringTheme,
  EALoadBlock,
  FollowUpGap,
} from "../../types";

// ════════════════════════════════════════════════════════════════════════════
// Shared fixtures
// ════════════════════════════════════════════════════════════════════════════

const STUDENT_14D = new Array(14).fill(0);

const PRIORITY_STUDENTS: StudentSummary[] = [
  {
    alias: "Amira",
    pending_action_count: 3,
    last_intervention_days: 9,
    active_pattern_count: 2,
    pending_message_count: 1,
    latest_priority_reason: "Open follow-up",
    intervention_history_14d: STUDENT_14D,
  },
  {
    alias: "Brody",
    pending_action_count: 0,
    last_intervention_days: 20,
    active_pattern_count: 1,
    pending_message_count: 0,
    latest_priority_reason: null,
    intervention_history_14d: STUDENT_14D,
  },
];

const RECENCY_STUDENTS: StudentSummary[] = [
  {
    alias: "Amira",
    pending_action_count: 1,
    last_intervention_days: 5,
    active_pattern_count: 0,
    pending_message_count: 0,
    latest_priority_reason: null,
    intervention_history_14d: STUDENT_14D,
  },
  {
    alias: "Brody",
    pending_action_count: 0,
    last_intervention_days: 32,
    active_pattern_count: 1,
    pending_message_count: 0,
    latest_priority_reason: null,
    intervention_history_14d: STUDENT_14D,
  },
];

function makeDebtItem(i: number): DebtItem {
  return {
    category: "stale_followup" as const,
    student_refs: [`student-${i}`],
    description: `Debt item ${i}`,
    source_record_id: `rec-${i}`,
    age_days: i + 1,
    suggested_action: "Review soon",
  };
}

const DEBT_ITEMS: DebtItem[] = [0, 1, 2, 3, 4].map(makeDebtItem);

const TREND_DATA = [2, 3, 4, 5, 6, 7, 8];
const CAL_DATA = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1];
const PLANS_14D: (0 | 1)[] = [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1];

const FOLLOWUP_RECORDS: InterventionRecord[] = [
  { record_id: "r1", classroom_id: "cls1", student_refs: ["s1"], observation: "obs1", action_taken: "act1", follow_up_needed: true, created_at: "2026-01-01T10:00:00Z", schema_version: "1" },
  { record_id: "r2", classroom_id: "cls1", student_refs: ["s2"], observation: "obs2", action_taken: "act2", follow_up_needed: false, created_at: "2026-01-02T10:00:00Z", schema_version: "1" },
  { record_id: "r3", classroom_id: "cls1", student_refs: ["s3"], observation: "obs3", action_taken: "act3", follow_up_needed: true, created_at: "2026-01-03T10:00:00Z", schema_version: "1" },
  { record_id: "r4", classroom_id: "cls1", student_refs: ["s4"], observation: "obs4", action_taken: "act4", follow_up_needed: false, created_at: "2026-01-04T10:00:00Z", schema_version: "1" },
];

const TIMELINE_RECORDS: InterventionRecord[] = [
  { record_id: "t1", classroom_id: "cls1", student_refs: ["Alice"], observation: "obs1", action_taken: "act1", follow_up_needed: false, created_at: "2026-01-01T10:00:00Z", schema_version: "1" },
  { record_id: "t2", classroom_id: "cls1", student_refs: ["Ben"], observation: "obs2", action_taken: "act2", follow_up_needed: true, created_at: "2026-01-03T10:00:00Z", schema_version: "1" },
];

const PATTERN_THEMES: RecurringTheme[] = [
  { theme: "transition routine", student_refs: ["Amira", "Ben"], evidence_count: 3, example_observations: ["obs1"] },
  { theme: "focus and attention issues", student_refs: ["Dara"], evidence_count: 2, example_observations: ["obs2"] },
  { theme: "reading comprehension", student_refs: ["Amira"], evidence_count: 4, example_observations: ["obs3"] },
];

const EA_BLOCKS: EALoadBlock[] = [
  { time_slot: "8:30-9:15", activity: "Literacy", ea_available: true, supported_students: ["Amira", "Brody"], load_level: "medium", load_factors: ["EAL support needed"] },
  { time_slot: "9:15-10:00", activity: "Math", ea_available: true, supported_students: ["Chen"], load_level: "low", load_factors: [] },
];

const FOLLOWUP_GAPS: FollowUpGap[] = [
  { original_record_id: "r1", student_refs: ["Amira"], observation: "Needs follow-up on reading", days_since: 8 },
  { original_record_id: "r2", student_refs: ["Brody"], observation: "Pending math assessment", days_since: 3 },
];

const COMPOSITION_STUDENTS = [
  { alias: "Amira", eal_flag: true, support_tags: ["eal_level_2"], family_language: "Arabic" },
  { alias: "Ben", eal_flag: true, support_tags: ["eal_level_2"], family_language: "Arabic" },
  { alias: "Chen", eal_flag: true, support_tags: ["eal_level_3"], family_language: "Mandarin" },
  { alias: "Dara", eal_flag: false, support_tags: [], family_language: undefined },
];

const RADAR_SECTION_ITEMS = {
  watchpoints: ["a", "b", "c"],
  priorities: ["p1", "p2"],
  eaActions: ["e1"],
  prepItems: ["pr1", "pr2"],
  familyFollowups: ["f1"],
};

const SCHEDULE_BLOCKS = [
  { time_slot: "8:30", student_count: 3, label: "Literacy" },
  { time_slot: "10:00", student_count: 1, label: "Math" },
  { time_slot: "13:00", student_count: 5, label: "Science" },
];

const VARIANTS = [
  { variant_type: "core", estimated_minutes: 25, title: "Original lesson" },
  { variant_type: "eal_supported", estimated_minutes: 20, title: "EAL scaffolded" },
];

const WORKFLOW_FLOWS = [
  { sequence: ["log-intervention", "draft-message", "approve"], count: 4 },
  { sequence: ["forecast", "ea-briefing"], count: 3 },
];

const SPARK_STUDENT: StudentSummary = {
  alias: "Amira",
  pending_action_count: 2,
  last_intervention_days: 7,
  active_pattern_count: 1,
  pending_message_count: 0,
  latest_priority_reason: null,
  intervention_history_14d: STUDENT_14D,
};

const COHORT_STUDENTS: StudentSummary[] = [
  {
    alias: "A1",
    pending_action_count: 0,
    last_intervention_days: null,
    active_pattern_count: 0,
    pending_message_count: 0,
    latest_priority_reason: null,
    intervention_history_14d: STUDENT_14D,
  },
  {
    alias: "A2",
    pending_action_count: 1,
    last_intervention_days: 5,
    active_pattern_count: 0,
    pending_message_count: 0,
    latest_priority_reason: null,
    intervention_history_14d: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  },
];

// ════════════════════════════════════════════════════════════════════════════
// Test suite
// ════════════════════════════════════════════════════════════════════════════

describe("viz accessibility — zero axe violations", () => {

  // ── Primitives ────────────────────────────────────────────────────────────

  it("Sparkline (shared/DataViz) — with data", async () => {
    const { container } = render(<SharedSparkline data={[1, 2, 3, 4]} label="Trend" />);
    await expectNoAxeViolations(container);
  });

  it("Sparkline (shared/DataViz) — empty / short data", async () => {
    const { container } = render(<SharedSparkline data={[1]} label="No data" />);
    await expectNoAxeViolations(container);
  });

  it("TrendIndicator — up", async () => {
    const { container } = render(<TrendIndicator value={5} direction="up" />);
    await expectNoAxeViolations(container);
  });

  it("TrendIndicator — down", async () => {
    const { container } = render(<TrendIndicator value={-3.2} direction="down" />);
    await expectNoAxeViolations(container);
  });

  it("TrendIndicator — flat", async () => {
    const { container } = render(<TrendIndicator value={0} direction="flat" />);
    await expectNoAxeViolations(container);
  });

  it("HealthDot — healthy", async () => {
    const { container } = render(<HealthDot status="healthy" tooltip="Good" />);
    await expectNoAxeViolations(container);
  });

  it("HealthDot — warning (no tooltip)", async () => {
    const { container } = render(<HealthDot status="warning" />);
    await expectNoAxeViolations(container);
  });

  it("HealthDot — critical", async () => {
    const { container } = render(<HealthDot status="critical" tooltip="Needs attention" />);
    await expectNoAxeViolations(container);
  });

  it("ProgressBar — partial fill", async () => {
    const { container } = render(<ProgressBar value={50} label="Done" />);
    await expectNoAxeViolations(container);
  });

  it("ProgressBar — zero fill", async () => {
    const { container } = render(<ProgressBar value={0} label="Not started" />);
    await expectNoAxeViolations(container);
  });

  it("ProgressBar — full fill", async () => {
    const { container } = render(<ProgressBar value={100} label="Complete" />);
    await expectNoAxeViolations(container);
  });

  it("ToneSparkline — sufficient data points", async () => {
    const { container } = render(<ToneSparkline data={[1, 2, 3, 4, 5]} label="Intervention pulse" />);
    await expectNoAxeViolations(container);
  });

  it("CohortSparklineGrid — with students, no click handler", async () => {
    const { container } = render(<CohortSparklineGrid students={COHORT_STUDENTS} />);
    await expectNoAxeViolations(container);
  });

  it("CohortSparklineGrid — with click handler (interactive buttons)", async () => {
    const { container } = render(
      <CohortSparklineGrid students={COHORT_STUDENTS} onStudentClick={() => {}} />,
    );
    await expectNoAxeViolations(container);
  });

  it("CohortSparklineGrid — empty students", async () => {
    const { container } = render(<CohortSparklineGrid students={[]} />);
    await expectNoAxeViolations(container);
  });

  // ── DataVisualizations.tsx ────────────────────────────────────────────────

  it("StudentPriorityMatrix — with students, no click handler", async () => {
    const { container } = render(<StudentPriorityMatrix students={PRIORITY_STUDENTS} />);
    await expectNoAxeViolations(container);
  });

  it("StudentPriorityMatrix — with students, with click handler", async () => {
    const { container } = render(
      <StudentPriorityMatrix students={PRIORITY_STUDENTS} onStudentClick={() => {}} />,
    );
    await expectNoAxeViolations(container);
  });

  it("ComplexityDebtGauge — no click handler", async () => {
    const { container } = render(
      <ComplexityDebtGauge debtItems={DEBT_ITEMS} previousTotal={3} />,
    );
    await expectNoAxeViolations(container);
  });

  it("ComplexityDebtGauge — with click handler", async () => {
    const { container } = render(
      <ComplexityDebtGauge debtItems={DEBT_ITEMS} previousTotal={3} onSegmentClick={() => {}} />,
    );
    await expectNoAxeViolations(container);
  });

  it("ClassroomCompositionRings — no click handler", async () => {
    const { container } = render(
      <ClassroomCompositionRings students={COMPOSITION_STUDENTS} />,
    );
    await expectNoAxeViolations(container);
  });

  it("ClassroomCompositionRings — with click handler", async () => {
    const { container } = render(
      <ClassroomCompositionRings students={COMPOSITION_STUDENTS} onSegmentClick={() => {}} />,
    );
    await expectNoAxeViolations(container);
  });

  it("InterventionRecencyTimeline — no click handler", async () => {
    const { container } = render(
      <InterventionRecencyTimeline students={RECENCY_STUDENTS} />,
    );
    await expectNoAxeViolations(container);
  });

  it("InterventionRecencyTimeline — with click handler", async () => {
    const { container } = render(
      <InterventionRecencyTimeline students={RECENCY_STUDENTS} onStudentClick={() => {}} />,
    );
    await expectNoAxeViolations(container);
  });

  it("EALoadStackedBars — with blocks", async () => {
    const { container } = render(<EALoadStackedBars blocks={EA_BLOCKS} />);
    await expectNoAxeViolations(container);
  });

  it("SupportPatternRadar — no click handler", async () => {
    const { container } = render(<SupportPatternRadar themes={PATTERN_THEMES} />);
    await expectNoAxeViolations(container);
  });

  it("SupportPatternRadar — with click handler", async () => {
    const { container } = render(
      <SupportPatternRadar themes={PATTERN_THEMES} onSegmentClick={() => {}} />,
    );
    await expectNoAxeViolations(container);
  });

  it("PlanStreakCalendar — no click handler", async () => {
    const { container } = render(<PlanStreakCalendar plans14d={PLANS_14D} />);
    await expectNoAxeViolations(container);
  });

  it("PlanStreakCalendar — with click handler", async () => {
    const { container } = render(
      <PlanStreakCalendar plans14d={PLANS_14D} onSegmentClick={() => {}} />,
    );
    await expectNoAxeViolations(container);
  });

  it("FollowUpDecayIndicators — no click handler", async () => {
    const { container } = render(<FollowUpDecayIndicators gaps={FOLLOWUP_GAPS} />);
    await expectNoAxeViolations(container);
  });

  it("FollowUpDecayIndicators — with click handler", async () => {
    const { container } = render(
      <FollowUpDecayIndicators gaps={FOLLOWUP_GAPS} onStudentClick={() => {}} />,
    );
    await expectNoAxeViolations(container);
  });

  it("MessageApprovalFunnel — typical values", async () => {
    const { container } = render(
      <MessageApprovalFunnel messagesTotal={10} messagesApproved={7} />,
    );
    await expectNoAxeViolations(container);
  });

  it("StudentSparkIndicator", async () => {
    const { container } = render(<StudentSparkIndicator student={SPARK_STUDENT} />);
    await expectNoAxeViolations(container);
  });

  it("DebtTrendSparkline — no click handler", async () => {
    const { container } = render(<DebtTrendSparkline data={TREND_DATA} />);
    await expectNoAxeViolations(container);
  });

  it("DebtTrendSparkline — with click handler", async () => {
    const { container } = render(
      <DebtTrendSparkline data={TREND_DATA} onSegmentClick={() => {}} />,
    );
    await expectNoAxeViolations(container);
  });

  it("ComplexityTrendCalendar — no click handler", async () => {
    const { container } = render(<ComplexityTrendCalendar data={CAL_DATA} />);
    await expectNoAxeViolations(container);
  });

  it("ComplexityTrendCalendar — with click handler", async () => {
    const { container } = render(
      <ComplexityTrendCalendar data={CAL_DATA} onSegmentClick={() => {}} />,
    );
    await expectNoAxeViolations(container);
  });

  it("InterventionTimeline — no dot-click handler", async () => {
    const { container } = render(<InterventionTimeline records={TIMELINE_RECORDS} />);
    await expectNoAxeViolations(container);
  });

  it("InterventionTimeline — with dot-click handler", async () => {
    const { container } = render(
      <InterventionTimeline records={TIMELINE_RECORDS} onDotClick={() => {}} />,
    );
    await expectNoAxeViolations(container);
  });

  it("FollowUpSuccessRate — no click handler", async () => {
    const { container } = render(<FollowUpSuccessRate records={FOLLOWUP_RECORDS} />);
    await expectNoAxeViolations(container);
  });

  it("FollowUpSuccessRate — with click handler", async () => {
    const { container } = render(
      <FollowUpSuccessRate records={FOLLOWUP_RECORDS} onSegmentClick={() => {}} />,
    );
    await expectNoAxeViolations(container);
  });

  it("ScheduleLoadStrip", async () => {
    const { container } = render(<ScheduleLoadStrip blocks={SCHEDULE_BLOCKS} />);
    await expectNoAxeViolations(container);
  });

  it("VariantSummaryStrip — no click handler", async () => {
    const { container } = render(<VariantSummaryStrip variants={VARIANTS} />);
    await expectNoAxeViolations(container);
  });

  it("VariantSummaryStrip — with click handler", async () => {
    const { container } = render(
      <VariantSummaryStrip variants={VARIANTS} onSegmentClick={() => {}} />,
    );
    await expectNoAxeViolations(container);
  });

  it("PlanCoverageRadar — no click handler", async () => {
    const { container } = render(
      <PlanCoverageRadar
        watchpoints={5}
        priorities={3}
        eaActions={2}
        prepItems={4}
        familyFollowups={1}
      />,
    );
    await expectNoAxeViolations(container);
  });

  it("PlanCoverageRadar — with click handler", async () => {
    const { container } = render(
      <PlanCoverageRadar
        watchpoints={5}
        priorities={3}
        eaActions={2}
        prepItems={4}
        familyFollowups={1}
        onSegmentClick={() => {}}
        sectionItems={RADAR_SECTION_ITEMS}
      />,
    );
    await expectNoAxeViolations(container);
  });

  it("WorkflowFlowStrip", async () => {
    const { container } = render(<WorkflowFlowStrip flows={WORKFLOW_FLOWS} />);
    await expectNoAxeViolations(container);
  });

  it("ReadabilityComparisonGauge", async () => {
    const { container } = render(
      <ReadabilityComparisonGauge
        sourceText="The student demonstrated significant difficulty with complex multi-step mathematical word problems involving fractions."
        simplifiedText="The student had trouble with hard math word problems about fractions."
      />,
    );
    await expectNoAxeViolations(container);
  });

  it("ScaffoldEffectivenessChart — static (post role-fix)", async () => {
    const { container } = render(
      <ScaffoldEffectivenessChart
        scaffolds={[
          { name: "visual_support", count: 5 },
          { name: "sentence_starters", count: 3 },
          { name: "partner_reading", count: 4 },
        ]}
      />,
    );
    await expectNoAxeViolations(container);
  });

  it("ForecastTimeline — static", async () => {
    const { container } = render(
      <ForecastTimeline
        blocks={[
          { id: "b1", time_slot: "9:00 AM", activity: "Math", level: "high", source: "forecast" } as never,
          { id: "b2", time_slot: "10:00 AM", activity: "Reading", level: "low", source: "forecast" } as never,
        ]}
      />,
    );
    await expectNoAxeViolations(container);
  });

  it("ForecastTimeline — interactive", async () => {
    const { container } = render(
      <ForecastTimeline
        blocks={[
          { id: "b1", time_slot: "9:00 AM", activity: "Math", level: "high", source: "forecast" } as never,
        ]}
        onBlockClick={() => {}}
      />,
    );
    await expectNoAxeViolations(container);
  });

});
