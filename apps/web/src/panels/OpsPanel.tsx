import { useMemo } from "react";
import { useApp } from "../AppContext";
import {
  TOOL_META,
  TOOLS_BY_TAB,
  defaultToolForTab,
  type ActiveTool,
} from "../appReducer";
import OpsWorkflowStepper from "../components/OpsWorkflowStepper";
import InterventionPanel from "./InterventionPanel";
import EABriefingPanel from "./EABriefingPanel";
import EALoadPanel from "./EALoadPanel";
import SurvivalPacketPanel from "./SurvivalPacketPanel";
import type { InterventionPrefill } from "../types";
import "../styles/page-tool-switcher.css";
import "../styles/multi-tool-page.css";
import "./OpsPanel.css";

const OPS_TOOLS = TOOLS_BY_TAB.ops ?? ([
  "log-intervention",
  "ea-briefing",
  "ea-load",
  "survival-packet",
] as ActiveTool[]);
const OPS_TOOL_TITLE: Partial<Record<ActiveTool, string>> = {
  "log-intervention": "Capture intervention notes",
  "ea-briefing": "Brief the EAs in the room",
  "ea-load": "Balance EA load across the day",
  "survival-packet": "Stage the substitute handoff",
};

interface Props {
  prefillIntervention?: InterventionPrefill | null;
}

/**
 * OpsPanel — standalone Ops page that hosts the four adult-coordination
 * tools on one surface.
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

  const activeTitle = OPS_TOOL_TITLE[currentTool] ?? TOOL_META[currentTool]?.label ?? "Active workspace";
  const activeStatus = statusForTool(currentTool);

  return (
    <section className="workspace-page multi-tool-page ops-page" id="ops-top" data-active-tool={currentTool}>
      <section className="ops-command-workflow" aria-labelledby="ops-command-title">
        <header className="ops-command-workflow__header">
          <div className="ops-command-workflow__identity">
            <span className="ops-command-workflow__eyebrow">Ops command</span>
            <h1 id="ops-command-title">Coordinate the adults without losing the thread.</h1>
            <p>
              Capture today&apos;s evidence, brief the adults in the room, balance coverage,
              and package the handoff from one operational surface.
            </p>
          </div>

          <dl className="ops-command-workflow__metrics" aria-label="Ops readiness">
            <div>
              <dt>Threads</dt>
              <dd>{watchThreads}</dd>
            </div>
            <div>
              <dt>EA moves</dt>
              <dd>{eaActions || "—"}</dd>
            </div>
            <div>
              <dt>Blocks</dt>
              <dd>{forecastBlocks || "—"}</dd>
            </div>
          </dl>

          <aside className="ops-command-workflow__queue" aria-label="Ops coordination queue">
            <span className="ops-command-workflow__queue-value">{staleFollowups}</span>
            <span className="ops-command-workflow__queue-label">
              {staleFollowups === 1 ? "Follow-up" : "Follow-ups"}
            </span>
            <span className="ops-command-workflow__queue-note">Require coordination</span>
            <button
              type="button"
              className="ops-command-workflow__queue-link"
              onClick={() => setActiveTool("log-intervention")}
            >
              View queue
            </button>
          </aside>
        </header>

        <OpsWorkflowStepper activeTool={currentTool} variant="compact" />

        <section className="ops-workflow-stage" aria-label="Active ops workflow">
          <header className="ops-workflow-stage__header">
            <span className="ops-workflow-stage__eyebrow">Active workflow</span>
            <div>
              <h2>{activeTitle}</h2>
              <p>
                {watchThreads} thread{watchThreads === 1 ? "" : "s"} ·{" "}
                {eaActions || "no"} EA move{eaActions === 1 ? "" : "s"} ·{" "}
                {forecastBlocks || "no"} block{forecastBlocks === 1 ? "" : "s"} ·{" "}
                {activeStatus}
              </p>
            </div>
          </header>

          <div id="ops-workspace" className="page-tool-surface ops-workflow-surface">
            {currentTool === "log-intervention" ? (
              <InterventionPanel prefill={prefillIntervention ?? null} />
            ) : null}
            {currentTool === "ea-briefing" ? <EABriefingPanel /> : null}
            {currentTool === "ea-load" ? <EALoadPanel /> : null}
            {currentTool === "survival-packet" ? <SurvivalPacketPanel /> : null}
          </div>
        </section>
      </section>
    </section>
  );
}
