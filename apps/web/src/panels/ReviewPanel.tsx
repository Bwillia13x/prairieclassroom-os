import { useMemo } from "react";
import { useApp } from "../AppContext";
import {
  TOOL_META,
  TOOLS_BY_TAB,
  defaultToolForTab,
  type ActiveTool,
} from "../appReducer";
import FamilyMessagePanel from "./FamilyMessagePanel";
import SupportPatternsPanel from "./SupportPatternsPanel";
import UsageInsightsPanel from "./UsageInsightsPanel";
import type { FamilyMessagePrefill, InterventionPrefill } from "../types";

const REVIEW_TOOLS = TOOLS_BY_TAB.review ?? ([
  "family-message",
  "support-patterns",
  "usage-insights",
] as ActiveTool[]);

interface Props {
  onFollowupClick: (prefill: FamilyMessagePrefill) => void;
  onInterventionClick: (prefill: InterventionPrefill) => void;
}

/**
 * ReviewPanel — standalone Review page that hosts Family Message,
 * Support Patterns, and Usage Insights inside one page shell. Tool
 * selection persists via `?tool=` and defaults to Family Message.
 */
export default function ReviewPanel({ onFollowupClick, onInterventionClick }: Props) {
  const { activeTool, setActiveTool, messagePrefill } = useApp();
  const currentTool = useMemo<ActiveTool>(
    () => (activeTool && REVIEW_TOOLS.includes(activeTool) ? activeTool : defaultToolForTab("review") ?? "family-message"),
    [activeTool],
  );

  return (
    <div className="review-page" id="review-top" data-active-tool={currentTool}>
      <div id="review-tools" className="page-tool-switcher" role="tablist" aria-label="Review tool">
        {REVIEW_TOOLS.map((tool) => (
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

      <div id="review-workspace" className="page-tool-surface">
        {currentTool === "family-message" ? (
          <FamilyMessagePanel prefill={messagePrefill} />
        ) : null}
        {currentTool === "support-patterns" ? (
          <SupportPatternsPanel
            onFollowupClick={onFollowupClick}
            onInterventionClick={onInterventionClick}
          />
        ) : null}
        {currentTool === "usage-insights" ? <UsageInsightsPanel /> : null}
      </div>
    </div>
  );
}
