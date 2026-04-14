import { useEffect, useMemo, useState } from "react";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { fetchTodaySnapshot, fetchClassroomHealth, fetchStudentSummary } from "../api";
import type { ActiveTab } from "../appReducer";
import PendingActionsCard from "../components/PendingActionsCard";
import PlanRecap from "../components/PlanRecap";
import ForecastTimeline from "../components/ForecastTimeline";
import SectionSkeleton from "../components/SectionSkeleton";
import PageIntro from "../components/PageIntro";
import EmptyStateCard from "../components/EmptyStateCard";
import EmptyStateIllustration from "../components/EmptyStateIllustration";
import ErrorBanner from "../components/ErrorBanner";
import StatusChip from "../components/StatusChip";
import SectionIcon from "../components/SectionIcon";
import HealthBar from "../components/HealthBar";
import StudentRoster from "../components/StudentRoster";
import DrillDownDrawer from "../components/DrillDownDrawer";
import TimeSuggestion, { getSuggestion } from "../components/TimeSuggestion";
import { Card, ActionButton } from "../components/shared";
import { ComplexityDebtGauge, StudentPriorityMatrix, InterventionRecencyTimeline, ClassroomCompositionRings } from "../components/DataVisualizations";
import DayArc from "../components/DayArc";
import TodayStory from "../components/TodayStory";
import type { TodaySnapshot, ClassroomHealth, StudentSummary, DrillDownContext, InterventionPrefill, FamilyMessagePrefill } from "../types";
import "./TodayPanel.css";

interface Props {
  onTabChange: (tab: ActiveTab) => void;
  onInterventionPrefill?: (prefill: InterventionPrefill) => void;
  onMessagePrefill?: (prefill: FamilyMessagePrefill) => void;
}

export default function TodayPanel({ onTabChange, onInterventionPrefill, onMessagePrefill }: Props) {
  const { activeClassroom, profile } = useApp();
  const session = useSession();
  const { error, result, execute, reset } = useAsyncAction<TodaySnapshot>();
  const health = useAsyncAction<ClassroomHealth>();
  const studentSummaries = useAsyncAction<StudentSummary[]>();
  const [drillDown, setDrillDown] = useState<DrillDownContext | null>(null);

  useEffect(() => {
    session.recordPanelVisit("today");
  }, [session]);

  useEffect(() => {
    if (!activeClassroom) return;
    execute((signal) => fetchTodaySnapshot(activeClassroom, signal));
    health.execute((signal) => fetchClassroomHealth(activeClassroom, signal));
    studentSummaries.execute((signal) => fetchStudentSummary(activeClassroom, undefined, signal));
  }, [activeClassroom, execute, health.execute, studentSummaries.execute]);

  const recommendedAction = useMemo(
    () => result ? getRecommendedAction(result) : null,
    [result],
  );

  const suggestion = useMemo(() => getSuggestion(new Date().getHours()), []);
  const totalActionCount = useMemo(
    () => result?.debt_register.items.length ?? 0,
    [result],
  );

  const attentionStudents = useMemo(
    () => new Set(result?.debt_register.items.flatMap((i) => i.student_refs) ?? []),
    [result],
  );

  const previousDebtTotal = useMemo(() => {
    const series = health.result?.trends?.debt_total_14d;
    if (!series || series.length < 2) return undefined;
    return series[series.length - 2];
  }, [health.result]);

  const studentsToCheckFirst = useMemo(() => {
    if (!result) return [];

    const categoryPriority: Record<string, number> = {
      unapproved_message: 0,
      stale_followup: 1,
      unaddressed_pattern: 2,
      approaching_review: 3,
    };

    const seen = new Set<string>();
    const ordered: string[] = [];
    const prioritizedItems = [...result.debt_register.items].sort((a, b) => {
      const aRank = categoryPriority[a.category] ?? Number.MAX_SAFE_INTEGER;
      const bRank = categoryPriority[b.category] ?? Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) return aRank - bRank;
      return b.age_days - a.age_days;
    });

    for (const item of prioritizedItems) {
      for (const studentRef of item.student_refs) {
        if (!studentRef || seen.has(studentRef)) continue;
        seen.add(studentRef);
        ordered.push(studentRef);
        if (ordered.length === 5) {
          return ordered;
        }
      }
    }

    return ordered;
  }, [result]);

  const showTimeSuggestion = useMemo(() => {
    if (!suggestion) return false;
    if (!recommendedAction) return true;
    return totalActionCount === 0 || suggestion.primaryAction.tab !== recommendedAction.tab;
  }, [recommendedAction, suggestion, totalActionCount]);

  if (!profile) return null;

  return (
    <section className="workspace-page today-panel">
      <PageIntro
        eyebrow="Command Center"
        title="Today"
        sectionTone="sun"
        sectionIcon="sun"
        breadcrumb={{ group: "Today", tab: "Command Center" }}
        description={`Start with the active queue, carry forward what still matters, and move directly into the next classroom action for Grade ${profile.grade_band}.`}
        badges={[
          { label: `${profile.students.length} students`, tone: "sun" },
          { label: "Morning triage first", tone: "pending" },
        ]}
      />

      {error && !result ? <ErrorBanner message={error} onDismiss={reset} /> : null}

      <div className="today-grid motion-stagger">
        {result ? (
          <DayArc
            forecast={result.latest_forecast}
            students={studentSummaries.result ?? []}
            debtItems={result.debt_register.items}
            health={health.result ?? null}
            onStudentClick={(alias) => setDrillDown({ type: "student", alias })}
            onBlockClick={(index) => {
              const block = result.latest_forecast?.blocks[index];
              if (block) setDrillDown({ type: "forecast-block", blockIndex: index, block });
            }}
          />
        ) : (
          <SectionSkeleton label="Loading day arc" variant="day-arc" lines={3} />
        )}

        {result ? (
          <TodayStory
            snapshot={result}
            health={health.result ?? null}
            students={studentSummaries.result ?? []}
          />
        ) : (
          <SectionSkeleton label="Loading today story" variant="story" lines={2} />
        )}

        {result ? (
          <PendingActionsCard
            items={[
              {
                key: "unapproved_message",
                label: "unapproved messages",
                count: result.debt_register.item_count_by_category.unapproved_message ?? 0,
                targetTab: "family-message",
                icon: <SectionIcon name="mail" className="shell-nav__group-icon" />,
              },
              {
                key: "stale_followup",
                label: "stale follow-ups",
                count: result.debt_register.item_count_by_category.stale_followup ?? 0,
                targetTab: "log-intervention",
                icon: <SectionIcon name="alert" className="shell-nav__group-icon" />,
              },
              {
                key: "unaddressed_pattern",
                label: "unaddressed patterns",
                count: result.debt_register.item_count_by_category.unaddressed_pattern ?? 0,
                targetTab: "support-patterns",
                icon: <SectionIcon name="star" className="shell-nav__group-icon" />,
              },
              {
                key: "approaching_review",
                label: "approaching review",
                count: result.debt_register.item_count_by_category.approaching_review ?? 0,
                targetTab: "support-patterns",
                icon: <SectionIcon name="clock" className="shell-nav__group-icon" />,
              },
            ]}
            primaryAction={recommendedAction!}
            onNavigate={onTabChange}
            totalCount={totalActionCount}
            studentsToCheckFirst={studentsToCheckFirst}
            onStudentClick={(studentRef) => setDrillDown({ type: "student", alias: studentRef })}
            onItemClick={(item) => {
              if (item.key) {
                const category = item.key;
                const items = result.debt_register.items.filter((i) => i.category === category);
                setDrillDown({ type: "debt-category", category, items });
              }
            }}
          />
        ) : (
          <SectionSkeleton label="Loading pending actions" variant="pending" lines={3} />
        )}

        {/* Visualization strip: Debt Gauge + Priority Matrix + Recency Timeline */}
        {result && result.debt_register.items.length > 0 && (
          <ComplexityDebtGauge
            debtItems={result.debt_register.items}
            previousTotal={previousDebtTotal}
          />
        )}

        {studentSummaries.result && studentSummaries.result.length > 0 ? (
          <StudentPriorityMatrix
            students={studentSummaries.result}
            onStudentClick={(alias) => setDrillDown({ type: "student", alias })}
          />
        ) : studentSummaries.loading ? (
          <SectionSkeleton label="Loading student priority matrix" variant="matrix" lines={3} />
        ) : null}

        {studentSummaries.result && studentSummaries.result.length > 0 ? (
          <InterventionRecencyTimeline
            students={studentSummaries.result}
            onStudentClick={(alias) => setDrillDown({ type: "student", alias })}
          />
        ) : studentSummaries.loading ? (
          <SectionSkeleton label="Loading intervention recency" variant="matrix" lines={3} />
        ) : null}

        {profile && profile.students.length > 0 && (
          <ClassroomCompositionRings students={profile.students} />
        )}

        {result && showTimeSuggestion ? <TimeSuggestion onNavigate={onTabChange} compact suggestion={suggestion} /> : null}

        {health.result ? (
          <HealthBar health={health.result} loading={false} pendingActionCount={totalActionCount} />
        ) : health.error ? (
          <div className="today-health-error" role="alert">Couldn&apos;t load health summary: {health.error}</div>
        ) : (
          <SectionSkeleton label="Loading health summary" variant="health" lines={2} />
        )}

        {result && (result.latest_plan || result.latest_forecast) ? (
          <div className="today-grid--secondary">
            {result.latest_plan ? (
              <PlanRecap
                plan={result.latest_plan}
                onPriorityClick={(studentRef) => setDrillDown({ type: "student", alias: studentRef })}
                onOpenPlan={() => onTabChange("tomorrow-plan")}
              />
            ) : null}

            {result.latest_forecast ? (
              <Card variant="raised" className="today-forecast-section">
                <Card.Body>
                <div className="today-forecast-header">
                  <div>
                    <h3>Risk Windows</h3>
                    <p className="today-forecast-summary">
                      {getForecastSummary(result.latest_forecast.overall_summary)}
                    </p>
                  </div>
                  <div className="today-forecast-header-right">
                    <StatusChip label={result.latest_forecast.highest_risk_block || "Forecast ready"} tone="analysis" />
                    <ActionButton size="sm" variant="secondary" onClick={() => onTabChange("complexity-forecast")}>
                      Open Forecast
                    </ActionButton>
                  </div>
                </div>
                <ForecastTimeline
                  blocks={result.latest_forecast.blocks}
                  onBlockClick={(index) => {
                    const block = result.latest_forecast!.blocks[index];
                    if (block) setDrillDown({ type: "forecast-block", blockIndex: index, block });
                  }}
                />
              </Card.Body>
            </Card>
          ) : null}
          </div>
        ) : null}

        {result ? (
          <StudentRoster
            attentionCount={attentionStudents.size}
            onDrillDown={(context) => setDrillDown(context)}
          />
        ) : null}

        {result && !result.latest_plan && !result.latest_forecast && result.debt_register.items.length === 0 ? (
          <EmptyStateCard
            icon={<EmptyStateIllustration name="prairie" />}
            title="Fresh start"
            description="No classroom debt or prior planning signal yet. Start with tomorrow planning or log an intervention so the command center has something to track."
            actionLabel="Build Tomorrow Plan"
            onAction={() => onTabChange("tomorrow-plan")}
          />
        ) : null}
      </div>

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
  if ((counts.unaddressed_pattern ?? 0) > 0) {
    return makeAction(
      "Support patterns need review before they quietly become the default classroom routine.",
      "support-patterns",
      "Support Patterns",
      "Pattern review",
      "analysis",
    );
  }
  if ((counts.approaching_review ?? 0) > 0) {
    return makeAction(
      "Several supports are approaching their review window. Tighten the pattern record before it goes stale.",
      "support-patterns",
      "Support Patterns",
      "Review due",
      "analysis",
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

function getForecastSummary(summary: string): string {
  const normalized = summary.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "Review the riskiest block first, then open the full forecast for mitigation details.";
  }
  const sentenceMatch = normalized.match(/^.*?[.!?](?=\s|$)/);
  if (sentenceMatch?.[0]) {
    return sentenceMatch[0];
  }
  if (normalized.length <= 150) {
    return normalized;
  }
  return `${normalized.slice(0, 147).trimEnd()}...`;
}
