import type { TomorrowPlan } from "../types";
import Sparkline from "./Sparkline";

interface Props {
  plan: TomorrowPlan;
  sparklineData?: number[];
  onPriorityClick?: (studentRef: string) => void;
}

export default function PlanRecap({ plan, sparklineData, onPriorityClick }: Props) {
  return (
    <div className="plan-recap">
      <div className="plan-recap-header-row">
        <h3 className="plan-recap-heading">Yesterday's Plan</h3>
        {sparklineData && sparklineData.length >= 3 ? (
          <Sparkline data={sparklineData} label="Plans trend over 14 days" />
        ) : null}
      </div>

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
          <ul className="plan-recap-list">
            {plan.prep_checklist.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {plan.family_followups.length > 0 && (
        <div className="plan-recap-section">
          <h4>Family Follow-ups</h4>
          <ul className="plan-recap-list">
            {plan.family_followups.map((f, i) => (
              <li key={i}>
                <strong>{f.student_ref}</strong> — {f.message_type.replace(/_/g, " ")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
