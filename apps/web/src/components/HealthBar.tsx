import StatusChip from "./StatusChip";
import type { ClassroomHealth } from "../types";
import "./HealthBar.css";

interface Props {
  health: ClassroomHealth | null;
  loading: boolean;
}

function isZeroState(health: ClassroomHealth): boolean {
  return (
    health.streak_days === 0 &&
    health.messages_total === 0 &&
    health.plans_last_7.every((p) => !p)
  );
}

function getOverallTone(health: ClassroomHealth): "success" | "pending" | "warning" {
  const todayDebt = 0; // debt is contextual; use messages_approved vs total as proxy
  const planToday = health.plans_last_7[health.plans_last_7.length - 1] ?? false;
  const highDebt = health.messages_total > 0 && health.messages_approved < health.messages_total * 0.5;

  if (highDebt) return "warning";
  if (todayDebt === 0 && health.streak_days >= 2 && planToday) return "success";
  return "pending";
}

function getOverallLabel(tone: "success" | "pending" | "warning"): string {
  if (tone === "success") return "On track";
  if (tone === "warning") return "Needs attention";
  return "Catching up";
}

export default function HealthBar({ health, loading }: Props) {
  if (loading) return null;

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
  const overallTone = getOverallTone(health);
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

      {health.messages_total > 0 && (
        <StatusChip
          tone={health.messages_approved === health.messages_total ? "success" : "pending"}
          label={`${health.messages_approved} of ${health.messages_total} approved`}
        />
      )}

      <StatusChip tone={overallTone} label={overallLabel} />
    </div>
  );
}
