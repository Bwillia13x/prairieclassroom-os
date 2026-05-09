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

const LANGUAGE_LABELS: Record<string, string> = {
  ar: "Arabic",
  en: "English",
  es: "Spanish",
  fr: "French",
  ko: "Korean",
  pa: "Punjabi",
  so: "Somali",
  tl: "Tagalog",
  ur: "Urdu",
  vi: "Vietnamese",
  zh: "Mandarin",
};

function displayLanguage(language: string): string {
  return LANGUAGE_LABELS[language.toLowerCase()] ?? language;
}

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
  const students = profile?.students ?? [];
  const ealCount = students.filter((student) => student.eal_flag).length;
  const languageEntries = Array.from(new Set(
    students
      .map((student) => student.family_language?.trim())
      .filter((language): language is string => Boolean(language)),
  ));
  const languageCount = languageEntries.length;

  const pulse = derivePulse(ealCount, languageCount);
  const activeTitle = PREP_TOOL_TITLE[currentTool] ?? TOOL_META[currentTool]?.label ?? "Active workspace";
  const prepMetricGroups: PageHeroMetricGroup[] = [
    {
      label: "Roster",
      metrics: [
        { value: students.length || "—", label: "Students" },
        {
          value: ealCount || "—",
          label: "EAL",
          tone: ealCount > 6 ? "warning" : undefined,
        },
      ],
    },
    {
      label: "Language",
      metrics: [
        { value: languageCount || "—", label: "Languages" },
        {
          value: currentTool === "differentiate" ? "Variants" : "Language",
          label: "Mode",
        },
      ],
    },
  ];
  const prepStatusRows: PageHeroStatusRow[] = [
    { label: "Active tool", value: TOOL_META[currentTool]?.label ?? "—" },
  ];
  const prepPreviewGroups: OperationalPreviewGroup[] = [
    {
      eyebrow: "Artifact readiness",
      evidence: [
        { label: "Input lane", meta: "upload · paste · web" },
        { label: "Curriculum", meta: "Alberta program" },
        { label: "Output", meta: currentTool === "differentiate" ? "variants" : "simplify · vocabulary" },
      ],
    },
    {
      eyebrow: "Language load",
      evidence: [
        { label: "EAL students", meta: String(ealCount) },
        { label: "Family languages", meta: String(languageCount) },
      ],
      chips: languageEntries.slice(0, 6).map((language) => ({
        label: displayLanguage(language),
        tone: "watch",
        title: language,
      })),
    },
    {
      eyebrow: "Teacher pass",
      chips: [
        { label: "Same outcome", tone: "success", meta: "no lowered bar" },
        { label: "Editable copy", tone: "success", meta: "teacher owned" },
        { label: "Materials list", tone: "neutral", meta: "ready to stage" },
      ],
    },
  ];

  return (
    <section className="workspace-page multi-tool-page prep-page" id="prep-top" data-active-tool={currentTool}>
      <PageHero
        id="prep-command"
        ariaLabel="Prep command, lesson adaptation, and language supports"
        eyebrow="Prep command"
        title="Prepare the material before it reaches the room."
        description={
          <>
            Start with artifact, context, and readiness. Keep the canvas visible
            while choosing the prep mode.
          </>
        }
        metricGroups={prepMetricGroups}
        statusRows={prepStatusRows}
        pulse={pulse}
        variant="prep"
        density="utility"
      />

      <OperationalPreview
        ariaLabel="Prep operational preview"
        id="prep-preview"
        groups={prepPreviewGroups}
        className="prep-operational-preview"
      />

      <SectionMarker
        number="02"
        title="Prep lane"
        subtitle="Choose the prep mode, then keep the artifact canvas and output preview in one line of sight."
      />

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
