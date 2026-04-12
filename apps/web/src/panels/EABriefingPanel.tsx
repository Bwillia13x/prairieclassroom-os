import { useState, useCallback } from "react";
import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { generateEABriefing } from "../api";
import { EABriefingForm, EABriefingResult } from "../components/EABriefing";
import ContextualHint from "../components/ContextualHint";
import ErrorBanner from "../components/ErrorBanner";
import SkeletonLoader from "../components/SkeletonLoader";
import OutputFeedback from "../components/OutputFeedback";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import EmptyStateCard from "../components/EmptyStateCard";
import EmptyStateIllustration from "../components/EmptyStateIllustration";
import ResultBanner from "../components/ResultBanner";
import { FeedbackCollector } from "../components/shared";
import { useFeedback } from "../hooks/useFeedback";
import type { EABriefingResponse } from "../types";

export default function EABriefingPanel() {
  const { classrooms, activeClassroom, setActiveClassroom, profile, showSuccess } = useApp();
  const { loading, error, result, execute, reset } = useAsyncAction<EABriefingResponse>();
  const [resultKey, setResultKey] = useState(0);
  const feedback = useFeedback(activeClassroom, `briefing-session-${activeClassroom}`);
  const handleFeedbackSubmit = useCallback(
    (rating: number, comment?: string) => {
      feedback.submit("ea-briefing", rating, comment, `briefing-${resultKey}`, "generate_ea_briefing");
    },
    [feedback.submit, resultKey],
  );

  if (classrooms.length === 0) return null;

  async function handleSubmit(classroomId: string, eaName?: string) {
    const resp = await execute((signal) =>
      generateEABriefing({ classroom_id: classroomId, ea_name: eaName }, signal)
    );
    if (resp) showSuccess("Briefing generated");
    if (resp) setResultKey((k) => k + 1);
  }

  return (
    <section className="workspace-page">
      <PageIntro
        eyebrow="Operations Workspace"
        title="Build the EA Briefing"
        sectionTone="slate"
        sectionIcon="grid"
        breadcrumb={{ group: "Ops", tab: "EA Briefing" }}
        description="Generate one briefing that packages schedule blocks, student watch items, pending follow-ups, and the teacher's notes into a shared coordination artifact."
        badges={[
          { label: profile ? `Grade ${profile.grade_band}` : "EA coordination", tone: "sun" },
          { label: "Coordination document", tone: "analysis" },
          { label: "Print-ready", tone: "slate" },
        ]}
      />

      <WorkspaceLayout
        rail={(
          <>
            <ContextualHint
              featureKey="ea-briefing"
              title="EA Briefing"
              description="Build a coordination document for the educational assistant that combines the day plan, student watch items, and pending follow-ups."
              tone="slate"
            />
            <EABriefingForm
              classrooms={classrooms}
              selectedClassroom={activeClassroom}
              onClassroomChange={setActiveClassroom}
              onSubmit={handleSubmit}
              loading={loading}
            />
          </>
        )}
        canvas={(
          <div className="workspace-result" aria-live="polite" aria-busy={loading && result === null}>
            {error && result === null ? <ErrorBanner message={error} onDismiss={reset} /> : null}
            {loading && result === null ? (
              <SkeletonLoader variant="stack" message="Building EA coordination briefing..." label="Generating EA briefing" />
            ) : null}
            {!loading && result === null && !error ? (
              <EmptyStateCard
                icon={<EmptyStateIllustration name="briefing" />}
                title="No briefing yet"
                description="Select a classroom and optionally add the EA's name, then generate the coordination document for today."
              />
            ) : null}
            {result ? (
              <>
                <ResultBanner label="Briefing generated" generatedAt={Date.now()} />
                <EABriefingResult result={result} />
                <OutputFeedback outputId={`briefing-${resultKey}`} outputType="ea-briefing" />
                <FeedbackCollector
                  onSubmit={handleFeedbackSubmit}
                  submitted={feedback.submitted}
                  panelLabel="EA briefing"
                />
              </>
            ) : null}
          </div>
        )}
      />
    </section>
  );
}
