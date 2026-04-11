import { useEffect, useRef, useCallback } from "react";
import { useApp } from "../AppContext";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useAsyncAction } from "../useAsyncAction";
import {
  fetchInterventionHistoryForStudent,
  fetchMessageHistoryForStudent,
} from "../api";
import type {
  DrillDownContext,
  InterventionRecord,
  FamilyMessageDraft,
  ComplexityBlock,
  DebtItem,
} from "../types";
import type { ActiveTab } from "../appReducer";
import Sparkline from "./Sparkline";
import SkeletonLoader from "./SkeletonLoader";
import StatusChip from "./StatusChip";
import "./DrillDownDrawer.css";

interface Props {
  context: DrillDownContext | null;
  onClose: () => void;
  onNavigate: (tab: ActiveTab) => void;
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

// ── Title computation ─────────────────────────────────────────────────────────

function computeTitle(context: DrillDownContext): string {
  switch (context.type) {
    case "forecast-block":
      return `${context.block.time_slot} — ${context.block.activity} · ${context.block.level} complexity`;
    case "student":
      return `${context.alias} — Student Detail`;
    case "debt-category":
      return `${context.items.length} ${context.category.replace(/_/g, " ")}`;
    case "trend":
      return `${context.label} — 14-day trend`;
  }
}

// ── Sub-view: Student Detail ──────────────────────────────────────────────────

interface StudentViewProps {
  context: Extract<DrillDownContext, { type: "student" }>;
  classroomId: string;
  onInterventionPrefill?: Props["onInterventionPrefill"];
  onMessagePrefill?: Props["onMessagePrefill"];
  onNavigate: (tab: ActiveTab) => void;
}

function StudentDetailView({
  context,
  classroomId,
  onInterventionPrefill,
  onMessagePrefill,
  onNavigate,
}: StudentViewProps) {
  const interventionAction = useAsyncAction<InterventionRecord[]>();
  const messageAction = useAsyncAction<FamilyMessageDraft[]>();

  const loadData = useCallback(() => {
    interventionAction.execute((signal) =>
      fetchInterventionHistoryForStudent(classroomId, context.alias, 10, signal)
    );
    messageAction.execute((signal) =>
      fetchMessageHistoryForStudent(classroomId, context.alias, 10, signal)
    );
  }, [
    classroomId,
    context.alias,
    interventionAction.execute,
    messageAction.execute,
  ]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

// ── Sub-view: Forecast Block Detail ──────────────────────────────────────────

interface ForecastBlockViewProps {
  block: ComplexityBlock;
}

function ForecastBlockView({ block }: ForecastBlockViewProps) {
  const tone =
    block.level === "high"
      ? "warning"
      : block.level === "medium"
        ? "pending"
        : "success";

  return (
    <>
      <div className="drill-down-level-chip">
        <StatusChip label={block.level} tone={tone} />
      </div>

      {block.contributing_factors.length > 0 && (
        <div className="drill-down-section">
          <h4>Contributing factors</h4>
          <ul className="drill-down-list">
            {block.contributing_factors.map((factor, i) => (
              <li key={i}>{factor}</li>
            ))}
          </ul>
        </div>
      )}

      {block.suggested_mitigation && (
        <div className="drill-down-section">
          <h4>Suggested mitigation</h4>
          <p className="drill-down-mitigation-text">
            {block.suggested_mitigation}
          </p>
        </div>
      )}
    </>
  );
}

// ── Sub-view: Debt Category ───────────────────────────────────────────────────

interface DebtCategoryViewProps {
  items: DebtItem[];
  onInterventionPrefill?: Props["onInterventionPrefill"];
  onNavigate: (tab: ActiveTab) => void;
}

function DebtCategoryView({
  items,
  onInterventionPrefill,
  onNavigate,
}: DebtCategoryViewProps) {
  if (items.length === 0) {
    return <p className="drill-down-empty">No items in this category.</p>;
  }

  return (
    <>
      {items.map((item) => {
        const isStaleFollowup = item.category === "stale_followup";

        function handleLogFollowUp() {
          const studentRef = item.student_refs[0] ?? "";
          onInterventionPrefill?.({
            student_ref: studentRef,
            suggested_action: "Log follow-up",
            reason: item.description,
          });
          onNavigate("log-intervention");
        }

        return (
          <div key={item.source_record_id} className="drill-down-debt-item">
            <p className="drill-down-debt-item__description">
              {item.description}
            </p>
            <div className="drill-down-debt-item__meta">
              {item.student_refs.length > 0 && (
                <span className="drill-down-debt-item__refs">
                  {item.student_refs.join(", ")}
                </span>
              )}
              <span className="drill-down-debt-item__age">
                {item.age_days}d ago
              </span>
              {isStaleFollowup && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={handleLogFollowUp}
                >
                  Log follow-up
                </button>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

// ── Sub-view: Trend Detail ────────────────────────────────────────────────────

interface TrendViewProps {
  context: Extract<DrillDownContext, { type: "trend" }>;
}

function TrendDetailView({ context }: TrendViewProps) {
  const { data } = context;

  // Generate approximate dates going back from today
  const today = new Date();
  const rows = data.map((value, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (data.length - 1 - i));
    return { date: d, value };
  });

  return (
    <>
      <div className="drill-down-trend-chart">
        <Sparkline
          data={data}
          width={340}
          height={160}
          label={context.label}
        />
      </div>

      <div className="drill-down-section">
        <h4>Daily values</h4>
        <table className="drill-down-trend-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ date, value }, i) => (
              <tr key={i}>
                <td>
                  {date.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DrillDownDrawer({
  context,
  onClose,
  onNavigate,
  onInterventionPrefill,
  onMessagePrefill,
}: Props) {
  const { activeClassroom } = useApp();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(drawerRef, context !== null);

  // Escape key to close
  useEffect(() => {
    if (!context) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [context, onClose]);

  if (!context) return null;

  const title = computeTitle(context);

  return (
    <>
      {/* Backdrop */}
      <div
        className="drill-down-backdrop"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="drill-down-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="drill-down-drawer__header">
          <h2 className="drill-down-drawer__title" title={title}>
            {title}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            className="drill-down-drawer__close"
            aria-label="Close drawer"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Body — type-discriminated sub-view */}
        <div className="drill-down-drawer__body">
          {context.type === "student" && (
            <StudentDetailView
              context={context}
              classroomId={activeClassroom}
              onInterventionPrefill={onInterventionPrefill}
              onMessagePrefill={onMessagePrefill}
              onNavigate={onNavigate}
            />
          )}

          {context.type === "forecast-block" && (
            <ForecastBlockView block={context.block} />
          )}

          {context.type === "debt-category" && (
            <DebtCategoryView
              items={context.items}
              onInterventionPrefill={onInterventionPrefill}
              onNavigate={onNavigate}
            />
          )}

          {context.type === "trend" && <TrendDetailView context={context} />}
        </div>
      </div>
    </>
  );
}
