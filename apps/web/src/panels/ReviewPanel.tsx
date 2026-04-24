import { useMemo } from "react";
import { useApp } from "../AppContext";
import {
  TOOL_META,
  TOOLS_BY_TAB,
  defaultToolForTab,
  type ActiveTool,
} from "../appReducer";
import PageHero, { type PageHeroPulse } from "../components/shared/PageHero";
import FamilyMessagePanel from "./FamilyMessagePanel";
import SupportPatternsPanel from "./SupportPatternsPanel";
import UsageInsightsPanel from "./UsageInsightsPanel";
import type { FamilyMessagePrefill, InterventionPrefill } from "../types";

const REVIEW_TOOLS = TOOLS_BY_TAB.review ?? ([
  "family-message",
  "support-patterns",
  "usage-insights",
] as ActiveTool[]);
const REVIEW_TOOL_COPY: Partial<Record<ActiveTool, { kicker: string; description: string }>> = {
  "family-message": {
    kicker: "01 Family",
    description: "Draft family updates and keep human approval explicit.",
  },
  "support-patterns": {
    kicker: "02 Patterns",
    description: "Inspect recurring classroom signals before next actions.",
  },
  "usage-insights": {
    kicker: "03 Usage",
    description: "Review feedback and workflow patterns from recent sessions.",
  },
};

const REVIEW_TOOL_TITLE: Partial<Record<ActiveTool, string>> = {
  "family-message": "Draft family messages",
  "support-patterns": "Inspect support patterns",
  "usage-insights": "Review usage signals",
};

interface Props {
  onFollowupClick: (prefill: FamilyMessagePrefill) => void;
  onInterventionClick: (prefill: InterventionPrefill) => void;
}

function derivePulse(
  unapprovedMessages: number,
  unaddressedPatterns: number,
  approachingReview: number,
): PageHeroPulse {
  if (unapprovedMessages > 3) {
    return {
      tone: "danger",
      state: "Approvals stacked",
      meta: `${unapprovedMessages} awaiting · ${unaddressedPatterns} pattern signals`,
    };
  }
  if (unapprovedMessages > 0 || unaddressedPatterns > 2) {
    return {
      tone: "warning",
      state: "Review pending",
      meta: `${unapprovedMessages} approval${unapprovedMessages === 1 ? "" : "s"} · ${unaddressedPatterns} signals`,
    };
  }
  if (approachingReview > 0) {
    return {
      tone: "neutral",
      state: "Reviews due soon",
      meta: `${approachingReview} approaching review`,
    };
  }
  return {
    tone: "success",
    state: "All reviewed",
    meta: "0 approvals · 0 unread signals",
  };
}

/**
 * ReviewPanel — standalone Review page that hosts Family Message,
 * Support Patterns, and Usage Insights inside one page shell.
 */
export default function ReviewPanel({ onFollowupClick, onInterventionClick }: Props) {
  const { activeTool, setActiveTool, messagePrefill, latestTodaySnapshot } = useApp();
  const currentTool = useMemo<ActiveTool>(
    () => (activeTool && REVIEW_TOOLS.includes(activeTool) ? activeTool : defaultToolForTab("review") ?? "family-message"),
    [activeTool],
  );
  const unapprovedMessages = latestTodaySnapshot?.debt_register.item_count_by_category.unapproved_message ?? 0;
  const unaddressedPatterns = latestTodaySnapshot?.debt_register.item_count_by_category.unaddressed_pattern ?? 0;
  const approachingReview = latestTodaySnapshot?.debt_register.item_count_by_category.approaching_review ?? 0;
  const activeThreads = latestTodaySnapshot?.student_threads?.length ?? 0;

  function statusForTool(tool: ActiveTool) {
    if (tool === "family-message") return unapprovedMessages ? `${unapprovedMessages} approvals` : "Ready";
    if (tool === "support-patterns") return `${unaddressedPatterns} signals`;
    if (tool === "usage-insights") return approachingReview ? `${approachingReview} reviews` : "Session signal";
    return "Ready";
  }

  const pulse = derivePulse(unapprovedMessages, unaddressedPatterns, approachingReview);
  const activeTitle = REVIEW_TOOL_TITLE[currentTool] ?? TOOL_META[currentTool]?.label ?? "Active workspace";

  return (
    <section className="workspace-page multi-tool-page review-page" id="review-top" data-active-tool={currentTool}>
      <PageHero
        id="review-command"
        ariaLabel="Review command, family communication, patterns, and usage insights"
        eyebrow="Review command"
        title="Turn classroom memory into accountable follow-through."
        description={
          <>
            Move from open communication, recurring patterns, and session
            evidence into a review workflow that stays human-approved and
            auditable.
          </>
        }
        metrics={[
          { value: REVIEW_TOOLS.length, label: "Tools" },
          { value: unapprovedMessages, label: "Approvals" },
          { value: unaddressedPatterns, label: "Patterns" },
          { value: approachingReview, label: "Due" },
          { value: activeThreads, label: "Threads" },
        ]}
        pulse={pulse}
        variant="review"
      />

      <div id="review-tools" className="page-tool-switcher page-tool-switcher--cards" role="tablist" aria-label="Review tool">
        {REVIEW_TOOLS.map((tool) => {
          const copy = REVIEW_TOOL_COPY[tool];
          return (
            <button
              key={tool}
              type="button"
              role="tab"
              aria-selected={currentTool === tool}
              className={`page-tool-switcher__btn${currentTool === tool ? " page-tool-switcher__btn--active" : ""}`}
              onClick={() => setActiveTool(tool)}
            >
              <span className="page-tool-switcher__btn-kicker">{copy?.kicker ?? "Review lane"}</span>
              <span className="page-tool-switcher__btn-title">{TOOL_META[tool].label}</span>
              <span className="page-tool-switcher__btn-description">{copy?.description ?? "Open this review surface."}</span>
              <span className="page-tool-switcher__btn-status">{statusForTool(tool)}</span>
            </button>
          );
        })}
      </div>

      <section className="multi-tool-workspace-section" aria-label="Active workspace">
        <header className="multi-tool-workspace-section__header">
          <span className="multi-tool-workspace-section__eyebrow">Active workspace</span>
          <span className="multi-tool-workspace-section__title">{activeTitle}</span>
        </header>
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
      </section>
    </section>
  );
}
