import { useCallback, useEffect, useMemo, useState } from "react";
import "./EALoadPanel.css";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { generateEALoadProfile } from "../api";
import { parseRecordTimestamp } from "../utils/parseRecordTimestamp";
import OpsWorkflowStepper from "../components/OpsWorkflowStepper";
import { formatTargetDate } from "../utils/formatTargetDate";
import SkeletonLoader from "../components/SkeletonLoader";
import StreamingIndicator from "../components/StreamingIndicator";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import EmptyStateCard from "../components/EmptyStateCard";
import ErrorBanner from "../components/ErrorBanner";
import ResultBanner from "../components/ResultBanner";
import MockModeBanner from "../components/MockModeBanner";
import RetrievalTraceCard from "../components/RetrievalTraceCard";
import DrillDownDrawer from "../components/DrillDownDrawer";
import { CoverageTimeline } from "../components/TriageSurfaces";
import { ActionButton, FeedbackCollector, FormCard } from "../components/shared";
import { EALoadStackedBars } from "../components/DataVisualizations";
import { useFeedback } from "../hooks/useFeedback";
import { useStreamingRequest } from "../hooks/useStreamingRequest";
import type { DrillDownContext, EALoadBlock, EALoadLevel, EALoadResponse } from "../types";

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
  selectedClassroom: string | null;
  onSubmit: (classroomId: string, targetDate: string, teacherNotes?: string) => Promise<void>;
  loading: boolean;
}

function EALoadForm({
  selectedClassroom,
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
    <FormCard className="ea-load-form" as="section">
      <form onSubmit={handleSubmit} aria-label="EA load profile form">
        <div className="field">
          <label htmlFor="ea-load-target-date" className="form-label">Target date</label>
          <input
            id="ea-load-target-date"
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
            disabled={loading}
            required
          />
          {/* 2026-04-19 OPS audit phase 5: TZ-safe formatted caption so
              teachers see "Tue, Apr 21, 2026" instead of MM/DD/YYYY. */}
          {targetDate ? (
            <span className="form-caption" aria-live="polite">
              Selected: {formatTargetDate(targetDate)}
            </span>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="ea-load-notes" className="form-label">Teacher notes (optional)</label>
          <textarea
            id="ea-load-notes"
            value={teacherNotes}
            onChange={(event) => setTeacherNotes(event.target.value)}
            disabled={loading}
            rows={4}
            placeholder="Anything known about tomorrow that affects EA coverage — shortened window, coverage swap, unusual routine..."
          />
        </div>

        <ActionButton
          type="submit"
          variant="primary"
          loading={loading}
          disabled={!selectedClassroom}
        >
          {loading ? "Generating load profile…" : "Generate load profile"}
        </ActionButton>

        {/* 2026-04-19 OPS audit phase 5: the operational-only disclaimer
            relocates from the form to the viewer. The short "planning tier"
            helper stays because it sets the expectation for generate
            latency — different concern from the output disclaimer. */}
        <p className="form-hint">Uses the planning tier (thinking on).</p>
      </form>
    </FormCard>
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

      {/* 2026-04-19 OPS audit phase 5: disclaimer relocates here so the
          framing stays next to the output instead of cluttering the
          pre-submit form. Never score EA competence — that framing now
          anchors to the thing being shown, not the thing being entered. */}
      <p className="ea-load-viewer__disclaimer">
        Operational framing only — suggestions never score EA competence. The teacher and EA
        decide what moves.
      </p>

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
  const { classrooms, activeClassroom, showSuccess, showError, streaming, latestTodaySnapshot, profile, setActiveTab } = useApp();
  const session = useSession();
  const { loading, error, result, execute, cancel, reset } = useAsyncAction<EALoadResponse>({
    onError: (msg) => showError(`Couldn't balance EA load — ${msg}`),
  });
  const [drillDown, setDrillDown] = useState<DrillDownContext | null>(null);
  const streamer = useStreamingRequest({
    sectionLabels: ["Schedule analysis", "Load curves", "Redistribution"],
  });
  const feedback = useFeedback(activeClassroom, session.sessionId);
  const previewBlocks = useMemo<EALoadBlock[]>(
    () => (profile?.schedule ?? []).map((block, index) => ({
      time_slot: block.time_slot,
      activity: block.activity,
      load_level: !block.ea_available ? "break" : index % 3 === 1 ? "high" : index % 3 === 0 ? "medium" : "low",
      supported_students: !block.ea_available ? [] : index % 3 === 1 ? ["Student A", "Student C"] : index % 3 === 0 ? ["Student B"] : [],
      load_factors: !block.ea_available ? ["EA unavailable in this block"] : ["Plan transitions and regulation checks early"],
      redistribution_suggestion: block.ea_available ? "Shift a check-in earlier so the block opens calmer." : undefined,
      ea_available: Boolean(block.ea_available),
    })),
    [profile?.schedule],
  );

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
    const resp = await streamer.execute((stream) =>
      execute((signal) =>
        generateEALoadProfile(
          {
            classroom_id: classroomId,
            target_date: targetDate,
            teacher_notes: teacherNotes,
          },
          signal,
          stream,
        ),
      ),
    );
    if (resp) {
      showSuccess("EA load profile generated");
      session.recordGeneration("ea-load", "balance_ea_load");
    }
  }

  function handleTimelineBlockClick(index: number) {
    const block = result?.profile.blocks[index];
    if (block) {
      setDrillDown({ type: "ea-load-block", blockIndex: index, block });
      return;
    }

    const forecastBlock = latestTodaySnapshot?.latest_forecast?.blocks[index];
    if (forecastBlock) {
      setDrillDown({ type: "forecast-block", blockIndex: index, block: forecastBlock });
    }
  }

  return (
    <section className="workspace-page">
      <PageIntro
        title="Balance EA Cognitive Load"
        sectionTone="slate"
        description="Surface the per-block EA load for tomorrow and flag sequences of sustained high demand without a recovery window. Operational framing only — suggestions never score EA competence."
        infoContent={{
          title: "EA Load Balance",
          body: (
            <p>
              Pick the target day and classroom, and the model surfaces per-block EA
              load with recovery windows. Suggestions never score EA competence — they
              only flag operational sequences that need rebalancing.
            </p>
          ),
        }}
      />

      <OpsWorkflowStepper activeTool="ea-load" />

      <CoverageTimeline
        title="EA load timeline"
        schedule={profile?.schedule}
        forecastBlocks={latestTodaySnapshot?.latest_forecast?.blocks}
        eaLoadBlocks={result?.profile.blocks}
        watchpoints={latestTodaySnapshot?.latest_plan?.transition_watchpoints}
        unresolvedFollowups={latestTodaySnapshot?.debt_register.item_count_by_category.stale_followup ?? 0}
        onBlockClick={handleTimelineBlockClick}
      />

      <WorkspaceLayout
        splitState={result ? "output" : "input"}
        rail={(
          <EALoadForm
            selectedClassroom={activeClassroom}
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
              <>
                {previewBlocks.length > 0 ? <EALoadStackedBars blocks={previewBlocks} /> : null}
                <EmptyStateCard
                  variant="sample"
                  label="Sample EA load block"
                  sampleNode={(
                    <article className="ea-load-block ea-load-block--rose" aria-hidden="true">
                      <header className="ea-load-block__header">
                        <span className="ea-load-block__time">9:30–10:15</span>
                        <span className="ea-load-block__badge ea-load-block__badge--rose">
                          HIGH
                        </span>
                      </header>
                      <h3 className="ea-load-block__activity">Reading rotations</h3>
                      <p className="ea-load-block__supported">
                        <strong>Supporting:</strong> Student A, Student C
                      </p>
                      <ul className="ea-load-block__factors">
                        <li>Two regulation check-ins likely during station rotation</li>
                        <li>One student returning from morning transition</li>
                      </ul>
                      <p className="ea-load-block__suggestion">
                        <strong>Consider:</strong> stagger the rotation so the EA can settle the late-arriver before the second station starts.
                      </p>
                    </article>
                  )}
                />
              </>
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
