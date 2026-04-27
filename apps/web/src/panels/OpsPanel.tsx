import { useMemo } from "react";
import { useApp } from "../AppContext";
import {
  TOOL_META,
  TOOLS_BY_TAB,
  defaultToolForTab,
  type ActiveTool,
} from "../appReducer";
import PageHero, {
  type PageHeroPulse,
  type PageHeroMetricGroup,
  type PageHeroStatusRow,
} from "../components/shared/PageHero";
import OperationalPreview, {
  type OperationalPreviewGroup,
} from "../components/shared/OperationalPreview";
import SectionMarker from "../components/shared/SectionMarker";
import ToolSwitcherStepper from "../components/ToolSwitcherStepper";
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

const OPS_TOOL_TITLE: Partial<Record<ActiveTool, string>> = {
  "log-intervention": "Capture intervention notes",
  "ea-briefing": "Brief the EAs in the room",
  "ea-load": "Balance EA load across the day",
  "survival-packet": "Stage the substitute handoff",
};

interface Props {
  prefillIntervention?: InterventionPrefill | null;
}

function derivePulse(
  staleFollowups: number,
  eaActions: number,
  forecastBlocks: number,
): PageHeroPulse {
  if (staleFollowups > 5) {
    return {
      tone: "danger",
      state: "Needs attention",
      meta: `${staleFollowups} stale follow-ups · ${eaActions} EA moves`,
    };
  }
  if (staleFollowups > 0 || eaActions === 0) {
    return {
      tone: "warning",
      state: "Catching up",
      meta: `${staleFollowups} stale · ${eaActions || "no"} EA moves`,
    };
  }
  if (forecastBlocks === 0) {
    return {
      tone: "neutral",
      state: "Plan pending",
      meta: `${eaActions} EA moves staged · forecast empty`,
    };
  }
  return {
    tone: "success",
    state: "Coordinated",
    meta: `${eaActions} EA moves · ${forecastBlocks} blocks staged`,
  };
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

  const pulse = derivePulse(staleFollowups, eaActions, forecastBlocks);
  const activeTitle = OPS_TOOL_TITLE[currentTool] ?? TOOL_META[currentTool]?.label ?? "Active workspace";

  // Group metrics by ops lens — Capture (followups, watch threads),
  // Coordinate (EA moves, blocks). Each group keeps its own eyebrow.
  const heroMetricGroups: PageHeroMetricGroup[] = [
    {
      label: "Capture",
      metrics: [
        {
          value: staleFollowups,
          label: "Follow-ups",
          tone: staleFollowups > 5 ? "danger" : staleFollowups > 0 ? "warning" : undefined,
        },
        { value: watchThreads, label: "Threads" },
      ],
    },
    {
      label: "Coordinate",
      metrics: [
        {
          value: eaActions || "—",
          label: "EA moves",
          tone: eaActions === 0 ? "warning" : undefined,
        },
        { value: forecastBlocks || "—", label: "Blocks" },
      ],
    },
  ];

  const heroStatusRows: PageHeroStatusRow[] = [
    {
      label: "Active tool",
      value: TOOL_META[currentTool]?.label ?? "—",
    },
  ];

  // Tool-aware operational preview — different lens per tool so each
  // ops surface lands on its own evidence shape:
  //   Log Intervention → recent touchpoints
  //   EA Briefing → priority students + watch sections
  //   EA Load → overloaded blocks + recommended moves
  //   Sub Packet → readiness + privacy badges
  const opsPreviewGroups: OperationalPreviewGroup[] = (() => {
    if (currentTool === "log-intervention") {
      return [
        {
          eyebrow: "Recent touchpoints",
          chips: (latestTodaySnapshot?.student_threads ?? [])
            .slice(0, 6)
            .map((thread) => ({
              label: thread.alias,
              tone: thread.pending_action_count > 0 ? "watch" : "neutral",
              meta:
                thread.last_intervention_days !== null
                  ? `${thread.last_intervention_days}d ago`
                  : "no log",
            })),
        },
        {
          eyebrow: "Capture queue",
          evidence: [
            { label: "Stale follow-ups", meta: String(staleFollowups) },
            { label: "Open threads", meta: String(watchThreads) },
          ],
        },
      ];
    }
    if (currentTool === "ea-briefing") {
      return [
        {
          eyebrow: "Priority students",
          chips: (latestTodaySnapshot?.latest_plan?.support_priorities ?? [])
            .slice(0, 6)
            .map((priority) => ({
              label: priority.student_ref,
              tone: "watch" as const,
              meta: priority.suggested_action.split(" ").slice(0, 3).join(" "),
              title: priority.reason,
            })),
        },
        {
          eyebrow: "EA actions staged",
          evidence: (latestTodaySnapshot?.latest_plan?.ea_actions ?? [])
            .slice(0, 4)
            .map((action) => ({
              label: action.description.split(" ").slice(0, 6).join(" "),
              meta: action.timing,
            })),
        },
      ];
    }
    if (currentTool === "ea-load") {
      const blocks = latestTodaySnapshot?.latest_forecast?.blocks ?? [];
      return [
        {
          eyebrow: "Block load",
          evidence: blocks
            .filter((b) => b.level === "high" || b.level === "medium")
            .slice(0, 4)
            .map((block) => ({
              label: block.activity || block.time_slot,
              meta: block.level.toUpperCase(),
            })),
        },
        {
          eyebrow: "Recommended moves",
          chips: blocks
            .filter((b) => b.level === "high")
            .slice(0, 4)
            .map((block) => ({
              label: block.suggested_mitigation
                ? block.suggested_mitigation.split(" ").slice(0, 4).join(" ")
                : block.activity || "Move",
              tone: "danger" as const,
              meta: block.time_slot,
            })),
        },
      ];
    }
    // survival-packet
    return [
      {
        eyebrow: "Handoff readiness",
        evidence: [
          {
            label: "Plan filed",
            meta: latestTodaySnapshot?.latest_plan ? "yes" : "no",
          },
          {
            label: "Forecast filed",
            meta: latestTodaySnapshot?.latest_forecast ? "yes" : "no",
          },
          {
            label: "Watch threads",
            meta: String(watchThreads),
          },
        ],
      },
      {
        eyebrow: "Privacy",
        chips: [
          { label: "Aliases only", tone: "success", meta: "no real names" },
          { label: "Safe-to-share", tone: "success", meta: "redaction on" },
        ],
      },
    ];
  })();

  const opsHasPreview = opsPreviewGroups.some(
    (g) => (g.chips && g.chips.length > 0) || (g.evidence && g.evidence.length > 0),
  );

  return (
    <section className="workspace-page multi-tool-page ops-page" id="ops-top" data-active-tool={currentTool}>
      <PageHero
        id="ops-command"
        ariaLabel="Ops command, intervention capture, adult briefing, and coverage handoff"
        eyebrow="Ops command"
        title="Coordinate the adults without losing the thread."
        description={
          <>
            Capture today's evidence, brief the adults in the room, balance
            coverage, and package the handoff from one operational surface.
          </>
        }
        metricGroups={heroMetricGroups}
        statusRows={heroStatusRows}
        pulse={pulse}
        variant="ops"
      />

      {opsHasPreview ? (
        <OperationalPreview
          ariaLabel="Ops operational preview"
          id="ops-preview"
          groups={opsPreviewGroups}
        />
      ) : null}

      <SectionMarker
        number="02"
        title="Operational lane"
        subtitle="Log, brief, balance, hand off."
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

      <ToolSwitcherStepper
        total={OPS_TOOLS.length}
        activeIndex={OPS_TOOLS.indexOf(currentTool)}
        label="Ops tool progress"
      />

      <section className="multi-tool-workspace-section" aria-label="Active workspace">
        <header className="multi-tool-workspace-section__header">
          <span className="multi-tool-workspace-section__eyebrow">Active workspace</span>
          <span className="multi-tool-workspace-section__title">{activeTitle}</span>
        </header>
        <div id="ops-workspace" className="page-tool-surface">
          {currentTool === "log-intervention" ? (
            <InterventionPanel prefill={prefillIntervention ?? null} />
          ) : null}
          {currentTool === "ea-briefing" ? <EABriefingPanel /> : null}
          {currentTool === "ea-load" ? <EALoadPanel /> : null}
          {currentTool === "survival-packet" ? <SurvivalPacketPanel /> : null}
        </div>
      </section>
    </section>
  );
}
