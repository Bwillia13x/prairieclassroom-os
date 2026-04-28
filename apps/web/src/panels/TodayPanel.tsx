import { useEffect, useMemo, useState } from "react";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { fetchClassroomHealth, fetchStudentSummary, fetchSessionSummary } from "../api";
import type { SessionSummary } from "../api";
import type { NavTarget } from "../appReducer";
import PendingActionsCard from "../components/PendingActionsCard";
import PlanRecap from "../components/PlanRecap";
import ForecastTimeline from "../components/ForecastTimeline";
import SectionSkeleton from "../components/SectionSkeleton";
import PageIntro from "../components/PageIntro";
import EmptyStateCard from "../components/EmptyStateCard";
import SectionIcon from "../components/SectionIcon";
import DrillDownDrawer from "../components/DrillDownDrawer";
import { useMondayMoment } from "../hooks/useMondayMoment";
import TimeSuggestion from "../components/TimeSuggestion";
import { StudentCoverageStrip } from "../components/TriageSurfaces";
import { Card, ActionButton } from "../components/shared";
import OperationalPreview, {
  type OperationalPreviewChip,
  type OperationalPreviewGroup,
} from "../components/shared/OperationalPreview";
import SectionMarker from "../components/shared/SectionMarker";
import { ComplexityDebtGauge } from "../components/DataVisualizations";
import DayArc from "../components/DayArc";
import TodayHero from "../components/TodayHero";
import PageFreshness from "../components/PageFreshness";
import SourceTag from "../components/SourceTag";
import {
  getTodayPrimaryAction,
  getTodayContextualSuggestion,
  getTodayWorkflowNudge,
  getStudentsToCheckFirst,
  getPeakBlock,
} from "../utils/todayWorkflow";
import { countActionableThreads } from "./ClassroomPanel.helpers";
import type {
  ComplexityBlock,
  ComplexityForecast,
  ClassroomHealth,
  DebtItem,
  StudentSummary,
  TodaySnapshot,
  DrillDownContext,
  InterventionPrefill,
  FamilyMessagePrefill,
} from "../types";
import "./TodayPanel.css";

interface Props {
  onTabChange: (target: NavTarget) => void;
  onInterventionPrefill?: (prefill: InterventionPrefill) => void;
  onMessagePrefill?: (prefill: FamilyMessagePrefill) => void;
}

/**
 * TodayPanel — live-day triage surface. The 2026-04-23 navigation reorg
 * moved week-level content (OperatingDashboard, week heatmap, broader
 * classroom profile visualizations) to the dedicated Classroom and Week
 * pages so Today focuses on same-day execution: hero, recommended move,
 * touchpoint strip, immediate risks, day arc, stale follow-ups, and
 * current-day carry-forward.
 */
export default function TodayPanel({ onTabChange, onInterventionPrefill, onMessagePrefill }: Props) {
  const { activeClassroom, activeRole, profile, latestTodaySnapshot } = useApp();
  const session = useSession();
  const result = latestTodaySnapshot ?? null;
  const health = useAsyncAction<ClassroomHealth>();
  const studentSummaries = useAsyncAction<StudentSummary[]>();
  const sessionSummary = useAsyncAction<SessionSummary>();
  const [drillDown, setDrillDown] = useState<DrillDownContext | null>(null);
  const mondayMoment = useMondayMoment(activeClassroom ?? "");

  useEffect(() => {
    session.recordPanelVisit("today");
  }, [session]);

  useEffect(() => {
    if (!activeClassroom) return;
    health.execute((signal) => fetchClassroomHealth(activeClassroom, signal));
    studentSummaries.execute((signal) => fetchStudentSummary(activeClassroom, undefined, signal));
    sessionSummary.execute((signal) => fetchSessionSummary(activeClassroom, signal));
  }, [activeClassroom, health.execute, sessionSummary.execute, studentSummaries.execute]);

  const recommendedAction = useMemo(
    () => result ? getTodayPrimaryAction(result, activeRole) : null,
    [result, activeRole],
  );

  const currentHour = useMemo(() => new Date().getHours(), []);
  const suggestion = useMemo(
    () =>
      getTodayContextualSuggestion({
        hour: currentHour,
        snapshot: result,
        health: health.result ?? null,
        role: activeRole,
      }),
    [activeRole, currentHour, health.result, result],
  );
  const workflowNudge = useMemo(
    () => getTodayWorkflowNudge(sessionSummary.result ?? null, activeRole),
    [activeRole, sessionSummary.result],
  );
  const totalActionCount = useMemo(
    () => result?.debt_register.items.length ?? 0,
    [result],
  );

  const previousDebtTotal = useMemo(() => {
    const series = health.result?.trends?.debt_total_14d;
    if (!series || series.length < 2) return undefined;
    return series[series.length - 2];
  }, [health.result]);

  const studentReasons = useMemo(() => {
    const out: Record<string, string> = {};
    for (const s of studentSummaries.result ?? []) {
      if (s.latest_priority_reason) out[s.alias] = s.latest_priority_reason;
    }
    return out;
  }, [studentSummaries.result]);

  const studentsToCheckFirst = useMemo(
    () => getStudentsToCheckFirst(result),
    [result],
  );
  const interventionCtaPrefill = useMemo(
    () =>
      buildInterventionCtaPrefill({
        snapshot: result,
        recommendedTab: recommendedAction?.tab,
        firstStudent: studentsToCheckFirst[0],
        studentReasons,
        fallbackReason: recommendedAction?.description,
      }),
    [recommendedAction?.description, recommendedAction?.tab, result, studentReasons, studentsToCheckFirst],
  );

  const peakBlock = useMemo(
    () => getPeakBlock(result?.latest_forecast),
    [result?.latest_forecast],
  );
  const selectedCoverageAlias = useMemo(() => {
    if (drillDown?.type === "student") return drillDown.alias;
    if (drillDown?.type === "student-thread") return drillDown.thread.alias;
    return null;
  }, [drillDown]);

  const showTimeSuggestion = useMemo(() => {
    if (!suggestion) return false;
    if (!recommendedAction) return true;
    return totalActionCount === 0 || suggestion.primaryAction.tab !== recommendedAction.tab;
  }, [recommendedAction, suggestion, totalActionCount]);

  // OperationalPreview groups for the today triage cockpit. All data
  // pulled from the existing snapshot/health/forecast results — no new
  // backend fields. Falls back to empty groups while loading.
  const TODAY_DEBT_LABELS: Record<string, string> = {
    stale_followup: "Stale follow-up",
    unapproved_message: "Unapproved message",
    unaddressed_pattern: "Unaddressed pattern",
    recurring_plan_item: "Recurring plan item",
    approaching_review: "Approaching review",
  };
  const triageQueueEvidence = (result?.debt_register?.items ?? [])
    .slice(0, 4)
    .map((item) => ({
      label: TODAY_DEBT_LABELS[item.category] ?? item.category,
      meta: `${item.age_days}d · ${item.student_refs.length}`,
    }));

  const riskEvidence: { label: string; meta: string }[] = [];
  if (peakBlock) {
    riskEvidence.push({
      label: peakBlock.activity || "Peak block",
      meta: peakBlock.level
        ? peakBlock.level.toUpperCase()
        : peakBlock.time_slot ?? "—",
    });
  }
  if (totalActionCount > 0) {
    riskEvidence.push({
      label: "Open items",
      meta: String(totalActionCount),
    });
  }
  if (health.result?.streak_days) {
    riskEvidence.push({
      label: "Plan streak",
      meta: `${health.result.streak_days}d`,
    });
  }

  const watchingCount = countActionableThreads(result?.student_threads) ?? 0;

  const touchpointChips: OperationalPreviewChip[] = (
    result?.student_threads ?? []
  )
    .slice(0, 6)
    .map((thread) => {
      const tone =
        thread.pending_action_count > 2
          ? "danger"
          : thread.pending_action_count > 0
            ? "watch"
            : thread.eal_flag
              ? "accent"
              : "neutral";
      return {
        label: thread.alias,
        tone,
        meta:
          thread.pending_action_count > 0
            ? `${thread.pending_action_count} open`
            : thread.last_intervention_days !== null
              ? `${thread.last_intervention_days}d ago`
              : undefined,
        title: thread.priority_reason ?? undefined,
      };
    });

  const todayPreviewGroups: OperationalPreviewGroup[] = [
    {
      eyebrow: "Triage queue",
      meta: totalActionCount > 0 ? `${totalActionCount} pending` : "Clear",
      evidence: triageQueueEvidence.length > 0 ? triageQueueEvidence : undefined,
    },
    {
      eyebrow: "Risk signal",
      meta: peakBlock?.time_slot ?? undefined,
      evidence: riskEvidence.length > 0 ? riskEvidence : undefined,
    },
    {
      eyebrow: "Touchpoints",
      meta: watchingCount > 0 ? `${watchingCount} watching` : undefined,
      chips: touchpointChips.length > 0 ? touchpointChips : undefined,
    },
  ];

  const hasPreviewContent =
    triageQueueEvidence.length > 0 ||
    riskEvidence.length > 0 ||
    touchpointChips.length > 0;

  if (!profile) return <TodayPanelLoading />;

  return (
    <section className="workspace-page today-panel" id="today-top">
      <PageIntro
        eyebrow="Today"
        title="Today"
        sectionTone="sun"
        emphasis="brand"
        description={`Same-day triage for Grade ${profile.grade_band}: recommended next move, immediate risks, and the carry-forward you committed to before the day started.`}
        visual={{ src: "/brand/workflow-today.png" }}
        dynamicContext={[
          { label: `${profile.students.length} students`, tone: "sun" },
        ]}
      />

      <div id="command-center" className="today-anchor-target">
        {result ? (
          <TodayHero
            snapshot={result}
            health={health.result ?? null}
            students={studentSummaries.result ?? []}
            recommendedAction={recommendedAction}
            openItemCount={totalActionCount}
            checkFirstStudents={studentsToCheckFirst}
            studentReasons={studentReasons}
            peakBlock={peakBlock}
            mondayMoment={
              mondayMoment.active
                ? {
                    label: "Monday — A fresh week. One calm move opens it.",
                    onDismiss: mondayMoment.dismiss,
                  }
                : null
            }
            onCtaClick={() => {
              if (!recommendedAction) return;
              if (interventionCtaPrefill && onInterventionPrefill) {
                onInterventionPrefill(interventionCtaPrefill);
                return;
              }
              onTabChange(recommendedAction.tab);
            }}
            onStudentClick={(studentRef) => setDrillDown({ type: "student", alias: studentRef })}
          />
        ) : (
          <SectionSkeleton label="Loading today story" variant="today-hero" lines={3} />
        )}
      </div>

      {hasPreviewContent ? (
        <OperationalPreview
          ariaLabel="Today operational preview"
          id="today-preview"
          groups={todayPreviewGroups}
        />
      ) : null}

      {result?.student_threads?.length ? (
        <StudentCoverageStrip
          threads={result.student_threads}
          title="Who needs a touchpoint"
          selectedAlias={selectedCoverageAlias}
          onSelectThread={(thread) => setDrillDown({ type: "student-thread", thread })}
        />
      ) : null}

      {result && workflowNudge ? (
        <div className="today-workflow-nudge" data-testid="today-workflow-nudge" role="note" aria-label="Weekly workflow suggestion">
          <div className="today-workflow-nudge__copy">
            <span className="today-workflow-nudge__eyebrow">{workflowNudge.kicker}</span>
            <p className="today-workflow-nudge__text">{workflowNudge.message}</p>
            <p className="today-workflow-nudge__meta">
              <span>{workflowNudge.sequenceLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{workflowNudge.countLabel}</span>
            </p>
          </div>
          <ActionButton
            size="sm"
            variant="soft"
            onClick={() => onTabChange(workflowNudge.targetTab)}
          >
            {workflowNudge.cta}
          </ActionButton>
        </div>
      ) : null}

      {result ? (
        <section
          id="classroom-pulse"
          className="today-pulse"
          aria-labelledby="today-pulse-heading"
        >
          <SectionMarker
            number="02"
            titleId="today-pulse-heading"
            title="What to watch next"
            subtitle="What to triage now. Where the day stands."
          />
          <div className="today-grid motion-stagger">
          <div className="today-grid__hero-row">
            <div
              id="day-arc"
              className={[
                "today-anchor-target today-anchor-target--day-arc",
                !result.latest_forecast ? "today-anchor-target--compact-arc" : "",
              ].filter(Boolean).join(" ")}
            >
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
            </div>

            <div id="pending-actions" className="today-anchor-target today-anchor-target--pending-actions">
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
                    label: "open follow-ups",
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
                totalCount={totalActionCount}
                previousTotal={previousDebtTotal}
                onItemClick={(item) => {
                  if (item.key) {
                    const category = item.key;
                    const items = result.debt_register.items.filter((i) => i.category === category);
                    setDrillDown({ type: "debt-category", category, items });
                  }
                }}
              />
            </div>

            {result.debt_register.items.length > 0 ? (
              <div id="complexity-debt" className="today-anchor-target">
                <ComplexityDebtGauge
                  debtItems={result.debt_register.items}
                  previousTotal={previousDebtTotal}
                  onSegmentClick={(payload) =>
                    setDrillDown({
                      type: "trend",
                      trendKey: payload.trendKey,
                      data: health.result?.trends?.debt_total_14d ?? payload.data,
                      label: payload.label,
                    })
                  }
                />
              </div>
            ) : null}
          </div>

          {showTimeSuggestion ? <TimeSuggestion onNavigate={onTabChange} compact suggestion={suggestion} /> : null}

          <div id="planning-health" className="today-anchor-target">
            {health.result ? (
              <Card variant="flat" className="today-planning-jump" aria-label="Deeper lenses">
                <Card.Body>
                  <div className="classroom-jump-actions__row">
                    <div className="classroom-jump-actions__copy">
                      <strong>Need the wider lens?</strong>
                      <span>
                        Classroom shows the full operating dashboard and health trend; Week opens the multi-day forecast band.
                      </span>
                    </div>
                    <div className="classroom-jump-actions__buttons">
                      <ActionButton size="sm" variant="soft" onClick={() => onTabChange("classroom")}>
                        Open Classroom
                      </ActionButton>
                      <ActionButton size="sm" variant="soft" onClick={() => onTabChange("week")}>
                        Open Week
                      </ActionButton>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            ) : health.error ? (
              <div className="today-health-error" role="alert">Couldn&apos;t load health summary: {health.error}</div>
            ) : (
              <SectionSkeleton label="Loading planning lenses" variant="health" lines={2} />
            )}
          </div>

          {result.latest_plan || result.latest_forecast ? (
            <div
              id="carry-forward"
              className={[
                "today-grid--secondary today-anchor-target",
                Boolean(result.latest_plan) !== Boolean(result.latest_forecast) ? "today-grid--secondary--single" : "",
              ].filter(Boolean).join(" ")}
            >
              {result.latest_plan ? (
                <PlanRecap
                  plan={result.latest_plan}
                  classroomId={activeClassroom}
                  onPriorityClick={(studentRef) => setDrillDown({ type: "student", alias: studentRef })}
                  onOpenPlan={() => onTabChange("tomorrow")}
                  onMessagePrefill={
                    onMessagePrefill
                      ? (prefill) => {
                          onMessagePrefill(prefill);
                          onTabChange("family-message");
                        }
                      : undefined
                  }
                />
              ) : null}

              {result.latest_forecast ? (
                <RiskWindowsPanel
                  forecast={result.latest_forecast}
                  onOpenForecast={() => onTabChange("complexity-forecast")}
                  onBlockClick={(index) => {
                    const block = result.latest_forecast!.blocks[index];
                    if (block) setDrillDown({ type: "forecast-block", blockIndex: index, block });
                  }}
                />
              ) : null}
            </div>
          ) : null}

          {!result.latest_plan && !result.latest_forecast && result.debt_register.items.length === 0 ? (
            <EmptyStateCard
              variant="minimal"
              cue="Fresh start — no debt or planning signal yet."
              hint="Build a Tomorrow Plan or log an intervention to seed the command center."
            />
          ) : null}
        </div>
        </section>
      ) : null}

      {result ? (
        <footer
          id="end-of-today"
          className="today-end-marker"
          aria-label="End of Today"
        >
          <span className="today-end-marker__stamp">End of Today</span>
          <PageFreshness
            generatedAt={result.last_activity_at ?? null}
            kind="ai"
          />
        </footer>
      ) : null}

      <DrillDownDrawer
        context={drillDown}
        onClose={() => setDrillDown(null)}
        onNavigate={(tab) => { setDrillDown(null); onTabChange(tab); }}
        onContextChange={setDrillDown}
        onInterventionPrefill={onInterventionPrefill}
        onMessagePrefill={onMessagePrefill}
      />
    </section>
  );
}

function buildInterventionCtaPrefill({
  snapshot,
  recommendedTab,
  firstStudent,
  studentReasons,
  fallbackReason,
}: {
  snapshot: TodaySnapshot | null;
  recommendedTab?: NavTarget;
  firstStudent?: string;
  studentReasons: Record<string, string>;
  fallbackReason?: string;
}): InterventionPrefill | null {
  if (recommendedTab !== "log-intervention" || !snapshot || !firstStudent) {
    return null;
  }

  const matchingDebt = pickInterventionDebtItem(snapshot.debt_register.items, firstStudent);
  return {
    student_ref: firstStudent,
    suggested_action: matchingDebt?.suggested_action || "Log follow-up from Today",
    reason: studentReasons[firstStudent] || matchingDebt?.description || fallbackReason || "Follow-up from Today",
  };
}

function pickInterventionDebtItem(items: DebtItem[], studentRef: string): DebtItem | undefined {
  return items
    .filter((item) => item.student_refs.includes(studentRef))
    .sort((a, b) => {
      const aStale = a.category === "stale_followup" ? 0 : 1;
      const bStale = b.category === "stale_followup" ? 0 : 1;
      if (aStale !== bStale) return aStale - bStale;
      return b.age_days - a.age_days;
    })[0];
}

function TodayPanelLoading() {
  return (
    <section className="workspace-page today-panel today-panel--loading" id="today-top" aria-busy="true">
      <div id="command-center" className="today-anchor-target">
        <SectionSkeleton label="Loading today command center" variant="today-hero" lines={3} />
      </div>
    </section>
  );
}

interface RiskWindowsPanelProps {
  forecast: ComplexityForecast;
  onOpenForecast: () => void;
  onBlockClick: (index: number) => void;
}

function RiskWindowsPanel({ forecast, onOpenForecast, onBlockClick }: RiskWindowsPanelProps) {
  const model = getRiskWindowModel(forecast);

  return (
    <Card variant="flat" className="today-forecast-section risk-windows">
      <Card.Body
        className="risk-windows__body"
        data-testid="risk-windows-body"
      >
        <div className="risk-windows__readout" aria-label={`${model.highCount} high risk windows`}>
          <p className="risk-windows__eyebrow">
            Risk Windows <SourceTag kind="ai" />
          </p>
          <div className="risk-windows__metric">
            <span className="risk-windows__metric-number">{model.highCount}</span>
            <span className="risk-windows__metric-unit">{model.highCount === 1 ? "high block" : "high blocks"}</span>
          </div>
          <p className="risk-windows__signal">{model.signal}</p>
        </div>

        <div className="risk-windows__content">
          <div className="risk-windows__peak-group">
            <p className="risk-windows__label">Peak block</p>
            {model.peakBlock ? (
              <button
                type="button"
                className={`risk-windows__peak risk-windows__peak--${model.peakBlock.level}`}
                onClick={() => onBlockClick(model.peakIndex)}
                aria-label={`Open peak window details for ${model.peakBlock.activity} at ${model.peakBlock.time_slot}`}
              >
                <span className="risk-windows__peak-time">{model.peakBlock.time_slot}</span>
                <span className="risk-windows__peak-level">{model.peakBlock.level}</span>
              </button>
            ) : (
              <p className="risk-windows__empty">Forecast ready</p>
            )}
          </div>

          <p className="today-forecast-summary">{getForecastSummary(forecast.overall_summary)}</p>

          <div className="risk-windows__timeline-scroll">
            <ForecastTimeline
              blocks={forecast.blocks}
              onBlockClick={onBlockClick}
            />
          </div>

          {model.watchBlocks.length > 0 ? (
            <div className="risk-windows__ledger" aria-label="Risk window watch list">
              {model.watchBlocks.map(({ block, index }) => (
                <button
                  type="button"
                  key={`${block.time_slot}-${block.activity}-${index}`}
                  className={`risk-windows__row risk-windows__row--${block.level}`}
                  onClick={() => onBlockClick(index)}
                  aria-label={`Open details for ${block.activity} at ${block.time_slot}`}
                >
                  <span className="risk-windows__row-time">{block.time_slot}</span>
                  <span className="risk-windows__row-main">
                    <span className="risk-windows__row-activity">{block.activity}</span>
                    <span className="risk-windows__row-factor">{block.contributing_factors[0] ?? block.suggested_mitigation}</span>
                  </span>
                  <span className="risk-windows__row-level">{block.level}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <footer
          className="risk-windows__footer"
          data-testid="risk-windows-footer"
        >
          <ActionButton size="sm" variant="secondary" onClick={onOpenForecast}>
            Open Forecast
          </ActionButton>
        </footer>
      </Card.Body>
    </Card>
  );
}

interface RiskWindowModel {
  highCount: number;
  peakBlock: ComplexityBlock | null;
  peakIndex: number;
  signal: string;
  watchBlocks: Array<{ block: ComplexityBlock; index: number }>;
}

const FORECAST_LEVEL_RANK: Record<ComplexityBlock["level"], number> = {
  low: 0,
  medium: 1,
  high: 2,
};

function getRiskWindowModel(forecast: ComplexityForecast): RiskWindowModel {
  const blocks = forecast.blocks;
  const highCount = blocks.reduce((count, block) => count + (block.level === "high" ? 1 : 0), 0);
  const declaredPeakIndex = blocks.findIndex((block) => block.time_slot === forecast.highest_risk_block);
  const highestRank = blocks.reduce(
    (rank, block) => Math.max(rank, FORECAST_LEVEL_RANK[block.level]),
    -1,
  );
  const fallbackPeakIndex = blocks.findIndex((block) => FORECAST_LEVEL_RANK[block.level] === highestRank);
  const peakIndex = declaredPeakIndex >= 0 ? declaredPeakIndex : fallbackPeakIndex;
  const peakBlock = peakIndex >= 0 ? blocks[peakIndex] : null;
  const watchBlocks = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.level !== "low");

  return {
    highCount,
    peakBlock,
    peakIndex,
    signal: getRiskWindowSignal(highCount, peakBlock),
    watchBlocks,
  };
}

function getRiskWindowSignal(highCount: number, peakBlock: ComplexityBlock | null): string {
  if (!peakBlock) {
    return "No block data yet. Open the forecast before planning coverage.";
  }
  if (highCount > 1) {
    return `Stage supports before ${peakBlock.time_slot}. Keep recovery time visible.`;
  }
  if (highCount === 1) {
    return `Protect ${peakBlock.time_slot}. Prep the first move before transition.`;
  }
  if (peakBlock.level === "medium") {
    return `Watch ${peakBlock.time_slot}. Keep the mitigation close.`;
  }
  return "No high window logged. Keep the day shape steady.";
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
