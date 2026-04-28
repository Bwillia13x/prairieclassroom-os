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
import PageHero, {
  type PageHeroMetricGroup,
  type PageHeroStatusRow,
} from "../components/shared/PageHero";
import OperationalPreview, {
  type OperationalPreviewGroup,
} from "../components/shared/OperationalPreview";
import SectionMarker from "../components/shared/SectionMarker";
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

  // Metric groups split readiness across the two tools so the user
  // sees both pieces of state at a glance — Plan vs. Forecast — instead
  // of three flat figures whose relationship is implicit.
  const heroMetricGroups: PageHeroMetricGroup[] = [
    {
      label: "Plan",
      metrics: [
        {
          value: latestPlan ? "Ready" : "Needed",
          label: "Status",
          tone: latestPlan ? "success" : "warning",
        },
        { value: planPriorityCount, label: "Priorities" },
      ],
    },
    {
      label: "Forecast",
      metrics: [
        {
          value: latestForecast ? "Ready" : "Pending",
          label: "Status",
          tone: latestForecast ? "success" : "neutral",
        },
        { value: forecastBlockCount || "—", label: "Blocks" },
      ],
    },
    {
      label: "Carry-forward",
      metrics: [
        {
          value: tomorrowNotes.length,
          label: "Queued",
          tone: tomorrowNotes.length > 0 ? "warning" : undefined,
        },
        {
          value: unresolvedFollowups,
          label: "Open follow-ups",
          tone: unresolvedFollowups > 0 ? "warning" : undefined,
        },
      ],
    },
  ];

  const heroStatusRows: PageHeroStatusRow[] = [
    {
      label: "Active tool",
      value: currentTool === "tomorrow-plan" ? "Tomorrow Plan" : "Complexity Forecast",
      tone: "neutral",
    },
  ];

  // Tool-aware operational preview — Plan emphasizes priorities + EA
  // moves, Forecast emphasizes block-by-block risk and coverage gaps.
  // This is the "strongly differentiated tool states" the plan calls
  // for, surfaced as a compact strip below the hero.
  const planPreviewGroups: OperationalPreviewGroup[] =
    currentTool === "tomorrow-plan"
      ? [
          {
            eyebrow: "Planning order",
            evidence: [
              { label: "Watchpoints", meta: latestPlan ? `${latestPlan.support_priorities.length} priorities` : "—" },
              { label: "Carry-forward", meta: `${tomorrowNotes.length} queued` },
              { label: "Open follow-ups", meta: `${unresolvedFollowups}` },
            ],
          },
          {
            eyebrow: "Support priorities",
            chips: (latestPlan?.support_priorities ?? [])
              .slice(0, 6)
              .map((priority) => ({
                label: priority.student_ref,
                tone: "watch" as const,
                meta: priority.suggested_action.split(" ").slice(0, 3).join(" "),
                title: priority.reason,
              })),
          },
        ]
      : [
          {
            eyebrow: "Block risk",
            evidence: [
              { label: "Total blocks", meta: forecastBlockCount > 0 ? String(forecastBlockCount) : "—" },
              {
                label: "High-risk blocks",
                meta: latestForecast
                  ? String(
                      latestForecast.blocks.filter((b) => b.level === "high").length,
                    )
                  : "—",
              },
              {
                label: "Forecast date",
                meta: latestForecast?.forecast_date ?? "—",
              },
            ],
          },
          {
            eyebrow: "Coverage cues",
            chips: (latestForecast?.blocks ?? [])
              .filter((b) => b.level === "high" || b.level === "medium")
              .slice(0, 5)
              .map((block) => ({
                label: block.activity || block.time_slot || "Block",
                tone: block.level === "high" ? "danger" : "watch",
                meta: block.time_slot,
              })),
          },
        ];

  const planHasPreview =
    currentTool === "tomorrow-plan"
      ? !!latestPlan || tomorrowNotes.length > 0 || unresolvedFollowups > 0
      : !!latestForecast;

  return (
    <div className="multi-tool-page tomorrow-page" id="tomorrow-top" data-active-tool={currentTool}>
      <PageHero
        id="tomorrow-hub"
        ariaLabel="Tomorrow planning hub"
        eyebrow="Tomorrow command"
        title="Plan, forecast, and carry-forward queue"
        description={
          <>
            Start with the support plan, confirm block risk, then fold queued notes into
            the first moves for the next school day.
          </>
        }
        metricGroups={heroMetricGroups}
        statusRows={heroStatusRows}
        variant="tomorrow"
        density="utility"
      />

      {planHasPreview ? (
        <OperationalPreview
          ariaLabel="Tomorrow operational preview"
          id="tomorrow-preview"
          groups={planPreviewGroups}
        />
      ) : null}

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

      <SectionMarker
        number="02"
        title="Stage tomorrow"
        subtitle="What to stage. What to forecast. What lands tomorrow."
      />

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
