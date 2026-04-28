import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import OperatingDashboard, { buildOperatingDashboardSnapshot } from "../OperatingDashboard";
import type { ClassroomProfile, TodaySnapshot } from "../../types";

function makeProfile(): ClassroomProfile {
  return {
    classroom_id: "demo-classroom",
    grade_band: "3-4",
    subject_focus: "cross_curricular",
    classroom_notes: [],
    students: [
      { alias: "Amira", eal_flag: true, family_language: "Arabic", support_tags: ["vocabulary"] },
      { alias: "Brody", support_tags: ["transition"] },
    ],
    schedule: [
      { time_slot: "9:00", activity: "Literacy", ea_available: true },
      { time_slot: "10:00", activity: "Math", ea_available: false },
    ],
    upcoming_events: [
      { event_date: "2099-04-21", time_slot: "10:00", description: "Assembly", impacts: "Compressed transition" },
    ],
    is_demo: true,
  };
}

function makeSnapshot(): TodaySnapshot {
  return {
    debt_register: {
      register_id: "reg-1",
      classroom_id: "demo-classroom",
      items: [
        {
          category: "unapproved_message",
          student_refs: ["Amira"],
          description: "Message waiting",
          source_record_id: "msg-1",
          age_days: 1,
          suggested_action: "Approve",
        },
      ],
      item_count_by_category: { unapproved_message: 1, stale_followup: 1 },
      generated_at: "2026-04-21T12:00:00.000Z",
      schema_version: "1.0",
    },
    latest_plan: {
      plan_id: "plan-1",
      classroom_id: "demo-classroom",
      source_artifact_ids: [],
      transition_watchpoints: [
        {
          time_or_activity: "Math",
          risk_description: "Math starts after the assembly",
          suggested_mitigation: "Stage first task",
        },
      ],
      support_priorities: [],
      ea_actions: [],
      prep_checklist: ["Print sentence frames"],
      family_followups: [
        { student_ref: "Amira", reason: "Share writing progress", message_type: "praise" },
      ],
      schema_version: "1.0",
    },
    latest_forecast: {
      forecast_id: "forecast-1",
      classroom_id: "demo-classroom",
      forecast_date: "2099-04-21",
      blocks: [
        {
          time_slot: "10:00",
          activity: "Math",
          level: "high",
          contributing_factors: ["Post-assembly transition"],
          suggested_mitigation: "Stage first task",
        },
      ],
      overall_summary: "Math needs staging.",
      highest_risk_block: "10:00",
      schema_version: "1.0",
    },
    student_count: 2,
    last_activity_at: "2026-04-21T12:00:00.000Z",
    panel_statuses: [
      {
        panel_id: "family-message",
        label: "Family Message",
        state: "needs_action",
        dependency_state: "ready",
        pending_count: 1,
        detail: "One draft needs approval",
        last_run_at: "2026-04-21T12:00:00.000Z",
      },
    ],
    student_threads: [
      {
        alias: "Amira",
        priority_reason: "Family message waiting",
        last_intervention_days: 8,
        pending_action_count: 1,
        pending_message_count: 1,
        active_pattern_count: 0,
        thread_count: 2,
        eal_flag: true,
        family_language: "Arabic",
        support_tags: ["vocabulary"],
        actions: [
          {
            category: "unapproved_message",
            label: "Approve family message",
            count: 1,
            target_tab: "family-message",
            state: "needs_action",
          },
        ],
      },
    ],
  };
}

describe("OperatingDashboard", () => {
  it("derives queues, support coverage, and transition risks from current snapshot data", () => {
    const dashboard = buildOperatingDashboardSnapshot(makeSnapshot(), makeProfile(), {
      transition_counts: [{ from_panel: "today", to_panel: "family-message", count: 2 }],
      terminal_counts: [{ panel_id: "tomorrow-plan", count: 1 }],
    });

    expect(dashboard.communication_queue[0].label).toBe("Family messages");
    expect(dashboard.communication_queue[0].count).toBe(1);
    expect(dashboard.support_coverage[0].alias).toBe("Amira");
    expect(dashboard.support_coverage[0].cells.some((cell) => cell.state === "open")).toBe(true);
    expect(dashboard.transition_risks[0].activity).toBe("Math");
    expect(dashboard.outcome_metrics.today_exits).toBe(2);
  });

  it("opens dashboard drill-down contexts from visual controls", async () => {
    const user = userEvent.setup();
    const onOpenContext = vi.fn();

    render(
      <OperatingDashboard
        snapshot={makeSnapshot()}
        profile={makeProfile()}
        sessionSummary={null}
        activeRole="teacher"
        onNavigate={vi.fn()}
        onOpenContext={onOpenContext}
      />,
    );

    expect(screen.getByRole("heading", { name: /week, coverage, queues/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Family messages: 1 queued/i }));
    expect(onOpenContext).toHaveBeenCalledWith(expect.objectContaining({ type: "queue-state" }));

    await user.click(screen.getByRole("button", { name: /Amira Touch/i }));
    expect(onOpenContext).toHaveBeenCalledWith(expect.objectContaining({ type: "coverage-cell" }));

    await user.click(screen.getByRole("button", { name: /Transition risk 10:00 Math/i }));
    expect(onOpenContext).toHaveBeenCalledWith(expect.objectContaining({ type: "transition-risk" }));
  });

  it("renders the premium summary bands and opens debt context", async () => {
    const user = userEvent.setup();
    const onOpenContext = vi.fn();

    render(
      <OperatingDashboard
        variant="summary"
        snapshot={makeSnapshot()}
        profile={makeProfile()}
        sessionSummary={null}
        activeRole="teacher"
        onNavigate={vi.fn()}
        onOpenContext={onOpenContext}
      />,
    );

    expect(screen.getByRole("region", { name: /watchlist/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /coverage/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /prairie queue/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /approve/i }));
    expect(onOpenContext).toHaveBeenCalledWith(expect.objectContaining({ type: "debt-category" }));
  });
});
