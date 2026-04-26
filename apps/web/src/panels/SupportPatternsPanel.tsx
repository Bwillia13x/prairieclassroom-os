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
import DrillDownDrawer from "../components/DrillDownDrawer";
import { StudentCoverageStrip } from "../components/TriageSurfaces";
import { FeedbackCollector, OutputActionBar, type OutputAction } from "../components/shared";
import { useFeedback } from "../hooks/useFeedback";
import { useRole } from "../hooks/useRole";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { useStreamingRequest } from "../hooks/useStreamingRequest";
import { serializeSupportPatternsToPlainText } from "./outputActionBarHelpers";
import type { DrillDownContext, SupportPatternsResponse, FamilyMessagePrefill, InterventionPrefill, RecurringTheme } from "../types";

interface Props {
  onFollowupClick: (prefill: FamilyMessagePrefill) => void;
  onInterventionClick: (prefill: InterventionPrefill) => void;
}

export default function SupportPatternsPanel({ onFollowupClick, onInterventionClick }: Props) {
  const { classrooms, activeClassroom, profile, students, showSuccess, showError, appendTomorrowNote, streaming, latestTodaySnapshot, setActiveTab } = useApp();
  const session = useSession();
  const { loading, error, result, execute, cancel, reset } = useAsyncAction<SupportPatternsResponse>({
    onError: (msg) => showError(`Couldn't analyze patterns — ${msg}`),
  });
  const streamer = useStreamingRequest({
    sectionLabels: ["Themes", "Follow-up gaps", "Suggested focus"],
  });
  const [resultKey, setResultKey] = useState(0);
  const [selectedAlias, setSelectedAlias] = useState<string | null>(null);
  const [drillDown, setDrillDown] = useState<DrillDownContext | null>(null);
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

  function handlePatternSegmentClick(payload: { axis: string; label: string; themes: RecurringTheme[] }) {
    const aliases = new Set<string>();
    for (const theme of payload.themes) {
      for (const alias of theme.student_refs) {
        aliases.add(alias);
      }
    }
    const roster: Array<{
      alias: string;
      eal_flag?: boolean;
      support_tags?: string[];
      family_language?: string;
    }> = profile?.students ?? students;
    const studentsInGroup = [...aliases].sort().map((alias) => {
      const rosterMatch = roster.find((student) => student.alias === alias);
      return {
        alias,
        eal_flag: rosterMatch?.eal_flag,
        support_tags: rosterMatch?.support_tags,
        family_language: rosterMatch?.family_language,
      };
    });
    setDrillDown({
      type: "student-tag-group",
      groupKind: "support_cluster",
      tag: payload.axis,
      label: payload.label,
      students: studentsInGroup,
    });
  }

  return (
    <section className="workspace-page">
      <PageIntro
        eyebrow="Review Workspace"
        title="Review Classroom Support Patterns"
        sectionTone="forest"
        description="Scan recurring themes, follow-up gaps, positive trends, and suggested focus areas across recent records without losing the evidence behind them."
      />

      <RoleReadOnlyBanner
        role={role}
        required="canGenerate"
        whatIsBlocked="Running pattern analysis is reserved for the classroom's permanent teacher."
      />

      {latestTodaySnapshot?.student_threads?.length ? (
        <StudentCoverageStrip
          threads={latestTodaySnapshot.student_threads}
          title="Support pattern coverage"
          selectedAlias={selectedAlias}
          onSelectThread={(thread) => setSelectedAlias(thread.alias)}
        />
      ) : null}

      <WorkspaceLayout
        splitState={result ? "output" : "input"}
        rail={(
          <>
            <ContextualHint
              featureKey="support-patterns"
              title="Support Patterns"
              description="Analyze your own intervention records to surface recurring themes, follow-up gaps, and positive trends. This reflects your documentation — not a diagnosis."
              tone="forest"
            />
            {role.canGenerate ? (
              <>
                <p className="form-hint">Pattern analysis reflects your own intervention and observation records — not external assessments or diagnoses.</p>
                <PatternReportForm
                  students={students}
                  selectedClassroom={activeClassroom}
                  onSubmit={handleSubmit}
                  loading={loading}
                  prefillStudent={selectedAlias}
                />
              </>
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
                  onPatternSegmentClick={handlePatternSegmentClick}
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
      <DrillDownDrawer
        context={drillDown}
        onClose={() => setDrillDown(null)}
        onNavigate={(tab) => {
          setDrillDown(null);
          setActiveTab(tab);
        }}
        onContextChange={setDrillDown}
        onInterventionPrefill={onInterventionClick}
        onMessagePrefill={onFollowupClick}
      />
    </section>
  );
}
