import { useState, useCallback, useEffect, useMemo } from "react";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { detectSupportPatterns } from "../api";
import { PatternReportForm, PatternReportResult } from "../components/PatternReport";
import ContextualHint from "../components/ContextualHint";
import ErrorBanner from "../components/ErrorBanner";
import SkeletonLoader from "../components/SkeletonLoader";
import StreamingIndicator from "../components/StreamingIndicator";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import EmptyStateCard from "../components/EmptyStateCard";
import ResultBanner from "../components/ResultBanner";
import MockModeBanner from "../components/MockModeBanner";
import RetrievalTraceCard from "../components/RetrievalTraceCard";
import RoleReadOnlyBanner from "../components/RoleReadOnlyBanner";
import { FeedbackCollector, OutputActionBar, type OutputAction } from "../components/shared";
import { useFeedback } from "../hooks/useFeedback";
import { useRole } from "../hooks/useRole";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { useStreamingRequest } from "../hooks/useStreamingRequest";
import { serializeSupportPatternsToPlainText } from "./outputActionBarHelpers";
import type { SupportPatternsResponse, FamilyMessagePrefill, InterventionPrefill } from "../types";

interface Props {
  onFollowupClick: (prefill: FamilyMessagePrefill) => void;
  onInterventionClick: (prefill: InterventionPrefill) => void;
}

export default function SupportPatternsPanel({ onFollowupClick, onInterventionClick }: Props) {
  const { classrooms, activeClassroom, setActiveClassroom, profile, students, showSuccess, appendTomorrowNote, streaming } = useApp();
  const session = useSession();
  const { loading, error, result, execute, cancel, reset } = useAsyncAction<SupportPatternsResponse>();
  const streamer = useStreamingRequest({
    sectionLabels: ["Themes", "Follow-up gaps", "Suggested focus"],
  });
  const [resultKey, setResultKey] = useState(0);
  const feedback = useFeedback(activeClassroom, session.sessionId);
  const { copy } = useCopyToClipboard();
  const role = useRole();

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
    const resp = await streamer.execute((stream) =>
      execute((signal) =>
        detectSupportPatterns({
          classroom_id: classroomId,
          student_filter: studentFilter,
          time_window: timeWindow,
        }, signal, stream)
      )
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

      <RoleReadOnlyBanner
        role={role}
        required="canGenerate"
        whatIsBlocked="Running pattern analysis is reserved for the classroom's permanent teacher."
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
            {role.canGenerate ? (
              <PatternReportForm
                classrooms={classrooms}
                students={students}
                selectedClassroom={activeClassroom}
                onClassroomChange={setActiveClassroom}
                onSubmit={handleSubmit}
                loading={loading}
              />
            ) : null}
          </>
        )}
        canvas={(
          <div className="workspace-result" aria-live="polite" aria-busy={loading && result === null}>
            {error && result === null ? <ErrorBanner message={error} onDismiss={reset} /> : null}
            {loading && result === null ? (
              streaming.phase !== "idle"
                ? <StreamingIndicator onCancel={cancel} />
                : <SkeletonLoader variant="stack" message="Analyzing support patterns across records..." label="Detecting support patterns" />
            ) : null}
            {!loading && result === null && !error ? (
              <EmptyStateCard
                variant="sample"
                label="Sample pattern report"
                sampleNode={(
                  <section className="pattern-section pattern-section--themes" aria-hidden="true">
                    <h3>Recurring Themes</h3>
                    <div className="pattern-card">
                      <div className="pattern-card-label">
                        Self-regulation cues at transitions
                        <span className="pattern-card-tag">
                          {" · "}Student A, Student C · 4 records
                        </span>
                      </div>
                      <p className="pattern-evidence">
                        "Asked for a brain-break before math; calmed within 90 seconds."
                      </p>
                      <p className="pattern-evidence">
                        "Used the regulation corner during the read-aloud transition."
                      </p>
                    </div>
                  </section>
                )}
              />
            ) : null}
            {result ? (
              <>
                <ResultBanner label="Patterns analyzed" generatedAt={Date.now()} />
                <MockModeBanner
                  modelId={result.model_id}
                  panelHint="Pattern themes are static fixture text in mock mode and do not analyze your real intervention history. Run with Ollama or hosted Gemini to see real pattern detection."
                />
                <PatternReportResult
                  result={result}
                  onInterventionClick={onInterventionClick}
                  onFollowupClick={onFollowupClick}
                />
                <RetrievalTraceCard trace={result.retrieval_trace} />
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
