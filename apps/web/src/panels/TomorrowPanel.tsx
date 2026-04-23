import { useMemo } from "react";
import { useApp } from "../AppContext";
import {
  TOOL_META,
  TOOLS_BY_TAB,
  defaultToolForTab,
  type ActiveTool,
} from "../appReducer";
import TomorrowPlanPanel from "./TomorrowPlanPanel";
import ForecastPanel from "./ForecastPanel";
import TomorrowChip from "../components/TomorrowChip";
import type { FamilyMessagePrefill, InterventionPrefill } from "../types";

const TOMORROW_TOOLS = TOOLS_BY_TAB.tomorrow ?? (["tomorrow-plan", "complexity-forecast"] as ActiveTool[]);

const TOMORROW_TOOL_COPY: Partial<Record<ActiveTool, { kicker: string; description: string }>> = {
  "tomorrow-plan": {
    kicker: "01 Planning order",
    description: "Watchpoints, priorities, EA moves, prep, and family follow-ups.",
  },
  "complexity-forecast": {
    kicker: "02 Block risk",
    description: "Block-by-block risk before coverage and transition decisions.",
  },
};

interface Props {
  onFollowupClick: (prefill: FamilyMessagePrefill) => void;
  onInterventionClick: (prefill: InterventionPrefill) => void;
}

/**
 * TomorrowPanel — integrated planning hub that combines the Tomorrow
 * Plan and Complexity Forecast flows on one page. All "Save to
 * Tomorrow" actions from other panels now route here; the chip-tray
 * `TomorrowNote` queue is treated as carry-forward intent for the next
 * school day.
 */
export default function TomorrowPanel({ onFollowupClick, onInterventionClick }: Props) {
  const { activeTool, setActiveTool, tomorrowNotes, removeTomorrowNote, latestTodaySnapshot } = useApp();
  const currentTool = useMemo<ActiveTool>(
    () => (activeTool && TOMORROW_TOOLS.includes(activeTool) ? activeTool : defaultToolForTab("tomorrow") ?? "tomorrow-plan"),
    [activeTool],
  );
  const latestPlan = latestTodaySnapshot?.latest_plan ?? null;
  const latestForecast = latestTodaySnapshot?.latest_forecast ?? null;
  const unresolvedFollowups = latestTodaySnapshot?.debt_register.item_count_by_category.stale_followup ?? 0;
  const planPriorityCount = latestPlan?.support_priorities.length ?? 0;
  const forecastBlockCount = latestForecast?.blocks.length ?? 0;

  function statusForTool(tool: ActiveTool) {
    if (tool === "tomorrow-plan") {
      return latestPlan ? `${planPriorityCount} priorities ready` : "Plan not generated";
    }
    if (tool === "complexity-forecast") {
      return latestForecast ? `${forecastBlockCount} blocks forecast` : "Forecast not generated";
    }
    return "Ready";
  }

  return (
    <div className="tomorrow-page" id="tomorrow-top" data-active-tool={currentTool}>
      <section
        className="tomorrow-planning-hub"
        id="tomorrow-hub"
        aria-label="Morning-ready plan, forecast, and carry-forward queue"
      >
        <div className="tomorrow-planning-hub__copy">
          <span className="tomorrow-planning-hub__eyebrow">Tomorrow command</span>
          <h2>Plan, forecast, and carry-forward queue</h2>
          <p>
            Start with the support plan, confirm block risk, then fold queued notes into the first moves for the next school day.
          </p>
        </div>
        <div className="tomorrow-planning-hub__metrics" aria-label="Tomorrow readiness summary">
          <span className="tomorrow-planning-hub__metric">
            <strong>{tomorrowNotes.length}</strong>
            <span>Queued notes</span>
          </span>
          <span className="tomorrow-planning-hub__metric">
            <strong>{latestPlan ? "Ready" : "Needed"}</strong>
            <span>{latestPlan ? `${planPriorityCount} priorities` : "Support plan"}</span>
          </span>
          <span className="tomorrow-planning-hub__metric">
            <strong>{latestForecast ? `${forecastBlockCount}` : "Open"}</strong>
            <span>{latestForecast ? "Forecast blocks" : `${unresolvedFollowups} follow-ups`}</span>
          </span>
        </div>
      </section>

      {tomorrowNotes.length > 0 ? (
        <section className="tomorrow-queue-strip" aria-label="Queued Tomorrow Plan items">
          <div className="tomorrow-queue-strip__copy">
            <span>Queued for tomorrow</span>
            <strong>{tomorrowNotes.length} carry-forward {tomorrowNotes.length === 1 ? "item" : "items"}</strong>
          </div>
          <TomorrowChip
            notes={tomorrowNotes}
            onRemove={removeTomorrowNote}
            onReviewAll={() => setActiveTool("tomorrow-plan")}
          />
        </section>
      ) : null}

      <div id="tomorrow-tools" className="page-tool-switcher page-tool-switcher--cards" role="tablist" aria-label="Tomorrow tool">
        {TOMORROW_TOOLS.map((tool) => {
          const copy = TOMORROW_TOOL_COPY[tool];
          return (
            <button
              key={tool}
              type="button"
              role="tab"
              aria-selected={currentTool === tool}
              className={`page-tool-switcher__btn${currentTool === tool ? " page-tool-switcher__btn--active" : ""}`}
              onClick={() => setActiveTool(tool)}
            >
              <span className="page-tool-switcher__btn-kicker">{copy?.kicker ?? "Planning tool"}</span>
              <span className="page-tool-switcher__btn-title">{TOOL_META[tool].label}</span>
              <span className="page-tool-switcher__btn-description">{copy?.description ?? "Open this planning surface."}</span>
              <span className="page-tool-switcher__btn-status">{statusForTool(tool)}</span>
            </button>
          );
        })}
      </div>

      <div id="tomorrow-workspace" className="page-tool-surface">
        {currentTool === "tomorrow-plan" ? (
          <TomorrowPlanPanel onFollowupClick={onFollowupClick} onInterventionClick={onInterventionClick} />
        ) : null}
        {currentTool === "complexity-forecast" ? <ForecastPanel /> : null}
      </div>
    </div>
  );
}
