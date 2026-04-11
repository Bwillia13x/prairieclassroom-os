import { useState } from "react";
import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { detectSupportPatterns } from "../api";
import { PatternReportForm, PatternReportResult } from "../components/PatternReport";
import ContextualHint from "../components/ContextualHint";
import ErrorBanner from "../components/ErrorBanner";
import SkeletonLoader from "../components/SkeletonLoader";
import OutputFeedback from "../components/OutputFeedback";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import EmptyStateCard from "../components/EmptyStateCard";
import EmptyStateIllustration from "../components/EmptyStateIllustration";
import ResultBanner from "../components/ResultBanner";
import type { SupportPatternsResponse, FamilyMessagePrefill, InterventionPrefill } from "../types";

interface Props {
  onFollowupClick: (prefill: FamilyMessagePrefill) => void;
  onInterventionClick: (prefill: InterventionPrefill) => void;
}

export default function SupportPatternsPanel({ onFollowupClick, onInterventionClick }: Props) {
  const { classrooms, activeClassroom, setActiveClassroom, profile, students, showSuccess } = useApp();
  const { loading, error, result, execute, reset } = useAsyncAction<SupportPatternsResponse>();
  const [resultKey, setResultKey] = useState(0);

  if (classrooms.length === 0) return null;

  async function handleSubmit(classroomId: string, studentFilter?: string, timeWindow?: number) {
    const resp = await execute((signal) =>
      detectSupportPatterns({
        classroom_id: classroomId,
        student_filter: studentFilter,
        time_window: timeWindow,
      }, signal)
    );
    if (resp) showSuccess("Patterns analyzed");
    if (resp) setResultKey((k) => k + 1);
  }

  return (
    <section className="workspace-page">
      <PageIntro
        eyebrow="Review Workspace"
        title="Review Classroom Support Patterns"
        sectionTone="forest"
        sectionIcon="check"
        breadcrumb={{ group: "Review", tab: "Support Patterns" }}
        description="Scan recurring themes, follow-up gaps, positive trends, and suggested focus areas across recent records without losing the evidence behind them."
        badges={[
          { label: profile ? `Grade ${profile.grade_band}` : "Pattern review", tone: "sun" },
          { label: "Evidence-led analysis", tone: "provenance" },
          { label: "Teacher review", tone: "forest" },
        ]}
      />

      <WorkspaceLayout
        rail={(
          <>
            <ContextualHint
              featureKey="support-patterns"
              title="Support Patterns"
              description="Analyze your own intervention records to surface recurring themes, follow-up gaps, and positive trends. This reflects your documentation — not a diagnosis."
              tone="forest"
            />
            <PatternReportForm
              classrooms={classrooms}
              students={students}
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
              <SkeletonLoader variant="stack" message="Analyzing support patterns across records..." label="Detecting support patterns" />
            ) : null}
            {!loading && result === null && !error ? (
              <EmptyStateCard
                icon={<EmptyStateIllustration name="patterns" />}
                title="No patterns analyzed yet"
                description="Select a classroom, optionally filter by student, and run the analysis to surface recurring themes and follow-up gaps."
              />
            ) : null}
            {result ? (
              <>
                <ResultBanner label="Patterns analyzed" generatedAt={Date.now()} />
                <PatternReportResult
                  result={result}
                  onInterventionClick={onInterventionClick}
                  onFollowupClick={onFollowupClick}
                />
                <OutputFeedback outputId={`patterns-${resultKey}`} outputType="support-patterns" />
              </>
            ) : null}
          </div>
        )}
      />
    </section>
  );
}
