import { describe, it, expect } from "vitest";
import {
  buildRetrievalTrace,
  planCitation,
  interventionCitation,
  patternReportCitation,
  forecastCitation,
  scaffoldReviewCitation,
  survivalPacketCitation,
  familyMessageCitation,
} from "../retrieval-trace.js";
import type { TomorrowPlan } from "../../../packages/shared/schemas/plan.js";
import type { InterventionRecord } from "../../../packages/shared/schemas/intervention.js";
import type { SupportPatternReport } from "../../../packages/shared/schemas/pattern.js";
import type { ComplexityForecast } from "../../../packages/shared/schemas/forecast.js";
import type { ScaffoldDecayReport } from "../../../packages/shared/schemas/scaffold-decay.js";
import type { SurvivalPacket } from "../../../packages/shared/schemas/survival-packet.js";
import type { FamilyMessageDraft } from "../../../packages/shared/schemas/message.js";

const samplePlan: TomorrowPlan = {
  plan_id: "plan-001",
  classroom_id: "demo-okafor-grade34",
  schema_version: "1.0",
  source_artifact_ids: [],
  transition_watchpoints: [],
  support_priorities: [
    {
      student_ref: "Brody",
      reason: "Post-lunch math is the highest-risk window",
      suggested_action: "Pre-stage manipulatives at 12:50",
    },
  ],
  ea_actions: [],
  prep_checklist: [],
  family_followups: [],
};

const sampleIntervention: InterventionRecord = {
  record_id: "int-042",
  classroom_id: "demo-okafor-grade34",
  schema_version: "1.0",
  student_refs: ["Brody"],
  observation: "Brody had difficulty re-entering after recess; sat in doorway for several minutes",
  action_taken: "Calm corner with weighted lap pad",
  outcome: "Settled within 6 minutes",
  follow_up_needed: false,
  created_at: "2026-04-16T13:00:00Z",
};

const samplePattern: SupportPatternReport = {
  report_id: "pat-001",
  classroom_id: "demo-okafor-grade34",
  schema_version: "1.0",
  student_filter: null,
  time_window: 10,
  recurring_themes: [
    {
      theme: "Post-lunch transition difficulty",
      student_refs: ["Brody"],
      evidence_count: 4,
      example_observations: [],
    },
  ],
  follow_up_gaps: [],
  positive_trends: [],
  suggested_focus: [],
  generated_at: "2026-04-10T00:00:00Z",
};

const sampleForecast: ComplexityForecast = {
  forecast_id: "fc-2026-04-17",
  classroom_id: "demo-okafor-grade34",
  forecast_date: "2026-04-18",
  blocks: [],
  overall_summary: "Morning calm, post-lunch spike expected",
  highest_risk_block: "12:50 Math",
  schema_version: "1.0",
};

const sampleScaffoldReview: ScaffoldDecayReport = {
  report_id: "sd-001",
  classroom_id: "demo-okafor-grade34",
  student_ref: "Brody",
  reviews: [
    {
      scaffold_name: "Weighted lap pad",
      usage_trend: {
        scaffold_name: "Weighted lap pad",
        early_window_count: 5,
        early_window_total: 10,
        recent_window_count: 1,
        recent_window_total: 10,
        trend: "decaying",
      },
      positive_signals: [],
      withdrawal_plan: [],
      regression_protocol: "Re-introduce if student shows escalation",
      confidence: "medium",
    },
  ],
  summary: "Weighted lap pad usage decreased over last 20 interventions",
  generated_at: "2026-04-15T00:00:00Z",
  schema_version: "1.0",
};

const sampleSurvivalPacket: SurvivalPacket = {
  packet_id: "sp-2026-04-18",
  classroom_id: "demo-okafor-grade34",
  generated_for_date: "2026-04-18",
  routines: [],
  student_support: [],
  ea_coordination: {
    schedule_summary: "EA present 9:00–14:00",
    primary_students: ["Brody"],
    if_ea_absent: "Stagger small-group rotations",
  },
  simplified_day_plan: [],
  family_comms: [],
  complexity_peaks: [],
  heads_up: ["Brody returns from appt at 11:00"],
  schema_version: "1.0",
};

const sampleFamilyMessage: FamilyMessageDraft = {
  draft_id: "fm-042",
  classroom_id: "demo-okafor-grade34",
  student_refs: ["Brody"],
  message_type: "praise",
  target_language: "en",
  plain_language_text: "Brody had a great afternoon today — stayed on-task through math.",
  teacher_approved: true,
  approval_timestamp: "2026-04-16T15:00:00Z",
  schema_version: "1.0",
};

describe("retrieval-trace helpers", () => {
  it("planCitation includes record_id and an excerpt drawn from the first support priority", () => {
    const c = planCitation(samplePlan);
    expect(c.source_type).toBe("plan");
    expect(c.record_id).toBe("plan-001");
    expect(c.excerpt).toMatch(/Brody/);
    expect(c.excerpt).toMatch(/Post-lunch math/);
  });

  it("interventionCitation includes student name and observation in the excerpt", () => {
    const c = interventionCitation(sampleIntervention);
    expect(c.source_type).toBe("intervention");
    expect(c.record_id).toBe("int-042");
    expect(c.created_at).toBe("2026-04-16T13:00:00Z");
    expect(c.excerpt).toMatch(/Brody/);
  });

  it("patternReportCitation includes the first theme as the excerpt", () => {
    const c = patternReportCitation(samplePattern);
    expect(c.source_type).toBe("pattern_report");
    expect(c.record_id).toBe("pat-001");
    expect(c.excerpt).toMatch(/Post-lunch transition/);
  });

  it("buildRetrievalTrace defaults total_records_considered to citations.length", () => {
    const trace = buildRetrievalTrace([planCitation(samplePlan)]);
    expect(trace.citations).toHaveLength(1);
    expect(trace.total_records_considered).toBe(1);
  });

  it("buildRetrievalTrace honors a larger considered count when caller passes it", () => {
    const trace = buildRetrievalTrace(
      [planCitation(samplePlan), interventionCitation(sampleIntervention)],
      8,
    );
    expect(trace.citations).toHaveLength(2);
    expect(trace.total_records_considered).toBe(8);
  });

  it("buildRetrievalTrace clamps considered count up to citations.length when caller passes too small", () => {
    const trace = buildRetrievalTrace(
      [planCitation(samplePlan), interventionCitation(sampleIntervention)],
      0,
    );
    expect(trace.total_records_considered).toBe(2);
  });

  it("citations use record_id as the stable key for the UI", () => {
    expect(planCitation(samplePlan).record_id).toBe(samplePlan.plan_id);
    expect(interventionCitation(sampleIntervention).record_id).toBe(sampleIntervention.record_id);
    expect(patternReportCitation(samplePattern).record_id).toBe(samplePattern.report_id);
  });

  it("forecastCitation surfaces the highest-risk block in the excerpt", () => {
    const c = forecastCitation(sampleForecast);
    expect(c.source_type).toBe("forecast");
    expect(c.record_id).toBe("fc-2026-04-17");
    expect(c.excerpt).toMatch(/Highest risk/);
    expect(c.excerpt).toMatch(/Math/);
  });

  it("scaffoldReviewCitation includes the student ref and first scaffold name", () => {
    const c = scaffoldReviewCitation(sampleScaffoldReview);
    expect(c.source_type).toBe("scaffold_review");
    expect(c.record_id).toBe("sd-001");
    expect(c.created_at).toBe("2026-04-15T00:00:00Z");
    expect(c.excerpt).toMatch(/Brody/);
    expect(c.excerpt).toMatch(/Weighted lap pad/);
  });

  it("survivalPacketCitation includes the generated_for_date and first heads-up", () => {
    const c = survivalPacketCitation(sampleSurvivalPacket);
    expect(c.source_type).toBe("survival_packet");
    expect(c.record_id).toBe("sp-2026-04-18");
    expect(c.excerpt).toMatch(/2026-04-18/);
    expect(c.excerpt).toMatch(/Brody/);
  });

  it("familyMessageCitation labels draft vs approved status in the excerpt", () => {
    const approved = familyMessageCitation(sampleFamilyMessage);
    expect(approved.source_type).toBe("family_message");
    expect(approved.record_id).toBe("fm-042");
    expect(approved.created_at).toBe("2026-04-16T15:00:00Z");
    expect(approved.excerpt).toMatch(/Brody/);
    expect(approved.excerpt).toMatch(/praise/);
    expect(approved.excerpt).toMatch(/approved/);

    const draft = familyMessageCitation({ ...sampleFamilyMessage, teacher_approved: false, approval_timestamp: undefined });
    expect(draft.excerpt).toMatch(/draft/);
    expect(draft.created_at).toBeUndefined();
  });

  it("new citation types are covered by RetrievalSourceTypeSchema via the schema enum", () => {
    const trace = buildRetrievalTrace([
      forecastCitation(sampleForecast),
      scaffoldReviewCitation(sampleScaffoldReview),
      survivalPacketCitation(sampleSurvivalPacket),
      familyMessageCitation(sampleFamilyMessage),
    ]);
    const types = trace.citations.map((c) => c.source_type).sort();
    expect(types).toEqual(["family_message", "forecast", "scaffold_review", "survival_packet"]);
  });
});
