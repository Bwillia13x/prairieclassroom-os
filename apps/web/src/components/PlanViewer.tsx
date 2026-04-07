import type { TomorrowPlan, FamilyMessagePrefill, InterventionPrefill } from "../types";
import "./PlanViewer.css";

interface Props {
  plan: TomorrowPlan;
  thinkingSummary: string | null;
  patternInformed?: boolean;
  onFollowupClick?: (prefill: FamilyMessagePrefill) => void;
  onInterventionClick?: (prefill: InterventionPrefill) => void;
}

export default function PlanViewer({ plan, thinkingSummary, patternInformed, onFollowupClick, onInterventionClick }: Props) {
  return (
    <div className="plan-viewer">
      <header className="plan-header">
        <h2>Tomorrow's Support Plan</h2>
        {patternInformed && (
          <span className="pattern-informed-badge">Pattern-informed</span>
        )}
        <p className="plan-meta">
          {plan.classroom_id}
        </p>
      </header>

      {thinkingSummary && (
        <details className="plan-thinking">
          <summary>Model Thinking</summary>
          <pre>{thinkingSummary}</pre>
        </details>
      )}

      {/* Transition Watchpoints */}
      {plan.transition_watchpoints.length > 0 && (
        <section className="plan-section plan-section--watchpoints">
          <h3>
            <span className="plan-icon">⚠</span> Transition Watchpoints
          </h3>
          <div className="plan-cards motion-stagger">
            {plan.transition_watchpoints.map((w, i) => (
              <div key={i} className="plan-card plan-card--watchpoint">
                <div className="plan-card-label">{w.time_or_activity}</div>
                <p className="plan-card-risk">{w.risk_description}</p>
                <p className="plan-card-action">{w.suggested_mitigation}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Support Priorities */}
      {plan.support_priorities.length > 0 && (
        <section className="plan-section plan-section--priorities">
          <h3>
            <span className="plan-icon">★</span> Support Priorities
          </h3>
          <div className="plan-cards motion-stagger">
            {plan.support_priorities.map((s, i) => (
              <div key={i} className="plan-card plan-card--priority">
                <div className="plan-card-label">{s.student_ref}</div>
                <p className="plan-card-reason">{s.reason}</p>
                <p className="plan-card-action">{s.suggested_action}</p>
                {onInterventionClick && (
                  <button
                    className="plan-card-intervention-link"
                    onClick={() =>
                      onInterventionClick({
                        student_ref: s.student_ref,
                        suggested_action: s.suggested_action,
                        reason: s.reason,
                      })
                    }
                  >
                    Log Intervention
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* EA Actions */}
      {plan.ea_actions.length > 0 && (
        <section className="plan-section plan-section--ea">
          <h3>
            <span className="plan-icon">👤</span> EA Plan
          </h3>
          <div className="plan-cards motion-stagger">
            {plan.ea_actions.map((e, i) => (
              <div key={i} className="plan-card plan-card--ea">
                <div className="plan-card-label">
                  {e.timing}
                  {e.student_refs.length > 0 && (
                    <span className="plan-card-tag"> · {e.student_refs.join(", ")}</span>
                  )}
                </div>
                <p>{e.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Prep Checklist */}
      {plan.prep_checklist.length > 0 && (
        <section className="plan-section plan-section--prep">
          <h3>
            <span className="plan-icon">✓</span> Prep Checklist
          </h3>
          <ul className="plan-checklist">
            {plan.prep_checklist.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Family Follow-ups */}
      {plan.family_followups.length > 0 && (
        <section className="plan-section plan-section--family">
          <h3>
            <span className="plan-icon">✉</span> Family Follow-ups
          </h3>
          <div className="plan-cards motion-stagger">
            {plan.family_followups.map((f, i) => (
              <div
                key={i}
                className={`plan-card plan-card--family${onFollowupClick ? " plan-card--clickable" : ""}`}
                onClick={
                  onFollowupClick
                    ? () =>
                        onFollowupClick({
                          student_ref: f.student_ref,
                          reason: f.reason,
                          message_type: f.message_type,
                        })
                    : undefined
                }
                onKeyDown={
                  onFollowupClick
                    ? (e: React.KeyboardEvent) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onFollowupClick({
                            student_ref: f.student_ref,
                            reason: f.reason,
                            message_type: f.message_type,
                          });
                        }
                      }
                    : undefined
                }
                role={onFollowupClick ? "button" : undefined}
                tabIndex={onFollowupClick ? 0 : undefined}
              >
                <div className="plan-card-label">
                  {f.student_ref}
                  <span className="plan-card-tag"> · {f.message_type.replace(/_/g, " ")}</span>
                </div>
                <p>{f.reason}</p>
                {onFollowupClick && (
                  <span className="plan-card-action-hint">Click to draft message</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <button
        className="btn btn--ghost plan-print"
        onClick={() => window.print()}
      >
        Print Plan
      </button>
    </div>
  );
}
