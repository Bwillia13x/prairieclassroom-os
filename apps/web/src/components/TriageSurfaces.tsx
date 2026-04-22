import { useEffect, useMemo, useState } from "react";
import type { DrillDownContext, EALoadBlock, PanelStatus, PanelStatusState, ScheduleBlockInput, StudentThread, TodaySnapshot, TransitionWatchpoint, ComplexityBlock } from "../types";
import { TAB_META, type ActiveTab, type ClassroomRole, isTabVisibleForRole } from "../appReducer";
import { roleCapabilities } from "../hooks/useRole";
import SectionIcon from "./SectionIcon";
import "./TriageSurfaces.css";

type AtlasColumnId = "message" | "intervention" | "plan" | "forecast" | "ea" | "sub";
type AtlasCellState = PanelStatusState | "blocked";

interface AtlasCell {
  state: AtlasCellState;
  detail: string;
  count: number;
  targetTab: ActiveTab | null;
  panelStatus?: PanelStatus;
}

const ACTION_COLUMNS: Array<{
  id: AtlasColumnId;
  label: string;
  panelIds: string[];
  icon: React.ComponentProps<typeof SectionIcon>["name"];
}> = [
  { id: "message", label: "Message", panelIds: ["family-message"], icon: "mail" },
  { id: "intervention", label: "Intervention", panelIds: ["log-intervention"], icon: "alert" },
  { id: "plan", label: "Plan", panelIds: ["tomorrow-plan"], icon: "pencil" },
  { id: "forecast", label: "Forecast", panelIds: ["complexity-forecast"], icon: "clock" },
  { id: "ea", label: "EA", panelIds: ["ea-briefing", "ea-load"], icon: "grid" },
  { id: "sub", label: "Sub", panelIds: ["survival-packet"], icon: "check" },
];

const TARGET_TAB_BY_CATEGORY: Record<string, ActiveTab> = {
  unapproved_message: "family-message",
  family_followup: "family-message",
  stale_followup: "log-intervention",
  support_priority: "tomorrow-plan",
  ea_action: "ea-briefing",
};

function panelStateRank(state: AtlasCellState): number {
  switch (state) {
    case "needs_action":
      return 5;
    case "stale":
      return 4;
    case "draft_ready":
      return 3;
    case "fresh":
      return 2;
    case "blocked":
      return 1;
    case "not_applicable":
      return 0;
  }
}

function isActiveTab(value: string | null | undefined): value is ActiveTab {
  return typeof value === "string" && value in TAB_META;
}

function tabFromPanelId(panelId: string | null | undefined): ActiveTab | null {
  return isActiveTab(panelId) ? panelId : null;
}

function combinePanelStatuses(
  statuses: PanelStatus[],
  role: ClassroomRole,
): AtlasCell {
  if (statuses.length === 0) {
    return {
      state: "not_applicable",
      detail: "No classroom signal here yet",
      count: 0,
      targetTab: null,
    };
  }

  const visible = statuses.filter((status) => {
    const tab = tabFromPanelId(status.panel_id);
    return tab ? isTabVisibleForRole(tab, role) : false;
  });
  if (visible.length === 0) {
    return {
      state: "blocked",
      detail: "This workflow is hidden for the current role",
      count: statuses.reduce((total, status) => total + status.pending_count, 0),
      targetTab: null,
    };
  }

  const chosen = [...visible].sort((a, b) => {
    const rankDiff = panelStateRank(b.state) - panelStateRank(a.state);
    if (rankDiff !== 0) return rankDiff;
    if (b.pending_count !== a.pending_count) return b.pending_count - a.pending_count;
    return a.label.localeCompare(b.label);
  })[0];

  return {
    state: chosen.state,
    detail: visible.length > 1
      ? visible.map((status) => `${status.label}: ${status.detail}`).join(" · ")
      : chosen.detail,
    count: visible.reduce((total, status) => total + status.pending_count, 0),
    targetTab: tabFromPanelId(chosen.panel_id),
    panelStatus: chosen,
  };
}

function threadCellForColumn(thread: StudentThread, column: AtlasColumnId): AtlasCell {
  const matchingActions = thread.actions.filter((action) => {
    const target = TARGET_TAB_BY_CATEGORY[action.category] ?? tabFromPanelId(action.target_tab);
    switch (column) {
      case "message":
        return target === "family-message";
      case "intervention":
        return target === "log-intervention";
      case "plan":
        return target === "tomorrow-plan";
      case "forecast":
        return target === "complexity-forecast";
      case "ea":
        return target === "ea-briefing" || target === "ea-load";
      case "sub":
        return target === "survival-packet";
    }
  });

  if (matchingActions.length === 0) {
    return {
      state: "not_applicable",
      detail: "No current thread",
      count: 0,
      targetTab: null,
    };
  }

  const chosen = [...matchingActions].sort((a, b) => {
    const rankDiff = panelStateRank(b.state) - panelStateRank(a.state);
    if (rankDiff !== 0) return rankDiff;
    return b.count - a.count;
  })[0];
  const target = TARGET_TAB_BY_CATEGORY[chosen.category] ?? tabFromPanelId(chosen.target_tab);

  return {
    state: chosen.state,
    detail: matchingActions.map((action) => action.label).join(" · "),
    count: matchingActions.reduce((total, action) => total + action.count, 0),
    targetTab: target,
  };
}

export function pickRecommendedPanelStatus(
  statuses: PanelStatus[],
  role: ClassroomRole,
): PanelStatus | null {
  const visible = statuses.filter((status) => {
    const tab = tabFromPanelId(status.panel_id);
    return tab ? isTabVisibleForRole(tab, role) : false;
  });
  if (visible.length === 0) return null;

  return [...visible].sort((a, b) => {
    const rankDiff = panelStateRank(b.state) - panelStateRank(a.state);
    if (rankDiff !== 0) return rankDiff;
    if (b.pending_count !== a.pending_count) return b.pending_count - a.pending_count;
    return a.label.localeCompare(b.label);
  })[0] ?? null;
}

interface ActionAtlasProps {
  snapshot: TodaySnapshot | null;
  activeRole: ClassroomRole;
  onTabChange: (tab: ActiveTab) => void;
  onOpenContext?: (context: DrillDownContext) => void;
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

export function ActionAtlas({
  snapshot,
  activeRole,
  onTabChange,
  onOpenContext,
  onInterventionPrefill,
  onMessagePrefill,
}: ActionAtlasProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setCollapsed(false);
      return;
    }
    const media = window.matchMedia("(max-width: 820px)");
    const sync = () => setCollapsed(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const capability = roleCapabilities(activeRole);
  const statusMap = useMemo(
    () => new Map((snapshot?.panel_statuses ?? []).map((status) => [status.panel_id, status])),
    [snapshot?.panel_statuses],
  );
  const studentRows = useMemo(() => {
    const threads = snapshot?.student_threads ?? [];
    const activeThreads = threads.filter((thread) => thread.thread_count > 0 || thread.pending_action_count > 0);
    return (activeThreads.length > 0 ? activeThreads : threads).slice(0, 5);
  }, [snapshot?.student_threads]);
  const activeThreadCount = useMemo(
    () => (snapshot?.student_threads ?? []).filter((thread) => thread.thread_count > 0 || thread.pending_action_count > 0).length,
    [snapshot?.student_threads],
  );

  const summaryRows = useMemo(
    () => [
      {
        id: "room",
        label: "Room-wide",
        description: snapshot ? `${snapshot.debt_register.items.length} open classroom threads` : "Loading room-wide triage",
      },
      {
        id: "handoff",
        label: "Morning handoff",
        description: snapshot?.latest_plan
          ? "Plan, forecast, and handoff surfaces for tomorrow morning"
          : "Tomorrow-facing surfaces unlock once the support plan exists",
      },
    ],
    [snapshot],
  );

  const recommended = useMemo(
    () => pickRecommendedPanelStatus(snapshot?.panel_statuses ?? [], activeRole),
    [snapshot?.panel_statuses, activeRole],
  );
  const checkFirstThread = studentRows[0] ?? null;

  function getSummaryCell(rowId: string, columnId: AtlasColumnId): AtlasCell {
    const statuses: PanelStatus[] = [];
    if (rowId === "room") {
      if (columnId === "message" && statusMap.get("family-message")) statuses.push(statusMap.get("family-message")!);
      if (columnId === "intervention" && statusMap.get("log-intervention")) statuses.push(statusMap.get("log-intervention")!);
      if (columnId === "plan" && statusMap.get("tomorrow-plan")) statuses.push(statusMap.get("tomorrow-plan")!);
      if (columnId === "forecast" && statusMap.get("complexity-forecast")) statuses.push(statusMap.get("complexity-forecast")!);
      if (columnId === "ea") {
        if (statusMap.get("ea-briefing")) statuses.push(statusMap.get("ea-briefing")!);
        if (statusMap.get("ea-load")) statuses.push(statusMap.get("ea-load")!);
      }
      if (columnId === "sub" && statusMap.get("survival-packet")) statuses.push(statusMap.get("survival-packet")!);
      return combinePanelStatuses(statuses, activeRole);
    }

    if (rowId === "handoff") {
      if (columnId === "plan" && statusMap.get("tomorrow-plan")) {
        statuses.push(statusMap.get("tomorrow-plan")!);
      }
      if (columnId === "forecast" && statusMap.get("complexity-forecast")) {
        statuses.push(statusMap.get("complexity-forecast")!);
      }
      if (columnId === "ea") {
        if (statusMap.get("ea-briefing")) statuses.push(statusMap.get("ea-briefing")!);
        if (statusMap.get("ea-load")) statuses.push(statusMap.get("ea-load")!);
      }
      if (columnId === "sub" && statusMap.get("survival-packet")) {
        statuses.push(statusMap.get("survival-packet")!);
      }
      if (statuses.length === 0) {
        return {
          state: "not_applicable",
          detail: "This handoff lane is not part of the current morning chain",
          count: 0,
          targetTab: null,
        };
      }
      return combinePanelStatuses(statuses, activeRole);
    }

    return {
      state: "not_applicable",
      detail: "No signal",
      count: 0,
      targetTab: null,
    };
  }

  function handleCellSelect(thread: StudentThread | null, cell: AtlasCell) {
    if (!cell.targetTab || cell.state === "blocked" || cell.state === "not_applicable") return;

    if (thread && cell.targetTab === "family-message" && onMessagePrefill) {
      onMessagePrefill({
        student_ref: thread.alias,
        reason: thread.priority_reason ?? "Follow up from the Action Atlas",
        message_type: "routine_update",
      });
    }

    if (thread && cell.targetTab === "log-intervention" && onInterventionPrefill) {
      onInterventionPrefill({
        student_ref: thread.alias,
        suggested_action: "Log a follow-up touchpoint",
        reason: thread.priority_reason ?? "Open intervention thread from the Action Atlas",
      });
    }

    if (cell.panelStatus) {
      onOpenContext?.({ type: "panel-status", status: cell.panelStatus });
    }
    onTabChange(cell.targetTab);
  }

  if (!snapshot) {
    return (
      <section className="action-atlas action-atlas--loading" aria-label="Action Atlas">
        <div className="action-atlas__header">
          <div>
            <span className="action-atlas__eyebrow">Shell triage</span>
            <h2 className="action-atlas__title">Action Atlas</h2>
          </div>
          <span className="action-atlas__hint">Loading current classroom signal…</span>
        </div>
        <div className="action-atlas__skeleton" aria-hidden="true">
          <div className="action-atlas__skeleton-row" />
          <div className="action-atlas__skeleton-row" />
          <div className="action-atlas__skeleton-row" />
        </div>
      </section>
    );
  }

  const recommendedTab = recommended ? tabFromPanelId(recommended.panel_id) : null;

  return (
    <section className="action-atlas" aria-label="Action Atlas">
      <div className="action-atlas__header">
        <div>
          <span className="action-atlas__eyebrow">Shell triage</span>
          <h2 className="action-atlas__title">Action Atlas</h2>
        </div>
        <div className="action-atlas__header-actions">
          {!collapsed && recommended && recommendedTab ? (
            <button
              type="button"
              className="action-atlas__recommended"
              onClick={() => onTabChange(recommendedTab)}
            >
              <span>Recommended now</span>
              <strong>{recommended.label}</strong>
            </button>
          ) : null}
          {collapsed ? (
            <button
              type="button"
              className="action-atlas__collapse"
              onClick={() => setCollapsed(false)}
              aria-expanded="false"
              aria-controls="action-atlas-grid"
            >
              Show matrix
            </button>
          ) : (
            <button
              type="button"
              className="action-atlas__collapse"
              onClick={() => setCollapsed(true)}
              aria-expanded="true"
              aria-controls="action-atlas-grid"
            >
              Hide matrix
            </button>
          )}
        </div>
      </div>

      {collapsed ? (
        <div className="action-atlas__compact" data-testid="action-atlas-compact">
          {recommended && recommendedTab ? (
            <button
              type="button"
              className="action-atlas__compact-card action-atlas__compact-card--focus"
              onClick={() => onTabChange(recommendedTab)}
              data-testid="action-atlas-focus-card"
            >
              <span className="action-atlas__compact-label">Focus now</span>
              <strong>{recommended.label}</strong>
              <p>{recommended.detail}</p>
            </button>
          ) : (
            <div className="action-atlas__compact-card action-atlas__compact-card--focus">
              <span className="action-atlas__compact-label">Room pulse</span>
              <strong>Classroom triage</strong>
              <p>{summaryRows[0].description}</p>
            </div>
          )}

          {checkFirstThread ? (
            <button
              type="button"
              className="action-atlas__compact-card"
              onClick={() => onOpenContext?.({ type: "student-thread", thread: checkFirstThread })}
              disabled={!onOpenContext}
              data-testid="action-atlas-check-first-card"
            >
              <span className="action-atlas__compact-label">Check first</span>
              <strong>{checkFirstThread.alias}</strong>
              <p>
                {checkFirstThread.priority_reason
                  ?? (checkFirstThread.thread_count > 0
                    ? `${checkFirstThread.thread_count} active threads`
                    : "No active thread reason yet")}
              </p>
            </button>
          ) : null}

          <div className="action-atlas__compact-stats" aria-label="Shell triage summary">
            <div className="action-atlas__compact-stat">
              <span>Open threads</span>
              <strong>{snapshot.debt_register.items.length}</strong>
            </div>
            <div className="action-atlas__compact-stat">
              <span>Students active</span>
              <strong>{activeThreadCount}</strong>
            </div>
            {!capability.canGenerate ? (
              <div className="action-atlas__compact-stat">
                <span>Access</span>
                <strong>Role filtered</strong>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="action-atlas__meta">
          <span>{snapshot.debt_register.items.length} open classroom threads</span>
          <span>{activeThreadCount} students with active threads</span>
          {!capability.canGenerate ? <span>Role-filtered view</span> : null}
        </div>
      )}

      {!collapsed ? (
        <div id="action-atlas-grid" className="action-atlas__grid">
          <div className="action-atlas__corner">
            <span>Who / what</span>
          </div>
          {ACTION_COLUMNS.map((column) => (
            <div key={column.id} className="action-atlas__column">
              <SectionIcon name={column.icon} className="action-atlas__column-icon" />
              <span>{column.label}</span>
            </div>
          ))}

          {summaryRows.map((row) => (
            <div key={row.id} className="action-atlas__row-group">
              <div className="action-atlas__row-label action-atlas__row-label--summary">
                <strong>{row.label}</strong>
                <span>{row.description}</span>
              </div>
              {ACTION_COLUMNS.map((column) => {
                const cell = getSummaryCell(row.id, column.id);
                return (
                  <button
                    key={`${row.id}-${column.id}`}
                    type="button"
                    className={`action-atlas__cell action-atlas__cell--${cell.state}`}
                    onClick={() => handleCellSelect(null, cell)}
                    disabled={!cell.targetTab || cell.state === "blocked" || cell.state === "not_applicable"}
                    aria-label={`${row.label}, ${column.label}: ${cell.detail}`}
                    title={cell.detail}
                  >
                    <span className="action-atlas__cell-state">{cell.state.replace(/_/g, " ")}</span>
                    <span className="action-atlas__cell-detail">{cell.count > 0 ? `${cell.count}` : "—"}</span>
                  </button>
                );
              })}
            </div>
          ))}

          {studentRows.map((thread) => (
            <div key={thread.alias} className="action-atlas__row-group">
              <button
                type="button"
                className="action-atlas__row-label action-atlas__row-label--student"
                onClick={() => onOpenContext?.({ type: "student-thread", thread })}
              >
                <strong>{thread.alias}</strong>
                <span>
                  {thread.priority_reason ?? (thread.thread_count > 0 ? `${thread.thread_count} active threads` : "No open thread")}
                </span>
              </button>
              {ACTION_COLUMNS.map((column) => {
                const cell = threadCellForColumn(thread, column.id);
                const tabVisible = cell.targetTab ? isTabVisibleForRole(cell.targetTab, activeRole) : true;
                const effectiveCell = !tabVisible
                  ? { ...cell, state: "blocked" as const, targetTab: null, detail: "This workflow is hidden for the current role" }
                  : cell;
                return (
                  <button
                    key={`${thread.alias}-${column.id}`}
                    type="button"
                    className={`action-atlas__cell action-atlas__cell--${effectiveCell.state}`}
                    onClick={() => handleCellSelect(thread, effectiveCell)}
                    disabled={!effectiveCell.targetTab || effectiveCell.state === "blocked" || effectiveCell.state === "not_applicable"}
                    aria-label={`${thread.alias}, ${column.label}: ${effectiveCell.detail}`}
                    title={effectiveCell.detail}
                  >
                    <span className="action-atlas__cell-state">{effectiveCell.state.replace(/_/g, " ")}</span>
                    <span className="action-atlas__cell-detail">{effectiveCell.count > 0 ? `${effectiveCell.count}` : "—"}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

interface StudentCoverageStripProps {
  threads: StudentThread[];
  title?: string;
  selectedAlias?: string | null;
  onSelectThread: (thread: StudentThread) => void;
}

type CoverageFilter = "all" | "urgent" | "stale" | "eal" | "support" | "family";

function filterThread(thread: StudentThread, filter: CoverageFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "urgent":
      return thread.thread_count > 0 || thread.pending_action_count > 0;
    case "stale":
      return thread.last_intervention_days === null || thread.last_intervention_days >= 5;
    case "eal":
      return Boolean(thread.eal_flag);
    case "support":
      return Boolean(thread.support_tags?.length);
    case "family":
      return thread.actions.some((action) => {
        const target = TARGET_TAB_BY_CATEGORY[action.category] ?? tabFromPanelId(action.target_tab);
        return target === "family-message";
      });
  }
}

export function StudentCoverageStrip({
  threads,
  title = "Student coverage",
  selectedAlias,
  onSelectThread,
}: StudentCoverageStripProps) {
  const [filter, setFilter] = useState<CoverageFilter>("all");

  const filterCounts = useMemo(
    () => ({
      all: threads.length,
      urgent: threads.filter((thread) => filterThread(thread, "urgent")).length,
      stale: threads.filter((thread) => filterThread(thread, "stale")).length,
      eal: threads.filter((thread) => filterThread(thread, "eal")).length,
      support: threads.filter((thread) => filterThread(thread, "support")).length,
      family: threads.filter((thread) => filterThread(thread, "family")).length,
    }),
    [threads],
  );
  const visible = useMemo(
    () => threads.filter((thread) => filterThread(thread, filter)).slice(0, 18),
    [threads, filter],
  );

  if (threads.length === 0) return null;

  return (
    <section className="student-coverage" aria-label={title}>
      <div className="student-coverage__header">
        <div>
          <span className="student-coverage__eyebrow">Sticky coverage</span>
          <h3 className="student-coverage__title">{title}</h3>
        </div>
        <span className="student-coverage__meta">{filterCounts.urgent} active threads</span>
      </div>

      <div className="student-coverage__filters" role="toolbar" aria-label="Student coverage filters">
        {([
          ["all", "All"],
          ["urgent", "Urgent"],
          ["stale", "No recent touch"],
          ["eal", "EAL"],
          ["support", "Support cluster"],
          ["family", "Family follow-up"],
        ] as Array<[CoverageFilter, string]>).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`student-coverage__filter${filter === value ? " student-coverage__filter--active" : ""}`}
            onClick={() => setFilter(value)}
          >
            {label}
            <span>{filterCounts[value]}</span>
          </button>
        ))}
      </div>

      <div className="student-coverage__scroll">
        {visible.map((thread) => (
          <button
            key={thread.alias}
            type="button"
            className={`student-coverage__chip${selectedAlias === thread.alias ? " student-coverage__chip--active" : ""}`}
            onClick={() => onSelectThread(thread)}
            aria-label={`${thread.alias}: ${thread.thread_count} active thread${thread.thread_count === 1 ? "" : "s"}`}
          >
            <span className="student-coverage__chip-name">{thread.alias}</span>
            <span className="student-coverage__chip-meta">
              {thread.thread_count > 0 ? `${thread.thread_count} threads` : "stable"}
            </span>
            <span className="student-coverage__chip-flags">
              {thread.eal_flag ? <span>EAL</span> : null}
              {thread.support_tags?.length ? <span>{thread.support_tags[0]}</span> : null}
              {thread.family_language ? <span>{thread.family_language}</span> : null}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

interface CoverageTimelineProps {
  title?: string;
  schedule?: ScheduleBlockInput[] | null;
  forecastBlocks?: ComplexityBlock[] | null;
  eaLoadBlocks?: EALoadBlock[] | null;
  watchpoints?: TransitionWatchpoint[] | null;
  unresolvedFollowups?: number;
  onBlockClick?: (index: number) => void;
}

function matchesWatchpoint(
  block: { time_slot: string; activity: string },
  watchpoint: TransitionWatchpoint,
): boolean {
  const blockText = `${block.time_slot} ${block.activity}`.toLowerCase();
  const watchText = watchpoint.time_or_activity.toLowerCase();
  return blockText.includes(watchText) || watchText.includes(block.activity.toLowerCase());
}

export function CoverageTimeline({
  title = "Coverage timeline",
  schedule,
  forecastBlocks,
  eaLoadBlocks,
  watchpoints,
  unresolvedFollowups = 0,
  onBlockClick,
}: CoverageTimelineProps) {
  const blocks = useMemo(() => {
    if (schedule && schedule.length > 0) return schedule;
    if (forecastBlocks && forecastBlocks.length > 0) {
      return forecastBlocks.map((block) => ({
        time_slot: block.time_slot,
        activity: block.activity,
        ea_available: false,
      }));
    }
    if (eaLoadBlocks && eaLoadBlocks.length > 0) {
      return eaLoadBlocks.map((block) => ({
        time_slot: block.time_slot,
        activity: block.activity,
        ea_available: block.ea_available,
      }));
    }
    return [];
  }, [schedule, forecastBlocks, eaLoadBlocks]);

  if (blocks.length === 0) return null;

  return (
    <section className="coverage-timeline" aria-label={title}>
      <div className="coverage-timeline__header">
        <div>
          <span className="coverage-timeline__eyebrow">Shared timeline</span>
          <h3 className="coverage-timeline__title">{title}</h3>
        </div>
        <div className="coverage-timeline__legend">
          {unresolvedFollowups > 0 ? (
            <span className="coverage-timeline__legend-pill coverage-timeline__legend-pill--followup">
              {unresolvedFollowups} unresolved follow-up{unresolvedFollowups === 1 ? "" : "s"}
            </span>
          ) : null}
          {watchpoints && watchpoints.length > 0 ? (
            <span className="coverage-timeline__legend-pill coverage-timeline__legend-pill--watch">
              {watchpoints.length} watchpoint{watchpoints.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="coverage-timeline__scroll">
        <div className="coverage-timeline__rail" role="list">
          {blocks.map((block, index) => {
            const forecast = forecastBlocks?.[index] ?? null;
            const load = eaLoadBlocks?.[index] ?? null;
            const blockWatchpoints = (watchpoints ?? []).filter((watchpoint) => matchesWatchpoint(block, watchpoint));
            const interactive = typeof onBlockClick === "function";
            const content = (
              <>
                <div className="coverage-timeline__time">{block.time_slot}</div>
                <div className="coverage-timeline__activity">{block.activity}</div>
                <div className="coverage-timeline__signals">
                  {forecast ? (
                    <span className={`coverage-timeline__signal coverage-timeline__signal--forecast coverage-timeline__signal--${forecast.level}`}>
                      Forecast {forecast.level}
                    </span>
                  ) : null}
                  {load ? (
                    <span className={`coverage-timeline__signal coverage-timeline__signal--load coverage-timeline__signal--${load.load_level}`}>
                      EA {load.load_level}
                    </span>
                  ) : null}
                  {blockWatchpoints.length > 0 ? (
                    <span className="coverage-timeline__signal coverage-timeline__signal--watch">
                      {blockWatchpoints.length} watch
                    </span>
                  ) : null}
                  {block.ea_available ? (
                    <span className="coverage-timeline__signal coverage-timeline__signal--ea">
                      EA in block
                    </span>
                  ) : null}
                </div>
              </>
            );
            return (
              <div
                key={`${block.time_slot}-${block.activity}-${index}`}
                className="coverage-timeline__item"
                role="listitem"
              >
                {interactive ? (
                  <button
                    type="button"
                    onClick={() => onBlockClick?.(index)}
                    className="coverage-timeline__card"
                    aria-label={`${block.time_slot}: ${block.activity}`}
                  >
                    {content}
                  </button>
                ) : (
                  <div className="coverage-timeline__card" aria-label={`${block.time_slot}: ${block.activity}`}>
                    {content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
