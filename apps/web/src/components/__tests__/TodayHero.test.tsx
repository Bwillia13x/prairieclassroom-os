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
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        onCtaClick={() => {}}
      />,
    );
    expect(screen.getByText("Prep ready")).toBeInTheDocument();
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
