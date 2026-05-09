import { useMemo } from "react";
import { useApp } from "../AppContext";
import {
  TOOL_META,
  TOOLS_BY_TAB,
  defaultToolForTab,
  type ActiveTool,
} from "../appReducer";
import PageHero, {
  type PageHeroMetricGroup,
  type PageHeroPulse,
  type PageHeroStatusRow,
} from "../components/shared/PageHero";
import OperationalPreview, {
  type OperationalPreviewGroup,
} from "../components/shared/OperationalPreview";
import SectionMarker from "../components/shared/SectionMarker";
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
  const { activeTool, latestTodaySnapshot } = useApp();
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
  const pulse: PageHeroPulse = staleFollowups > 0
    ? {
        tone: "warning",
        state: "Coordination queued",
        meta: `${staleFollowups} follow-up${staleFollowups === 1 ? "" : "s"} · ${watchThreads} threads`,
        live: true,
      }
    : eaActions > 0
      ? {
          tone: "success",
          state: "Coverage staged",
          meta: `${eaActions} EA move${eaActions === 1 ? "" : "s"} · ${forecastBlocks || "no"} blocks`,
        }
      : {
          tone: "neutral",
          state: "Ops ready",
          meta: "Open log · briefing · coverage · handoff",
        };
  const opsMetricGroups: PageHeroMetricGroup[] = [
    {
      label: "Capture",
      metrics: [
        { value: watchThreads, label: "Threads" },
        {
          value: staleFollowups,
          label: "Follow-ups",
          tone: staleFollowups > 0 ? "warning" : undefined,
        },
      ],
    },
    {
      label: "Coverage",
      metrics: [
        { value: eaActions || "—", label: "EA moves" },
        { value: forecastBlocks || "—", label: "Blocks" },
      ],
    },
  ];
  const opsStatusRows: PageHeroStatusRow[] = [
    { label: "Active workflow", value: TOOL_META[currentTool]?.label ?? "—" },
    { label: "Handoff", value: "Sub packet ready", tone: "success" },
  ];
  const opsPreviewGroups: OperationalPreviewGroup[] = [
    {
      eyebrow: "Capture queue",
      evidence: [
        { label: "Open threads", meta: String(watchThreads) },
        { label: "Follow-ups", meta: String(staleFollowups) },
        { label: "Current lane", meta: activeStatus },
      ],
    },
    {
      eyebrow: "Coverage cues",
      chips: (latestTodaySnapshot?.latest_plan?.ea_actions ?? [])
        .slice(0, 4)
        .map((action) => ({
          label: action.student_refs.slice(0, 2).join(", ") || "EA move",
          tone: "accent",
          meta: action.timing,
          title: action.description,
        })),
      evidence: eaActions === 0
        ? [{ label: "EA moves", meta: "needs plan" }]
        : undefined,
    },
    {
      eyebrow: "Handoff path",
      chips: [
        { label: "Log note", tone: currentTool === "log-intervention" ? "accent" : "neutral" },
        { label: "Brief EAs", tone: currentTool === "ea-briefing" ? "accent" : "neutral" },
        { label: "Balance load", tone: currentTool === "ea-load" ? "accent" : "neutral" },
        { label: "Sub packet", tone: currentTool === "survival-packet" ? "accent" : "neutral" },
      ],
    },
  ];

  return (
    <section className="workspace-page multi-tool-page ops-page" id="ops-top" data-active-tool={currentTool}>
      <section className="ops-command-workflow" aria-label="Ops command workflow">
        <PageHero
          id="ops-command"
          ariaLabel="Ops command, adult coordination, and handoff workflows"
          eyebrow="Ops command"
          title="Coordinate the adults without losing the thread."
          description={
            <>
              Capture today&apos;s evidence, brief the adults in the room, balance coverage,
              and package the handoff from one operational surface.
            </>
          }
          metricGroups={opsMetricGroups}
          statusRows={opsStatusRows}
          pulse={pulse}
          variant="ops"
          density="utility"
        />

        <OperationalPreview
          ariaLabel="Ops operational preview"
          id="ops-preview"
          groups={opsPreviewGroups}
          className="ops-operational-preview"
        />

        <SectionMarker
          number="02"
          title="Ops workflow"
          subtitle="Capture the evidence, then move it through briefing, load balance, and substitute handoff."
        />

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
