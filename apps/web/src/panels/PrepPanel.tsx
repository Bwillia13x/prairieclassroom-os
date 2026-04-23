import { useMemo } from "react";
import { useApp } from "../AppContext";
import {
  TOOL_META,
  TOOLS_BY_TAB,
  defaultToolForTab,
  type ActiveTool,
} from "../appReducer";
import PrepSectionIntro from "../components/PrepSectionIntro";
import DifferentiatePanel from "./DifferentiatePanel";
import LanguageToolsPanel from "./LanguageToolsPanel";

const PREP_TOOLS = TOOLS_BY_TAB.prep ?? (["differentiate", "language-tools"] as ActiveTool[]);

/**
 * PrepPanel — standalone Prep page that hosts the Differentiate and
 * Language Tools workspaces inside one page shell. The teacher switches
 * between the two tools through a local switcher; the top-level nav
 * keeps pointing at a single `Prep` tab.
 */
export default function PrepPanel() {
  const { activeTool, setActiveTool } = useApp();
  const currentTool = useMemo<ActiveTool>(
    () => (activeTool && PREP_TOOLS.includes(activeTool) ? activeTool : defaultToolForTab("prep") ?? "differentiate"),
    [activeTool],
  );

  return (
    <div className="prep-page" id="prep-top" data-active-tool={currentTool}>
      <PrepSectionIntro />

      <div id="prep-tools" className="page-tool-switcher" role="tablist" aria-label="Prep tool">
        {PREP_TOOLS.map((tool) => (
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

      <div id="prep-workspace" className="page-tool-surface">
        {currentTool === "differentiate" ? <DifferentiatePanel /> : null}
        {currentTool === "language-tools" ? <LanguageToolsPanel /> : null}
      </div>
    </div>
  );
}
