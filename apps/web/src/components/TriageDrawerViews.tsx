import {
  TAB_META,
  TOOL_META,
  isActiveTab as isAppActiveTab,
  isActiveTool,
  isTabVisibleForRole,
  resolveLegacyPanel,
  type ActiveTool,
  type ClassroomRole,
  type NavTarget,
} from "../appReducer";
import type {
  EALoadBlock,
  OperatingDashboardCoverageCell,
  OperatingDashboardCoverageRow,
  OperatingDashboardDay,
  OperatingDashboardQueue,
  OperatingDashboardTransitionRisk,
  PanelStatus,
  StudentThread,
  StudentThreadAction,
} from "../types";
import { ActionButton } from "./shared";

const TARGET_TAB_BY_CATEGORY: Record<string, ActiveTool> = {
  unapproved_message: "family-message",
  family_followup: "family-message",
  stale_followup: "log-intervention",
  support_priority: "tomorrow-plan",
  ea_action: "ea-briefing",
};

function isNavTargetValue(value: string | null | undefined): value is NavTarget {
  return typeof value === "string" && (isAppActiveTab(value) || isActiveTool(value));
}

function targetFromString(value: string | null | undefined): NavTarget | null {
  return isNavTargetValue(value) ? value : null;
}

function tabFromAction(action: StudentThreadAction): NavTarget | null {
  const mapped = TARGET_TAB_BY_CATEGORY[action.category];
  if (mapped) return mapped;
  return isNavTargetValue(action.target_tab) ? action.target_tab : null;
}

function hostTabForTarget(target: NavTarget | null): ReturnType<typeof resolveLegacyPanel>["tab"] | null {
  if (!target) return null;
  return resolveLegacyPanel(target).tab;
}

function isTargetVisibleForRole(target: NavTarget | null, role?: ClassroomRole): boolean {
  if (!role) return true;
  const hostTab = hostTabForTarget(target);
  return hostTab ? isTabVisibleForRole(hostTab, role) : false;
}

function formatPanelName(value: string) {
  if (isAppActiveTab(value)) return TAB_META[value].label;
  if (isActiveTool(value)) return TOOL_META[value].label;
  return value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function labelForTarget(target: NavTarget): string {
  if (isAppActiveTab(target)) return TAB_META[target].label;
  if (isActiveTool(target)) return TOOL_META[target].label;
  return String(target);
}

function shortLabelForTarget(target: NavTarget): string {
  if (isAppActiveTab(target)) return TAB_META[target].shortLabel;
  if (isActiveTool(target)) return TOOL_META[target].shortLabel;
  return String(target);
}

function formatStatusLabel(value: string) {
  return value.replace(/_/g, " ");
}

function formatTimestamp(value: string | null) {
  if (!value) return "Not generated yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not generated yet";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

interface PanelStatusViewProps {
  status: PanelStatus;
  onNavigate: (target: NavTarget) => void;
  activeRole?: ClassroomRole;
}

export function PanelStatusView({ status, onNavigate, activeRole }: PanelStatusViewProps) {
  const targetTab = targetFromString(status.panel_id);
  const canOpenTarget = targetTab ? isTargetVisibleForRole(targetTab, activeRole) : false;

  return (
    <>
      <section className="drill-down-section">
        <h4>Workflow Status</h4>
        <div className="drill-down-record">
          <p className="drill-down-record__observation">{status.detail}</p>
          <div className="drill-down-record__meta">
            <span>{formatPanelName(status.panel_id)}</span>
            <span>{status.pending_count} pending</span>
            <span>{formatStatusLabel(status.state)}</span>
            <span>{formatStatusLabel(status.dependency_state)}</span>
          </div>
        </div>
      </section>

      <section className="drill-down-section">
        <h4>Snapshot</h4>
        <div className="drill-down-stats-grid">
          <div className="drill-down-stat">
            <span className="drill-down-stat__value">{status.pending_count}</span>
            <span className="drill-down-stat__label">Pending items</span>
          </div>
          <div className="drill-down-stat">
            <span className="drill-down-stat__value">{formatStatusLabel(status.state)}</span>
            <span className="drill-down-stat__label">Current state</span>
          </div>
          <div className="drill-down-stat">
            <span className="drill-down-stat__value">{formatStatusLabel(status.dependency_state)}</span>
            <span className="drill-down-stat__label">Dependency</span>
          </div>
          <div className="drill-down-stat">
            <span className="drill-down-stat__value">{formatTimestamp(status.last_run_at)}</span>
            <span className="drill-down-stat__label">Last run</span>
          </div>
        </div>
      </section>

      {targetTab && canOpenTarget ? (
        <div className="drill-down-actions">
          <ActionButton size="sm" variant="secondary" onClick={() => onNavigate(targetTab)}>
            Open {shortLabelForTarget(targetTab)}
          </ActionButton>
        </div>
      ) : null}
    </>
  );
}

interface StudentThreadViewProps {
  thread: StudentThread;
  onNavigate: (target: NavTarget) => void;
  activeRole?: ClassroomRole;
  onOpenStudent?: (alias: string) => void;
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

export function StudentThreadView({
  thread,
  onNavigate,
  activeRole,
  onOpenStudent,
  onInterventionPrefill,
  onMessagePrefill,
}: StudentThreadViewProps) {
  const primaryAction = thread.actions[0] ?? null;
  const primaryTarget = primaryAction ? tabFromAction(primaryAction) : null;
  const canOpenPrimaryTarget = primaryTarget ? isTargetVisibleForRole(primaryTarget, activeRole) : false;

  return (
    <>
      <section className="drill-down-section">
        <h4>Thread Summary</h4>
        <div className="drill-down-record">
          <p className="drill-down-record__observation">
            {thread.priority_reason ?? `${thread.thread_count} active threads are open for ${thread.alias}.`}
          </p>
          <div className="drill-down-record__meta">
            {thread.eal_flag ? <span>EAL support</span> : null}
            {thread.family_language ? <span>{thread.family_language}</span> : null}
            {thread.support_tags?.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </div>
      </section>

      <section className="drill-down-section">
        <h4>Open Signal</h4>
        <div className="drill-down-stats-grid">
          <div className="drill-down-stat">
            <span className="drill-down-stat__value">{thread.thread_count}</span>
            <span className="drill-down-stat__label">Active threads</span>
          </div>
          <div className="drill-down-stat">
            <span className="drill-down-stat__value">{thread.pending_action_count}</span>
            <span className="drill-down-stat__label">Pending actions</span>
          </div>
          <div className="drill-down-stat">
            <span className="drill-down-stat__value">{thread.pending_message_count}</span>
            <span className="drill-down-stat__label">Family follow-ups</span>
          </div>
          <div className="drill-down-stat">
            <span className="drill-down-stat__value">
              {thread.last_intervention_days === null ? "—" : `${thread.last_intervention_days}d`}
            </span>
            <span className="drill-down-stat__label">Since last touch</span>
          </div>
        </div>
      </section>

      {thread.actions.length > 0 ? (
        <section className="drill-down-section">
          <h4>Available Actions</h4>
          <ul className="drill-down-list">
            {thread.actions.map((action) => {
              const targetTab = tabFromAction(action);
              return (
                <li key={`${action.category}-${action.target_tab}`}>
                  <strong>{action.label}</strong>
                  <div className="drill-down-record__meta">
                    <span>{action.count} open</span>
                    <span>{formatStatusLabel(action.state)}</span>
                    {targetTab ? <span>{labelForTarget(targetTab)}</span> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="drill-down-actions">
        <ActionButton size="sm" variant="secondary" onClick={() => onOpenStudent?.(thread.alias)}>
          Open Student Detail
        </ActionButton>
        {primaryAction && primaryTarget === "family-message" && canOpenPrimaryTarget ? (
          <ActionButton
            size="sm"
            variant="secondary"
            onClick={() => {
              onMessagePrefill?.({
                student_ref: thread.alias,
                reason: thread.priority_reason ?? primaryAction.label,
                message_type: "routine_update",
              });
              onNavigate("family-message");
            }}
          >
            Start Message
          </ActionButton>
        ) : null}
        {primaryAction && primaryTarget === "log-intervention" && canOpenPrimaryTarget ? (
          <ActionButton
            size="sm"
            variant="secondary"
            onClick={() => {
              onInterventionPrefill?.({
                student_ref: thread.alias,
                suggested_action: primaryAction.label,
                reason: thread.priority_reason ?? primaryAction.label,
              });
              onNavigate("log-intervention");
            }}
          >
            Log Follow-up
          </ActionButton>
        ) : null}
        {primaryAction && primaryTarget && primaryTarget !== "family-message" && primaryTarget !== "log-intervention" && canOpenPrimaryTarget ? (
          <ActionButton
            size="sm"
            variant="secondary"
            onClick={() => onNavigate(primaryTarget)}
          >
            Open {shortLabelForTarget(primaryTarget)}
          </ActionButton>
        ) : null}
      </div>
    </>
  );
}

interface EALoadBlockViewProps {
  block: EALoadBlock;
}

export function EALoadBlockView({ block }: EALoadBlockViewProps) {
  return (
    <>
      <section className="drill-down-section">
        <h4>EA Load Block</h4>
        <div className="drill-down-record">
          <p className="drill-down-record__observation">
            {block.time_slot} · {block.activity}
          </p>
          <div className="drill-down-record__meta">
            <span>EA {block.load_level}</span>
            <span>{block.ea_available ? "EA available" : "EA unavailable"}</span>
            <span>{block.supported_students.length} students</span>
          </div>
        </div>
      </section>

      {block.load_factors.length > 0 ? (
        <section className="drill-down-section">
          <h4>Load Factors</h4>
          <ul className="drill-down-list">
            {block.load_factors.map((factor, index) => <li key={index}>{factor}</li>)}
          </ul>
        </section>
      ) : null}

      {block.supported_students.length > 0 ? (
        <section className="drill-down-section">
          <h4>Supported Students</h4>
          <ul className="drill-down-list">
            {block.supported_students.map((student) => <li key={student}>{student}</li>)}
          </ul>
        </section>
      ) : null}

      {block.redistribution_suggestion ? (
        <section className="drill-down-section">
          <h4>Redistribution Suggestion</h4>
          <p className="drill-down-mitigation-text">{block.redistribution_suggestion}</p>
        </section>
      ) : null}
    </>
  );
}

interface WeekDayViewProps {
  day: OperatingDashboardDay;
  onNavigate: (target: NavTarget) => void;
  activeRole?: ClassroomRole;
}

export function WeekDayView({ day, onNavigate, activeRole }: WeekDayViewProps) {
  const forecastBlocks = day.blocks.filter((block) => block.source === "forecast").length;
  const eventBlocks = day.blocks.filter((block) => block.source === "event").length;
  const canOpenForecast = isTargetVisibleForRole("complexity-forecast", activeRole);

  return (
    <>
      <section className="drill-down-section">
        <h4>Day Source</h4>
        <div className="drill-down-stats-grid">
          <div className="drill-down-stat">
            <span className="drill-down-stat__value">{day.blocks.length}</span>
            <span className="drill-down-stat__label">Blocks</span>
          </div>
          <div className="drill-down-stat">
            <span className="drill-down-stat__value">{formatStatusLabel(day.source)}</span>
            <span className="drill-down-stat__label">Primary source</span>
          </div>
          <div className="drill-down-stat">
            <span className="drill-down-stat__value">{forecastBlocks}</span>
            <span className="drill-down-stat__label">Forecasted</span>
          </div>
          <div className="drill-down-stat">
            <span className="drill-down-stat__value">{eventBlocks}</span>
            <span className="drill-down-stat__label">Event seeded</span>
          </div>
        </div>
      </section>

      <section className="drill-down-section">
        <h4>Blocks</h4>
        <ul className="drill-down-list">
          {day.blocks.map((block) => (
            <li key={block.id}>
              <strong>{block.time_slot} · {block.activity}</strong>
              <p className="drill-down-mitigation-text">{block.detail}</p>
              <div className="drill-down-record__meta">
                <span>{formatStatusLabel(block.level)}</span>
                <span>{formatStatusLabel(block.source)}</span>
                {block.event_count ? <span>{block.event_count} events</span> : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {forecastBlocks > 0 && canOpenForecast ? (
        <div className="drill-down-actions">
          <ActionButton size="sm" variant="secondary" onClick={() => onNavigate("complexity-forecast")}>
            Open Forecast
          </ActionButton>
        </div>
      ) : null}
    </>
  );
}

interface QueueStateViewProps {
  queue: OperatingDashboardQueue;
  onNavigate: (target: NavTarget) => void;
  activeRole?: ClassroomRole;
}

export function QueueStateView({ queue, onNavigate, activeRole }: QueueStateViewProps) {
  const targetTab = targetFromString(queue.target_tab);
  const canOpenTarget = targetTab ? isTargetVisibleForRole(targetTab, activeRole) : false;

  return (
    <>
      <section className="drill-down-section">
        <h4>Queue State</h4>
        <div className="drill-down-record">
          <p className="drill-down-record__observation">{queue.detail}</p>
          <div className="drill-down-record__meta">
            <span>{queue.count} queued</span>
            <span>{formatStatusLabel(queue.state)}</span>
            {targetTab ? <span>{labelForTarget(targetTab)}</span> : null}
          </div>
        </div>
      </section>

      {queue.status ? (
        <section className="drill-down-section">
          <h4>Workflow Snapshot</h4>
          <div className="drill-down-stats-grid">
            <div className="drill-down-stat">
              <span className="drill-down-stat__value">{formatStatusLabel(queue.status.state)}</span>
              <span className="drill-down-stat__label">Status</span>
            </div>
            <div className="drill-down-stat">
              <span className="drill-down-stat__value">{formatStatusLabel(queue.status.dependency_state)}</span>
              <span className="drill-down-stat__label">Dependency</span>
            </div>
            <div className="drill-down-stat">
              <span className="drill-down-stat__value">{queue.status.pending_count}</span>
              <span className="drill-down-stat__label">Pending</span>
            </div>
            <div className="drill-down-stat">
              <span className="drill-down-stat__value">{formatTimestamp(queue.status.last_run_at)}</span>
              <span className="drill-down-stat__label">Last run</span>
            </div>
          </div>
        </section>
      ) : null}

      {targetTab && canOpenTarget ? (
        <div className="drill-down-actions">
          <ActionButton size="sm" variant="secondary" onClick={() => onNavigate(targetTab)}>
            Open {shortLabelForTarget(targetTab)}
          </ActionButton>
        </div>
      ) : null}
    </>
  );
}

interface CoverageCellViewProps {
  row: OperatingDashboardCoverageRow;
  cell: OperatingDashboardCoverageCell;
  onNavigate: (target: NavTarget) => void;
  activeRole?: ClassroomRole;
  onOpenStudent?: (alias: string) => void;
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

export function CoverageCellView({
  row,
  cell,
  onNavigate,
  activeRole,
  onOpenStudent,
  onInterventionPrefill,
  onMessagePrefill,
}: CoverageCellViewProps) {
  const targetTab = targetFromString(cell.target_tab);
  const canOpenTarget = targetTab ? isTargetVisibleForRole(targetTab, activeRole) : false;

  return (
    <>
      <section className="drill-down-section">
        <h4>Coverage Cell</h4>
        <div className="drill-down-record">
          <p className="drill-down-record__observation">{cell.detail}</p>
          <div className="drill-down-record__meta">
            <span>{row.alias}</span>
            <span>{cell.label}</span>
            <span>{formatStatusLabel(cell.state)}</span>
            <span>{cell.count} signal{cell.count === 1 ? "" : "s"}</span>
          </div>
        </div>
      </section>

      <section className="drill-down-section">
        <h4>Student Signal</h4>
        <div className="drill-down-stats-grid">
          <div className="drill-down-stat">
            <span className="drill-down-stat__value">{row.thread_count}</span>
            <span className="drill-down-stat__label">Open threads</span>
          </div>
          <div className="drill-down-stat">
            <span className="drill-down-stat__value">{row.eal_flag ? "Yes" : "No"}</span>
            <span className="drill-down-stat__label">EAL</span>
          </div>
          <div className="drill-down-stat">
            <span className="drill-down-stat__value">{row.family_language ?? "—"}</span>
            <span className="drill-down-stat__label">Family language</span>
          </div>
          <div className="drill-down-stat">
            <span className="drill-down-stat__value">{row.support_tags?.length ?? 0}</span>
            <span className="drill-down-stat__label">Support tags</span>
          </div>
        </div>
      </section>

      <div className="drill-down-actions">
        <ActionButton size="sm" variant="secondary" onClick={() => onOpenStudent?.(row.alias)}>
          Open Student Detail
        </ActionButton>
        {targetTab === "family-message" && canOpenTarget ? (
          <ActionButton
            size="sm"
            variant="secondary"
            onClick={() => {
              onMessagePrefill?.({
                student_ref: row.alias,
                reason: row.priority_reason ?? cell.detail,
                message_type: "routine_update",
              });
              onNavigate("family-message");
            }}
          >
            Start Message
          </ActionButton>
        ) : null}
        {targetTab === "log-intervention" && canOpenTarget ? (
          <ActionButton
            size="sm"
            variant="secondary"
            onClick={() => {
              onInterventionPrefill?.({
                student_ref: row.alias,
                suggested_action: cell.detail,
                reason: row.priority_reason ?? cell.detail,
              });
              onNavigate("log-intervention");
            }}
          >
            Log Follow-up
          </ActionButton>
        ) : null}
        {targetTab && targetTab !== "family-message" && targetTab !== "log-intervention" && canOpenTarget ? (
          <ActionButton size="sm" variant="secondary" onClick={() => onNavigate(targetTab)}>
            Open {shortLabelForTarget(targetTab)}
          </ActionButton>
        ) : null}
      </div>
    </>
  );
}

interface TransitionRiskViewProps {
  risk: OperatingDashboardTransitionRisk;
  onNavigate: (target: NavTarget) => void;
  activeRole?: ClassroomRole;
}

export function TransitionRiskView({ risk, onNavigate, activeRole }: TransitionRiskViewProps) {
  const targetTab = targetFromString(risk.target_tab);
  const canOpenTarget = targetTab ? isTargetVisibleForRole(targetTab, activeRole) : false;

  return (
    <>
      <section className="drill-down-section">
        <h4>Transition Risk</h4>
        <div className="drill-down-record">
          <p className="drill-down-record__observation">{risk.reason}</p>
          <div className="drill-down-record__meta">
            <span>{risk.time_slot}</span>
            <span>{risk.activity}</span>
            <span>{formatStatusLabel(risk.level)}</span>
          </div>
        </div>
      </section>

      <section className="drill-down-section">
        <h4>Mitigation</h4>
        <p className="drill-down-mitigation-text">{risk.mitigation}</p>
      </section>

      {risk.watchpoints.length > 0 ? (
        <section className="drill-down-section">
          <h4>Plan Watchpoints</h4>
          <ul className="drill-down-list">
            {risk.watchpoints.map((watchpoint, index) => <li key={index}>{watchpoint}</li>)}
          </ul>
        </section>
      ) : null}

      {targetTab && canOpenTarget ? (
        <div className="drill-down-actions">
          <ActionButton size="sm" variant="secondary" onClick={() => onNavigate(targetTab)}>
            Open {shortLabelForTarget(targetTab)}
          </ActionButton>
        </div>
      ) : null}
    </>
  );
}
