import { useCallback, useEffect, useState } from "react";
import "./EALoadPanel.css";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { generateEALoadProfile } from "../api";
import { parseRecordTimestamp } from "../utils/parseRecordTimestamp";
import SkeletonLoader from "../components/SkeletonLoader";
import StreamingIndicator from "../components/StreamingIndicator";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import EmptyStateCard from "../components/EmptyStateCard";
import EmptyStateIllustration from "../components/EmptyStateIllustration";
import ErrorBanner from "../components/ErrorBanner";
import ResultBanner from "../components/ResultBanner";
import MockModeBanner from "../components/MockModeBanner";
import RetrievalTraceCard from "../components/RetrievalTraceCard";
import { FeedbackCollector } from "../components/shared";
import { EALoadStackedBars } from "../components/DataVisualizations";
import { useFeedback } from "../hooks/useFeedback";
import { useStreamingRequest } from "../hooks/useStreamingRequest";
import type { ClassroomProfile, EALoadBlock, EALoadLevel, EALoadResponse } from "../types";

// Tomorrow, formatted for the date input (YYYY-MM-DD).
function defaultTargetDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function loadBadgeTone(level: EALoadLevel): string {
  switch (level) {
    case "low":
      return "leaf";
    case "medium":
      return "sun";
    case "high":
      return "rose";
    case "break":
      return "slate";
  }
}

function loadLabel(level: EALoadLevel): string {
  return level === "break" ? "no EA" : level.toUpperCase();
}

interface EALoadFormProps {
  classrooms: ClassroomProfile[];
  selectedClassroom: string | null;
  onClassroomChange: (id: string) => void;
  onSubmit: (classroomId: string, targetDate: string, teacherNotes?: string) => Promise<void>;
  loading: boolean;
}

function EALoadForm({
  classrooms,
  selectedClassroom,
  onClassroomChange,
  onSubmit,
  loading,
}: EALoadFormProps) {
  const [targetDate, setTargetDate] = useState(defaultTargetDate());
  const [teacherNotes, setTeacherNotes] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClassroom) return;
    void onSubmit(selectedClassroom, targetDate, teacherNotes.trim() || undefined);
  };

  return (
    <form className="workspace-form" onSubmit={handleSubmit} aria-label="EA load profile form">
      <label className="workspace-form__field">
        <span className="workspace-form__label">Classroom</span>
        <select
          value={selectedClassroom ?? ""}
          onChange={(event) => onClassroomChange(event.target.value)}
          disabled={loading}
          required
        >
          <option value="" disabled>
            Select a classroom
          </option>
          {classrooms.map((c) => (
            <option key={c.classroom_id} value={c.classroom_id}>
              Grade {c.grade_band} — {c.subject_focus.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>

      <label className="workspace-form__field">
        <span className="workspace-form__label">Target date</span>
        <input
          type="date"
          value={targetDate}
          onChange={(event) => setTargetDate(event.target.value)}
          disabled={loading}
          required
        />
      </label>

      <label className="workspace-form__field">
        <span className="workspace-form__label">Teacher notes (optional)</span>
        <textarea
          value={teacherNotes}
          onChange={(event) => setTeacherNotes(event.target.value)}
          disabled={loading}
          rows={4}
          placeholder="Anything known about tomorrow that affects EA coverage — shortened window, coverage swap, unusual routine..."
        />
      </label>

      <button type="submit" className="workspace-form__submit" disabled={loading || !selectedClassroom}>
        {loading ? "Generating load profile…" : "Generate load profile"}
      </button>

      <p className="workspace-form__helper">
        Uses the planning tier (thinking on). Suggestions are operational only — the teacher and EA decide
        what moves.
      </p>
    </form>
  );
}

interface EALoadBlockCardProps {
  block: EALoadBlock;
}

function EALoadBlockCard({ block }: EALoadBlockCardProps) {
  const tone = loadBadgeTone(block.load_level);
  return (
    <article className={`ea-load-block ea-load-block--${tone}`}>
      <header className="ea-load-block__header">
        <span className="ea-load-block__time">{block.time_slot}</span>
        <span className={`ea-load-block__badge ea-load-block__badge--${tone}`}>
          {loadLabel(block.load_level)}
        </span>
      </header>
      <h3 className="ea-load-block__activity">{block.activity}</h3>
      {block.supported_students.length > 0 ? (
        <p className="ea-load-block__supported">
          <strong>Supporting:</strong> {block.supported_students.join(", ")}
        </p>
      ) : null}
      {block.load_factors.length > 0 ? (
        <ul className="ea-load-block__factors">
          {block.load_factors.map((factor, index) => (
            <li key={index}>{factor}</li>
          ))}
        </ul>
      ) : null}
      {block.redistribution_suggestion ? (
        <p className="ea-load-block__suggestion">
          <strong>Consider:</strong> {block.redistribution_suggestion}
        </p>
      ) : null}
    </article>
  );
}

interface EALoadViewerProps {
  response: EALoadResponse;
}

function EALoadViewer({ response }: EALoadViewerProps) {
  const { profile } = response;
  return (
    <div className="ea-load-viewer">
      {profile.blocks.length > 0 && (
        <EALoadStackedBars blocks={profile.blocks} />
      )}

      {profile.overall_summary ? (
        <section className="ea-load-viewer__summary" aria-label="Overall summary">
          <h2>Overall summary</h2>
          <p>{profile.overall_summary}</p>
        </section>
      ) : null}

      {profile.alerts.length > 0 ? (
        <section className="ea-load-viewer__alerts" aria-label="Load alerts">
          <h2>Load alerts</h2>
          <ul>
            {profile.alerts.map((alert, index) => (
              <li key={index}>{alert}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="ea-load-viewer__blocks" aria-label="Per-block load">
        <h2>Per-block load</h2>
        <div className="ea-load-viewer__blocks-grid">
          {profile.blocks.map((block, index) => (
            <EALoadBlockCard key={`${block.time_slot}-${index}`} block={block} />
          ))}
        </div>
      </section>

      {profile.highest_load_block ? (
        <p className="ea-load-viewer__highest">
          <strong>Highest-load block:</strong> {profile.highest_load_block}
        </p>
      ) : null}
    </div>
  );
}

export default function EALoadPanel() {
  const { classrooms, activeClassroom, setActiveClassroom, profile, showSuccess, streaming } = useApp();
  const session = useSession();
  const { loading, error, result, execute, cancel, reset } = useAsyncAction<EALoadResponse>();
  const streamer = useStreamingRequest({
    sectionLabels: ["Schedule analysis", "Load curves", "Redistribution"],
  });
  const feedback = useFeedback(activeClassroom, session.sessionId);

  useEffect(() => {
    session.recordPanelVisit("ea-load");
  }, [session]);

  const handleFeedbackSubmit = useCallback(
    (rating: number, comment?: string) => {
      feedback.submit("ea-load", rating, comment, result?.profile.load_id, "balance_ea_load");
      session.recordFeedback();
    },
    [feedback, result, session],
  );

  if (classrooms.length === 0) return null;

  async function handleSubmit(classroomId: string, targetDate: string, teacherNotes?: string) {
    const resp = await streamer.execute(() =>
      execute((signal) =>
        generateEALoadProfile(
          {
            classroom_id: classroomId,
            target_date: targetDate,
            teacher_notes: teacherNotes,
          },
          signal,
        ),
      ),
    );
    if (resp) {
      showSuccess("EA load profile generated");
      session.recordGeneration("ea-load", "balance_ea_load");
    }
  }

  return (
    <section className="workspace-page">
      <PageIntro
        eyebrow="Operations Workspace"
        title="Balance EA Cognitive Load"
        sectionTone="slate"
        sectionIcon="grid"
        breadcrumb={{ group: "Ops", tab: "EA Load" }}
        description="Surface the per-block EA load for tomorrow and flag sequences of sustained high demand without a recovery window. Operational framing only — suggestions never score EA competence."
        badges={[
          { label: profile ? `Grade ${profile.grade_band}` : "EA load suite", tone: "sun" },
          { label: "Block-by-block load", tone: "analysis" },
          { label: "Retrieval-backed", tone: "slate" },
        ]}
      />

      <WorkspaceLayout
        rail={(
          <EALoadForm
            classrooms={classrooms}
            selectedClassroom={activeClassroom}
            onClassroomChange={setActiveClassroom}
            onSubmit={handleSubmit}
            loading={loading}
          />
        )}
        canvas={(
          <div className="workspace-result" aria-live="polite" aria-busy={loading && result === null}>
            {error && result === null ? <ErrorBanner message={error} onDismiss={reset} /> : null}
            {loading && result === null ? (
              streaming.phase !== "idle" ? (
                <StreamingIndicator onCancel={cancel} />
              ) : (
                <SkeletonLoader
                  variant="stack"
                  message="Modeling tomorrow's EA load with deep reasoning..."
                  label="Generating EA load profile"
                />
              )
            ) : null}
            {!loading && result === null && !error ? (
              <EmptyStateCard
                icon={<EmptyStateIllustration name="forecast" />}
                title="No EA load profile yet"
                description="Run the load balancer once tomorrow's schedule, EA coverage, and any day-specific notes are ready. The canvas will show each block and flag sustained high-load sequences."
              />
            ) : null}
            {result ? (
              <>
                <ResultBanner
                  label="EA load profile generated"
                  generatedAt={parseRecordTimestamp(result.profile.load_id)}
                  latencyMs={result.latency_ms || undefined}
                />
                <MockModeBanner
                  modelId={result.model_id}
                  panelHint="Block load assignments and rebalancing suggestions are static fixture in mock mode. Run with Ollama or hosted Gemini to see real load balancing."
                />
                <EALoadViewer response={result} />
                <RetrievalTraceCard trace={result.retrieval_trace} />
                <FeedbackCollector
                  onSubmit={handleFeedbackSubmit}
                  submitted={feedback.submitted}
                  panelLabel="EA load balancer"
                />
              </>
            ) : null}
          </div>
        )}
      />
    </section>
  );
}
