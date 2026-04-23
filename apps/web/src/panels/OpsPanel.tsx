import { useMemo } from "react";
import { useApp } from "../AppContext";
import {
  TOOL_META,
  TOOLS_BY_TAB,
  defaultToolForTab,
  type ActiveTool,
} from "../appReducer";
import OpsSectionHint from "../components/OpsSectionHint";
import InterventionPanel from "./InterventionPanel";
import EABriefingPanel from "./EABriefingPanel";
import EALoadPanel from "./EALoadPanel";
import SurvivalPacketPanel from "./SurvivalPacketPanel";
import type { InterventionPrefill } from "../types";

const OPS_TOOLS = TOOLS_BY_TAB.ops ?? ([
  "log-intervention",
  "ea-briefing",
  "ea-load",
  "survival-packet",
] as ActiveTool[]);

interface Props {
  prefillIntervention?: InterventionPrefill | null;
}

/**
 * OpsPanel — standalone Ops page that hosts the four adult-coordination
 * tools on one surface. Tomorrow Plan and Complexity Forecast moved to
 * the Tomorrow page as part of the 2026-04-23 navigation reorg.
 */
export default function OpsPanel({ prefillIntervention }: Props) {
  const { activeTool, setActiveTool } = useApp();
  const currentTool = useMemo<ActiveTool>(
    () => (activeTool && OPS_TOOLS.includes(activeTool) ? activeTool : defaultToolForTab("ops") ?? "log-intervention"),
    [activeTool],
  );

  return (
    <div className="ops-page" id="ops-top" data-active-tool={currentTool}>
      <OpsSectionHint />

      <div id="ops-tools" className="page-tool-switcher" role="tablist" aria-label="Ops tool">
        {OPS_TOOLS.map((tool) => (
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

      <div id="ops-workspace" className="page-tool-surface">
        {currentTool === "log-intervention" ? (
          <InterventionPanel prefill={prefillIntervention ?? null} />
        ) : null}
        {currentTool === "ea-briefing" ? <EABriefingPanel /> : null}
        {currentTool === "ea-load" ? <EALoadPanel /> : null}
        {currentTool === "survival-packet" ? <SurvivalPacketPanel /> : null}
      </div>
    </div>
  );
}
