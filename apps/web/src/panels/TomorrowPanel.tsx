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
  const { activeTool, setActiveTool, tomorrowNotes, removeTomorrowNote } = useApp();
  const currentTool = useMemo<ActiveTool>(
    () => (activeTool && TOMORROW_TOOLS.includes(activeTool) ? activeTool : defaultToolForTab("tomorrow") ?? "tomorrow-plan"),
    [activeTool],
  );

  return (
    <div className="tomorrow-page" id="tomorrow-top" data-active-tool={currentTool}>
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

      <div id="tomorrow-tools" className="page-tool-switcher" role="tablist" aria-label="Tomorrow tool">
        {TOMORROW_TOOLS.map((tool) => (
          <button
            key={tool}
            type="button"
            role="tab"
            aria-selected={currentTool === tool}
            className={`page-tool-switcher__btn${currentTool === tool ? " page-tool-switcher__btn--active" : ""}`}
            onClick={() => setActiveTool(tool)}
          >
            {TOOL_META[tool].label}
          </button>
        ))}
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
