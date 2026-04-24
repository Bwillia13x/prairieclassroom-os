import { useMemo } from "react";
import { useApp } from "../AppContext";
import {
  TOOL_META,
  TOOLS_BY_TAB,
  defaultToolForTab,
  type ActiveTool,
} from "../appReducer";
import PageHero, { type PageHeroPulse } from "../components/shared/PageHero";
import DifferentiatePanel from "./DifferentiatePanel";
import LanguageToolsPanel from "./LanguageToolsPanel";

const PREP_TOOLS = TOOLS_BY_TAB.prep ?? (["differentiate", "language-tools"] as ActiveTool[]);
const PREP_TOOL_COPY: Partial<Record<ActiveTool, { kicker: string; description: string; status: string }>> = {
  differentiate: {
    kicker: "01 Artifact",
    description: "Adapt one lesson, worksheet, or passage across readiness levels.",
    status: "Lesson variants",
  },
  "language-tools": {
    kicker: "02 Language",
    description: "Simplify text and prepare bilingual vocabulary supports.",
    status: "EAL support",
  },
};

const PREP_TOOL_TITLE: Partial<Record<ActiveTool, string>> = {
  differentiate: "Build lesson variants",
  "language-tools": "Prepare language supports",
};

function derivePulse(ealCount: number, languageCount: number): PageHeroPulse {
  if (ealCount > 6) {
    return {
      tone: "warning",
      state: "Heavy EAL load",
      meta: `${ealCount} EAL · ${languageCount} languages`,
    };
  }
  if (ealCount > 0) {
    return {
      tone: "neutral",
      state: "Prep ready",
      meta: `${ealCount} EAL · ${languageCount} languages`,
    };
  }
  return {
    tone: "success",
    state: "Prep ready",
    meta: "No EAL flags · open canvas",
  };
}

/**
 * PrepPanel — standalone Prep page that hosts the Differentiate and
 * Language Tools workspaces inside one page shell.
 */
export default function PrepPanel() {
  const { activeTool, setActiveTool, profile } = useApp();
  const currentTool = useMemo<ActiveTool>(
    () => (activeTool && PREP_TOOLS.includes(activeTool) ? activeTool : defaultToolForTab("prep") ?? "differentiate"),
    [activeTool],
  );
  const ealCount = profile?.students.filter((student) => student.eal_flag).length ?? 0;
  const languageCount = new Set(
    (profile?.students ?? []).map((student) => student.family_language).filter(Boolean),
  ).size;

  const pulse = derivePulse(ealCount, languageCount);
  const activeTitle = PREP_TOOL_TITLE[currentTool] ?? TOOL_META[currentTool]?.label ?? "Active workspace";

  return (
    <section className="workspace-page multi-tool-page prep-page" id="prep-top" data-active-tool={currentTool}>
      <PageHero
        id="prep-command"
        ariaLabel="Prep command, lesson adaptation, and language supports"
        eyebrow="Prep command"
        title="Prepare the material before it reaches the room."
        description={
          <>
            Choose the right prep lane, then work from one active canvas. Lesson
            variants and language supports stay grouped here so planning does
            not fragment across tools.
          </>
        }
        metrics={[
          { value: PREP_TOOLS.length, label: "Tools" },
          { value: ealCount || "—", label: "EAL" },
          { value: languageCount || "—", label: "Languages" },
          { value: profile?.students.length ?? "—", label: "Students" },
        ]}
        pulse={pulse}
        variant="prep"
      />

      <div id="prep-tools" className="page-tool-switcher page-tool-switcher--cards" role="tablist" aria-label="Prep tool">
        {PREP_TOOLS.map((tool) => {
          const copy = PREP_TOOL_COPY[tool];
          return (
            <button
              key={tool}
              type="button"
              role="tab"
              aria-selected={currentTool === tool}
              className={`page-tool-switcher__btn${currentTool === tool ? " page-tool-switcher__btn--active" : ""}`}
              onClick={() => setActiveTool(tool)}
            >
              <span className="page-tool-switcher__btn-kicker">{copy?.kicker ?? "Prep lane"}</span>
              <span className="page-tool-switcher__btn-title">{TOOL_META[tool].label}</span>
              <span className="page-tool-switcher__btn-description">{copy?.description ?? "Open this prep surface."}</span>
              <span className="page-tool-switcher__btn-status">{copy?.status ?? "Ready"}</span>
            </button>
          );
        })}
      </div>

      <section className="multi-tool-workspace-section" aria-label="Active workspace">
        <header className="multi-tool-workspace-section__header">
          <span className="multi-tool-workspace-section__eyebrow">Active workspace</span>
          <span className="multi-tool-workspace-section__title">{activeTitle}</span>
        </header>
        <div id="prep-workspace" className="page-tool-surface">
          {currentTool === "differentiate" ? <DifferentiatePanel /> : null}
          {currentTool === "language-tools" ? <LanguageToolsPanel /> : null}
        </div>
      </section>
    </section>
  );
}
