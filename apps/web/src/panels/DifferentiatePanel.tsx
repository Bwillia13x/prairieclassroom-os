import { useState, useRef, useCallback, useEffect } from "react";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { differentiate } from "../api";
import ArtifactUpload from "../components/ArtifactUpload";
import VariantGrid from "../components/VariantGrid";
import SkeletonLoader from "../components/SkeletonLoader";
import ContextualHint from "../components/ContextualHint";
import OutputFeedback from "../components/OutputFeedback";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import DifferentiateEmptyState from "../components/DifferentiateEmptyState";
import ErrorBanner from "../components/ErrorBanner";
import OutputMetaRow from "../components/OutputMetaRow";
import ResultBanner from "../components/ResultBanner";
import { Card, FeedbackCollector } from "../components/shared";
import { useFeedback } from "../hooks/useFeedback";
import type { LessonArtifact, DifferentiateResponse } from "../types";

export default function DifferentiatePanel() {
  const { classrooms, activeClassroom, setActiveClassroom, profile, showSuccess } = useApp();
  const session = useSession();
  const { loading, error, result, execute, reset } = useAsyncAction<DifferentiateResponse>();
  const [artifactTitle, setArtifactTitle] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);
  const intakeRef = useRef<HTMLFormElement>(null);
  const [resultKey, setResultKey] = useState(0);
  const feedback = useFeedback(activeClassroom, session.sessionId);

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

  async function handleDifferentiate(artifact: LessonArtifact, classroomId: string) {
    setArtifactTitle(artifact.title);
    const resp = await execute((signal) =>
      differentiate({
        artifact,
        classroom_id: classroomId,
        teacher_goal: artifact.teacher_goal,
      }, signal)
    );
    if (resp) {
      showSuccess("Variants generated");
      session.recordGeneration("differentiate", "differentiate_material");
      setResultKey((k) => k + 1);
    }
  }

  function focusIntake() {
    intakeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    intakeRef.current?.querySelector<HTMLElement>("select, input, textarea, button")?.focus();
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
          { label: profile ? `Grade ${profile.grade_band}` : "Lesson prep", tone: "sun" },
          { label: "Artifact-led workflow", tone: "provenance" },
          { label: "Student-ready variants", tone: "sage" },
        ]}
      />

      <WorkspaceLayout
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
            {loading && result === null ? (
              <SkeletonLoader variant="grid" message="Differentiating lesson into multiple variants..." label="Loading differentiated variants" />
            ) : null}
            {!loading && result === null && !error ? (
              <DifferentiateEmptyState onStart={focusIntake} />
            ) : null}
            {result ? (
              <>
                <ResultBanner
                  label={`${result.variants.length} variants generated`}
                  generatedAt={Date.now()}
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
                      ]}
                    />
                  </Card.Body>
                </Card>
                <VariantGrid artifactTitle={artifactTitle} variants={result.variants} />
                <OutputFeedback outputId={`diff-${resultKey}`} outputType="differentiate" />
                <FeedbackCollector
                  onSubmit={handleFeedbackSubmit}
                  submitted={feedback.submitted}
                  panelLabel="differentiation"
                />
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
