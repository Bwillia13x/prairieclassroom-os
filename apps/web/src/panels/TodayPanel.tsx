import { useEffect, useMemo, useState } from "react";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { fetchTodaySnapshot, fetchClassroomHealth } from "../api";
import type { ActiveTab } from "../appReducer";
import PendingActionsCard from "../components/PendingActionsCard";
import PlanRecap from "../components/PlanRecap";
import ForecastTimeline from "../components/ForecastTimeline";
import SkeletonLoader from "../components/SkeletonLoader";
import TimeSuggestion from "../components/TimeSuggestion";
import PageIntro from "../components/PageIntro";
import EmptyStateCard from "../components/EmptyStateCard";
import EmptyStateIllustration from "../components/EmptyStateIllustration";
import ErrorBanner from "../components/ErrorBanner";
import StatusChip from "../components/StatusChip";
import SectionIcon from "../components/SectionIcon";
import HealthBar from "../components/HealthBar";
import StudentRoster from "../components/StudentRoster";
import DrillDownDrawer from "../components/DrillDownDrawer";
import Sparkline from "../components/Sparkline";
import { HealthDot, TrendIndicator, Card, ActionButton } from "../components/shared";
import type { TodaySnapshot, ClassroomHealth, DrillDownContext, InterventionPrefill, FamilyMessagePrefill } from "../types";
import "./TodayPanel.css";

interface Props {
  onTabChange: (tab: ActiveTab) => void;
  onInterventionPrefill?: (prefill: InterventionPrefill) => void;
  onMessagePrefill?: (prefill: FamilyMessagePrefill) => void;
}

export default function TodayPanel({ onTabChange, onInterventionPrefill, onMessagePrefill }: Props) {
  const { activeClassroom, profile } = useApp();
  const session = useSession();
  const { loading, error, result, execute, reset } = useAsyncAction<TodaySnapshot>();
  const health = useAsyncAction<ClassroomHealth>();
  const [drillDown, setDrillDown] = useState<DrillDownContext | null>(null);

  useEffect(() => {
    session.recordPanelVisit("today");
  }, [session]);

  useEffect(() => {
    if (!activeClassroom) return;
    execute((signal) => fetchTodaySnapshot(activeClassroom, signal));
    health.execute((signal) => fetchClassroomHealth(activeClassroom, signal));
  }, [activeClassroom, execute, health.execute]);

  if (!profile) return null;

  const recommendedAction = useMemo(
    () => result ? getRecommendedAction(result) : null,
    [result],
  );

  const attentionStudents = new Set(
    result?.debt_register.items.flatMap((i) => i.student_refs) ?? []
  );

  return (
    <section className="workspace-page today-panel">
      <PageIntro
        eyebrow="Command Center"
        title="Today"
        sectionTone="sun"
        sectionIcon="sun"
        breadcrumb={{ group: "Today", tab: "Command Center" }}
        description={`Monitor what needs attention first, review yesterday's planning signal, and move directly into the next action for Grade ${profile.grade_band}.`}
        badges={[
          { label: `${profile.students.length} students`, tone: "sun" },
          { label: "Pending actions first", tone: "pending" },
          { label: "Planning recap next", tone: "analysis" },
        ]}
      />

      <TimeSuggestion onNavigate={onTabChange} />

      {loading && !result ? (
        <SkeletonLoader variant="stack" message="Loading today's snapshot..." label="Loading dashboard" />
      ) : null}

      {error && !result ? <ErrorBanner message={error} onDismiss={reset} /> : null}

      {result ? (
        <div className="today-grid motion-stagger">
          <HealthBar health={health.result ?? null} loading={health.loading} pendingActionCount={result.debt_register.items.length} />
          {health.result && !health.loading && (
            <div className="today-health-viz">
              <HealthDot
                status={
                  result.debt_register.items.length > 3 ? "critical"
                  : result.debt_register.items.length > 0 ? "warning"
                  : "healthy"
                }
                tooltip={`${result.debt_register.items.length} pending action${result.debt_register.items.length !== 1 ? "s" : ""}`}
              />
              {health.result.trends.debt_total_14d.length >= 2 && (() => {
                const d = health.result!.trends.debt_total_14d;
                const recent = d[d.length - 1];
                const prev = d[d.length - 2];
                const delta = prev === 0 ? 0 : ((recent - prev) / Math.abs(prev)) * 100;
                return (
                  <TrendIndicator
                    value={delta}
                    direction={delta > 5 ? "up" : delta < -5 ? "down" : "flat"}
                  />
                );
              })()}
            </div>
          )}

          <PendingActionsCard
            items={[
              {
                label: "unapproved messages",
                count: result.debt_register.item_count_by_category.unapproved_message ?? 0,
                targetTab: "family-message",
                icon: <SectionIcon name="mail" className="shell-nav__group-icon" />,
              },
              {
                label: "stale follow-ups",
                count: result.debt_register.item_count_by_category.stale_followup ?? 0,
                targetTab: "log-intervention",
                icon: <SectionIcon name="alert" className="shell-nav__group-icon" />,
              },
              {
                label: "unaddressed patterns",
                count: result.debt_register.item_count_by_category.unaddressed_pattern ?? 0,
                targetTab: "support-patterns",
                icon: <SectionIcon name="star" className="shell-nav__group-icon" />,
              },
              {
                label: "approaching review",
                count: result.debt_register.item_count_by_category.approaching_review ?? 0,
                targetTab: "support-patterns",
                icon: <SectionIcon name="clock" className="shell-nav__group-icon" />,
              },
            ]}
            onNavigate={onTabChange}
            sparklineData={health.result?.trends.debt_total_14d}
            onItemClick={(label) => {
              const categoryMap: Record<string, string> = {
                "unapproved messages": "unapproved_message",
                "stale follow-ups": "stale_followup",
                "unaddressed patterns": "unaddressed_pattern",
                "approaching review": "approaching_review",
              };
              const category = categoryMap[label];
              if (category) {
                const items = result.debt_register.items.filter((i) => i.category === category);
                setDrillDown({ type: "debt-category", category, items });
              }
            }}
          />

          {recommendedAction ? (
            <Card variant="raised" tone="priority" accent className="today-priority-card">
              <Card.Body>
                <div className="today-priority-header">
                  <div>
                    <h3>Recommended Next Step</h3>
                    <p>{recommendedAction.description}</p>
                  </div>
                  <StatusChip label={recommendedAction.label} tone={recommendedAction.tone} />
                </div>
                <ActionButton variant="primary" onClick={() => onTabChange(recommendedAction.tab)}>
                  Open {recommendedAction.cta}
                </ActionButton>
              </Card.Body>
            </Card>
          ) : null}

          {result.latest_plan ? (
            <PlanRecap
              plan={result.latest_plan}
              sparklineData={health.result?.trends.plans_14d}
              onPriorityClick={(studentRef) => setDrillDown({ type: "student", alias: studentRef })}
            />
          ) : null}

          {result.latest_forecast ? (
            <Card variant="raised" className="today-forecast-section">
              <Card.Body>
                <div className="today-forecast-header">
                  <h3>Latest Forecast Recap</h3>
                  <div className="today-forecast-header-right">
                    {health.result?.trends.peak_complexity_14d ? (
                      <Sparkline data={health.result.trends.peak_complexity_14d} label="Complexity trend over 14 days" />
                    ) : null}
                    <StatusChip label={result.latest_forecast.highest_risk_block || "Forecast ready"} tone="analysis" />
                  </div>
                </div>
                <ForecastTimeline
                  blocks={result.latest_forecast.blocks}
                  onBlockClick={(index) => {
                    const block = result.latest_forecast!.blocks[index];
                    if (block) setDrillDown({ type: "forecast-block", blockIndex: index, block });
                  }}
                />
                <p className="today-forecast-summary">{result.latest_forecast.overall_summary}</p>
              </Card.Body>
            </Card>
          ) : null}

          <StudentRoster
            attentionCount={attentionStudents.size}
            onDrillDown={(context) => setDrillDown(context)}
          />

          {!result.latest_plan && !result.latest_forecast && result.debt_register.items.length === 0 ? (
            <EmptyStateCard
              icon={<EmptyStateIllustration name="prairie" />}
              title="Fresh start"
              description="No classroom debt or prior planning signal yet. Start with tomorrow planning or log an intervention so the command center has something to track."
              actionLabel="Build Tomorrow Plan"
              onAction={() => onTabChange("tomorrow-plan")}
            />
          ) : null}
        </div>
      ) : null}

      <DrillDownDrawer
        context={drillDown}
        onClose={() => setDrillDown(null)}
        onNavigate={(tab) => { setDrillDown(null); onTabChange(tab); }}
        onInterventionPrefill={onInterventionPrefill}
        onMessagePrefill={onMessagePrefill}
      />
    </section>
  );
}

function getRecommendedAction(snapshot: TodaySnapshot) {
  const makeAction = (
    description: string,
    tab: ActiveTab,
    cta: string,
    label: string,
    tone: "pending" | "warning" | "analysis" | "provenance" | "success",
  ) => ({ description, tab, cta, label, tone });

  const counts = snapshot.debt_register.item_count_by_category;
  if ((counts.unapproved_message ?? 0) > 0) {
    return makeAction(
      "There are family messages waiting for teacher approval before they can be copied out.",
      "family-message",
      "Family Message",
      "Approval queue",
      "pending",
    );
  }
  if ((counts.stale_followup ?? 0) > 0) {
    return makeAction(
      "Follow-up debt is the highest operational risk right now. Log the next intervention while context is still recent.",
      "log-intervention",
      "Intervention Log",
      "Follow-up needed",
      "warning",
    );
  }
  if (!snapshot.latest_plan) {
    return makeAction(
      "There is no current plan on record. Capture today's signal so tomorrow starts with clear priorities.",
      "tomorrow-plan",
      "Tomorrow Plan",
      "Plan missing",
      "analysis",
    );
  }
  if (!snapshot.latest_forecast) {
    return makeAction(
      "The planning record exists, but tomorrow's block-by-block complexity outlook has not been generated yet.",
      "complexity-forecast",
      "Forecast",
      "Forecast missing",
      "provenance",
    );
  }
  return makeAction(
    "Core planning is up to date. Use the prep suite to build differentiated material for the next lesson artifact.",
    "differentiate",
    "Differentiate",
    "Prep ready",
    "success",
  );
}
