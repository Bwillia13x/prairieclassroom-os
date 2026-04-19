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
import ContextualHint from "../components/ContextualHint";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import EmptyStateCard from "../components/EmptyStateCard";
import RecentRunsChipRow from "../components/RecentRunsChipRow";
import { useRecentRuns } from "../hooks/useRecentRuns";
import ErrorBanner from "../components/ErrorBanner";
import OutputMetaRow from "../components/OutputMetaRow";
import { buildModelMetaItems } from "../components/buildModelMetaItems";
import ResultBanner from "../components/ResultBanner";
import MockModeBanner from "../components/MockModeBanner";
import { Card, FeedbackCollector, OutputActionBar, type OutputAction } from "../components/shared";
import { useFeedback } from "../hooks/useFeedback";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { useDownloadBlob } from "../hooks/useDownloadBlob";
import {
  serializeVariantsToPlainText,
  serializeVariantsToMarkdown,
  summarizeVariantsForTomorrow,
} from "./DifferentiatePanel.helpers";
import type { CurriculumSelection, LessonArtifact, DifferentiateResponse } from "../types";

export default function DifferentiatePanel() {
  const {
    classrooms,
    activeClassroom,
    setActiveClassroom,
    profile,
    showSuccess,
    streaming,
    appendTomorrowNote,
  } = useApp();
  const session = useSession();
  const { loading, error, result, execute, cancel, reset } = useAsyncAction<DifferentiateResponse>();
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
    <section className="workspace-page">
      <PageIntro
        eyebrow="Prep Workspace"
        title="Build Lesson Variants"
        sectionTone="sage"
        sectionIcon="pencil"
        breadcrumb={{ group: "Prep", tab: "Differentiate" }}
        description="Bring one lesson artifact into the system and generate a set of classroom-ready variants with clearer scaffolds, chunking, extension, and language support."
        badges={[
          {
            label: profile ? `Grade ${profile.grade_band}` : "Choose classroom",
            tone: "live",
            onClick: () =>
              document.dispatchEvent(
                new CustomEvent("prairie:open-classroom-switcher"),
              ),
          },
          { label: "Artifact-led", tone: "muted" },
          { label: "Student-ready variants", tone: "muted" },
        ]}
      />

      <WorkspaceLayout
        splitState={result ? "output" : "input"}
        rail={(
          <>
            <ContextualHint
              featureKey="differentiate"
              title="Differentiate"
              description="Upload a lesson artifact and the system generates variants adapted for each student's readiness and language profile."
              tone="sage"
            />
            <ArtifactUpload
              classrooms={classrooms}
              selectedClassroom={activeClassroom}
              onClassroomChange={setActiveClassroom}
              onSubmit={handleDifferentiate}
              loading={loading}
              formRef={intakeRef}
            />
          </>
        )}
        canvas={(
          <div className="workspace-result" aria-live="polite" aria-busy={loading && result === null} ref={resultRef}>
            {error && result === null ? <ErrorBanner message={error} onDismiss={reset} /> : null}
            {(loading || streaming.active) && result === null ? (
              <StreamingIndicator label="Generating lesson variants" onCancel={cancel} />
            ) : null}
            {!loading && result === null && !error ? (
              <EmptyStateCard variant="preview" label="Variant lane preview" />
            ) : null}
            {result ? (
              <>
                <RecentRunsChipRow runs={recent.runs} onSelect={handleRestoreRun} />
                <ResultBanner
                  label={`${result.variants.length} variants generated`}
                  generatedAt={Date.now()}
                />
                <MockModeBanner
                  modelId={result.model_id}
                  panelHint="Variants reuse the same fixture text in mock mode and do not adapt to the lesson artifact you uploaded. Run with Ollama or hosted Gemini to see real differentiation."
                />
                <Card variant="raised" tone="sage" className="differentiate-result-summary">
                  <Card.Body>
                    <h3 className="form-panel-title">{artifactTitle || "Latest artifact"}</h3>
                    <p className="panel-description">
                      {result.variants.length} variants generated across readiness, chunking, extension, and language-support lanes.
                    </p>
                    <OutputMetaRow
                      items={[
                        { label: profile ? describeSource(profile.grade_band) : "Classroom-linked", tone: "accent" },
                        { label: "Retrieval-backed profiles", tone: "provenance" },
                        { label: "Differentiation suite", tone: "analysis" },
                        ...buildModelMetaItems(result),
                      ]}
                    />
                  </Card.Body>
                </Card>
                <VariantSummaryStrip variants={result.variants} />
                <VariantGrid artifactTitle={artifactTitle} variants={result.variants} />
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
    </section>
  );
}

function describeSource(gradeBand: string) {
  return `Grade ${gradeBand} classroom`;
}

function slugify(s: string): string {
  return (s || "variants").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80);
}
