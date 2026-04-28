import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { differentiate } from "../api";
import ArtifactUpload from "../components/ArtifactUpload";
import VariantGrid from "../components/VariantGrid";
import { VariantSummaryStrip } from "../components/DataVisualizations";
import StreamingIndicator from "../components/StreamingIndicator";
import { useEmulatedStreaming } from "../hooks/useEmulatedStreaming";
import WorkspaceLayout from "../components/WorkspaceLayout";
import RecentRunsChipRow from "../components/RecentRunsChipRow";
import { useRecentRuns } from "../hooks/useRecentRuns";
import ErrorBanner from "../components/ErrorBanner";
import { FeedbackCollector, OutputActionBar, type OutputAction } from "../components/shared";
import { useFeedback } from "../hooks/useFeedback";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { useDownloadBlob } from "../hooks/useDownloadBlob";
import {
  serializeVariantsToPlainText,
  serializeVariantsToMarkdown,
  summarizeVariantsForTomorrow,
} from "./DifferentiatePanel.helpers";
import DrillDownDrawer from "../components/DrillDownDrawer";
import type { CurriculumSelection, LessonArtifact, DifferentiateResponse, DrillDownContext, DifferentiatedVariant } from "../types";

export default function DifferentiatePanel() {
  const {
    classrooms,
    activeClassroom,
    profile,
    showSuccess,
    showError,
    streaming,
    appendTomorrowNote,
    setActiveTab,
  } = useApp();
  const [drillDown, setDrillDown] = useState<DrillDownContext | null>(null);
  const session = useSession();
  const { loading, error, result, execute, cancel, reset } = useAsyncAction<DifferentiateResponse>({
    onError: (msg) => showError(`Couldn't generate variants — ${msg}`),
  });
  const [artifactTitle, setArtifactTitle] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);
  const intakeRef = useRef<HTMLFormElement>(null);
  const [resultKey, setResultKey] = useState(0);
  const feedback = useFeedback(activeClassroom, session.sessionId);
  const recent = useRecentRuns("differentiate", activeClassroom, 3);
  const streamer = useEmulatedStreaming({
    sectionLabels: ["Readiness variants", "Scaffolded chunking", "Extension variants", "Language support"],
    structuringDelayMs: 2000,
  });
  const { copy } = useCopyToClipboard();
  const { download } = useDownloadBlob();

  const actions = useMemo<OutputAction[]>(() => {
    if (!result) return [];
    return [
      {
        key: "print",
        label: "Print",
        icon: "pencil",
        onClick: () => window.print(),
      },
      {
        key: "copy",
        label: "Copy",
        icon: "check",
        onClick: async () => {
          await copy(serializeVariantsToPlainText(artifactTitle, result.variants));
          showSuccess("Copied");
        },
      },
      {
        key: "download",
        label: "Download",
        icon: "grid",
        onClick: () =>
          download({
            filename: `${slugify(artifactTitle)}.md`,
            content: serializeVariantsToMarkdown(artifactTitle, result.variants),
            mime: "text/markdown",
          }),
      },
      {
        key: "save-to-tomorrow",
        label: "Save to Tomorrow",
        icon: "star",
        variant: "primary",
        onClick: () => {
          appendTomorrowNote({
            sourcePanel: "differentiate",
            sourceType: "differentiate_material",
            summary: summarizeVariantsForTomorrow(artifactTitle, result.variants),
          });
          showSuccess("Saved to Tomorrow Plan");
        },
      },
    ];
  }, [result, artifactTitle, copy, download, appendTomorrowNote, showSuccess]);

  useEffect(() => {
    session.recordPanelVisit("differentiate");
  }, [session]);

  const handleFeedbackSubmit = useCallback(
    (rating: number, comment?: string) => {
      feedback.submit("differentiate", rating, comment, `diff-${resultKey}`, "differentiate_material");
      session.recordFeedback();
    },
    [feedback.submit, resultKey, session],
  );

  if (classrooms.length === 0) return null;

  async function handleDifferentiate(
    artifact: LessonArtifact,
    classroomId: string,
    curriculumSelection: CurriculumSelection | null,
  ) {
    setArtifactTitle(artifact.title);
    const resp = await streamer.execute(() =>
      execute((signal) =>
        differentiate({
          artifact,
          classroom_id: classroomId,
          teacher_goal: artifact.teacher_goal,
          curriculum_selection: curriculumSelection ?? undefined,
        }, signal)
      )
    );
    if (resp) {
      showSuccess("Variants generated");
      session.recordGeneration("differentiate", "differentiate_material");
      setResultKey((k) => k + 1);
      const runId = `diff-${resultKey + 1}-${Date.now()}`;
      recent.record(
        { id: runId, label: artifact.title, at: Date.now() },
        { artifactTitle: artifact.title, response: resp },
      );
    }
  }

  function handleRestoreRun(runId: string) {
    const cached = recent.getPayload<{
      artifactTitle: string;
      response: DifferentiateResponse;
    }>(runId);
    if (cached) {
      setArtifactTitle(cached.artifactTitle);
      // Replay the cached response through useAsyncAction.execute so the
      // canvas renders via the same code path. Local resolver avoids a new
      // network request.
      execute(async () => cached.response);
    }
    resultRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="workspace-page differentiate-panel">
      <h2 className="sr-only">Build Lesson Variants</h2>

      <WorkspaceLayout
        className="workspace-layout--prep-canvas"
        surface="differentiate"
        splitState={result ? "output" : "input"}
        rail={(
          <div className="differentiate-intake-pane">
            <ArtifactUpload
              classrooms={classrooms}
              selectedClassroom={activeClassroom}
              classroomProfile={profile}
              onSubmit={handleDifferentiate}
              loading={loading}
              formRef={intakeRef}
            />
          </div>
        )}
        canvas={(
          <div className="workspace-result differentiate-canvas" aria-live="polite" aria-busy={loading && result === null} ref={resultRef}>
            {error && result === null ? <ErrorBanner message={error} onDismiss={reset} /> : null}
            {(loading || streaming.active) && result === null ? (
              <StreamingIndicator label="Generating lesson variants" onCancel={cancel} />
            ) : null}
            {!loading && result === null && !error ? (
              <section className="differentiate-canvas__preview" aria-label="Variant lane preview">
                <VariantGrid
                  artifactTitle="Community Helpers Reading Passage"
                  variants={PREVIEW_VARIANTS}
                  preview
                />
                <ul className="output-preview-checklist" aria-label="Output will include">
                  <li>Readiness lane</li>
                  <li>Scaffolded lane</li>
                  <li>Extension lane</li>
                  <li>Language support lane</li>
                </ul>
              </section>
            ) : null}
            {result ? (
              <>
                <VariantGrid artifactTitle={artifactTitle} variants={result.variants} modelId={result.model_id} />
                <div className="differentiate-canvas__lane-jump">
                  <VariantSummaryStrip
                    variants={result.variants}
                    onSegmentClick={({ variantType, label, variants }) =>
                      setDrillDown({ type: "variant-lane", variantType, label, variants })
                    }
                  />
                </div>
                <RecentRunsChipRow runs={recent.runs} onSelect={handleRestoreRun} />
                <FeedbackCollector
                  onSubmit={handleFeedbackSubmit}
                  submitted={feedback.submitted}
                  panelLabel="differentiation"
                />
                {result ? <OutputActionBar actions={actions} contextLabel="Variants output" /> : null}
              </>
            ) : null}
          </div>
        )}
      />
      <DrillDownDrawer
        context={drillDown}
        onClose={() => setDrillDown(null)}
        onNavigate={(tab) => {
          setDrillDown(null);
          setActiveTab(tab);
        }}
        onContextChange={setDrillDown}
      />
    </section>
  );
}

function slugify(s: string): string {
  return (s || "variants").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80);
}

const PREVIEW_VARIANTS: DifferentiatedVariant[] = [
  {
    variant_id: "preview-core",
    artifact_id: "preview",
    variant_type: "core",
    title: "Core lane",
    student_facing_instructions: "Balanced support with clear structure and visuals to build comprehension.",
    teacher_notes: "Use as the right-level version once the artifact is attached.",
    required_materials: ["Source artifact", "Student copy"],
    estimated_minutes: 18,
    schema_version: "preview",
  },
  {
    variant_id: "preview-chunked",
    artifact_id: "preview",
    variant_type: "chunked",
    title: "Chunked lane",
    student_facing_instructions: "Smaller steps, sentence stems, and visual supports to build independence.",
    teacher_notes: "Best for students who need a scaffolded entry point.",
    required_materials: ["Chunked copy", "Sentence stems"],
    estimated_minutes: 14,
    schema_version: "preview",
  },
  {
    variant_id: "preview-extension",
    artifact_id: "preview",
    variant_type: "extension",
    title: "Extension lane",
    student_facing_instructions: "Richer texts, deeper questions, and opportunities for synthesis.",
    teacher_notes: "Use with students who are ready to extend the same outcome.",
    required_materials: ["Challenge prompt"],
    estimated_minutes: 20,
    schema_version: "preview",
  },
  {
    variant_id: "preview-eal",
    artifact_id: "preview",
    variant_type: "eal_supported",
    title: "EAL Supported lane",
    student_facing_instructions: "Language supports and vocabulary focus to build comprehension and confidence.",
    teacher_notes: "Keep the concept load intact while clarifying language.",
    required_materials: ["Vocabulary bank", "Visual supports"],
    estimated_minutes: 16,
    schema_version: "preview",
  },
];
