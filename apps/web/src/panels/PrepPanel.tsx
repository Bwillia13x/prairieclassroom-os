import { useMemo } from "react";
import { useApp } from "../AppContext";
import {
  TOOL_META,
  TOOLS_BY_TAB,
  defaultToolForTab,
  type ActiveTool,
} from "../appReducer";
import PageCommandHub from "../components/PageCommandHub";
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

/**
 * PrepPanel — standalone Prep page that hosts the Differentiate and
 * Language Tools workspaces inside one page shell. The teacher switches
 * between the two tools through a local switcher; the top-level nav
 * keeps pointing at a single `Prep` tab.
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

  return (
    <section className="workspace-page multi-tool-page prep-page" id="prep-top" data-active-tool={currentTool}>
      <PageCommandHub
        id="prep-command"
        ariaLabel="Prep command, lesson adaptation, and language supports"
        eyebrow="Prep command"
        title="Prepare the material before it reaches the room"
        description="Choose the right prep lane, then work from one active canvas. Lesson variants and language supports stay grouped here so planning does not fragment across tools."
        metrics={[
          { value: PREP_TOOLS.length, label: "Tools" },
          { value: ealCount || "...", label: "EAL" },
          { value: languageCount || "...", label: "Languages" },
          { value: profile?.students.length ?? "...", label: "Students" },
        ]}
        actions={[
          { label: "Differentiate", icon: "pencil", onClick: () => setActiveTool("differentiate") },
          { label: "Language Tools", icon: "star", onClick: () => setActiveTool("language-tools") },
        ]}
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

      <div id="prep-workspace" className="page-tool-surface">
        {currentTool === "differentiate" ? <DifferentiatePanel /> : null}
        {currentTool === "language-tools" ? <LanguageToolsPanel /> : null}
      </div>
    </section>
  );
}
