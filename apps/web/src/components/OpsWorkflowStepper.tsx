import { useId, useMemo } from "react";
import { useApp } from "../AppContext";
import { type ActiveTab, type ClassroomRole, isTabVisibleForRole } from "../appReducer";
import type { PanelStatus, PanelStatusState } from "../types";
import { pickRecommendedPanelStatus } from "./TriageSurfaces";
import "./OpsWorkflowStepper.css";

/**
 * Ordered Ops workflow steps. Single source of truth — consumed by the
 * stepper component and available to tests via the named export.
 */
export const OPS_STEPS: ReadonlyArray<{ tab: ActiveTab; label: string }> = [
  { tab: "log-intervention", label: "Log" },
  { tab: "tomorrow-plan", label: "Plan" },
  { tab: "complexity-forecast", label: "Forecast" },
  { tab: "ea-briefing", label: "EA Brief" },
  { tab: "ea-load", label: "EA Load" },
  { tab: "survival-packet", label: "Sub Packet" },
] as const;

interface Props {
  /** Currently active tab — determines which step is highlighted. */
  activeTab: ActiveTab;
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

function isActiveTabValue(value: string | null | undefined): value is ActiveTab {
  return Boolean(value) && OPS_STEPS.some((step) => step.tab === value);
}

function pickOpsFocusTab(statuses: PanelStatus[], role: ClassroomRole): ActiveTab | null {
  const recommended = pickRecommendedPanelStatus(
    statuses.filter((status) => isActiveTabValue(status.panel_id)),
    role,
  );
  if (recommended && isActiveTabValue(recommended.panel_id)) {
    return recommended.panel_id;
  }

  const fallback = [...statuses]
    .filter((status) => isActiveTabValue(status.panel_id) && isTabVisibleForRole(status.panel_id, role))
    .sort((a, b) => {
      const rankDiff = statusRank(b.state) - statusRank(a.state);
      if (rankDiff !== 0) return rankDiff;
      return b.pending_count - a.pending_count;
    })[0];

  return fallback && isActiveTabValue(fallback.panel_id) ? fallback.panel_id : null;
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
 * OpsWorkflowStepper — stateful workflow strip for daily ops work.
 * On Today it can render in a compact mode; within Ops panels it stays full.
 */
export default function OpsWorkflowStepper({ activeTab, variant = "full" }: Props) {
  const { setActiveTab, latestTodaySnapshot, activeRole } = useApp();
  const stepperId = useId();
  const statuses = latestTodaySnapshot?.panel_statuses ?? [];
  const statusMap = useMemo(
    () => new Map(statuses.map((status) => [status.panel_id, status])),
    [statuses],
  );
  const focusTab = useMemo(
    () => (OPS_STEPS.some((step) => step.tab === activeTab) ? activeTab : pickOpsFocusTab(statuses, activeRole)),
    [activeRole, activeTab, statuses],
  );
  const activeIdx = focusTab ? OPS_STEPS.findIndex((step) => step.tab === focusTab) : -1;

  return (
    <nav
      className={`ops-stepper ops-stepper--${variant}`}
      aria-label="Ops workflow"
      data-testid="ops-workflow-stepper"
    >
      <ol className="ops-stepper__list">
        {OPS_STEPS.map((step, i) => {
          const status = statusMap.get(step.tab) ?? null;
          const isActive = step.tab === focusTab;
          const isCompleted = activeIdx >= 0 && i < activeIdx;
          const stateClass = isActive
            ? "ops-stepper__step--active"
            : isCompleted
              ? "ops-stepper__step--completed"
              : "";
          const statusClass = status ? `ops-stepper__step--${status.state}` : "ops-stepper__step--waiting";
          const dependencyClass = status ? `ops-stepper__step--dependency-${status.dependency_state}` : "";
          const noteId = `${stepperId}-${step.tab}-note`;
          const content = (
            <>
              <span className="ops-stepper__number">{i + 1}</span>
              <span className="ops-stepper__copy">
                <span className="ops-stepper__label">{step.label}</span>
                {variant === "full" ? (
                  <span id={noteId} className="ops-stepper__note">{statusNote(status)}</span>
                ) : null}
              </span>
              <span
                className={`ops-stepper__badge${status?.pending_count ? " ops-stepper__badge--count" : ""}`}
                aria-hidden="true"
              >
                {statusBadge(status)}
              </span>
            </>
          );

          if (!isActive) {
            return (
              <li
                key={step.tab}
                className={`ops-stepper__step ${stateClass} ${statusClass} ${dependencyClass}`}
                title={statusNote(status)}
              >
                <button
                  type="button"
                  className="ops-stepper__btn"
                  onClick={() => setActiveTab(step.tab)}
                  aria-label={`Step ${i + 1}: ${step.label}`}
                  aria-describedby={variant === "full" ? noteId : undefined}
                  aria-current={undefined}
                >
                  {content}
                </button>
              </li>
            );
          }

          return (
            <li
              key={step.tab}
              className={`ops-stepper__step ${stateClass} ${statusClass} ${dependencyClass}`}
              aria-label={`Current step ${i + 1}: ${step.label}. ${statusNote(status)}`}
              aria-current="step"
              title={statusNote(status)}
            >
              <span className="ops-stepper__indicator">
                {content}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
