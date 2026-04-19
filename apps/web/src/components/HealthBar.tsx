import StatusChip from "./StatusChip";
import NumberTicker from "./NumberTicker";
import { PlanStreakCalendar, DebtTrendSparkline, ComplexityTrendCalendar } from "./DataVisualizations";
import type { ClassroomHealth } from "../types";
import "./HealthBar.css";

interface Props {
  health: ClassroomHealth | null;
  loading: boolean;
  pendingActionCount?: number;
  onTrendClick?: (payload: {
    trendKey: "debt" | "plans" | "complexity";
    label: string;
    data: number[];
    highlightIndex?: number;
  }) => void;
}

function isZeroState(health: ClassroomHealth): boolean {
  return (
    health.streak_days === 0 &&
    health.plans_last_7.every((p) => !p)
  );
}

function getOverallTone(health: ClassroomHealth, pendingActionCount: number): "success" | "pending" | "warning" {
  const planToday = health.plans_last_7[0] ?? false;

  if (pendingActionCount > 3) return "warning";
  if (pendingActionCount === 0 && health.streak_days >= 2 && planToday) return "success";
  return "pending";
}

function getOverallLabel(tone: "success" | "pending" | "warning"): string {
  if (tone === "success") return "On track";
  if (tone === "warning") return "Needs attention";
  return "Catching up";
}

export default function HealthBar({ health, loading, pendingActionCount = 0, onTrendClick }: Props) {
  if (loading) {
    return (
      <div className="health-bar health-bar--loading" aria-busy="true" aria-label="Loading health summary">
        <span className="health-bar__shimmer" />
      </div>
    );
  }

  if (!health || isZeroState(health)) {
    return (
      <div className="health-bar health-bar--empty">
        <StatusChip
          tone="muted"
          label="Health tracking starts after your first plan or intervention"
        />
      </div>
    );
  }

  const streak = Math.min(health.streak_days, 30);
  const plannedCount = health.plans_last_7.filter(Boolean).length;
  const overallTone = getOverallTone(health, pendingActionCount);
  const overallLabel = getOverallLabel(overallTone);
  const has14dTrend =
    !!health.trends?.plans_14d && health.trends.plans_14d.length > 0;

  return (
    <div
      className="health-bar"
      role="status"
      aria-label="Classroom health summary"
    >
      {streak > 0 && (
        <StatusChip tone="success">
          {/* NumberTicker's default aria-label is the formatted value ("5"),
              which concatenates naturally with the surrounding text to read
              "5-day streak — no stale follow-ups". Passing an explicit
              ariaLabel here would duplicate and garble the announcement. */}
          <NumberTicker value={streak} />-day streak — no stale follow-ups
        </StatusChip>
      )}

      {/* Audit #23: unify the planning denominator. When a 14-day trend
          is available, PlanStreakCalendar owns the numeric denominator
          ("N of 14 days planned") and the weekly dots here render as a
          silent visual scoped by the "this week" caption. When no 14-day
          trend is available, we fall back to the inline "N of 7 planned"
          so the teacher still sees a count. */}
      <div className="health-bar__planning-group" data-testid="health-bar-planning">
        <span className="health-bar__planning">
          {health.plans_last_7.map((planned, i) => (
            <span
              key={i}
              className={`health-bar__dot${planned ? " health-bar__dot--filled" : ""}`}
              aria-hidden="true"
            />
          ))}
          {has14dTrend ? (
            <span className="health-bar__planning-subnote">this week · 7 days</span>
          ) : (
            <span className="health-bar__planning-label">
              <NumberTicker value={plannedCount} /> of 7 planned
            </span>
          )}
        </span>

        {has14dTrend && (
          <PlanStreakCalendar
            plans14d={health.trends!.plans_14d}
            onSegmentClick={
              onTrendClick
                ? (payload) =>
                    onTrendClick({
                      trendKey: "plans",
                      label: "Planning streak",
                      data: health.trends!.plans_14d,
                      highlightIndex: payload.dayIndex,
                    })
                : undefined
            }
          />
        )}
      </div>

      <StatusChip tone={overallTone} label={overallLabel} />
      {health.trends?.debt_total_14d && health.trends.debt_total_14d.length > 1 && (
        <DebtTrendSparkline
          data={health.trends.debt_total_14d}
          onSegmentClick={onTrendClick}
        />
      )}
      {health.trends?.peak_complexity_14d && health.trends.peak_complexity_14d.length > 0 && (
        <ComplexityTrendCalendar
          data={health.trends.peak_complexity_14d}
          onSegmentClick={onTrendClick}
        />
      )}
    </div>
  );
}
