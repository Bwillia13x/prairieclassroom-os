import StatusChip from "./StatusChip";
import type { ClassroomHealth } from "../types";
import "./HealthBar.css";

interface Props {
  health: ClassroomHealth | null;
  loading: boolean;
  pendingActionCount?: number;
}

function isZeroState(health: ClassroomHealth): boolean {
  return (
    health.streak_days === 0 &&
    health.plans_last_7.every((p) => !p)
  );
}

function getOverallTone(health: ClassroomHealth, pendingActionCount: number): "success" | "pending" | "warning" {
  const planToday = health.plans_last_7[0] ?? false;

  if (pendingActionCount > 3) return "warning";
  if (pendingActionCount === 0 && health.streak_days >= 2 && planToday) return "success";
  return "pending";
}

function getOverallLabel(tone: "success" | "pending" | "warning"): string {
  if (tone === "success") return "On track";
  if (tone === "warning") return "Needs attention";
  return "Catching up";
}

export default function HealthBar({ health, loading, pendingActionCount = 0 }: Props) {
  if (loading) {
    return (
      <div className="health-bar health-bar--loading" aria-busy="true" aria-label="Loading health summary">
        <span className="health-bar__shimmer" />
      </div>
    );
  }

  if (!health || isZeroState(health)) {
    return (
      <div className="health-bar health-bar--empty">
        <StatusChip
          tone="muted"
          label="Health tracking starts after your first plan or intervention"
        />
      </div>
    );
  }

  const streak = Math.min(health.streak_days, 30);
  const plannedCount = health.plans_last_7.filter(Boolean).length;
  const overallTone = getOverallTone(health, pendingActionCount);
  const overallLabel = getOverallLabel(overallTone);

  return (
    <div
      className="health-bar"
      role="status"
      aria-label="Classroom health summary"
    >
      {streak > 0 && (
        <StatusChip
          tone="success"
          label={`${streak}-day streak — no stale follow-ups`}
        />
      )}

      <span className="health-bar__planning">
        {health.plans_last_7.map((planned, i) => (
          <span
            key={i}
            className={`health-bar__dot${planned ? " health-bar__dot--filled" : ""}`}
            aria-hidden="true"
          />
        ))}
        <span className="health-bar__planning-label">
          {`${plannedCount} of 7 planned`}
        </span>
      </span>

      <StatusChip tone={overallTone} label={overallLabel} />
    </div>
  );
}
