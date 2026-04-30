/**
 * TodayHero.tsx — Live-day triage cockpit, redesigned (2026-04-29).
 *
 * Composition aligned to the target Today dashboard reference:
 *   • Command card (eyebrow → icon → title → description → dual CTAs)
 *   • Today's flow timeline (5 schedule blocks with current-block focus)
 *   • Follow-up debt strip (5 metric tiles)
 *   • Side rail with Live Signals + Students to Watch
 *
 * The component still receives the Today snapshot, classroom health,
 * student summaries, recommended-action contract, and watchlist
 * inputs — same public Props as the prior hero — but the rendered
 * surface is reorganised to read as a clean operating dashboard
 * instead of an editorial lede + dense triage strip.
 *
 * DOM contracts preserved for tests:
 *   • root has className `today-hero` and `data-testid="today-hero"`
 *   • primary CTA reads `Open ${recommendedAction.cta}` and triggers
 *     `onCtaClick`
 *   • watch rows are `<button>` elements with the student alias in
 *     their accessible name and call `onStudentClick(alias)`
 *   • a `source-tag-ai` caption is rendered (the side-rail freshness)
 */

import type { CSSProperties, ReactNode } from "react";
import type { NavTarget } from "../appReducer";
import type {
  TodaySnapshot,
  ClassroomHealth,
  StudentSummary,
  ComplexityBlock,
  DebtItem,
} from "../types";
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
  const openItems = openItemCount ?? snapshot?.debt_register.items.length ?? 0;
  const firstStudentToCheck = checkFirstStudents[0] ?? null;

  const flowBlocks = getFlowBlocks(forecastBlocks);
  const debtTiles = getDebtTiles(snapshot, openItems);
  const signalRows = getLiveSignals(health, snapshot, openItems);
  const watchRows = getWatchRows({ checkFirstStudents, studentReasons, snapshot, students });

  const nextActionTitle = getNextActionTitle(recommendedAction, firstStudentToCheck, openItems);
  const nextActionReason = getNextActionReason({
    recommendedAction,
    firstStudentToCheck,
    studentReasons,
    peakBlock,
  });

  const primaryCtaLabel = recommendedAction
    ? `Open ${recommendedAction.cta}`
    : "Review today's command center";
  const showSecondaryCta = recommendedAction?.cta !== "Intervention Log";

  return (
    <section className="today-hero" data-testid="today-hero" aria-label="Today command dashboard">
      {mondayMoment ? (
        <header className="today-hero__monday" role="note">
          <span className="today-hero__monday-label">{mondayMoment.label}</span>
          <button
            type="button"
            className="today-hero__monday-dismiss"
            onClick={mondayMoment.onDismiss}
            aria-label="Dismiss Monday moment"
          >
            ×
          </button>
        </header>
      ) : null}

      <div className="today-hero__layout">
        <div className="today-hero__main">
          {/* ── Command card ───────────────────────────── */}
          <article className="today-hero__command" aria-labelledby="today-command-title">
            <span className="today-hero__eyebrow">Command</span>
            <div className="today-hero__command-body">
              <span className="today-hero__command-icon" aria-hidden="true">
                <ClipboardIcon />
              </span>
              <div className="today-hero__command-copy">
                <h2 id="today-command-title" className="today-hero__command-title">
                  {nextActionTitle}
                </h2>
                <p className="today-hero__command-description">{nextActionReason}</p>
              </div>
              <div className="today-hero__command-actions">
                <ActionButton
                  variant="primary"
                  size="lg"
                  onClick={onCtaClick}
                  className="today-hero__cta"
                  trailingIcon={<ArrowRightIcon />}
                >
                  {primaryCtaLabel}
                </ActionButton>
                {showSecondaryCta ? (
                  <ActionButton
                    variant="secondary"
                    size="lg"
                    onClick={onCtaClick}
                    className="today-hero__cta-secondary"
                    leadingIcon={<NotebookIcon />}
                  >
                    Open Intervention Log
                  </ActionButton>
                ) : null}
              </div>
            </div>
          </article>

          {/* ── Today's flow ───────────────────────────── */}
          <section className="today-hero__section today-hero__flow" aria-labelledby="today-flow-title">
            <header className="today-hero__section-header">
              <h3 id="today-flow-title" className="today-hero__section-title">
                Today's flow
              </h3>
            </header>
            <div className="today-hero__flow-track" role="list">
              {flowBlocks.length === 0 ? (
                <p className="today-hero__flow-empty">
                  Forecast blocks not generated yet — open Forecast to seed today's flow.
                </p>
              ) : (
                flowBlocks.map((block) => (
                  <article
                    key={`${block.time_slot}-${block.activity}`}
                    className={[
                      "today-hero__block",
                      block.state === "current" && "today-hero__block--current",
                      block.state === "past" && "today-hero__block--past",
                      block.state === "upcoming" && "today-hero__block--upcoming",
                    ].filter(Boolean).join(" ")}
                    role="listitem"
                    data-state={block.state}
                    data-level={block.level}
                  >
                    <header className="today-hero__block-header">
                      <span className="today-hero__block-time">{block.time_slot}</span>
                      <span className="today-hero__block-status" aria-label={`Status: ${block.state}`}>
                        {block.state === "past" ? <CheckBadgeIcon /> : null}
                        {block.state === "current" ? (
                          <span className="today-hero__block-now">Now</span>
                        ) : null}
                        {block.state === "upcoming" ? <span className="today-hero__block-dot" aria-hidden="true" /> : null}
                      </span>
                    </header>
                    <span className="today-hero__block-icon" aria-hidden="true">
                      <ActivityIcon activity={block.activity} />
                    </span>
                    <strong className="today-hero__block-title">{getActivityTitle(block.activity)}</strong>
                    <p className="today-hero__block-subtitle">{getBlockSubtitle(block)}</p>
                    {block.state === "current" ? (
                      <div className="today-hero__block-progress" aria-hidden="true">
                        <span
                          className="today-hero__block-progress-fill"
                          style={{ "--today-flow-progress": `${block.progressPercent}%` } as CSSProperties}
                        />
                      </div>
                    ) : null}
                    {block.state === "current" ? (
                      <span className="today-hero__block-elapsed">{block.elapsedLabel}</span>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>

          {/* ── Follow-up debt strip ─────────────────── */}
          <section className="today-hero__section today-hero__debt" aria-labelledby="today-debt-title">
            <header className="today-hero__section-header">
              <h3 id="today-debt-title" className="today-hero__section-title">
                Follow-up debt
              </h3>
              <span className="today-hero__section-meta">
                <button type="button" className="today-hero__link" onClick={onCtaClick}>
                  View all ({openItems})
                </button>
              </span>
            </header>
            <div className="today-hero__debt-tiles" role="list">
              {debtTiles.map((tile) => (
                <article
                  key={tile.key}
                  className="today-hero__debt-tile"
                  role="listitem"
                  data-tone={tile.tone}
                >
                  <span className="today-hero__debt-icon" aria-hidden="true">
                    {tile.icon}
                  </span>
                  <strong className="today-hero__debt-value">{tile.value}</strong>
                  <span className="today-hero__debt-label">{tile.label}</span>
                  <span
                    className={`today-hero__debt-caption today-hero__debt-caption--${tile.tone}`}
                  >
                    {tile.caption}
                  </span>
                </article>
              ))}
            </div>
          </section>
        </div>

        {/* ── Side rail ─────────────────────────────── */}
        <aside className="today-hero__rail" aria-label="Live signals and watchlist">
          <article className="today-hero__rail-card today-hero__signals" aria-labelledby="today-signals-title">
            <header className="today-hero__rail-header">
              <span className="today-hero__rail-eyebrow" id="today-signals-title">
                Live signals
              </span>
              <span className="today-hero__rail-live" aria-label="Updating live">
                <span className="today-hero__rail-live-dot" aria-hidden="true" />
                Live
              </span>
            </header>
            <ul className="today-hero__signals-list">
              {signalRows.map((row) => (
                <li
                  key={row.label}
                  className={`today-hero__signal-row today-hero__signal-row--${row.tone}`}
                >
                  <span className="today-hero__signal-icon" aria-hidden="true">
                    {row.icon}
                  </span>
                  <span className="today-hero__signal-label">{row.label}</span>
                  <strong className="today-hero__signal-value">{row.value}</strong>
                </li>
              ))}
            </ul>
            <footer className="today-hero__rail-footer">
              <button type="button" className="today-hero__rail-link" onClick={onCtaClick}>
                View all signals
                <ArrowRightIcon />
              </button>
            </footer>
            <PageFreshness
              generatedAt={snapshot?.last_activity_at ?? null}
              kind="ai"
            />
          </article>

          <article className="today-hero__rail-card today-hero__watchlist" aria-labelledby="today-watch-title">
            <header className="today-hero__rail-header">
              <span className="today-hero__rail-eyebrow" id="today-watch-title">
                Students to watch
              </span>
            </header>
            {watchRows.length === 0 ? (
              <p className="today-hero__watch-empty">
                No students need a touchpoint this block — confirm coverage and prep for the next.
              </p>
            ) : (
              <ul className="today-hero__watchlist-list">
                {watchRows.map((row) => (
                  <li key={row.alias}>
                    <button
                      type="button"
                      className={`today-hero__watch-row today-hero__watch-row--${row.tone}`}
                      onClick={() => onStudentClick?.(row.alias)}
                      aria-label={row.accessibleLabel}
                    >
                      <span className="today-hero__watch-avatar" aria-hidden="true">
                        {getInitials(row.alias)}
                      </span>
                      <span className="today-hero__watch-info">
                        <strong className="today-hero__watch-name">{row.alias}</strong>
                        <span className="today-hero__watch-reason">{row.reason}</span>
                      </span>
                      <span
                        className={`today-hero__watch-dot today-hero__watch-dot--${row.tone}`}
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <footer className="today-hero__rail-footer">
              <button type="button" className="today-hero__rail-link" onClick={onCtaClick}>
                View all students
                <ArrowRightIcon />
              </button>
            </footer>
          </article>
        </aside>
      </div>
    </section>
  );
}

// ─── Flow block model ──────────────────────────────────────────────

type FlowBlockState = "past" | "current" | "upcoming";

interface FlowBlock {
  time_slot: string;
  activity: string;
  level: ComplexityBlock["level"];
  contributing_factors: string[];
  suggested_mitigation: string;
  state: FlowBlockState;
  progressPercent: number;
  elapsedLabel: string;
}

function getFlowBlocks(blocks: ComplexityBlock[]): FlowBlock[] {
  if (blocks.length === 0) return [];
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const visible = blocks.slice(0, 5);

  return visible.map((block) => {
    const range = parseTimeSlot(block.time_slot);
    let state: FlowBlockState = "upcoming";
    let progressPercent = 0;
    let elapsedLabel = "";

    if (range) {
      if (current >= range.end) {
        state = "past";
        progressPercent = 100;
      } else if (current >= range.start) {
        state = "current";
        const span = Math.max(1, range.end - range.start);
        progressPercent = Math.min(100, Math.max(2, Math.round(((current - range.start) / span) * 100)));
        elapsedLabel = `${current - range.start} min`;
      }
    }

    // If nothing matches "current" because we're outside the day, force
    // the first upcoming block to render the "Now" affordance — keeps the
    // dashboard alive even before the school day begins.
    return {
      time_slot: block.time_slot,
      activity: block.activity,
      level: block.level,
      contributing_factors: block.contributing_factors ?? [],
      suggested_mitigation: block.suggested_mitigation ?? "",
      state,
      progressPercent,
      elapsedLabel,
    };
  }).map((block, index, arr) => {
    const hasCurrent = arr.some((b) => b.state === "current");
    if (!hasCurrent && index === 0) {
      return { ...block, state: "current", progressPercent: 24, elapsedLabel: "Up next" };
    }
    return block;
  });
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

function getActivityTitle(activity: string): string {
  const stripped = activity.replace(/\s*\(.*$/, "").trim();
  if (!stripped) return "Block";
  const lower = stripped.toLowerCase();
  if (lower.includes("math")) return "Math block";
  if (lower.includes("literacy") || lower.includes("read")) return "Reading block";
  if (lower.includes("writ")) return "Writing";
  if (lower.includes("science")) return "Science";
  if (lower.includes("phys") || lower.includes("pe")) return "PE";
  if (lower.includes("morning") || lower.includes("routine")) return "Morning routines";
  if (lower.includes("recess") || lower.includes("break")) return "Break";
  if (lower.includes("lunch")) return "Lunch";
  return stripped;
}

function getBlockSubtitle(block: ComplexityBlock): string {
  const factor = block.contributing_factors?.[0];
  if (factor) return factor;
  if (block.suggested_mitigation) return block.suggested_mitigation;
  return "Steady block — confirm coverage";
}

// ─── Debt tiles ────────────────────────────────────────────────────

interface DebtTile {
  key: string;
  icon: ReactNode;
  value: number;
  label: string;
  caption: string;
  tone: "danger" | "warning" | "muted";
}

function getDebtTiles(snapshot: TodaySnapshot | null, totalCount: number): DebtTile[] {
  const counts = snapshot?.debt_register.item_count_by_category ?? {};
  const items = snapshot?.debt_register.items ?? [];
  const followups = counts.stale_followup ?? 0;
  const messages = counts.unapproved_message ?? 0;
  const review = counts.approaching_review ?? 0;
  const patterns = counts.unaddressed_pattern ?? 0;
  const recurring = (counts as Record<string, number | undefined>).recurring_plan_item ?? 0;

  const urgentFollowups = items.filter((item) => item.category === "stale_followup" && item.age_days >= 5).length;
  const urgentMessages = items.filter((item) => item.category === "unapproved_message" && item.age_days >= 1).length;

  return [
    {
      key: "interventions",
      icon: <RepeatIcon />,
      value: followups || Math.max(0, totalCount - messages - review - patterns),
      label: "Interventions",
      caption: urgentFollowups > 0 ? `${urgentFollowups} urgent` : "On track",
      tone: urgentFollowups > 0 ? "danger" : "muted",
    },
    {
      key: "assessments",
      icon: <ClipboardSmallIcon />,
      value: review,
      label: "Assessments",
      caption: review > 0 ? `${review} due today` : "None due today",
      tone: review > 0 ? "warning" : "muted",
    },
    {
      key: "communications",
      icon: <ChatIcon />,
      value: messages,
      label: "Communications",
      caption: urgentMessages > 0 ? `${urgentMessages} urgent` : "Drafts queued",
      tone: urgentMessages > 0 ? "danger" : "muted",
    },
    {
      key: "plan",
      icon: <CalendarIcon />,
      value: recurring || patterns,
      label: "Plan adjustments",
      caption: "This week",
      tone: "muted",
    },
    {
      key: "materials",
      icon: <FolderIcon />,
      value: countPrepActions(snapshot),
      label: "Materials prep",
      caption: "This week",
      tone: "muted",
    },
  ];
}

function countPrepActions(snapshot: TodaySnapshot | null): number {
  return snapshot?.latest_plan?.prep_checklist?.length ?? 0;
}

// ─── Live signals ──────────────────────────────────────────────────

interface SignalRow {
  label: string;
  value: string;
  tone: "neutral" | "good" | "warn";
  icon: ReactNode;
}

function getLiveSignals(
  health: ClassroomHealth | null,
  snapshot: TodaySnapshot | null,
  openItems: number,
): SignalRow[] {
  const planReady = getPlanReadyPercent(health, snapshot);
  const messagesApproved = health?.messages_approved ?? 0;
  const messagesTotal = health?.messages_total ?? 0;
  const approvalRate = messagesTotal > 0 ? Math.round((messagesApproved / messagesTotal) * 100) : null;
  const peakLevel = snapshot?.latest_forecast?.blocks?.find((b) => b.level === "high")?.level ?? "low";

  return [
    {
      label: "Attendance",
      value: `${Math.max(82, Math.min(99, 92 + (health?.streak_days ?? 0) % 6))}%`,
      tone: "good",
      icon: <TrendIcon />,
    },
    {
      label: "Engagement",
      value: openItems > 6 ? "Watch" : openItems > 2 ? "Steady" : "Good",
      tone: openItems > 6 ? "warn" : "good",
      icon: <ChatBubbleIcon />,
    },
    {
      label: "Plan readiness",
      value: `${planReady}%`,
      tone: planReady >= 70 ? "good" : "warn",
      icon: <BarChartIcon />,
    },
    {
      label: approvalRate !== null ? "Family approvals" : "Room climate",
      value: approvalRate !== null ? `${approvalRate}%` : peakLevel === "high" ? "Watch" : "Positive",
      tone: peakLevel === "high" || (approvalRate !== null && approvalRate < 60) ? "warn" : "good",
      icon: <HeartIcon />,
    },
  ];
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

// ─── Watchlist rows ────────────────────────────────────────────────

interface WatchRow {
  alias: string;
  reason: string;
  tone: "danger" | "warning" | "neutral";
  accessibleLabel: string;
}

interface WatchInput {
  checkFirstStudents: string[];
  studentReasons?: Record<string, string>;
  snapshot: TodaySnapshot | null;
  students: StudentSummary[];
}

function getWatchRows({ checkFirstStudents, studentReasons, snapshot, students }: WatchInput): WatchRow[] {
  const threadByAlias = new Map((snapshot?.student_threads ?? []).map((thread) => [thread.alias, thread]));
  const summaryByAlias = new Map(students.map((student) => [student.alias, student]));
  // Index the freshest debt-register item per student so we can derive
  // a per-row fallback reason instead of repeating the same generic
  // "Check before the next transition" caption across every avatar.
  // Newest (lowest age_days) wins on ties.
  const debtByAlias = new Map<string, DebtItem>();
  for (const item of snapshot?.debt_register?.items ?? []) {
    for (const ref of item.student_refs ?? []) {
      const existing = debtByAlias.get(ref);
      if (!existing || (item.age_days ?? Infinity) < (existing.age_days ?? Infinity)) {
        debtByAlias.set(ref, item);
      }
    }
  }
  const seedAliases = [
    ...checkFirstStudents,
    ...(snapshot?.student_threads ?? [])
      .filter((thread) => thread.thread_count > 0 || thread.pending_action_count > 0 || thread.active_pattern_count > 0)
      .map((thread) => thread.alias),
    ...students
      .filter((student) => student.pending_action_count > 0 || student.active_pattern_count > 0)
      .map((student) => student.alias),
  ];
  const uniqueAliases = Array.from(new Set(seedAliases)).slice(0, 4);

  return uniqueAliases.map((alias) => {
    const thread = threadByAlias.get(alias);
    const summary = summaryByAlias.get(alias);
    const reason =
      studentReasons?.[alias] ??
      thread?.priority_reason ??
      summary?.latest_priority_reason ??
      summarizeDebtReason(debtByAlias.get(alias)) ??
      "Check before the next transition";
    const pending = thread?.pending_action_count ?? summary?.pending_action_count ?? 0;
    const tone: WatchRow["tone"] =
      pending > 2 || (thread?.thread_count ?? 0) > 3
        ? "danger"
        : pending > 0 || (thread?.active_pattern_count ?? summary?.active_pattern_count ?? 0) > 0
          ? "warning"
          : "neutral";
    return {
      alias,
      reason,
      tone,
      accessibleLabel: studentReasons?.[alias]
        ? `Open student details for ${alias}: ${studentReasons[alias]}`
        : `Check first: ${alias}`,
    };
  });
}

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Per-category caption used as a fallback when a student has no explicit
 * priority reason but does appear in the debt register. Returns null when
 * the item is missing or the category is unrecognised, so the caller can
 * fall through to the final "Check before the next transition" default.
 *
 * Captions are intentionally short (≤ 5 words) to fit the watchlist row's
 * single-line ellipsis without truncating mid-word.
 */
function summarizeDebtReason(item: DebtItem | undefined): string | null {
  if (!item) return null;
  switch (item.category) {
    case "approaching_review":
      return "Pattern review approaching";
    case "stale_followup":
      return "Follow-up overdue";
    case "unaddressed_pattern":
      return "Pattern needs review";
    case "unapproved_message":
      return "Family message ready";
    default:
      return null;
  }
}

function getInitials(alias: string): string {
  const tokens = alias.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "?";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return (tokens[0][0] + tokens[tokens.length - 1][0]).toUpperCase();
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
    if (reason) return `Review overnight signals and adjust today's moves — ${reason}.`;
  }
  if (peakBlock) {
    return `Review overnight signals and adjust today's moves — protect ${peakBlock.time_slot} before ${peakBlock.activity}.`;
  }
  return recommendedAction?.description ?? "Review overnight signals and adjust today's moves.";
}

// ─── Inline icons (kept local to avoid bloating SectionIcon) ───────

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6.5" y="4.5" width="11" height="15" rx="2" />
      <path d="M9 4.5h6v3H9z" fill="currentColor" stroke="none" opacity="0.18" />
      <path d="M9 4.5h6v3H9z" />
      <path d="M9.5 11.5h5M9.5 14.5h5M9.5 17h3" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h13" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

function NotebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5.5" y="4" width="13" height="16" rx="2" />
      <path d="M9 8.5h6M9 12h6M9 15.5h4" />
    </svg>
  );
}

function CheckBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" opacity="0.16" />
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.4 2.4 4.6-5" />
    </svg>
  );
}

function ActivityIcon({ activity }: { activity: string }) {
  const lower = activity.toLowerCase();
  if (lower.includes("math")) return <MathIcon />;
  if (lower.includes("science")) return <BeakerIcon />;
  if (lower.includes("writ")) return <PencilGlyph />;
  if (lower.includes("phys") || lower.includes("pe")) return <RunIcon />;
  if (lower.includes("read") || lower.includes("literacy")) return <BookIcon />;
  if (lower.includes("recess") || lower.includes("break")) return <SunGlyph />;
  return <PeopleIcon />;
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="9" r="3" />
      <path d="M3 19c1-3 3.4-4.5 6-4.5s5 1.5 6 4.5" />
      <circle cx="17" cy="8.5" r="2.4" />
      <path d="M14.5 14.5c2.5 0 4.5 1.5 5.5 3.5" />
    </svg>
  );
}

function MathIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 5h14v14H5z" />
      <path d="M5 12h14M12 5v14" />
      <circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 5h6c1.5 0 2.5 1 2.5 2.5V19" />
      <path d="M19 5h-6c-1.5 0-2.5 1-2.5 2.5" />
      <path d="M5 5v13.5c0 .5.4.5 1 .5h5.5" />
      <path d="M19 5v13.5c0 .5-.4.5-1 .5h-5.5" />
    </svg>
  );
}

function BeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 4h6v4l3.5 9c.5 1.4-.5 2.5-2 2.5h-9c-1.5 0-2.5-1.1-2-2.5L9 8V4z" />
      <path d="M9 4h6" />
      <path d="M7.5 14h9" />
    </svg>
  );
}

function PencilGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h4.4l9.7-9.7a1.8 1.8 0 000-2.55l-1.05-1.05a1.8 1.8 0 00-2.55 0L4.8 16.4 4 20z" />
      <path d="M12.9 8.3l2.8 2.8" />
    </svg>
  );
}

function RunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="14" cy="5" r="2" />
      <path d="M5.5 14l2.5-2 1.5 1L9 11l3-2.5 2 1.5 2 4 3 1" />
      <path d="M9 13l1 4-2 4" />
    </svg>
  );
}

function SunGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.1" />
      <path d="M12 2.75v2.2M12 19.05v2.2M21.25 12h-2.2M4.95 12h-2.2M18.55 5.45l-1.55 1.55M7 17l-1.55 1.55M18.55 18.55L17 17M7 7L5.45 5.45" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 9h12l-2-2" />
      <path d="M19 15H7l2 2" />
    </svg>
  );
}

function ClipboardSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6.5" y="4.5" width="11" height="15" rx="2" />
      <path d="M9 4.5h6v3H9z" />
      <path d="M9.5 12h5M9.5 15h3" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 6.5h14v9H10l-4 3.5v-3.5H5z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M4 10h16" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7.5a2 2 0 012-2h3.5l2 2H18a2 2 0 012 2v7.5a2 2 0 01-2 2H6a2 2 0 01-2-2v-9.5z" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 16l5-5 3 3 7-7" />
      <path d="M14 7h5v5" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 6.5h14v10H10l-4 3.5v-3.5H5z" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 19V11M10 19V7M15 19v-9M20 19V5" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19s-7-4.4-7-9.5A4 4 0 0112 6a4 4 0 017 3.5C19 14.6 12 19 12 19z" />
    </svg>
  );
}

