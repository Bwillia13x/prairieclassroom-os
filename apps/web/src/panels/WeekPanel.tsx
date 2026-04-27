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
import { Card, ActionButton } from "../components/shared";
import EmptyStateCard from "../components/EmptyStateCard";
import SectionIcon from "../components/SectionIcon";
import PageHero, {
  type PageHeroMetricGroup,
  type PageHeroStatusRow,
} from "../components/shared/PageHero";
import SectionMarker from "../components/shared/SectionMarker";
import type {
  ClassroomHealth,
  DrillDownContext,
  FamilyMessagePrefill,
  InterventionPrefill,
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
  const eventsThisWeek = upcomingEvents.filter((event) => weekDays.some((day) => eventMatchesDay(event, day.id))).length;
  const unaddressedPatterns = result?.debt_register.item_count_by_category.unaddressed_pattern ?? 0;
  const staleFollowups = result?.debt_register.item_count_by_category.stale_followup ?? 0;
  const pressureTotal = unaddressedPatterns + staleFollowups;
  const nextHighRiskDay = weekDays.find((day) => day.blocks.some((block) => block.level === "high"));
  const commandDetail = nextHighRiskDay
    ? `${nextHighRiskDay.label} ${nextHighRiskDay.date_label} carries the next high-risk block.`
    : "Use the weekly pattern before locking tomorrow's coverage.";

  if (!profile) return null;

  // Metric groups frame the week as three lenses — Forecast (block-level
  // risk), Events (dates with student impact), Pressure (open pattern +
  // followup signal). Each group keeps its own eyebrow.
  const heroMetricGroups: PageHeroMetricGroup[] = [
    {
      label: "Forecast",
      metrics: [
        { value: dashboard ? weekDays.length : "—", label: "Days mapped" },
        { value: dashboard ? forecastDayCount : "—", label: "Forecast days" },
        {
          value: dashboard ? highRiskBlockCount : "—",
          label: "High blocks",
          tone: highRiskBlockCount > 0 ? "warning" : undefined,
        },
      ],
    },
    {
      label: "Events",
      metrics: [
        {
          value: dashboard ? eventsThisWeek : "—",
          label: "This week",
          tone: eventsThisWeek > 1 ? "warning" : undefined,
        },
      ],
    },
    {
      label: "Pressure",
      metrics: [
        {
          value: result ? pressureTotal : "—",
          label: "Open items",
          tone: pressureTotal > 4 ? "danger" : pressureTotal > 0 ? "warning" : undefined,
        },
        {
          value: result?.debt_register.item_count_by_category.stale_followup ?? "—",
          label: "Stale follow-ups",
        },
      ],
    },
  ];

  const heroStatusRows: PageHeroStatusRow[] = nextHighRiskDay
    ? [
        {
          label: "Next high-risk",
          value: `${nextHighRiskDay.label} ${nextHighRiskDay.date_label}`,
          tone: "warning",
        },
      ]
    : [];

  return (
    <section className="workspace-page week-panel" id="week-top">
      <PageHero
        id="week-hub"
        ariaLabel="Week command and multi-day forecast"
        eyebrow="Week command"
        title={<>Shape the <em>week</em> before it shapes tomorrow</>}
        description={
          <>
            {commandDetail} Read the forecasted days, event load, and open pressure signal
            before committing the next plan.
          </>
        }
        metricGroups={heroMetricGroups}
        statusRows={heroStatusRows}
        variant="week"
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
          </>
        }
      />

      {error && !result ? <ErrorBanner message={error} onDismiss={reset} /> : null}

      <SectionMarker
        number="02"
        title="Forecasted days"
        subtitle="Where the pressure is, where the events are, where the plan should land."
      />

      <div id="week-overview" className="week-panel__anchor-target">
        <Card variant="flat" className="week-panel__overview" aria-labelledby="week-overview-heading">
          <Card.Body>
            <header className="operating-dashboard__band-header">
              <h3 id="week-overview-heading">This Week</h3>
              <p>Forecasted days use AI risk levels; schedule- and event-seeded days stay visible for handoff planning.</p>
            </header>
            {dashboard ? (
              <div
                className="week-heatmap"
                style={{ "--op-day-count": dashboard.week_overview.length } as CSSProperties}
              >
                {dashboard.week_overview.map((day) => (
                  <div key={day.id} className={`week-heatmap__day week-heatmap__day--${day.source}`}>
                    <button
                      type="button"
                      className="week-heatmap__day-head"
                      onClick={() => setDrillDown({ type: "week-day", day })}
                      aria-label={`Open week dashboard details for ${day.label} ${day.date_label}`}
                    >
                      <span>{day.label}</span>
                      <strong>{day.date_label}</strong>
                      {day.is_today ? <em>Today</em> : null}
                    </button>
                    <div className="week-heatmap__cells">
                      {day.blocks.map((block) => (
                        <button
                          key={block.id}
                          type="button"
                          className={`week-heatmap__cell week-heatmap__cell--${block.level} week-heatmap__cell--${block.source}`}
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
                          aria-label={`${day.label} ${block.time_slot}, ${block.activity}: ${block.level}`}
                          title={block.detail}
                        >
                          <span>{block.time_slot}</span>
                          <strong>{block.activity}</strong>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <SectionSkeleton label="Loading week overview" variant="story" lines={3} />
            )}
          </Card.Body>
        </Card>
      </div>

      <div id="week-events" className="week-panel__anchor-target">
        <Card variant="flat" className="week-panel__events" aria-labelledby="week-events-heading">
          <Card.Body>
          <header className="operating-dashboard__band-header">
            <h3 id="week-events-heading">Upcoming events</h3>
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
          </Card.Body>
        </Card>
      </div>

      <div id="week-pressure" className="week-panel__anchor-target">
        <Card variant="flat" className="week-panel__pressure" aria-labelledby="week-pressure-heading">
          <Card.Body>
          <header className="operating-dashboard__band-header">
            <h3 id="week-pressure-heading">Planning rhythm & pattern pressure</h3>
            <p>Debt trend and open pattern/followup signal over the last 7-14 days.</p>
          </header>
          <ul className="week-pressure-list">
            <li>
              <strong>{trendWindow.at(-1) ?? 0}</strong>
              <span>current debt items</span>
            </li>
            <li>
              <strong>
                {trendWindow.length >= 2
                  ? (trendWindow.at(-1)! - trendWindow[0]!)
                  : 0}
              </strong>
              <span>{trendWindow.length >= 2 ? "7-day change" : "debt delta (waiting for trend)"}</span>
            </li>
            <li>
              <strong>{result?.debt_register.item_count_by_category.unaddressed_pattern ?? 0}</strong>
              <span>unaddressed patterns</span>
            </li>
            <li>
              <strong>{result?.debt_register.item_count_by_category.stale_followup ?? 0}</strong>
              <span>stale follow-ups</span>
            </li>
          </ul>
          </Card.Body>
        </Card>
      </div>

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
