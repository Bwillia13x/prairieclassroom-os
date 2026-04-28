import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import {
  fetchTodaySnapshot,
  fetchClassroomHealth,
  fetchSessionSummary,
  type SessionSummary,
} from "../api";
import type { NavTarget } from "../appReducer";
import SectionSkeleton from "../components/SectionSkeleton";
import ErrorBanner from "../components/ErrorBanner";
import { buildOperatingDashboardSnapshot } from "../components/OperatingDashboard";
import DrillDownDrawer from "../components/DrillDownDrawer";
import { WeekRiskHorizon } from "../components/DataVisualizations";
import { ActionButton } from "../components/shared";
import EmptyStateCard from "../components/EmptyStateCard";
import SectionIcon from "../components/SectionIcon";
import PageHero from "../components/shared/PageHero";
import type {
  ClassroomHealth,
  DrillDownContext,
  FamilyMessagePrefill,
  InterventionPrefill,
  OperatingDashboardBlockLevel,
  OperatingDashboardCoverageRow,
  OperatingDashboardDay,
  OperatingDashboardSource,
  OperatingDashboardWeekBlock,
  TodaySnapshot,
  UpcomingEvent,
} from "../types";
import "./TodayPanel.css";

interface Props {
  onTabChange: (target: NavTarget) => void;
  onInterventionPrefill?: (prefill: InterventionPrefill) => void;
  onMessagePrefill?: (prefill: FamilyMessagePrefill) => void;
}

function eventMatchesDay(event: UpcomingEvent, dayId: string): boolean {
  const key = (event.event_date ?? "").slice(0, 10);
  return key === dayId;
}

const LEVEL_RANK: Record<OperatingDashboardBlockLevel, number> = {
  unknown: 0,
  low: 1,
  medium: 2,
  high: 3,
};

const LEVEL_LABEL: Record<OperatingDashboardBlockLevel, string> = {
  unknown: "Schedule only",
  low: "Low",
  medium: "Medium",
  high: "High",
};

const SOURCE_LABEL: Record<OperatingDashboardSource, string> = {
  forecast: "forecast",
  event: "event",
  schedule: "schedule",
  insufficient_data: "insufficient data",
};

function riskLevelForDay(day: OperatingDashboardDay): OperatingDashboardBlockLevel {
  return day.blocks.reduce<OperatingDashboardBlockLevel>((highest, block) => (
    LEVEL_RANK[block.level] > LEVEL_RANK[highest] ? block.level : highest
  ), "unknown");
}

function eventLoadForDay(day: OperatingDashboardDay, events: UpcomingEvent[]): number {
  const profileEvents = events.filter((event) => eventMatchesDay(event, day.id)).length;
  const blockEventCount = Math.max(0, ...day.blocks.map((block) => block.event_count ?? 0));
  return Math.max(profileEvents, blockEventCount);
}

function blocksForBoard(day: OperatingDashboardDay): OperatingDashboardWeekBlock[] {
  return day.blocks.slice(0, 5);
}

function hasForecast(day: OperatingDashboardDay): boolean {
  return day.source === "forecast" || day.blocks.some((block) => block.source === "forecast");
}

function teacherRhythmForDay(day: OperatingDashboardDay, eventLoad: number): string {
  const riskLevel = riskLevelForDay(day);
  if (riskLevel === "high") return "Front-load support before the highest-pressure block.";
  if (day.source === "forecast") return "Use the forecast bands to stage coverage, then keep one review window.";
  if (eventLoad > 0) return "Protect transitions around the event load and keep the plan lighter.";
  if (day.source === "insufficient_data") return "Add schedule detail before staging coverage.";
  return "Keep a light check-in cadence and preserve flexible planning time.";
}

function formatUpdatedAt(value: string | null | undefined): string {
  if (!value) return "Profile schedule";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Profile schedule";
  return `Updated ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function supportCoveragePercent(rows: OperatingDashboardCoverageRow[]): number {
  const cells = rows.flatMap((row) => row.cells).filter((cell) => cell.state !== "not_applicable");
  if (cells.length === 0) return 0;
  const score = cells.reduce((total, cell) => {
    if (cell.state === "covered") return total + 1;
    if (cell.state === "watch") return total + 0.55;
    return total;
  }, 0);
  return Math.round((score / cells.length) * 100);
}

function coverageStatus(value: number): string {
  if (value >= 80) return "Steady coverage";
  if (value >= 60) return "Coverage watch";
  return "Teacher pass needed";
}

function blockAriaLabel(day: OperatingDashboardDay, block: OperatingDashboardWeekBlock): string {
  return `${day.label} ${day.date_label}, ${block.time_slot}, ${block.activity}. ${LEVEL_LABEL[block.level]} signal from ${SOURCE_LABEL[block.source]}. ${block.detail}`;
}

/**
 * WeekPanel — multi-day lens for coverage, upcoming events, planning
 * rhythm, and pattern pressure. Extracted from the Today/OperatingDashboard
 * week overview as part of the 2026-04-23 reorg so the week view has its
 * own page.
 */
export default function WeekPanel({ onTabChange, onInterventionPrefill, onMessagePrefill }: Props) {
  const { activeClassroom, activeRole, profile } = useApp();
  const session = useSession();
  const { error, result, execute, reset } = useAsyncAction<TodaySnapshot>();
  const health = useAsyncAction<ClassroomHealth>();
  const sessionSummary = useAsyncAction<SessionSummary>();
  const [drillDown, setDrillDown] = useState<DrillDownContext | null>(null);

  useEffect(() => {
    session.recordPanelVisit("week");
  }, [session]);

  useEffect(() => {
    if (!activeClassroom) return;
    execute((signal) => fetchTodaySnapshot(activeClassroom, signal));
    health.execute((signal) => fetchClassroomHealth(activeClassroom, signal));
    sessionSummary.execute((signal) => fetchSessionSummary(activeClassroom, signal));
  }, [activeClassroom, execute, health.execute, sessionSummary.execute]);

  const dashboard = useMemo(
    () => (result && profile)
      ? buildOperatingDashboardSnapshot(result, profile, sessionSummary.result ?? null)
      : null,
    [result, profile, sessionSummary.result],
  );

  const upcomingEvents = useMemo(() => {
    if (!profile?.upcoming_events?.length) return [];
    return profile.upcoming_events;
  }, [profile]);

  const debtTrend = health.result?.trends?.debt_total_14d ?? [];
  const trendWindow = debtTrend.slice(-7);
  const weekDays = dashboard?.week_overview ?? [];
  const highRiskBlockCount = weekDays.reduce(
    (total, day) => total + day.blocks.filter((block) => block.level === "high").length,
    0,
  );
  const forecastDayCount = weekDays.filter((day) => day.blocks.some((block) => block.source === "forecast")).length;
  const unmappedDayCount = weekDays.filter((day) => day.source === "insufficient_data").length;
  const eventsThisWeek = upcomingEvents.filter((event) => weekDays.some((day) => eventMatchesDay(event, day.id))).length;
  const unaddressedPatterns = result?.debt_register.item_count_by_category.unaddressed_pattern ?? 0;
  const staleFollowups = result?.debt_register.item_count_by_category.stale_followup ?? 0;
  const pressureTotal = unaddressedPatterns + staleFollowups;
  const openItems = result?.debt_register.items.length ?? pressureTotal;
  const coverageValue = dashboard ? supportCoveragePercent(dashboard.support_coverage) : 0;
  const nextHighRiskDay = weekDays.find((day) => day.blocks.some((block) => block.level === "high"));
  const commandDetail = nextHighRiskDay
    ? `${nextHighRiskDay.label} ${nextHighRiskDay.date_label} carries the next high-risk block.`
    : "Use the weekly pattern before locking tomorrow's coverage.";
  const latestDebt = trendWindow.at(-1) ?? 0;
  const debtDelta = trendWindow.length >= 2 ? latestDebt - trendWindow[0]! : 0;
  const riskHorizonPoints = weekDays.map((day) => ({
    label: day.label,
    dateLabel: day.date_label,
    level: riskLevelForDay(day),
    source: day.source,
  }));
  const prepChecklist = [
    {
      label: "Plan tomorrow",
      detail: result?.latest_plan ? "Plan ready" : "Needs teacher pass",
      state: result?.latest_plan ? "done" : "pending",
    },
    {
      label: "Read forecast day",
      detail: forecastDayCount > 0 ? `${forecastDayCount} day mapped` : "No forecasted day",
      state: forecastDayCount > 0 ? "done" : "pending",
    },
    {
      label: "Stage high-risk support",
      detail: highRiskBlockCount > 0 ? `${highRiskBlockCount} block${highRiskBlockCount === 1 ? "" : "s"}` : "No high-risk blocks",
      state: highRiskBlockCount > 0 ? "pending" : "done",
    },
  ];

  if (!profile) return null;

  return (
    <section className="workspace-page week-panel" id="week-top">
      <PageHero
        id="week-hub"
        ariaLabel="Week command and multi-day forecast"
        eyebrow="Week command"
        title={<>Shape the <em>week</em>{" "}before it shapes tomorrow</>}
        description={
          <>
            {commandDetail} Read the forecast, check the risk, and stage the plan
            before tomorrow starts making decisions for you.
          </>
        }
        instrument={
          <div className="week-command-instrument" aria-label="Week command metrics">
            <div className="week-command-instrument__tile week-command-instrument__tile--lead">
              <strong>{dashboard ? weekDays.length : "—"}</strong>
              <span>Days mapped</span>
            </div>
            <div className="week-command-instrument__tile">
              <strong>{dashboard ? forecastDayCount : "—"}</strong>
              <span>Forecast days</span>
            </div>
            <div className={`week-command-instrument__tile${highRiskBlockCount > 0 ? " week-command-instrument__tile--warning" : ""}`}>
              <strong>{dashboard ? highRiskBlockCount : "—"}</strong>
              <span>High-risk blocks</span>
            </div>
            <div className="week-command-instrument__tile">
              <strong>{dashboard ? unmappedDayCount : "—"}</strong>
              <span>Unmapped days</span>
            </div>
            <div className={`week-command-instrument__tile${openItems > 4 ? " week-command-instrument__tile--danger" : openItems > 0 ? " week-command-instrument__tile--warning" : ""}`}>
              <strong>{result ? openItems : "—"}</strong>
              <span>Open items</span>
            </div>
          </div>
        }
        variant="week"
        density="utility"
        actions={
          <>
            <ActionButton size="sm" variant="soft" onClick={() => onTabChange("tomorrow")}>
              <SectionIcon name="clock" className="shell-nav__group-icon" />
              Plan Tomorrow
            </ActionButton>
            <ActionButton size="sm" variant="soft" onClick={() => onTabChange("today")}>
              <SectionIcon name="sun" className="shell-nav__group-icon" />
              Review Today
            </ActionButton>
            <span className="week-hero__freshness">{formatUpdatedAt(result?.last_activity_at)}</span>
          </>
        }
      />

      {error && !result ? <ErrorBanner message={error} onDismiss={reset} /> : null}

      <section id="week-overview" className="week-operations-board" aria-labelledby="week-overview-heading">
        <div className="week-operations-board__header">
          <div>
            <span className="week-operations-board__eyebrow">Five-day horizon</span>
            <h2 id="week-overview-heading">This week</h2>
          </div>
          <p>
            Forecasted blocks keep their risk levels. Schedule-only and event-seeded blocks stay in view
            so the week reads as a planning map, not a spreadsheet.
          </p>
        </div>

        {dashboard ? (
          <>
            <div
              className="week-ops-horizon"
              style={{ "--week-day-count": dashboard.week_overview.length } as CSSProperties}
            >
              {dashboard.week_overview.map((day) => {
                const riskLevel = riskLevelForDay(day);
                const eventLoad = eventLoadForDay(day, upcomingEvents);
                const forecasted = hasForecast(day);
                const rhythm = teacherRhythmForDay(day, eventLoad);
                return (
                  <article
                    key={day.id}
                    className={`week-ops-day week-ops-day--${riskLevel} week-ops-day--${day.source}`}
                    aria-label={`${day.label} ${day.date_label}, ${LEVEL_LABEL[riskLevel]} week signal, ${eventLoad} event${eventLoad === 1 ? "" : "s"}`}
                  >
                    <header className="week-ops-day__header">
                      <button
                        type="button"
                        className="week-ops-day__date"
                        onClick={() => setDrillDown({ type: "week-day", day })}
                        aria-label={`Open week dashboard details for ${day.label} ${day.date_label}`}
                      >
                        <span>{day.label}</span>
                        <strong>{day.date_label}</strong>
                      </button>
                      <div className="week-ops-day__badges" aria-label="Day signals">
                        {day.is_today ? <span className="week-ops-badge">Today</span> : null}
                        {forecasted ? <span className="week-ops-badge week-ops-badge--forecast">Forecast</span> : null}
                        {riskLevel === "high" ? <span className="week-ops-badge week-ops-badge--high">High risk</span> : null}
                      </div>
                    </header>

                    <div className="week-ops-day__signals">
                      <span className={`week-risk-pill week-risk-pill--${riskLevel}`}>
                        <i aria-hidden="true" />
                        {LEVEL_LABEL[riskLevel]}
                      </span>
                      <span className="week-event-load">
                        <strong>{eventLoad}</strong>
                        <em>Event load</em>
                      </span>
                    </div>

                    <div className="week-ops-day__blocks">
                      {blocksForBoard(day).map((block) => (
                        <button
                          key={block.id}
                          type="button"
                          className={`week-ops-block week-ops-block--${block.level} week-ops-block--${block.source}`}
                          onClick={() => {
                            if (typeof block.forecast_index === "number" && result?.latest_forecast?.blocks[block.forecast_index]) {
                              setDrillDown({
                                type: "forecast-block",
                                blockIndex: block.forecast_index,
                                block: result.latest_forecast.blocks[block.forecast_index],
                              });
                              return;
                            }
                            setDrillDown({ type: "week-day", day });
                          }}
                          aria-label={blockAriaLabel(day, block)}
                          title={block.detail}
                        >
                          <span className="week-ops-block__time">{block.time_slot}</span>
                          <strong>{block.activity}</strong>
                          <span className="week-ops-block__source">{SOURCE_LABEL[block.source]}</span>
                        </button>
                      ))}
                    </div>

                    <footer className="week-ops-day__rhythm">
                      <span>Teacher rhythm</span>
                      <p>{rhythm}</p>
                    </footer>
                  </article>
                );
              })}
            </div>

            <div className="week-analytics-band" aria-label="Weekly planning analytics">
              <section className="week-analytics-card week-analytics-card--trend" aria-labelledby="week-risk-trend-heading">
                <header>
                  <span>Risk trend</span>
                  <h3 id="week-risk-trend-heading">Five-day signal</h3>
                </header>
                <WeekRiskHorizon points={riskHorizonPoints} />
              </section>

              <section className="week-analytics-card" aria-labelledby="week-pressure-signals-heading">
                <header>
                  <span>Pressure</span>
                  <h3 id="week-pressure-signals-heading">What needs staging</h3>
                </header>
                <dl className="week-pressure-compact">
                  <div>
                    <dt>High-risk blocks</dt>
                    <dd>{highRiskBlockCount}</dd>
                  </div>
                  <div>
                    <dt>Events this week</dt>
                    <dd>{eventsThisWeek}</dd>
                  </div>
                  <div>
                    <dt>Follow-up debt</dt>
                    <dd>{staleFollowups}</dd>
                  </div>
                </dl>
              </section>

              <section className="week-analytics-card" aria-labelledby="week-coverage-heading">
                <header>
                  <span>Coverage</span>
                  <h3 id="week-coverage-heading">{coverageStatus(coverageValue)}</h3>
                </header>
                <div
                  className="week-coverage-gauge"
                  style={{ "--coverage-angle": `${coverageValue * 3.6}deg` } as CSSProperties}
                  aria-label={`Support coverage ${coverageValue}%`}
                >
                  <strong>{coverageValue}%</strong>
                  <span>Core supports</span>
                </div>
              </section>

              <section className="week-analytics-card" aria-labelledby="week-prep-checklist-heading">
                <header>
                  <span>Planning rhythm</span>
                  <h3 id="week-prep-checklist-heading">Prep checklist</h3>
                </header>
                <ul className="week-prep-checklist">
                  {prepChecklist.map((item) => (
                    <li key={item.label} className={`week-prep-checklist__item week-prep-checklist__item--${item.state}`}>
                      <span aria-hidden="true" />
                      <strong>{item.label}</strong>
                      <em>{item.detail}</em>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        ) : (
          <SectionSkeleton label="Loading week overview" variant="story" lines={3} />
        )}
      </section>

      <section id="week-events" className="week-panel__section week-panel__section--events" aria-labelledby="week-events-heading">
        <header className="week-panel__section-header">
          <div>
            <span>Upcoming events</span>
            <h2 id="week-events-heading">Schedule changes in the plan</h2>
          </div>
          <p>Field trips, assemblies, and schedule shifts surfaced from the classroom profile.</p>
        </header>
        {upcomingEvents.length > 0 ? (
          <ul className="upcoming-events-list">
            {upcomingEvents.slice(0, 8).map((event, index) => (
              <li
                key={`${event.event_date}-${index}`}
                className={`upcoming-event${dashboard?.week_overview.some((day) => eventMatchesDay(event, day.id)) ? " upcoming-event--thisweek" : ""}`}
              >
                <span className="upcoming-event__date">{event.event_date}</span>
                <span className="upcoming-event__title"><strong>{event.description}</strong></span>
                {event.impacts ? <span className="upcoming-event__impacts">{event.impacts}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyStateCard
            cue="No upcoming events on file."
            hint="Field trips, assemblies, and schedule shifts populate this rail when they're added to the classroom profile."
          />
        )}
      </section>

      <section id="week-pressure" className="week-panel__section week-panel__section--pressure" aria-labelledby="week-pressure-heading">
        <header className="week-panel__section-header">
          <div>
            <span>Pattern pressure</span>
            <h2 id="week-pressure-heading">Debt trend and open follow-through</h2>
          </div>
          <p>Open pattern and follow-up signals over the last 7-14 days.</p>
        </header>
        <ul className="week-pressure-list">
          <li>
            <strong>{latestDebt}</strong>
            <span>current debt items</span>
          </li>
          <li>
            <strong>{debtDelta > 0 ? `+${debtDelta}` : debtDelta}</strong>
            <span>{trendWindow.length >= 2 ? "7-day change" : "debt delta waiting for trend"}</span>
          </li>
          <li>
            <strong>{unaddressedPatterns}</strong>
            <span>unaddressed patterns</span>
          </li>
          <li>
            <strong>{staleFollowups}</strong>
            <span>stale follow-ups</span>
          </li>
        </ul>
      </section>

      {activeRole !== "reviewer" ? (
        <DrillDownDrawer
          context={drillDown}
          onClose={() => setDrillDown(null)}
          onNavigate={(tab) => {
            setDrillDown(null);
            onTabChange(tab);
          }}
          onContextChange={setDrillDown}
          onInterventionPrefill={onInterventionPrefill}
          onMessagePrefill={onMessagePrefill}
        />
      ) : (
        <DrillDownDrawer
          context={drillDown}
          onClose={() => setDrillDown(null)}
          onNavigate={(tab) => {
            setDrillDown(null);
            onTabChange(tab);
          }}
          onContextChange={setDrillDown}
        />
      )}
    </section>
  );
}
