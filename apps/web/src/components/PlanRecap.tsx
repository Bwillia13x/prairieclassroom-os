import { useEffect, useState } from "react";
import type { FamilyMessagePrefill, TomorrowPlan } from "../types";
import { ActionButton } from "./shared";
import { getCompleted, toggle } from "../utils/prepChecklistStore";

interface Props {
  plan: TomorrowPlan;
  /**
   * Scoping key for prep-checklist persistence (audit #24). When the
   * active classroom changes, ticks rehydrate from that classroom's
   * own localStorage partition instead of leaking across rooms.
   */
  classroomId: string;
  onPriorityClick?: (studentRef: string) => void;
  onOpenPlan?: () => void;
  /**
   * Audit #26: deep-link the first family follow-up row to the message
   * composer. When supplied, a "Draft {student}" button appears. The
   * parent is responsible for also switching tabs if desired.
   */
  onMessagePrefill?: (prefill: FamilyMessagePrefill) => void;
}

export default function PlanRecap({
  plan,
  classroomId,
  onPriorityClick,
  onOpenPlan,
  onMessagePrefill,
}: Props) {
  const [completed, setCompleted] = useState<Set<string>>(() =>
    getCompleted(classroomId, plan.plan_id),
  );

  // Rehydrate if classroom or plan changes.
  useEffect(() => {
    setCompleted(getCompleted(classroomId, plan.plan_id));
  }, [classroomId, plan.plan_id]);

  function handleToggle(item: string) {
    setCompleted(toggle(classroomId, plan.plan_id, item));
  }

  const firstFollowup = plan.family_followups[0] ?? null;
  const remainingFollowups = Math.max(plan.family_followups.length - 1, 0);

  return (
    <div className="plan-recap">
      <div className="plan-recap-header-row">
        <div>
          <h3 className="plan-recap-heading">Carry Forward</h3>
          <p className="plan-recap-subtitle">
            Keep the priorities that still matter before opening a fresh planning pass.
          </p>
        </div>
        {onOpenPlan ? (
          <ActionButton size="sm" variant="secondary" onClick={onOpenPlan}>
            Open Tomorrow Plan
          </ActionButton>
        ) : null}
      </div>

      {/* Audit #25: render EVERY support priority + checklist item. The
          old "+N more items" caption turned the list into a secondary
          surface; the list IS the primary surface. */}
      {plan.support_priorities.length > 0 && (
        <div className="plan-recap-section">
          <h4>Support Priorities</h4>
          <ul className="plan-recap-list">
            {plan.support_priorities.map((p, i) => (
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
          </ul>
        </div>
      )}

      {plan.prep_checklist.length > 0 && (
        <div className="plan-recap-section">
          <h4>Prep Checklist</h4>
          {/* Audit #24: real checkboxes with persistent state so the
              morning-prep teacher actually crosses items off. */}
          <ul className="plan-recap-list plan-recap-list--checklist">
            {plan.prep_checklist.map((item, i) => {
              const isDone = completed.has(item);
              return (
                <li key={i} className={isDone ? "plan-recap-item--done" : undefined}>
                  <label className="plan-recap-checkbox">
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => handleToggle(item)}
                      aria-label={item}
                    />
                    <span>{item}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {firstFollowup ? (
        <div className="plan-recap-section">
          <h4>Family Follow-ups</h4>
          <div className="plan-recap-followup-row">
            <p className="plan-recap-summary">
              <strong>
                {plan.family_followups.length} follow-up
                {plan.family_followups.length !== 1 ? "s" : ""}
              </strong>
              {" — "}
              {firstFollowup.student_ref} · {firstFollowup.message_type.replace(/_/g, " ")}
              {remainingFollowups > 0 ? ` · +${remainingFollowups} more` : ""}
            </p>
            {onMessagePrefill ? (
              <ActionButton
                size="sm"
                variant="secondary"
                onClick={() =>
                  onMessagePrefill({
                    student_ref: firstFollowup.student_ref,
                    message_type: firstFollowup.message_type,
                    reason: firstFollowup.reason ?? "",
                  })
                }
                aria-label={`Draft ${firstFollowup.student_ref} family message`}
              >
                Draft {firstFollowup.student_ref}
              </ActionButton>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
