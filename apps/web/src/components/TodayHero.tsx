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
} from "../types";
import TodayStory from "./TodayStory";
import StatusChip from "./StatusChip";
import PageFreshness from "./PageFreshness";
import { ActionButton } from "./shared";
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
  onCtaClick: () => void;
}

export default function TodayHero({
  snapshot,
  health,
  students,
  recommendedAction,
  onCtaClick,
}: Props) {
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
    </section>
  );
}
