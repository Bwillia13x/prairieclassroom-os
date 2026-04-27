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

  // Group metrics by review lens — Approvals (human-in-the-loop work),
  // Patterns (signal observation), Reviews (cadence). Each group keeps
  // its own eyebrow.
  const heroMetricGroups: PageHeroMetricGroup[] = [
    {
      label: "Approvals",
      metrics: [
        {
          value: unapprovedMessages,
          label: "Awaiting",
          tone: unapprovedMessages > 3 ? "danger" : unapprovedMessages > 0 ? "warning" : undefined,
        },
      ],
    },
    {
      label: "Signals",
      metrics: [
        {
          value: unaddressedPatterns,
          label: "Patterns",
          tone: unaddressedPatterns > 2 ? "warning" : undefined,
        },
        { value: activeThreads, label: "Threads" },
      ],
    },
    {
      label: "Cadence",
      metrics: [
        {
          value: approachingReview,
          label: "Reviews due",
          tone: approachingReview > 0 ? "warning" : undefined,
        },
      ],
    },
  ];

  const heroStatusRows: PageHeroStatusRow[] = [
    {
      label: "Active tool",
      value: TOOL_META[currentTool]?.label ?? "—",
    },
  ];

  // Tool-aware operational preview — different lens per tool:
  //   Family Message → draft + language + approval status
  //   Support Patterns → recency timeline + confidence
  //   Usage Insights → workflow analytics + sequence rows
  const reviewPreviewGroups: OperationalPreviewGroup[] = (() => {
    if (currentTool === "family-message") {
      return [
        {
          eyebrow: "Approval queue",
          evidence: [
            { label: "Awaiting approval", meta: String(unapprovedMessages) },
            {
              label: "Active threads",
              meta: String(activeThreads),
            },
          ],
        },
        {
          eyebrow: "Human-in-the-loop",
          chips: [
            { label: "Always editable", tone: "success", meta: "teacher edits persist" },
            { label: "No autonomous send", tone: "success", meta: "approval required" },
          ],
        },
      ];
    }
    if (currentTool === "support-patterns") {
      return [
        {
          eyebrow: "Pattern signal",
          evidence: [
            { label: "Unaddressed patterns", meta: String(unaddressedPatterns) },
            { label: "Approaching review", meta: String(approachingReview) },
          ],
        },
        {
          eyebrow: "Active threads",
          chips: (latestTodaySnapshot?.student_threads ?? [])
            .filter((t) => t.active_pattern_count > 0)
            .slice(0, 6)
            .map((thread) => ({
              label: thread.alias,
              tone: thread.active_pattern_count > 1 ? "watch" : "neutral",
              meta: `${thread.active_pattern_count} pattern${thread.active_pattern_count === 1 ? "" : "s"}`,
            })),
        },
      ];
    }
    // usage-insights
    return [
      {
        eyebrow: "Workflow signal",
        evidence: [
          { label: "Approaching review", meta: String(approachingReview) },
          { label: "Active threads", meta: String(activeThreads) },
          { label: "Open patterns", meta: String(unaddressedPatterns) },
        ],
      },
    ];
  })();

  const reviewHasPreview = reviewPreviewGroups.some(
    (g) => (g.chips && g.chips.length > 0) || (g.evidence && g.evidence.length > 0),
  );

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
        metricGroups={heroMetricGroups}
        statusRows={heroStatusRows}
        pulse={pulse}
        variant="review"
      />

      {reviewHasPreview ? (
        <OperationalPreview
          ariaLabel="Review operational preview"
          id="review-preview"
          groups={reviewPreviewGroups}
        />
      ) : null}

      <SectionMarker
        number="02"
        title="Review lane"
        subtitle="What to approve, what to read, what to learn."
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

      <ToolSwitcherStepper
        total={REVIEW_TOOLS.length}
        activeIndex={REVIEW_TOOLS.indexOf(currentTool)}
        label="Review tool progress"
      />

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
