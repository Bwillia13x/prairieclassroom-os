import { useMemo } from "react";
import { useApp } from "../AppContext";
import {
  TOOL_META,
  TOOLS_BY_TAB,
  defaultToolForTab,
  type ActiveTool,
} from "../appReducer";
import PageCommandHub from "../components/PageCommandHub";
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
const OPS_TOOL_COPY: Partial<Record<ActiveTool, { kicker: string; description: string }>> = {
  "log-intervention": {
    kicker: "01 Capture",
    description: "Log what happened while the classroom context is still fresh.",
  },
  "ea-briefing": {
    kicker: "02 Brief",
    description: "Turn the plan into adult-facing coverage and watchpoints.",
  },
  "ea-load": {
    kicker: "03 Balance",
    description: "Spread EA attention across blocks, needs, and students.",
  },
  "survival-packet": {
    kicker: "04 Handoff",
    description: "Package the day for a substitute or coverage handoff.",
  },
};

interface Props {
  prefillIntervention?: InterventionPrefill | null;
}

/**
 * OpsPanel — standalone Ops page that hosts the four adult-coordination
 * tools on one surface. Tomorrow Plan and Complexity Forecast moved to
 * the Tomorrow page as part of the 2026-04-23 navigation reorg.
 */
export default function OpsPanel({ prefillIntervention }: Props) {
  const { activeTool, setActiveTool, latestTodaySnapshot } = useApp();
  const currentTool = useMemo<ActiveTool>(
    () => (activeTool && OPS_TOOLS.includes(activeTool) ? activeTool : defaultToolForTab("ops") ?? "log-intervention"),
    [activeTool],
  );
  const staleFollowups = latestTodaySnapshot?.debt_register.item_count_by_category.stale_followup ?? 0;
  const watchThreads = latestTodaySnapshot?.student_threads?.length ?? 0;
  const eaActions = latestTodaySnapshot?.latest_plan?.ea_actions.length ?? 0;
  const forecastBlocks = latestTodaySnapshot?.latest_forecast?.blocks.length ?? 0;

  function statusForTool(tool: ActiveTool) {
    if (tool === "log-intervention") return `${staleFollowups} follow-ups`;
    if (tool === "ea-briefing") return eaActions ? `${eaActions} EA moves` : "Needs plan";
    if (tool === "ea-load") return forecastBlocks ? `${forecastBlocks} blocks` : "Forecast needed";
    if (tool === "survival-packet") return "Coverage ready";
    return "Ready";
  }

  return (
    <section className="workspace-page multi-tool-page ops-page" id="ops-top" data-active-tool={currentTool}>
      <PageCommandHub
        id="ops-command"
        ariaLabel="Ops command, intervention capture, adult briefing, and coverage handoff"
        eyebrow="Ops command"
        title="Coordinate the adults without losing the thread"
        description="Capture today's evidence, brief the adults in the room, balance coverage, and package the handoff from one operational surface."
        metrics={[
          { value: OPS_TOOLS.length, label: "Tools" },
          { value: staleFollowups, label: "Follow-ups" },
          { value: watchThreads, label: "Threads" },
          { value: eaActions || "...", label: "EA moves" },
          { value: forecastBlocks || "...", label: "Blocks" },
        ]}
        actions={[
          { label: "Log Now", icon: "check", onClick: () => setActiveTool("log-intervention") },
          { label: "EA Brief", icon: "info", onClick: () => setActiveTool("ea-briefing") },
          { label: "Sub Packet", icon: "grid", onClick: () => setActiveTool("survival-packet") },
        ]}
      />

      <div id="ops-tools" className="page-tool-switcher page-tool-switcher--cards" role="tablist" aria-label="Ops tool">
        {OPS_TOOLS.map((tool) => {
          const copy = OPS_TOOL_COPY[tool];
          return (
            <button
              key={tool}
              type="button"
              role="tab"
              aria-selected={currentTool === tool}
              className={`page-tool-switcher__btn${currentTool === tool ? " page-tool-switcher__btn--active" : ""}`}
              onClick={() => setActiveTool(tool)}
            >
              <span className="page-tool-switcher__btn-kicker">{copy?.kicker ?? "Ops lane"}</span>
              <span className="page-tool-switcher__btn-title">{TOOL_META[tool].label}</span>
              <span className="page-tool-switcher__btn-description">{copy?.description ?? "Open this operations surface."}</span>
              <span className="page-tool-switcher__btn-status">{statusForTool(tool)}</span>
            </button>
          );
        })}
      </div>

      <div id="ops-workspace" className="page-tool-surface">
        {currentTool === "log-intervention" ? (
          <InterventionPanel prefill={prefillIntervention ?? null} />
        ) : null}
        {currentTool === "ea-briefing" ? <EABriefingPanel /> : null}
        {currentTool === "ea-load" ? <EALoadPanel /> : null}
        {currentTool === "survival-packet" ? <SurvivalPacketPanel /> : null}
      </div>
    </section>
  );
}
