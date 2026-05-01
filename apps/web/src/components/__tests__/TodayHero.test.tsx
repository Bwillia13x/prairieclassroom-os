/**
 * TodayHero.test.tsx — Contract tests for the redesigned Today
 * command dashboard (2026-04-29).
 *
 * The hero composition was rebuilt to match the target dashboard
 * reference: command card → Today's flow timeline → Follow-up debt
 * strip, with a side rail (Live Signals + Students to Watch). These
 * tests assert the public DOM contract that the rest of the app
 * (and snapshot consumers) depend on, plus the visible behaviour
 * teachers see when the snapshot is populated.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TodayHero from "../TodayHero";
import type {
  TodaySnapshot,
  ClassroomHealth,
  ComplexityForecast,
} from "../../types";

function makeForecast(
  peak: "low" | "medium" | "high" = "high",
): ComplexityForecast {
  return {
    forecast_id: "fc-1",
    classroom_id: "demo",
    forecast_date: "2026-04-13",
    overall_summary: "",
    highest_risk_block: "10:00-10:45",
    schema_version: "1.0",
    blocks: [
      {
        time_slot: "08:00-08:45",
        activity: "Morning routines",
        level: "low",
        contributing_factors: ["Attendance, readiness, quick writes"],
        suggested_mitigation: "",
      },
      {
        time_slot: "10:00-10:45",
        activity: "Math",
        level: peak,
        contributing_factors: ["Fractions on a number line"],
        suggested_mitigation: "Stage the first task before students arrive.",
      },
      {
        time_slot: "11:00-11:45",
        activity: "Science",
        level: "medium",
        contributing_factors: ["Plant life cycles"],
        suggested_mitigation: "",
      },
      {
        time_slot: "13:00-13:45",
        activity: "Writing",
        level: "low",
        contributing_factors: ["Informational draft"],
        suggested_mitigation: "",
      },
      {
        time_slot: "14:00-14:45",
        activity: "PE",
        level: "low",
        contributing_factors: ["Fitness & games"],
        suggested_mitigation: "",
      },
    ],
  };
}

function makeSnapshot(overrides: Partial<TodaySnapshot> = {}): TodaySnapshot {
  return {
    debt_register: {
      register_id: "r1",
      classroom_id: "demo",
      items: [],
      item_count_by_category: {},
      generated_at: "2026-04-13T00:00:00Z",
      schema_version: "1.0",
    },
    latest_plan: null,
    latest_forecast: null,
    student_count: 3,
    last_activity_at: null,
    ...overrides,
  } as TodaySnapshot;
}

function makeHealth(streak = 0, planToday = false): ClassroomHealth {
  const plans7 = [planToday, false, false, false, false, false, false];
  return {
    streak_days: streak,
    plans_last_7: plans7,
    messages_approved: 0,
    messages_total: 0,
    trends: {
      debt_total_14d: [],
      plans_14d: [],
      peak_complexity_14d: [],
    },
  };
}

const calmAction = {
  description:
    "Core planning is up to date. Use the prep suite to build differentiated material for the next lesson artifact.",
  tab: "differentiate" as const,
  cta: "Differentiate",
  label: "Prep ready",
  tone: "success" as const,
};

describe("TodayHero", () => {
  it("renders the command card with the recommended-action title", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        onCtaClick={() => {}}
      />,
    );
    // The action-first eyebrow anchors the top of the dashboard.
    expect(screen.getByText(/^do this now$/i)).toBeInTheDocument();
    // Title falls back to the recommended-action label.
    expect(screen.getByRole("heading", { name: /prep ready/i })).toBeInTheDocument();
  });

  it("renders the primary CTA with a task label and fires onCtaClick", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        onCtaClick={handler}
      />,
    );
    const cta = screen.getByRole("button", { name: /adapt lesson/i });
    expect(cta).toBeInTheDocument();
    await user.click(cta);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("falls back to a phase-aware title when recommendedAction is null", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={null}
        currentHour={8}
        onCtaClick={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /do this now: differentiate/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /start morning triage/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /review today's command center/i }),
    ).toBeInTheDocument();
  });

  it("surfaces the action evidence in the command card", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("medium") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        checkFirstStudents={["Hannah"]}
        openItemCount={7}
        peakBlock={{
          time_slot: "10:00-10:45",
          activity: "Literacy block",
          level: "medium",
          contributing_factors: ["Independent writing"],
          suggested_mitigation: "Check in early",
        }}
        onCtaClick={() => {}}
      />,
    );
    const facts = screen.getByRole("group", { name: /why this action is first/i });
    expect(facts).toBeInTheDocument();
    expect(within(facts).getByText("Student")).toBeInTheDocument();
    expect(within(facts).getByText("Hannah")).toBeInTheDocument();
    expect(within(facts).getByText("10:00-10:45")).toBeInTheDocument();
    expect(within(facts).getByText("7")).toBeInTheDocument();
  });

  it("exposes a today-hero landmark with data-testid for downstream consumers", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        onCtaClick={() => {}}
      />,
    );
    const hero = screen.getByTestId("today-hero");
    expect(hero).toBeInTheDocument();
    expect(hero).toHaveClass("today-hero");
  });

  it("renders Today's flow as a 5-card timeline driven by forecast blocks", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("high") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        onCtaClick={() => {}}
      />,
    );
    const flowSection = screen.getByRole("region", { name: /today's flow/i });
    // Block titles map common subjects to short labels.
    expect(within(flowSection).getByText(/morning routines/i)).toBeInTheDocument();
    expect(within(flowSection).getByText(/math block/i)).toBeInTheDocument();
    expect(within(flowSection).getByText(/science/i)).toBeInTheDocument();
    expect(within(flowSection).getByText(/writing/i)).toBeInTheDocument();
    expect(within(flowSection).getByText(/^pe$/i)).toBeInTheDocument();
  });

  it("renders the Follow-up debt strip with five metric tiles", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        onCtaClick={() => {}}
      />,
    );
    expect(screen.getByText(/follow-up debt/i)).toBeInTheDocument();
    expect(screen.getByText(/interventions/i)).toBeInTheDocument();
    expect(screen.getByText(/assessments/i)).toBeInTheDocument();
    expect(screen.getByText(/communications/i)).toBeInTheDocument();
    expect(screen.getByText(/plan adjustments/i)).toBeInTheDocument();
    expect(screen.getByText(/materials prep/i)).toBeInTheDocument();
  });

  it("renders the Live Signals rail with a Live indicator and AI source tag", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({
          latest_forecast: makeForecast("low"),
          last_activity_at: "2026-04-18T08:47:00-06:00",
        })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        onCtaClick={() => {}}
      />,
    );
    expect(screen.getByText(/live signals/i)).toBeInTheDocument();
    expect(screen.getByText(/^live$/i)).toBeInTheDocument();
    // AI freshness tag is required by the source-tag contract.
    expect(screen.getByTestId("source-tag-ai")).toBeInTheDocument();
  });

  it("renders Students to Watch buttons that route through onStudentClick", async () => {
    const user = userEvent.setup();
    const onStudentClick = vi.fn();
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("high") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        openItemCount={4}
        checkFirstStudents={["Amira", "Brody", "Farid", "Jae", "Kiana", "Liam"]}
        peakBlock={makeForecast("high").blocks[1]}
        onCtaClick={() => {}}
        onStudentClick={onStudentClick}
      />,
    );

    // Watchlist clamps to a max of four rows so the rail stays scannable.
    expect(screen.getByText(/students to watch/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Kiana/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Amira/ }));
    expect(onStudentClick).toHaveBeenCalledWith("Amira");
  });

  it("uses accessible aria-labels on watchlist rows when reasons are provided", () => {
    const reasons: Record<string, string> = { Amira: "Pending follow-up" };
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("high") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        checkFirstStudents={["Amira", "Brody"]}
        studentReasons={reasons}
        onCtaClick={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Open student details for Amira: Pending follow-up/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Check first: Brody/ }),
    ).toBeInTheDocument();
  });

  it("personalises the command title when a check-first student is in scope", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("high") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        openItemCount={3}
        checkFirstStudents={["Amira"]}
        currentHour={8}
        onCtaClick={() => {}}
      />,
    );
    expect(
      screen.getByRole("heading", { name: /start morning triage with amira/i }),
    ).toBeInTheDocument();
  });

  it("pivots the student-first command to closeout after school", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("high") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        openItemCount={3}
        checkFirstStudents={["Amira"]}
        currentHour={18}
        onCtaClick={() => {}}
      />,
    );
    expect(
      screen.getByRole("heading", { name: /close today's loop for amira/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/end-of-day closeout/i)).toBeInTheDocument();
  });

  it("renders a Monday eyebrow with a working dismiss when mondayMoment is supplied", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        mondayMoment={{
          label: "Monday — A fresh week. One calm move opens it.",
          onDismiss,
        }}
        onCtaClick={() => {}}
      />,
    );
    expect(screen.getByText(/monday — a fresh week/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /dismiss monday moment/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("hides the Monday eyebrow when mondayMoment is null", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        mondayMoment={null}
        onCtaClick={() => {}}
      />,
    );
    expect(screen.queryByText(/monday — a fresh week/i)).not.toBeInTheDocument();
  });

  it("uses a student-specific log-note CTA when the primary routes to the intervention log", () => {
    const interventionAction = {
      ...calmAction,
      cta: "Intervention Log",
      tab: "log-intervention" as const,
      label: "Follow-up needed",
    };
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={interventionAction}
        checkFirstStudents={["Hannah"]}
        onCtaClick={() => {}}
      />,
    );
    const buttons = screen.getAllByRole("button", { name: /log hannah note/i });
    expect(buttons).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /view all signals/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /view all students/i })).not.toBeInTheDocument();
  });

  it("does not show a competing secondary intervention CTA by default", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        onCtaClick={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /open intervention log/i }),
    ).not.toBeInTheDocument();
  });

  it("highlights a current block in the flow timeline with a 'Now' affordance", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("medium") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        onCtaClick={() => {}}
      />,
    );
    // The component falls back to the first block as "current" when the
    // wall-clock falls outside any range, so the "Now" pill is always
    // present given a populated forecast.
    const flowSection = screen.getByRole("region", { name: /today's flow/i });
    expect(within(flowSection).getByText(/^now$/i)).toBeInTheDocument();
  });

  it("derives a per-student watchlist caption from the debt register when no explicit reason is supplied", () => {
    // Two students appear only via debt-register items; neither has a
    // priority_reason, latest_priority_reason, or studentReasons entry.
    // Without the debt-derived fallback every row would read the same
    // "Check before the next transition" caption — which we no longer
    // accept in the watchlist UI.
    const snapshot = makeSnapshot({
      latest_forecast: makeForecast("medium"),
      debt_register: {
        register_id: "r-fallback",
        classroom_id: "demo",
        items: [
          {
            category: "approaching_review",
            student_refs: ["Hannah"],
            description: "Hannah pattern review window approaching",
            source_record_id: "student-1",
            age_days: 14,
            suggested_action: "Log a touchpoint",
          },
          {
            category: "stale_followup",
            student_refs: ["Marco"],
            description: "Marco follow-up overdue",
            source_record_id: "student-2",
            age_days: 6,
            suggested_action: "Close the loop",
          },
        ],
        item_count_by_category: { approaching_review: 1, stale_followup: 1 },
        generated_at: "2026-04-13T00:00:00Z",
        schema_version: "1.0",
      },
    });

    render(
      <TodayHero
        snapshot={snapshot}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        checkFirstStudents={["Hannah", "Marco"]}
        onCtaClick={() => {}}
      />,
    );

    // Each row shows a category-specific caption rather than the
    // generic fallback. The text is short on purpose so it fits the
    // single-line ellipsis in the rail.
    expect(screen.getByText(/pattern review approaching/i)).toBeInTheDocument();
    expect(screen.getByText(/follow-up overdue/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/check before the next transition/i),
    ).not.toBeInTheDocument();
  });
});

describe("TodayHero css hygiene", () => {
  it("does not introduce raw hex colors", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const cssPath = path.resolve(
      __dirname,
      "..",
      "TodayHero.css",
    );
    const css = fs.readFileSync(cssPath, "utf8");
    // Match #abc or #aabbcc hex literals (excluding var refs).
    const hexMatches = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hexMatches).toEqual([]);
  });
});
