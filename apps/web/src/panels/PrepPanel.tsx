import { useMemo } from "react";
import { useApp } from "../AppContext";
import {
  TOOL_META,
  TOOLS_BY_TAB,
  defaultToolForTab,
  type ActiveTool,
} from "../appReducer";
import DifferentiatePanel from "./DifferentiatePanel";
import LanguageToolsPanel from "./LanguageToolsPanel";
import "../styles/page-tool-switcher.css";
import "../styles/multi-tool-page.css";
import "./PrepPanel.css";

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

function derivePulse(ealCount: number, languageCount: number) {
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
      <section
        id="prep-command"
        className="prep-command-strip"
        aria-label="Prep command, lesson adaptation, and language supports"
      >
        <div className="prep-command-strip__copy">
          <span className="prep-command-strip__eyebrow">Prep command</span>
          <h1>Prepare the material before it reaches the room.</h1>
          <p>
            Start with artifact, context, and readiness. Keep the canvas visible
            while choosing the prep mode.
          </p>
        </div>
        <dl className="prep-command-strip__metrics" aria-label="Prep readiness">
          <div>
            <dt>Students</dt>
            <dd>{profile?.students.length ?? "—"}</dd>
          </div>
          <div>
            <dt>EAL</dt>
            <dd>{ealCount || "—"}</dd>
          </div>
          <div>
            <dt>Languages</dt>
            <dd>{languageCount || "—"}</dd>
          </div>
          <div className={`prep-command-strip__pulse prep-command-strip__pulse--${pulse.tone}`}>
            <dt>{pulse.state}</dt>
            <dd>{pulse.meta}</dd>
          </div>
        </dl>
      </section>

      <div id="prep-tools" className="page-tool-switcher page-tool-switcher--segmented prep-lane-segment" role="tablist" aria-label="Prep tool">
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
              <span className="page-tool-switcher__btn-status">{copy?.status ?? "Ready"}</span>
              <span className="sr-only">{copy?.description ?? "Open this prep surface."}</span>
            </button>
          );
        })}
      </div>

      <section className="multi-tool-workspace-section multi-tool-workspace-section--prep" aria-label="Active workspace">
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
