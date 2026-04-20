/**
 * TodayHero.tsx — Full-width hero banner above the Today dashboard grid.
 *
 * Pairs the deterministic TodayStory narrative with a single primary CTA
 * tied to the panel's `recommendedAction`. Everything else on the Today
 * panel (DayArc, visualizations, HealthBar, PlanRecap, etc.) flows below
 * the "Classroom pulse" section divider.
 */

import type { ActiveTab } from "../appReducer";
import type {
  TodaySnapshot,
  ClassroomHealth,
  StudentSummary,
  ComplexityBlock,
} from "../types";
import TodayStory from "./TodayStory";
import StatusChip from "./StatusChip";
import PageFreshness from "./PageFreshness";
import { ActionButton, NothingInstrumentButton } from "./shared";
import "./TodayHero.css";

export interface TodayHeroAction {
  description: string;
  tab: ActiveTab;
  cta: string;
  label: string;
  tone: "pending" | "warning" | "analysis" | "provenance" | "success";
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
          <div className="today-hero__cta-actions">
            <ActionButton
              variant="primary"
              size="lg"
              onClick={onCtaClick}
              className="today-hero__cta"
            >
              Open {recommendedAction.cta}
            </ActionButton>
            {/* N0thing instrument companion mark — the "launch signal" for
                the Today hero action. Triggers the same onCtaClick so a
                click anywhere in the pair lands the navigation. Decorative
                tick marks frame it as an instrument, not a generic button. */}
            <NothingInstrumentButton
              size="xl"
              tone="accent"
              showTicks
              fireAnim="slide-right"
              onClick={onCtaClick}
              aria-label={`Launch ${recommendedAction.cta}`}
              className="today-hero__cta-instrument"
              data-testid="today-hero-cta-instrument"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </svg>
            </NothingInstrumentButton>
          </div>
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
