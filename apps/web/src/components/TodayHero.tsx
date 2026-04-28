/**
 * TodayHero.tsx — First-viewport live triage cockpit for Today.
 *
 * The hero owns the teacher's first question: "what should I do now?"
 * It keeps the existing recommended-action and drill-down contracts while
 * composing the immediate signals into one decisive operating surface.
 */

import { useEffect, useState, type CSSProperties } from "react";
import type { NavTarget } from "../appReducer";
import type {
  TodaySnapshot,
  ClassroomHealth,
  StudentSummary,
  ComplexityBlock,
  StudentThread,
} from "../types";
import StatusChip from "./StatusChip";
import PageFreshness from "./PageFreshness";
import { ActionButton } from "./shared";
import "./TodayHero.css";

export interface TodayHeroAction {
  description: string;
  tab: NavTarget;
  cta: string;
  label: string;
  tone: "pending" | "warning" | "analysis" | "provenance" | "success";
}

/**
 * Phase γ3 (2026-04-28) — Optional Monday-only eyebrow that absorbs
 * the prior `MondayResetMoment` standalone banner into the hero
 * composition. When provided, renders a single tracked-mono row at
 * the top of `.today-hero__narrative` with the freshness label and
 * an inline dismiss × that triggers `onDismiss`.
 *
 * Phase 4 follow-up (2026-04-28): the standalone `MondayResetMoment`
 * component has been deleted; the only remaining consumer of the
 * Monday moment is this eyebrow form. The dismissal contract lives
 * in the `useMondayMoment` hook (see `apps/web/src/hooks/useMondayMoment.ts`).
 */
export interface TodayHeroMondayMoment {
  label: string;
  onDismiss: () => void;
}

interface Props {
  snapshot: TodaySnapshot | null;
  health: ClassroomHealth | null;
  students: StudentSummary[];
  recommendedAction: TodayHeroAction | null;
  openItemCount?: number;
  checkFirstStudents?: string[];
  studentReasons?: Record<string, string>;
  peakBlock?: ComplexityBlock | null;
  mondayMoment?: TodayHeroMondayMoment | null;
  onCtaClick: () => void;
  onStudentClick?: (studentRef: string) => void;
}

export default function TodayHero({
  snapshot,
  health,
  students,
  recommendedAction,
  openItemCount,
  checkFirstStudents = [],
  studentReasons,
  peakBlock,
  mondayMoment,
  onCtaClick,
  onStudentClick,
}: Props) {
  const forecastBlocks = snapshot?.latest_forecast?.blocks ?? [];
  const threadCount = countActionableThreads(snapshot?.student_threads);
  const firstStudentToCheck = checkFirstStudents[0] ?? null;
  const focusBlock = getCurrentBlock(forecastBlocks) ?? peakBlock ?? forecastBlocks[0] ?? null;
  const planReadyPercent = getPlanReadyPercent(health, snapshot);
  const openItems = openItemCount ?? snapshot?.debt_register.items.length ?? 0;
  const pressure = getPressureModel({
    openItems,
    threadCount,
    peakBlock,
    forecastBlocks,
  });
  const watchRows = getWatchRows({
    checkFirstStudents,
    studentReasons,
    snapshot,
    students,
  });
  const debtModel = getDebtModel(snapshot, openItems);
  const nextActionTitle = getNextActionTitle(
    recommendedAction,
    firstStudentToCheck,
    openItems,
  );
  const nextActionReason = getNextActionReason({
    recommendedAction,
    firstStudentToCheck,
    studentReasons,
    peakBlock,
  });
  const cockpitCopy = getCockpitCopy(snapshot, openItems, firstStudentToCheck);
  const headline = focusBlock
    ? `${focusBlock.time_slot} is today's real test.`
    : "What should you do now?";
  const showMorningBrief =
    typeof openItemCount === "number" ||
    checkFirstStudents.length > 0 ||
    Boolean(peakBlock);
  const showMobileCommandMetrics =
    typeof openItemCount === "number" ||
    Boolean(peakBlock) ||
    Boolean(firstStudentToCheck);
  const showMobileFocus = useCompactViewport();

  return (
    <section
      className="today-hero"
      aria-label="Today hero"
      data-testid="today-hero"
    >
      <div className="today-hero__command">
        {mondayMoment ? (
          <p
            className="today-hero__eyebrow today-hero__eyebrow--fresh-week"
            data-testid="today-hero-monday-eyebrow"
          >
            <span className="today-hero__eyebrow-label">{mondayMoment.label}</span>
            <button
              type="button"
              className="today-hero__eyebrow-dismiss"
              onClick={mondayMoment.onDismiss}
              aria-label="Dismiss fresh week eyebrow"
            >
              ×
            </button>
          </p>
        ) : null}

        <div className="today-hero__headline-group">
          <p className="today-hero__kicker">Today command</p>
          <h1 className="today-hero__title">{headline}</h1>
          <p className="today-hero__copy">{cockpitCopy}</p>
        </div>

        <p className="today-hero__directive" data-testid="today-hero-directive">
          <span className="today-hero__directive-arrow" aria-hidden="true">→</span>
          Morning triage first
        </p>

        <div className="today-hero__meta-row">
          <PageFreshness
            generatedAt={snapshot?.last_activity_at ?? null}
            kind="ai"
          />
        </div>

        {recommendedAction ? (
          <div className="today-hero__next-action">
            <div className="today-hero__next-icon" aria-hidden="true">
              <span />
            </div>
            <div className="today-hero__next-main">
              <div className="today-hero__next-topline">
                <span className="today-hero__rail-kicker">Next best action</span>
                <StatusChip
                  label={recommendedAction.label}
                  tone={recommendedAction.tone}
                />
              </div>
              <h2 className="today-hero__next-title">{nextActionTitle}</h2>
              <p className="today-hero__cta-rationale">
                {recommendedAction.description}
              </p>
              <div className="today-hero__next-meta" aria-label="Next action context">
                <span>{openItems > 0 ? "5 min" : "2 min"}</span>
                <span>{peakBlock ? getCompactBlockLabel(peakBlock) : "Classroom check"}</span>
                <span>{firstStudentToCheck ? "Student watch" : "Planning signal"}</span>
              </div>
            </div>
            <div className="today-hero__mobile-command" data-testid="today-hero-mobile-command">
              <div
                className="today-hero__mobile-next-move"
                data-testid="today-hero-mobile-next-move"
              >
                <span className="today-hero__mobile-next-label">Next move</span>
                <strong className="today-hero__mobile-next-title">
                  {recommendedAction.label}
                </strong>
                <p className="today-hero__mobile-next-rationale">
                  {recommendedAction.description}
                </p>
              </div>
              {showMobileCommandMetrics ? (
                <dl className="today-hero__mobile-command-metrics" aria-label="Today command summary">
                  {typeof openItemCount === "number" ? (
                    <div className="today-hero__mobile-command-metric">
                      <dt>Open</dt>
                      <dd>{formatOpenItemCount(openItemCount)}</dd>
                    </div>
                  ) : null}
                  {peakBlock ? (
                    <div className="today-hero__mobile-command-metric">
                      <dt>Peak</dt>
                      <dd>{formatPeakBlock(peakBlock)}</dd>
                    </div>
                  ) : null}
                  {firstStudentToCheck ? (
                    <div className="today-hero__mobile-command-metric">
                      <dt>First check</dt>
                      <dd>{firstStudentToCheck}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </div>
            <div className="today-hero__next-footer">
              <p>
                <span>Why this now?</span>
                {nextActionReason}
              </p>
              <ActionButton
                variant="primary"
                size="lg"
                onClick={onCtaClick}
                className="today-hero__cta"
              >
                Open {recommendedAction.cta}
              </ActionButton>
            </div>
          </div>
        ) : null}

        {showMobileFocus && (focusBlock || watchRows.length > 0) ? (
          <div className="today-hero__mobile-focus" aria-label="Mobile Today focus">
            {focusBlock ? (
              <section className="today-hero__mobile-block" aria-label="Current block risk">
                <div className="today-hero__mobile-block-copy">
                  <span className="today-hero__panel-kicker">Current block</span>
                  <strong>{focusBlock.time_slot}</strong>
                  <p>{focusBlock.activity}</p>
                  <span className={`today-hero__mobile-risk-chip today-hero__mobile-risk-chip--${focusBlock.level}`}>
                    {focusBlock.level} risk
                  </span>
                </div>
                <div
                  className={`today-hero__mobile-risk-ring today-hero__mobile-risk-ring--${focusBlock.level}`}
                  style={{ "--today-mobile-risk": `${riskPercent(focusBlock.level)}%` } as CSSProperties}
                  aria-label={`${focusBlock.level} risk level`}
                >
                  <strong>{capitalizeLevel(focusBlock.level)}</strong>
                  <span>Risk level</span>
                </div>
              </section>
            ) : null}

            {watchRows.length > 0 ? (
              <section className="today-hero__mobile-watch" aria-label="First students to check">
                <header>
                  <span className="today-hero__panel-kicker">First to check</span>
                  <span>{watchRows.length} to watch</span>
                </header>
                <div className="today-hero__mobile-watch-rows">
                  {watchRows.slice(0, 4).map((row) => (
                    <button
                      key={`mobile-${row.alias}`}
                      type="button"
                      className={`today-hero__mobile-watch-row today-hero__mobile-watch-row--${row.tone}`}
                      aria-label={row.accessibleLabel}
                      onClick={() => onStudentClick?.(row.alias)}
                    >
                      <span aria-hidden="true" />
                      <strong>{row.alias}</strong>
                      <em>{row.reason}</em>
                      <small>{row.meta}</small>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        <div className="today-hero__flow" aria-label="Today's flow">
          <div className="today-hero__flow-header">
            <div>
              <span className="today-hero__panel-kicker">Today's flow</span>
              <p>Live block timeline</p>
            </div>
            <span>{forecastBlocks.length ? `${forecastBlocks.length} blocks` : "No forecast yet"}</span>
          </div>
          {forecastBlocks.length > 0 ? (
            <>
              <div className="today-hero__flow-line" aria-hidden="true">
                {forecastBlocks.slice(0, 5).map((block, index) => (
                  <span
                    key={`${block.time_slot}-${block.activity}-${index}-tick`}
                    className={[
                      "today-hero__flow-tick",
                      block === peakBlock ? "today-hero__flow-tick--current" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    {formatBlockStart(block)}
                  </span>
                ))}
              </div>
              <div className="today-hero__flow-blocks">
                {forecastBlocks.slice(0, 5).map((block, index) => (
                  <article
                    key={`${block.time_slot}-${block.activity}-${index}`}
                    className={[
                      "today-hero__flow-block",
                      `today-hero__flow-block--${block.level}`,
                      block === peakBlock ? "today-hero__flow-block--current" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    <strong>{block.activity}</strong>
                    <span>{block.time_slot}</span>
                  </article>
                ))}
              </div>
              {peakBlock ? (
                <p className="today-hero__flow-next">
                  <span>Next up:</span>
                  {peakBlock.activity} block ({peakBlock.time_slot})
                </p>
              ) : null}
            </>
          ) : (
            <p className="today-hero__empty-line">
              The block timeline appears after a forecast is generated.
            </p>
          )}
        </div>
      </div>

      <aside className="today-hero__side" aria-label="Live triage signals">
        <div className="today-hero__signals">
          <div className="today-hero__signals-header">
            <span className="today-hero__panel-kicker">Live signals</span>
            <span className="today-hero__live-dot">Live</span>
          </div>
          <div className="today-hero__signal-grid">
            <div className="today-hero__pressure">
              <div
                className="today-hero__pressure-ring"
                style={{ "--today-pressure": `${pressure.score}%` } as CSSProperties}
                aria-label={`Pressure index ${pressure.score}: ${pressure.label}`}
              >
                <strong>{pressure.score}</strong>
                <span>{pressure.label}</span>
              </div>
              <span>Pressure</span>
            </div>
            <SignalMetric label="Threads" value={threadCount} detail="Active" />
            <SignalMetric
              label="Roster"
              value={snapshot?.student_count ?? students.length}
              detail="Students"
            />
            <SignalMetric
              label="Plan ready"
              value={`${planReadyPercent}%`}
              detail="Last 7 days"
            />
            <SignalMetric label="Queue" value={openItems} detail="Needs you" />
          </div>
          <div className="today-hero__signals-footer">
            <span>{pressure.footer}</span>
            <span>View all signals</span>
          </div>
        </div>

        <div className="today-hero__watchlist">
          <div className="today-hero__watchlist-header">
            <span className="today-hero__panel-kicker">Students to watch</span>
            <span>{watchRows.length ? `${watchRows.length} queued` : "Clear"}</span>
          </div>
          {watchRows.length > 0 ? (
            <div className="today-hero__watchlist-rows">
              {watchRows.map((row) => (
                <button
                  key={row.alias}
                  type="button"
                  className={[
                    "today-hero__student-chip",
                    "today-hero__watch-row",
                    `today-hero__watch-row--${row.tone}`,
                  ].join(" ")}
                  aria-label={row.accessibleLabel}
                  onClick={() => onStudentClick?.(row.alias)}
                >
                  <span className="today-hero__watch-name">
                    <span aria-hidden="true" />
                    <strong>{row.alias}</strong>
                  </span>
                  <span>{row.lane}</span>
                  <span className="today-hero__chip-reason">{row.reason}</span>
                  <span>{row.meta}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="today-hero__empty-line">
              No student watchlist items are queued right now.
            </p>
          )}
          <div className="today-hero__watch-legend" aria-hidden="true">
            <span>High risk</span>
            <span>Medium risk</span>
            <span>Low risk</span>
          </div>
        </div>
      </aside>

      {showMorningBrief ? (
        <div
          className="today-hero__brief today-hero__debt-band"
          aria-label="Follow-up debt and morning brief"
          data-testid="today-hero-brief"
        >
          <div className="today-hero__debt-lead">
            <span className="today-hero__panel-kicker">Follow-up debt</span>
            <div className="today-hero__debt-score">
              <strong>{openItems}</strong>
              <span>{openItems === 1 ? "open item" : "open items"}</span>
            </div>
          </div>

          {typeof openItemCount === "number" ? (
            <div className="today-hero__brief-item">
              <span className="today-hero__brief-label">Open items</span>
              <strong className="today-hero__brief-value">
                {formatOpenItemCount(openItemCount)}
              </strong>
            </div>
          ) : null}

          {peakBlock ? (
            <div className="today-hero__brief-item">
              <span className="today-hero__brief-label">Peak block</span>
              <strong className="today-hero__brief-value">
                {formatPeakBlock(peakBlock)}
              </strong>
            </div>
          ) : null}

          {checkFirstStudents.length > 0 ? (
            <div className="today-hero__brief-item today-hero__brief-item--students">
              <span className="today-hero__brief-label">Check first</span>
              <strong className="today-hero__brief-value">
                {checkFirstStudents.slice(0, 5).join(", ")}
              </strong>
            </div>
          ) : null}

          {debtModel.map((item) => (
            <div className="today-hero__brief-item" key={item.label}>
              <span className="today-hero__brief-label">{item.label}</span>
              <strong className="today-hero__brief-value">
                {item.value}
              </strong>
              <span className="today-hero__brief-caption">{item.caption}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function useCompactViewport(): boolean {
  const getMatches = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 640px)").matches;
  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const query = window.matchMedia("(max-width: 640px)");
    const handleChange = () => setMatches(query.matches);
    handleChange();
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return matches;
}

interface SignalMetricProps {
  label: string;
  value: number | string;
  detail: string;
}

function SignalMetric({ label, value, detail }: SignalMetricProps) {
  return (
    <div className="today-hero__signal-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function getCockpitCopy(
  snapshot: TodaySnapshot | null,
  openItems: number,
  firstStudentToCheck: string | null,
): string {
  const blocks = snapshot?.latest_forecast?.blocks ?? [];
  const highBlocks = blocks.filter((block) => block.level === "high").length;
  if (firstStudentToCheck && openItems > 0) {
    return `${firstStudentToCheck} enters with unfinished threads. Meet them first.`;
  }
  if (openItems === 0 && highBlocks === 0) {
    return "Breathe first; the room is steady. Use this pass to confirm coverage before the next block begins.";
  }
  return "Bird's-eye triage for right now. Act on the highest leverage move before the next block begins.";
}

function getNextActionTitle(
  recommendedAction: TodayHeroAction | null,
  firstStudentToCheck: string | null,
  openItems: number,
): string {
  if (firstStudentToCheck && openItems > 0) {
    return `Start morning triage with ${firstStudentToCheck}`;
  }
  return recommendedAction?.label ?? "Review today's command center";
}

function getNextActionReason({
  recommendedAction,
  firstStudentToCheck,
  studentReasons,
  peakBlock,
}: {
  recommendedAction: TodayHeroAction | null;
  firstStudentToCheck: string | null;
  studentReasons?: Record<string, string>;
  peakBlock?: ComplexityBlock | null;
}): string {
  if (firstStudentToCheck) {
    const reason = studentReasons?.[firstStudentToCheck];
    if (reason) return `${firstStudentToCheck}: ${reason}`;
  }
  if (peakBlock) {
    return `Protect ${peakBlock.time_slot} before ${peakBlock.activity}.`;
  }
  return recommendedAction?.description ?? "Keep the next teacher decision visible.";
}

function getPlanReadyPercent(
  health: ClassroomHealth | null,
  snapshot: TodaySnapshot | null,
): number {
  const plannedDays = health?.plans_last_7?.filter(Boolean).length;
  if (typeof plannedDays === "number") {
    return Math.round((plannedDays / 7) * 100);
  }
  return snapshot?.latest_plan ? 100 : 0;
}

function countActionableThreads(threads?: StudentThread[]): number {
  return (threads ?? []).filter(
    (thread) =>
      thread.thread_count > 0 ||
      thread.pending_action_count > 0 ||
      thread.pending_message_count > 0 ||
      thread.active_pattern_count > 0 ||
      thread.actions.length > 0,
  ).length;
}

interface PressureInput {
  openItems: number;
  threadCount: number;
  peakBlock?: ComplexityBlock | null;
  forecastBlocks: ComplexityBlock[];
}

function getPressureModel({
  openItems,
  threadCount,
  peakBlock,
  forecastBlocks,
}: PressureInput) {
  const highBlocks = forecastBlocks.filter((block) => block.level === "high").length;
  const mediumBlocks = forecastBlocks.filter((block) => block.level === "medium").length;
  const peakBoost = peakBlock?.level === "high" ? 12 : peakBlock?.level === "medium" ? 6 : 0;
  const score = Math.max(
    18,
    Math.min(94, 28 + openItems * 2 + threadCount + highBlocks * 8 + mediumBlocks * 3 + peakBoost),
  );
  const label = score >= 72 ? "Elevated" : score >= 48 ? "Steady" : "Calm";
  const footer =
    score >= 72
      ? "Teacher pass needed before the next block."
      : score >= 48
        ? "Signals stable. Keep the queue visible."
        : "Signals calm. Confirm coverage and prep.";
  return { score, label, footer };
}

interface WatchRowsInput {
  checkFirstStudents: string[];
  studentReasons?: Record<string, string>;
  snapshot: TodaySnapshot | null;
  students: StudentSummary[];
}

interface WatchRow {
  alias: string;
  lane: string;
  reason: string;
  meta: string;
  tone: "high" | "medium" | "low";
  accessibleLabel: string;
}

function getWatchRows({
  checkFirstStudents,
  studentReasons,
  snapshot,
  students,
}: WatchRowsInput): WatchRow[] {
  const threadByAlias = new Map((snapshot?.student_threads ?? []).map((thread) => [thread.alias, thread]));
  const summaryByAlias = new Map(students.map((student) => [student.alias, student]));
  const aliases = [
    ...checkFirstStudents,
    ...(snapshot?.student_threads ?? [])
      .filter((thread) => thread.thread_count > 0 || thread.pending_action_count > 0 || thread.active_pattern_count > 0)
      .map((thread) => thread.alias),
    ...students
      .filter((student) => student.pending_action_count > 0 || student.active_pattern_count > 0)
      .map((student) => student.alias),
  ];
  const uniqueAliases = Array.from(new Set(aliases)).slice(0, 5);

  return uniqueAliases.map((alias) => {
    const thread = threadByAlias.get(alias);
    const summary = summaryByAlias.get(alias);
    const reason =
      studentReasons?.[alias] ??
      thread?.priority_reason ??
      summary?.latest_priority_reason ??
      "Check before the next transition";
    const pending = thread?.pending_action_count ?? summary?.pending_action_count ?? 0;
    const days = thread?.last_intervention_days ?? summary?.last_intervention_days ?? null;
    const tone: WatchRow["tone"] =
      pending > 2 || (thread?.thread_count ?? 0) > 3
        ? "high"
        : pending > 0 || (thread?.active_pattern_count ?? summary?.active_pattern_count ?? 0) > 0
          ? "medium"
          : "low";
    const lane = getWatchLane(reason, thread);
    const meta = pending > 0 ? `${pending} open` : days !== null ? `${days}d` : "Now";
    const accessibleLabel = studentReasons?.[alias]
      ? `Open student details for ${alias}: ${studentReasons[alias]}`
      : `Check first: ${alias}`;
    return { alias, lane, reason, meta, tone, accessibleLabel };
  });
}

function getWatchLane(reason: string, thread?: StudentThread): string {
  const lower = reason.toLowerCase();
  if (lower.includes("read") || lower.includes("fluency") || lower.includes("writing")) return "Reading";
  if (lower.includes("math") || lower.includes("concept")) return "Math";
  if (lower.includes("sel") || lower.includes("routine") || lower.includes("regulation")) return "SEL";
  if (thread?.eal_flag) return "EAL";
  return "Support";
}

function getDebtModel(snapshot: TodaySnapshot | null, openItems: number) {
  const counts = snapshot?.debt_register.item_count_by_category ?? {};
  return [
    {
      label: "Stale follow-ups",
      value: counts.stale_followup ?? 0,
      caption: "Older than 48h",
    },
    {
      label: "Open threads",
      value: openItems,
      caption: "Awaiting response",
    },
    {
      label: "Review windows",
      value: counts.approaching_review ?? 0,
      caption: "Needs visibility",
    },
    {
      label: "Family messages",
      value: counts.unapproved_message ?? 0,
      caption: "Drafts awaiting approval",
    },
  ];
}

function formatOpenItemCount(count: number): string {
  if (count === 0) return "0 items";
  if (count === 1) return "1 item";
  return `${count} items`;
}

function formatPeakBlock(block: ComplexityBlock): string {
  return `${block.time_slot} ${block.activity}`;
}

function formatBlockStart(block: ComplexityBlock): string {
  return block.time_slot.split("-")[0]?.trim() ?? block.time_slot;
}

function getCompactBlockLabel(block: ComplexityBlock): string {
  const label = block.activity.replace(/\s*\(.*/, "").trim();
  return label ? `${label} block` : "Peak block";
}

function getCurrentBlock(blocks: ComplexityBlock[]): ComplexityBlock | null {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  return blocks.find((block) => {
    const range = parseTimeSlot(block.time_slot);
    return range ? current >= range.start && current < range.end : false;
  }) ?? null;
}

function parseTimeSlot(timeSlot: string): { start: number; end: number } | null {
  const [startRaw, endRaw] = timeSlot.split(/[–-]/).map((part) => part.trim());
  const start = parseClockMinutes(startRaw);
  const end = parseClockMinutes(endRaw);
  if (start === null || end === null) return null;
  return { start, end };
}

function parseClockMinutes(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function riskPercent(level: ComplexityBlock["level"]): number {
  if (level === "high") return 82;
  if (level === "medium") return 58;
  return 34;
}

function capitalizeLevel(level: ComplexityBlock["level"]): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}
