import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
        time_slot: "09:00-09:45",
        activity: "Literacy",
        level: "medium",
        contributing_factors: [],
        suggested_mitigation: "",
      },
      {
        time_slot: "10:00-10:45",
        activity: "Math",
        level: peak,
        contributing_factors: [],
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
  it("renders the TodayStory lede inside the hero shell", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        onCtaClick={() => {}}
      />,
    );
    expect(screen.getByText(/breathe/i)).toBeInTheDocument();
  });

  it("renders the primary CTA with 'Open {cta}' label", () => {
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
      screen.getByRole("button", { name: /open differentiate/i }),
    ).toBeInTheDocument();
  });

  it("invokes onCtaClick when the primary button is pressed", async () => {
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
    await user.click(screen.getByRole("button", { name: /open differentiate/i }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("surfaces the recommended-action label chip inside the hero", () => {
    const { container } = render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        onCtaClick={() => {}}
      />,
    );
    expect(container.querySelector(".status-chip")).toHaveTextContent("Prep ready");
  });

  it("renders the recommended-action rationale sentence so the teacher sees why this is the next move", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        onCtaClick={() => {}}
      />,
    );
    // Desktop rationale + mobile next-move both contain this text.
    const matches = screen.getAllByText(/core planning is up to date/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("omits the CTA row when recommendedAction is null", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={null}
        onCtaClick={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /open differentiate/i }),
    ).not.toBeInTheDocument();
  });

  it("exposes a landmark region labelled 'Today hero'", () => {
    const { container } = render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        onCtaClick={() => {}}
      />,
    );
    expect(container.querySelector(".today-hero")).toBeInTheDocument();
    expect(
      container.querySelector('[aria-label="Today hero"]'),
    ).toBeInTheDocument();
  });

  it("renders the morning triage directive prominently (not as a tag chip)", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        onCtaClick={() => {}}
      />,
    );
    const directive = screen.getByTestId("today-hero-directive");
    expect(directive).toHaveTextContent(/morning triage first/i);
    // It must NOT live in a .pill or .chip or .badge element (elevation check).
    expect(directive.className).not.toMatch(/pill|chip|badge/i);
  });

  it("mounts PageFreshness with the snapshot's last_activity_at as AI-snapshot", () => {
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
    const freshness = screen.getByTestId("page-freshness");
    expect(freshness).toHaveTextContent(/AI SNAPSHOT/i);
  });

  it("renders the compact morning brief and opens student drill-down chips", async () => {
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

    const brief = screen.getByTestId("today-hero-brief");
    expect(brief).toHaveTextContent(/open items/i);
    expect(brief).toHaveTextContent(/4 items/i);
    expect(brief).toHaveTextContent(/peak block/i);
    expect(brief).toHaveTextContent(/10:00-10:45 Math/i);
    // Max 5 students rendered despite 6 passed in.
    expect(screen.queryByRole("button", { name: /Liam/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Amira/ }));
    expect(onStudentClick).toHaveBeenCalledWith("Amira");
  });

  it("renders student names with visible reasons when studentReasons are provided", () => {
    const reasons: Record<string, string> = {
      Amira: "Pending follow-up",
      Brody: "Stale math intervention (4 days)",
    };
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("high") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        openItemCount={4}
        checkFirstStudents={["Amira", "Brody", "Farid"]}
        studentReasons={reasons}
        peakBlock={makeForecast("high").blocks[1]}
        onCtaClick={() => {}}
      />,
    );

    // Reason text is visible in the chip, not just a title tooltip.
    expect(screen.getByText("Pending follow-up")).toBeInTheDocument();
    expect(screen.getByText("Stale math intervention (4 days)")).toBeInTheDocument();
    // Student without a reason shows just the name.
    const faridChip = screen.getByRole("button", { name: /Farid/ });
    expect(faridChip).toBeInTheDocument();
    expect(faridChip).not.toHaveTextContent(/follow-up|intervention/i);
  });

  it("uses accessible aria-labels on student chips with reasons", () => {
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

    const amiraChip = screen.getByRole("button", { name: /Open student details for Amira: Pending follow-up/ });
    expect(amiraChip).toBeInTheDocument();
    // Student without a reason gets "Check first" context.
    const brodyChip = screen.getByRole("button", { name: /Check first: Brody/ });
    expect(brodyChip).toBeInTheDocument();
  });

  it("renders a Monday freshness eyebrow with a working dismiss button when mondayMoment is provided", async () => {
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
    const eyebrow = screen.getByTestId("today-hero-monday-eyebrow");
    expect(eyebrow).toHaveTextContent(/monday/i);
    expect(eyebrow).toHaveTextContent(/fresh week/i);
    await user.click(screen.getByRole("button", { name: /dismiss fresh week eyebrow/i }));
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
    expect(screen.queryByTestId("today-hero-monday-eyebrow")).not.toBeInTheDocument();
  });

  it("renders a mobile command card with the recommended move and compact context", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        openItemCount={2}
        checkFirstStudents={["Amira"]}
        peakBlock={makeForecast("high").blocks[1]}
        onCtaClick={() => {}}
      />,
    );

    const command = screen.getByTestId("today-hero-mobile-command");
    expect(command).toHaveTextContent(/open/i);
    expect(command).toHaveTextContent(/2 items/i);
    expect(command).toHaveTextContent(/peak/i);
    expect(command).toHaveTextContent(/first check/i);
    expect(command).toHaveTextContent(/Amira/i);
    const nextMove = screen.getByTestId("today-hero-mobile-next-move");
    expect(nextMove).toHaveTextContent(/next move/i);
    expect(nextMove).toHaveTextContent(/differentiate/i);
    expect(nextMove).toHaveTextContent(/core planning is up to date/i);
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
