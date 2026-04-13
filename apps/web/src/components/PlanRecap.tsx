import type { TomorrowPlan } from "../types";
import { ActionButton } from "./shared";

interface Props {
  plan: TomorrowPlan;
  onPriorityClick?: (studentRef: string) => void;
  onOpenPlan?: () => void;
}

function renderOverflowLabel(count: number, singular: string, plural = `${singular}s`) {
  if (count <= 0) return null;
  return `+${count} more ${count === 1 ? singular : plural}`;
}

export default function PlanRecap({ plan, onPriorityClick, onOpenPlan }: Props) {
  const visiblePriorities = plan.support_priorities.slice(0, 3);
  const visibleChecklist = plan.prep_checklist.slice(0, 3);
  const hiddenPriorityCount = Math.max(plan.support_priorities.length - visiblePriorities.length, 0);
  const hiddenChecklistCount = Math.max(plan.prep_checklist.length - visibleChecklist.length, 0);
  const firstFollowup = plan.family_followups[0] ?? null;
  const hiddenFollowupCount = Math.max(plan.family_followups.length - 1, 0);

  return (
    <div className="plan-recap">
      <div className="plan-recap-header-row">
        <div>
          <h3 className="plan-recap-heading">Carry Forward</h3>
          <p className="plan-recap-subtitle">Keep the priorities that still matter before opening a fresh planning pass.</p>
        </div>
        {onOpenPlan ? (
          <ActionButton size="sm" variant="secondary" onClick={onOpenPlan}>
            Open Tomorrow Plan
          </ActionButton>
        ) : null}
      </div>

      {visiblePriorities.length > 0 && (
        <div className="plan-recap-section">
          <h4>Support Priorities</h4>
          <ul className="plan-recap-list">
            {visiblePriorities.map((p, i) => (
              <li key={i}>
                {onPriorityClick ? (
                  <button
                    className="plan-recap-priority-btn"
                    type="button"
                    onClick={() => onPriorityClick(p.student_ref)}
                  >
                    <strong>{p.student_ref}</strong> — {p.suggested_action}
                  </button>
                ) : (
                  <>
                    <strong>{p.student_ref}</strong> — {p.suggested_action}
                  </>
                )}
              </li>
            ))}
            {hiddenPriorityCount > 0 ? (
              <li className="plan-recap-overflow">{renderOverflowLabel(hiddenPriorityCount, "priority")}</li>
            ) : null}
          </ul>
        </div>
      )}

      {visibleChecklist.length > 0 && (
        <div className="plan-recap-section">
          <h4>Prep Checklist</h4>
          <ul className="plan-recap-list">
            {visibleChecklist.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
            {hiddenChecklistCount > 0 ? (
              <li className="plan-recap-overflow">{renderOverflowLabel(hiddenChecklistCount, "item")}</li>
            ) : null}
          </ul>
        </div>
      )}

      {firstFollowup ? (
        <div className="plan-recap-section">
          <h4>Family Follow-ups</h4>
          <p className="plan-recap-summary">
            <strong>{plan.family_followups.length} follow-up{plan.family_followups.length !== 1 ? "s" : ""}</strong>
            {" — "}
            {firstFollowup.student_ref} · {firstFollowup.message_type.replace(/_/g, " ")}
            {hiddenFollowupCount > 0 ? ` · ${renderOverflowLabel(hiddenFollowupCount, "follow-up")}` : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}
