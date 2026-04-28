import { useId, useMemo } from "react";
import { useApp } from "../AppContext";
import {
  isTabVisibleForRole,
  resolveLegacyPanel,
  type ActiveTool,
  type ClassroomRole,
} from "../appReducer";
import type { PanelStatus, PanelStatusState } from "../types";
import { pickRecommendedPanelStatus } from "./TriageSurfaces";
import "./OpsWorkflowStepper.css";

/**
 * Ordered Ops workflow steps. The 2026-04-23 navigation reorg removed
 * Tomorrow Plan and Complexity Forecast from Ops entirely — they now
 * live on the Tomorrow page. The ops stepper therefore walks only the
 * four adult-coordination tools hosted by the Ops page.
 */
export const OPS_STEPS: ReadonlyArray<{ tool: ActiveTool; label: string; summary: string }> = [
  { tool: "log-intervention", label: "Log Intervention", summary: "Capture the moment" },
  { tool: "ea-briefing", label: "EA Briefing", summary: "Turn into coverage" },
  { tool: "ea-load", label: "EA Load", summary: "Balance attention" },
  { tool: "survival-packet", label: "Sub Packet", summary: "Package the day" },
] as const;

interface Props {
  /** Currently focused tool id — determines which step is highlighted. */
  activeTool: ActiveTool | null;
  variant?: "full" | "compact";
}

function statusRank(state: PanelStatusState): number {
  switch (state) {
    case "needs_action":
      return 4;
    case "stale":
      return 3;
    case "draft_ready":
      return 2;
    case "fresh":
      return 1;
    case "not_applicable":
      return 0;
  }
}

function isOpsToolValue(value: string | null | undefined): value is ActiveTool {
  return Boolean(value) && OPS_STEPS.some((step) => step.tool === value);
}

function pickOpsFocusTool(statuses: PanelStatus[], role: ClassroomRole): ActiveTool | null {
  const recommended = pickRecommendedPanelStatus(
    statuses.filter((status) => isOpsToolValue(status.panel_id)),
    role,
  );
  if (recommended && isOpsToolValue(recommended.panel_id)) {
    return recommended.panel_id;
  }

  const fallback = [...statuses]
    .filter((status) => {
      if (!isOpsToolValue(status.panel_id)) return false;
      const resolved = resolveLegacyPanel(status.panel_id);
      return isTabVisibleForRole(resolved.tab, role);
    })
    .sort((a, b) => {
      const rankDiff = statusRank(b.state) - statusRank(a.state);
      if (rankDiff !== 0) return rankDiff;
      return b.pending_count - a.pending_count;
    })[0];

  return fallback && isOpsToolValue(fallback.panel_id) ? fallback.panel_id : null;
}

function statusBadge(status: PanelStatus | null): string {
  if (!status) return "Waiting";
  if (status.pending_count > 0) return `${status.pending_count}`;
  switch (status.state) {
    case "needs_action":
      return "Now";
    case "stale":
      return "Stale";
    case "draft_ready":
      return "Ready";
    case "fresh":
      return "Fresh";
    case "not_applicable":
      return "—";
  }
}

function statusNote(status: PanelStatus | null): string {
  if (!status) return "Waiting for classroom signal";
  if (status.pending_count > 0) {
    return `${status.pending_count} pending · ${status.detail}`;
  }
  if (status.dependency_state === "waiting") {
    return `Waiting · ${status.detail}`;
  }
  if (status.dependency_state === "stale") {
    return `Depends on stale input · ${status.detail}`;
  }
  return status.detail;
}

/**
 * OpsWorkflowStepper — workflow strip for the four Ops-page tools.
 * Renders inside the Ops page's embedded tool workspace. It no longer
 * appears on the Today page: the reorg removed the compact variant that
 * previously acted as a cross-page nudge.
 */
export default function OpsWorkflowStepper({ activeTool, variant = "full" }: Props) {
  const { setActiveTool, latestTodaySnapshot, activeRole } = useApp();
  const stepperId = useId();
  const statuses = latestTodaySnapshot?.panel_statuses ?? [];
  const statusMap = useMemo(
    () => new Map(statuses.map((status) => [status.panel_id, status])),
    [statuses],
  );
  const focusTool = useMemo(
    () => (activeTool && isOpsToolValue(activeTool) ? activeTool : pickOpsFocusTool(statuses, activeRole)),
    [activeRole, activeTool, statuses],
  );
  const activeIdx = focusTool ? OPS_STEPS.findIndex((step) => step.tool === focusTool) : -1;

  return (
    <nav
      className={`ops-stepper ops-stepper--${variant}`}
      aria-label="Ops workflow"
      data-testid="ops-workflow-stepper"
    >
      <ol className="ops-stepper__list" role="tablist" aria-label="Ops workflow steps">
        {OPS_STEPS.map((step, i) => {
          const status = statusMap.get(step.tool) ?? null;
          const isActive = step.tool === focusTool;
          const isCompleted = activeIdx >= 0 && i < activeIdx;
          const stateClass = isActive
            ? "ops-stepper__step--active"
            : isCompleted
              ? "ops-stepper__step--completed"
              : "";
          const statusClass = status ? `ops-stepper__step--${status.state}` : "ops-stepper__step--waiting";
          const dependencyClass = status ? `ops-stepper__step--dependency-${status.dependency_state}` : "";
          const noteId = `${stepperId}-${step.tool}-note`;
          const content = (
            <>
              <span className="ops-stepper__number">{i + 1}</span>
              <span className="ops-stepper__copy">
                <span className="ops-stepper__label">{step.label}</span>
                {variant === "full" ? (
                  <span id={noteId} className="ops-stepper__note">{step.summary}</span>
                ) : null}
              </span>
              <span
                className={`ops-stepper__badge${status?.pending_count ? " ops-stepper__badge--count" : ""}`}
                aria-label={statusNote(status)}
              >
                {statusBadge(status)}
              </span>
            </>
          );

          return (
            <li
              key={step.tool}
              className={`ops-stepper__step ${stateClass} ${statusClass} ${dependencyClass}`}
              aria-label={isActive ? `Current step ${i + 1}: ${step.label}. ${statusNote(status)}` : undefined}
              aria-current={isActive ? "step" : undefined}
              title={statusNote(status)}
            >
              <button
                type="button"
                role="tab"
                className={isActive ? "ops-stepper__indicator" : "ops-stepper__btn"}
                onClick={() => setActiveTool(step.tool)}
                aria-label={`Step ${i + 1}: ${step.label}`}
                aria-selected={isActive}
                aria-controls="ops-workspace"
                aria-describedby={variant === "full" ? noteId : undefined}
              >
                {content}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
