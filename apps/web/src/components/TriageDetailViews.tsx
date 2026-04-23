import { ActionButton } from "./shared";
import type { ActiveTool, NavTarget } from "../appReducer";
import type { PanelStatus, StudentThread } from "../types";
import "./TriageDetailViews.css";

interface PanelStatusViewProps {
  status: PanelStatus;
  onNavigate: (target: NavTarget) => void;
}

export function PanelStatusView({ status, onNavigate }: PanelStatusViewProps) {
  return (
    <div className="triage-detail">
      <div className="triage-detail__hero">
        <span className="triage-detail__eyebrow">Workflow status</span>
        <h3 className="triage-detail__title">{status.label}</h3>
        <p className="triage-detail__body">{status.detail}</p>
      </div>

      <dl className="triage-detail__facts">
        <div>
          <dt>State</dt>
          <dd>{status.state.replace(/_/g, " ")}</dd>
        </div>
        <div>
          <dt>Dependencies</dt>
          <dd>{status.dependency_state}</dd>
        </div>
        <div>
          <dt>Pending</dt>
          <dd>{status.pending_count}</dd>
        </div>
        <div>
          <dt>Last run</dt>
          <dd>{status.last_run_at ? new Date(status.last_run_at).toLocaleString() : "No recent run"}</dd>
        </div>
      </dl>

      {status.panel_id ? (
        <ActionButton
          variant="primary"
          onClick={() => onNavigate(status.panel_id as NavTarget)}
        >
          Open {status.label}
        </ActionButton>
      ) : null}
    </div>
  );
}

interface StudentThreadViewProps {
  thread: StudentThread;
  onNavigate: (target: NavTarget) => void;
  onInterventionPrefill?: (prefill: {
    student_ref: string;
    suggested_action: string;
    reason: string;
  }) => void;
  onMessagePrefill?: (prefill: {
    student_ref: string;
    reason: string;
    message_type: string;
  }) => void;
}

function normalizeTargetTab(raw: string): ActiveTool | null {
  switch (raw) {
    case "family-message":
    case "log-intervention":
    case "tomorrow-plan":
    case "ea-briefing":
    case "ea-load":
    case "survival-packet":
    case "complexity-forecast":
      return raw;
    default:
      return null;
  }
}

export function StudentThreadView({
  thread,
  onNavigate,
  onInterventionPrefill,
  onMessagePrefill,
}: StudentThreadViewProps) {
  return (
    <div className="triage-detail">
      <div className="triage-detail__hero">
        <span className="triage-detail__eyebrow">Student thread</span>
        <h3 className="triage-detail__title">{thread.alias}</h3>
        <p className="triage-detail__body">
          {thread.priority_reason ?? "No teacher-authored priority reason yet."}
        </p>
      </div>

      <dl className="triage-detail__facts">
        <div>
          <dt>Open threads</dt>
          <dd>{thread.thread_count}</dd>
        </div>
        <div>
          <dt>Pending actions</dt>
          <dd>{thread.pending_action_count}</dd>
        </div>
        <div>
          <dt>Last intervention</dt>
          <dd>{thread.last_intervention_days === null ? "None yet" : `${thread.last_intervention_days}d ago`}</dd>
        </div>
        <div>
          <dt>Family language</dt>
          <dd>{thread.family_language ?? "Not specified"}</dd>
        </div>
      </dl>

      <div className="triage-detail__action-list">
        {thread.actions.length > 0 ? thread.actions.map((action) => {
          const targetTab = normalizeTargetTab(action.target_tab);
          return (
            <button
              key={`${action.category}-${action.target_tab}`}
              type="button"
              className="triage-detail__action"
              onClick={() => {
                if (targetTab === "family-message" && onMessagePrefill) {
                  onMessagePrefill({
                    student_ref: thread.alias,
                    reason: thread.priority_reason ?? action.label,
                    message_type: "routine_update",
                  });
                  return;
                }
                if (targetTab === "log-intervention" && onInterventionPrefill) {
                  onInterventionPrefill({
                    student_ref: thread.alias,
                    suggested_action: "Log a follow-up touchpoint",
                    reason: thread.priority_reason ?? action.label,
                  });
                  return;
                }
                if (targetTab) {
                  onNavigate(targetTab);
                }
              }}
            >
              <span className="triage-detail__action-label">{action.label}</span>
              <span className="triage-detail__action-meta">
                {action.count} · {action.state.replace(/_/g, " ")}
              </span>
            </button>
          );
        }) : (
          <div className="triage-detail__empty">
            No live action threads for this student right now.
          </div>
        )}
      </div>
    </div>
  );
}
