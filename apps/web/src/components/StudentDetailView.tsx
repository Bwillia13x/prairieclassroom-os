import { useEffect } from "react";
import { useAsyncAction } from "../useAsyncAction";
import {
  fetchInterventionHistoryForStudent,
  fetchMessageHistoryForStudent,
} from "../api";
import type {
  DrillDownContext,
  InterventionRecord,
  FamilyMessageDraft,
} from "../types";
import type { ActiveTab } from "../appReducer";
import SkeletonLoader from "./SkeletonLoader";
import StatusChip from "./StatusChip";
import { InterventionTimeline, FollowUpSuccessRate } from "./DataVisualizations";

interface Props {
  context: Extract<DrillDownContext, { type: "student" }>;
  classroomId: string;
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
  onNavigate: (tab: ActiveTab) => void;
}

export default function StudentDetailView({
  context,
  classroomId,
  onInterventionPrefill,
  onMessagePrefill,
  onNavigate,
}: Props) {
  const interventionAction = useAsyncAction<InterventionRecord[]>();
  const messageAction = useAsyncAction<FamilyMessageDraft[]>();

  useEffect(() => {
    interventionAction.execute((signal) =>
      fetchInterventionHistoryForStudent(classroomId, context.alias, 10, signal)
    );
    messageAction.execute((signal) =>
      fetchMessageHistoryForStudent(classroomId, context.alias, 10, signal)
    );
  }, [classroomId, context.alias]);

  const { initialData } = context;

  function handleLogFollowUp() {
    onInterventionPrefill?.({
      student_ref: context.alias,
      suggested_action: "Log follow-up",
      reason: initialData?.latest_priority_reason ?? "",
    });
    onNavigate("log-intervention");
  }

  function handleDraftMessage() {
    onMessagePrefill?.({
      student_ref: context.alias,
      reason: initialData?.latest_priority_reason ?? "",
      message_type: "routine_update",
    });
    onNavigate("family-message");
  }

  return (
    <>
      {initialData && (
        <>
          <div className="drill-down-stats-grid">
            <div className="drill-down-stat">
              <span className="drill-down-stat__value">
                {initialData.pending_action_count}
              </span>
              <span className="drill-down-stat__label">Pending actions</span>
            </div>
            <div className="drill-down-stat">
              <span className="drill-down-stat__value">
                {initialData.active_pattern_count}
              </span>
              <span className="drill-down-stat__label">Active patterns</span>
            </div>
            <div className="drill-down-stat">
              <span className="drill-down-stat__value">
                {initialData.pending_message_count}
              </span>
              <span className="drill-down-stat__label">Pending messages</span>
            </div>
            <div className="drill-down-stat">
              <span className="drill-down-stat__value">
                {initialData.last_intervention_days !== null
                  ? `${initialData.last_intervention_days}d`
                  : "—"}
              </span>
              <span className="drill-down-stat__label">Last intervention</span>
            </div>
          </div>

          {initialData.latest_priority_reason && (
            <div className="drill-down-priority-chip">
              <StatusChip
                label={initialData.latest_priority_reason}
                tone="warning"
              />
            </div>
          )}
        </>
      )}

      {interventionAction.result && interventionAction.result.length > 0 && (
        <div className="drill-down-section">
          <div className="drill-down-viz-row">
            <InterventionTimeline records={interventionAction.result} />
            <FollowUpSuccessRate records={interventionAction.result} />
          </div>
        </div>
      )}

      <div className="drill-down-section">
        <h4>Intervention History</h4>
        {interventionAction.loading && (
          <SkeletonLoader
            variant="stack"
            message="Loading interventions…"
            label="Loading intervention history"
          />
        )}
        {interventionAction.error && !interventionAction.loading && (
          <p className="drill-down-error">Could not load interventions.</p>
        )}
        {!interventionAction.loading &&
          !interventionAction.error &&
          (interventionAction.result?.length ?? 0) === 0 && (
            <p className="drill-down-empty">No interventions logged yet.</p>
          )}
        {interventionAction.result && interventionAction.result.length > 0 && (
          <>
            {interventionAction.result.map((record) => (
              <div key={record.record_id} className="drill-down-record">
                <p className="drill-down-record__observation">
                  {record.observation}
                </p>
                <p className="drill-down-record__action">
                  Action: {record.action_taken}
                </p>
                {record.outcome && (
                  <p className="drill-down-record__action">
                    Outcome: {record.outcome}
                  </p>
                )}
                <div className="drill-down-record__meta">
                  {record.follow_up_needed && (
                    <StatusChip label="Follow-up needed" tone="pending" />
                  )}
                  <StatusChip
                    label={new Date(record.created_at).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric" }
                    )}
                    tone="muted"
                  />
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="drill-down-section">
        <h4>Message History</h4>
        {messageAction.loading && (
          <SkeletonLoader
            variant="stack"
            message="Loading messages…"
            label="Loading message history"
          />
        )}
        {messageAction.error && !messageAction.loading && (
          <p className="drill-down-error">Could not load messages.</p>
        )}
        {!messageAction.loading &&
          !messageAction.error &&
          (messageAction.result?.length ?? 0) === 0 && (
            <p className="drill-down-empty">No messages drafted yet.</p>
          )}
        {messageAction.result && messageAction.result.length > 0 && (
          <>
            {messageAction.result.map((draft) => (
              <div key={draft.draft_id} className="drill-down-record">
                <p className="drill-down-record__observation">
                  {draft.plain_language_text}
                </p>
                <div className="drill-down-record__meta">
                  {draft.teacher_approved ? (
                    <StatusChip label="Approved" tone="success" />
                  ) : (
                    <StatusChip label="Draft" tone="pending" />
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="drill-down-actions">
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={handleLogFollowUp}
        >
          Log Follow-up
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={handleDraftMessage}
        >
          Draft Message
        </button>
      </div>
    </>
  );
}
