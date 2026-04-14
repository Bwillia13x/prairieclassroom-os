import { useState, useCallback, useEffect, useMemo } from "react";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
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
import { FeedbackCollector, OutputActionBar, type OutputAction } from "../components/shared";
import { useFeedback } from "../hooks/useFeedback";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { serializeSupportPatternsToPlainText } from "./outputActionBarHelpers";
import type { SupportPatternsResponse, FamilyMessagePrefill, InterventionPrefill } from "../types";

interface Props {
  onFollowupClick: (prefill: FamilyMessagePrefill) => void;
  onInterventionClick: (prefill: InterventionPrefill) => void;
}

export default function SupportPatternsPanel({ onFollowupClick, onInterventionClick }: Props) {
  const { classrooms, activeClassroom, setActiveClassroom, profile, students, showSuccess, appendTomorrowNote } = useApp();
  const session = useSession();
  const { loading, error, result, execute, reset } = useAsyncAction<SupportPatternsResponse>();
  const [resultKey, setResultKey] = useState(0);
  const feedback = useFeedback(activeClassroom, session.sessionId);
  const { copy } = useCopyToClipboard();

  const actions = useMemo<OutputAction[]>(() => {
    if (!result) return [];
    const report = result.report;
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
          await copy(serializeSupportPatternsToPlainText(report));
          showSuccess("Copied");
        },
      },
      {
        key: "save-to-tomorrow",
        label: "Save to Tomorrow",
        icon: "star",
        variant: "primary",
        onClick: () => {
          appendTomorrowNote({
            sourcePanel: "support-patterns",
            sourceType: "detect_support_patterns",
            summary: `${report.recurring_themes.length} recurring themes, ${report.suggested_focus.length} focus areas identified`,
          });
          showSuccess("Saved to Tomorrow Plan");
        },
      },
      {
        key: "share-with-ea",
        label: "Share with EA",
        icon: "mail",
        onClick: async () => {
          await copy(serializeSupportPatternsToPlainText(report));
          showSuccess("EA summary copied — paste into Slack/email");
        },
      },
    ];
  }, [result, copy, appendTomorrowNote, showSuccess]);

  useEffect(() => {
    session.recordPanelVisit("support-patterns");
  }, [session]);

  const handleFeedbackSubmit = useCallback(
    (rating: number, comment?: string) => {
      feedback.submit("support-patterns", rating, comment, `patterns-${resultKey}`, "detect_support_patterns");
      session.recordFeedback();
    },
    [feedback.submit, resultKey, session],
  );

  if (classrooms.length === 0) return null;

  async function handleSubmit(classroomId: string, studentFilter?: string, timeWindow?: number) {
    const resp = await execute((signal) =>
      detectSupportPatterns({
        classroom_id: classroomId,
        student_filter: studentFilter,
        time_window: timeWindow,
      }, signal)
    );
    if (resp) {
      showSuccess("Patterns analyzed");
      session.recordGeneration("support-patterns", "detect_support_patterns");
      setResultKey((k) => k + 1);
    }
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
                <FeedbackCollector
                  onSubmit={handleFeedbackSubmit}
                  submitted={feedback.submitted}
                  panelLabel="support patterns"
                />
                <OutputActionBar actions={actions} contextLabel="Support patterns output" />
              </>
            ) : null}
          </div>
        )}
      />
    </section>
  );
}
