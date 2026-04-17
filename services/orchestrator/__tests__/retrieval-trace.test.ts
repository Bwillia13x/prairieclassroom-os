import { describe, it, expect } from "vitest";
import {
  buildRetrievalTrace,
  planCitation,
  interventionCitation,
  patternReportCitation,
} from "../retrieval-trace.js";
import type { TomorrowPlan } from "../../../packages/shared/schemas/plan.js";
import type { InterventionRecord } from "../../../packages/shared/schemas/intervention.js";
import type { SupportPatternReport } from "../../../packages/shared/schemas/pattern.js";

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
});
