import StatusChip from "./StatusChip";
import NumberTicker from "./NumberTicker";
import SourceTag from "./SourceTag";
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
  const plans14d = health.trends?.plans_14d ?? [];
  const has14dTrend =
    plans14d.length > 0;
  const planWindowTotal = has14dTrend ? plans14d.length : health.plans_last_7.length;
  const planWindowPlanned = has14dTrend ? plans14d.filter((p) => p === 1).length : plannedCount;
  const planWindowMissing = Math.max(0, planWindowTotal - planWindowPlanned);
  const planSummaryLabel = `${planWindowPlanned}/${planWindowTotal}`;
  const debtTrend = health.trends?.debt_total_14d ?? [];
  const debtStart = debtTrend[0] ?? 0;
  const debtCurrent = debtTrend[debtTrend.length - 1] ?? debtStart;
  const debtDirection = debtCurrent > debtStart ? "Rising" : debtCurrent < debtStart ? "Falling" : "Flat";
  const complexityTrend = health.trends?.peak_complexity_14d ?? [];
  const complexityHighDays = complexityTrend.filter((level) => level >= 2).length;
  const complexityCriticalDays = complexityTrend.filter((level) => level >= 3).length;

  return (
    <div
      className={`health-bar health-bar--${overallTone}`}
      role="status"
      aria-label="Classroom health summary"
    >
      <header className="health-bar__summary">
        <div className="health-bar__summary-copy">
          <span className="health-bar__eyebrow">Classroom health pulse</span>
          <strong>{planSummaryLabel}</strong>
          <span>
            {planWindowMissing === 0
              ? "Planning rhythm is covered"
              : `${planWindowMissing} days still need plans`}
          </span>
        </div>
        <div className="health-bar__summary-chips" aria-label="Health state">
          {streak > 0 && (
            <StatusChip tone="success">
              {/* NumberTicker's default aria-label is the formatted value ("5"),
                  which concatenates naturally with the surrounding text to read
                  "5-day streak — no stale follow-ups". Passing an explicit
                  ariaLabel here would duplicate and garble the announcement. */}
              <NumberTicker value={streak} />-day streak
            </StatusChip>
          )}
          <StatusChip tone={overallTone} label={overallLabel} />
        </div>
      </header>

      <div className="health-bar__grid">
        <section className="health-bar__module health-bar__module--planning" aria-label="Planning rhythm">
          <div className="health-bar__module-header">
            <div>
              <span>01</span>
              <h4>Planning rhythm</h4>
            </div>
            <span>{has14dTrend ? "14 day window" : "7 day window"}</span>
          </div>
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
                plans14d={plans14d}
                onSegmentClick={
                  onTrendClick
                    ? (payload) =>
                        onTrendClick({
                          trendKey: "plans",
                          label: "Planning streak",
                          data: plans14d,
                          highlightIndex: payload.dayIndex,
                        })
                    : undefined
                }
              />
            )}
          </div>
        </section>

        <section className="health-bar__module health-bar__module--state" aria-label="Action state">
          <div className="health-bar__module-header">
            <div>
              <span>02</span>
              <h4>Action state</h4>
            </div>
          </div>
          <div className="health-bar__state">
            <strong>{overallLabel}</strong>
            <span>
              {pendingActionCount === 0
                ? "No pending classroom actions"
                : `${pendingActionCount} pending classroom actions`}
            </span>
          </div>
        </section>

        <section className="health-bar__module health-bar__module--debt" aria-label="Debt trend">
          <div className="health-bar__module-header">
            <div>
              <span>03</span>
              <h4>Debt trend</h4>
            </div>
            <span>{debtDirection}</span>
          </div>
          {debtTrend.length > 1 ? (
            <DebtTrendSparkline
              data={debtTrend}
              onSegmentClick={onTrendClick}
            />
          ) : (
            <p className="health-bar__empty-note">No 14-day debt trend yet.</p>
          )}
        </section>

        <section className="health-bar__module health-bar__module--complexity" aria-label="Complexity trend">
          <div className="health-bar__module-header">
            <div>
              <span>04</span>
              <h4>Complexity</h4>
            </div>
            <span>{complexityTrend.length || 0} days</span>
          </div>
          {complexityTrend.length > 0 ? (
            <>
              <ComplexityTrendCalendar
                data={complexityTrend}
                onSegmentClick={onTrendClick}
              />
              <p className="health-bar__trend-note">
                {complexityCriticalDays > 0
                  ? `${complexityCriticalDays} critical days`
                  : `${complexityHighDays} high-pressure days`}
              </p>
            </>
          ) : (
            <p className="health-bar__empty-note">No complexity trend yet.</p>
          )}
        </section>
      </div>

      <footer className="health-bar__footer">
        <span>Updated by plans, interventions, and messages.</span>
        {/* Audit #34: health telemetry is derived from logged plans and
            debt items — record-derived, not AI output. */}
        <SourceTag kind="record" />
      </footer>
    </div>
  );
}
