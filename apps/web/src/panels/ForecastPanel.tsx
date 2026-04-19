import { useCallback, useEffect, useMemo } from "react";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { generateComplexityForecast } from "../api";
import { parseRecordTimestamp } from "../utils/parseRecordTimestamp";
import ForecastForm from "../components/ForecastForm";
import ForecastTimeline from "../components/ForecastTimeline";
import ForecastViewer from "../components/ForecastViewer";
import SkeletonLoader from "../components/SkeletonLoader";
import StreamingIndicator from "../components/StreamingIndicator";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import EmptyStateCard from "../components/EmptyStateCard";
import ErrorBanner from "../components/ErrorBanner";
import ResultBanner from "../components/ResultBanner";
import MockModeBanner from "../components/MockModeBanner";
import RetrievalTraceCard from "../components/RetrievalTraceCard";
import RoleReadOnlyBanner from "../components/RoleReadOnlyBanner";
import { FeedbackCollector, OutputActionBar, Sparkline as SharedSparkline, type OutputAction } from "../components/shared";
import { ComplexityHeatmap } from "../components/DataVisualizations";
import { useFeedback } from "../hooks/useFeedback";
import { useRole } from "../hooks/useRole";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { useStreamingRequest } from "../hooks/useStreamingRequest";
import { serializeForecastToPlainText } from "./outputActionBarHelpers";
import type { ComplexityForecastResponse } from "../types";

export default function ForecastPanel() {
  const { classrooms, activeClassroom, setActiveClassroom, profile, showSuccess, appendTomorrowNote, streaming } = useApp();
  const session = useSession();
  const { loading, error, result, execute, cancel, reset } = useAsyncAction<ComplexityForecastResponse>();
  const streamer = useStreamingRequest({
    sectionLabels: ["Block analysis", "Complexity curves", "Risk assessment"],
  });
  const feedback = useFeedback(activeClassroom, session.sessionId);
  const { copy } = useCopyToClipboard();
  const role = useRole();

  const actions = useMemo<OutputAction[]>(() => {
    if (!result) return [];
    const forecast = result.forecast;
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
          await copy(serializeForecastToPlainText(forecast));
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
            sourcePanel: "complexity-forecast",
            sourceType: "forecast_complexity",
            summary: `Forecast for ${forecast.forecast_date}: highest risk ${forecast.highest_risk_block}`,
          });
          showSuccess("Saved to Tomorrow Plan");
        },
      },
    ];
  }, [result, copy, appendTomorrowNote, showSuccess]);

  useEffect(() => {
    session.recordPanelVisit("complexity-forecast");
  }, [session]);

  const handleFeedbackSubmit = useCallback(
    (rating: number, comment?: string) => {
      feedback.submit("complexity-forecast", rating, comment, result?.forecast.forecast_id, "forecast_complexity");
      session.recordFeedback();
    },
    [feedback.submit, result, session],
  );

  if (classrooms.length === 0) return null;

  async function handleSubmit(classroomId: string, teacherNotes?: string) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const forecastDate = tomorrow.toISOString().split("T")[0];

    const resp = await streamer.execute((stream) =>
      execute((signal) =>
        generateComplexityForecast({
          classroom_id: classroomId,
          forecast_date: forecastDate,
          teacher_notes: teacherNotes || undefined,
        }, signal, stream)
      )
    );
    if (resp) {
      showSuccess("Forecast generated");
      session.recordGeneration("complexity-forecast", "forecast_complexity");
    }
  }

  return (
    <section className="workspace-page">
      <PageIntro
        eyebrow="Operations Workspace"
        title="Forecast Tomorrow's Complexity"
        sectionTone="slate"
        sectionIcon="grid"
        breadcrumb={{ group: "Ops", tab: "Forecast" }}
        description="Preview where the day will spike, which blocks need proactive mitigation, and what classroom conditions will shape the day before students arrive."
        badges={[
          { label: profile ? `Grade ${profile.grade_band}` : "Forecast suite", tone: "sun" },
          { label: "Block-by-block outlook", tone: "analysis" },
          { label: "Retrieval-backed inputs", tone: "slate" },
        ]}
      />

      <RoleReadOnlyBanner
        role={role}
        required="canGenerate"
        whatIsBlocked="Generating a new forecast is reserved for the classroom's permanent teacher. Substitutes and reviewers can read the latest forecast."
      />

      <WorkspaceLayout
        rail={(
          role.canGenerate ? (
            <ForecastForm
              classrooms={classrooms}
              selectedClassroom={activeClassroom}
              onClassroomChange={setActiveClassroom}
              onSubmit={handleSubmit}
              loading={loading}
            />
          ) : null
        )}
        canvas={(
          <div className="workspace-result" aria-live="polite" aria-busy={loading && result === null}>
            {error && result === null ? <ErrorBanner message={error} onDismiss={reset} /> : null}
            {loading && result === null ? (
              streaming.phase !== "idle"
                ? <StreamingIndicator onCancel={cancel} />
                : <SkeletonLoader variant="stack" message="Generating complexity forecast with deep reasoning..." label="Generating complexity forecast" />
            ) : null}
            {!loading && result === null && !error ? (
              <EmptyStateCard
                variant="minimal"
                cue="No forecast yet."
                hint="Run the forecast once the classroom and any day-specific notes are ready."
              />
            ) : null}
            {result ? (
              <>
                <ResultBanner
                  label="Forecast generated"
                  generatedAt={parseRecordTimestamp(result.forecast.forecast_id)}
                  latencyMs={result.latency_ms || undefined}
                />
                <MockModeBanner
                  modelId={result.model_id}
                  panelHint="Block-by-block complexity ratings come from a static fixture in mock mode and do not adapt to your schedule or classroom history. Run with Ollama or hosted Gemini to see real forecasting."
                />
                <ForecastTimeline blocks={result.forecast.blocks} />
                <ComplexityHeatmap blocks={result.forecast.blocks} />
                {result.forecast.blocks.length >= 2 && (
                  <div className="forecast-trend-sparkline">
                    <SharedSparkline
                      data={result.forecast.blocks.map((b) => {
                        const levelMap: Record<string, number> = { low: 1, medium: 2, high: 3 };
                        return levelMap[b.level] ?? 0;
                      })}
                      label="Block complexity trend"
                    />
                  </div>
                )}
                <ForecastViewer forecast={result.forecast} thinkingSummary={result.thinking_summary} meta={result} />
                <RetrievalTraceCard trace={result.retrieval_trace} />
                <FeedbackCollector
                  onSubmit={handleFeedbackSubmit}
                  submitted={feedback.submitted}
                  panelLabel="complexity forecast"
                />
                <OutputActionBar actions={actions} contextLabel="Forecast output" />
              </>
            ) : null}
          </div>
        )}
      />
    </section>
  );
}
