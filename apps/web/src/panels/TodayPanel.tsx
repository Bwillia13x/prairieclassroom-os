import { useEffect } from "react";
import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { fetchTodaySnapshot } from "../api";
import PendingActionsCard from "../components/PendingActionsCard";
import PlanRecap from "../components/PlanRecap";
import ForecastTimeline from "../components/ForecastTimeline";
import SkeletonLoader from "../components/SkeletonLoader";
import type { TodaySnapshot } from "../types";
import "./TodayPanel.css";

interface Props {
  onTabChange: (tab: string) => void;
}

export default function TodayPanel({ onTabChange }: Props) {
  const { activeClassroom, profile } = useApp();
  const { loading, error, result, execute } = useAsyncAction<TodaySnapshot>();

  useEffect(() => {
    if (!activeClassroom) return;
    execute((signal) => fetchTodaySnapshot(activeClassroom, signal));
  }, [activeClassroom, execute]);

  if (!profile) return null;

  return (
    <div className="today-panel">
      <header className="today-header">
        <h2>Good Morning</h2>
        <p className="today-subtitle">
          Grade {profile.grade_band} — {profile.subject_focus.replace(/_/g, " ")} — {profile.students.length} students
        </p>
      </header>

      {loading && !result && (
        <SkeletonLoader variant="stack" message="Loading today's snapshot..." label="Loading dashboard" />
      )}

      {error && !result && <div className="error-banner">{error}</div>}

      {result && (
        <div className="today-grid">
          <PendingActionsCard
            items={[
              {
                label: "unapproved messages",
                count: result.debt_register.item_count_by_category["unapproved_message"] ?? 0,
                targetTab: "family-message",
                icon: "\u2709",
              },
              {
                label: "stale follow-ups",
                count: result.debt_register.item_count_by_category["stale_followup"] ?? 0,
                targetTab: "log-intervention",
                icon: "\u26A0",
              },
              {
                label: "unaddressed patterns",
                count: result.debt_register.item_count_by_category["unaddressed_pattern"] ?? 0,
                targetTab: "support-patterns",
                icon: "\u2605",
              },
              {
                label: "approaching review",
                count: result.debt_register.item_count_by_category["approaching_review"] ?? 0,
                targetTab: "support-patterns",
                icon: "\u23F1",
              },
            ]}
            onNavigate={onTabChange}
          />

          {result.latest_plan && (
            <PlanRecap plan={result.latest_plan} />
          )}

          {result.latest_forecast && (
            <div className="today-forecast-section">
              <h3>Today's Complexity Shape</h3>
              <ForecastTimeline blocks={result.latest_forecast.blocks} />
              <p className="today-forecast-summary">{result.latest_forecast.overall_summary}</p>
            </div>
          )}

          {!result.latest_plan && !result.latest_forecast && result.debt_register.items.length === 0 && (
            <div className="empty-state">
              <svg className="empty-state-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <path d="M8 36 Q16 20 24 28 Q32 16 40 24" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" fill="none"/>
                <line x1="8" y1="38" x2="40" y2="38" stroke="var(--color-border)" strokeWidth="1.5"/>
                <circle cx="24" cy="14" r="6" stroke="var(--color-accent)" strokeWidth="1.5" fill="var(--color-bg-accent)"/>
              </svg>
              <div className="empty-state-title">Fresh start</div>
              <p className="empty-state-description">
                No classroom data yet. Start by generating a Tomorrow Plan or logging an intervention.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
