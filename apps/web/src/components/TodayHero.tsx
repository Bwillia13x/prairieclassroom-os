/**
 * TodayHero.tsx — Full-width hero banner above the Today dashboard grid.
 *
 * Pairs the deterministic TodayStory narrative with a single primary CTA
 * tied to the panel's `recommendedAction`. Everything else on the Today
 * panel (DayArc, visualizations, HealthBar, PlanRecap, etc.) flows below
 * the "Classroom pulse" section divider.
 */

import type { NavTarget } from "../appReducer";
import type {
  TodaySnapshot,
  ClassroomHealth,
  StudentSummary,
  ComplexityBlock,
} from "../types";
import TodayStory from "./TodayStory";
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
  const showMorningBrief =
    typeof openItemCount === "number" ||
    checkFirstStudents.length > 0 ||
    Boolean(peakBlock);

  return (
    <section
      className="today-hero"
      aria-label="Today hero"
      data-testid="today-hero"
    >
      <div className="today-hero__narrative">
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
        <TodayStory snapshot={snapshot} health={health} students={students} />

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
      </div>

      {recommendedAction ? (
        <div className="today-hero__cta-row">
          <span className="today-hero__rail-kicker">Recommended now</span>
          <StatusChip
            label={recommendedAction.label}
            tone={recommendedAction.tone}
          />
          <p className="today-hero__cta-rationale">
            {recommendedAction.description}
          </p>
          <div
            className="today-hero__mobile-next-move"
            data-testid="today-hero-mobile-next-move"
          >
            <span className="today-hero__mobile-next-label">Next move</span>
            <p className="today-hero__mobile-next-rationale">
              {recommendedAction.description}
            </p>
          </div>
          <ActionButton
            variant="primary"
            size="lg"
            onClick={onCtaClick}
            className="today-hero__cta"
          >
            Open {recommendedAction.cta}
          </ActionButton>
        </div>
      ) : null}

      {showMorningBrief ? (
        <div
          className="today-hero__brief"
          aria-label="Morning brief"
          data-testid="today-hero-brief"
        >
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
              <div className="today-hero__student-chips">
                {checkFirstStudents.slice(0, 5).map((studentRef) => {
                  const reason = studentReasons?.[studentRef];
                  const accessibleLabel = reason
                    ? `Open student details for ${studentRef}: ${reason}`
                    : `Check first: ${studentRef}`;
                  return (
                    <button
                      key={studentRef}
                      type="button"
                      className="today-hero__student-chip"
                      aria-label={accessibleLabel}
                      onClick={() => onStudentClick?.(studentRef)}
                    >
                      <span className="today-hero__chip-name">{studentRef}</span>
                      {reason ? (
                        <span className="today-hero__chip-reason">{reason}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function formatOpenItemCount(count: number): string {
  if (count === 0) return "0 items";
  if (count === 1) return "1 item";
  return `${count} items`;
}

function formatPeakBlock(block: ComplexityBlock): string {
  return `${block.time_slot} ${block.activity}`;
}
