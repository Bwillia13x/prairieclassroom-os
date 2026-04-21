import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { generateComplexityForecast } from "../api";
import { parseRecordTimestamp } from "../utils/parseRecordTimestamp";
import ForecastForm from "../components/ForecastForm";
import OpsWorkflowStepper from "../components/OpsWorkflowStepper";
import NextStepBand from "../components/NextStepBand";
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
import DrillDownDrawer from "../components/DrillDownDrawer";
import { CoverageTimeline } from "../components/TriageSurfaces";
import { FeedbackCollector, OutputActionBar, Sparkline as SharedSparkline, type OutputAction } from "../components/shared";
import { ComplexityHeatmap } from "../components/DataVisualizations";
import { useFeedback } from "../hooks/useFeedback";
import { useRole } from "../hooks/useRole";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { useStreamingRequest } from "../hooks/useStreamingRequest";
import { serializeForecastToPlainText } from "./outputActionBarHelpers";
import type { ComplexityBlock, ComplexityForecastResponse, DrillDownContext } from "../types";

export default function ForecastPanel() {
  const { classrooms, activeClassroom, showSuccess, appendTomorrowNote, streaming, latestTodaySnapshot, profile, setActiveTab } = useApp();
  const session = useSession();
  const { loading, error, result, execute, cancel, reset } = useAsyncAction<ComplexityForecastResponse>();
  const [drillDown, setDrillDown] = useState<DrillDownContext | null>(null);
  const streamer = useStreamingRequest({
    sectionLabels: ["Block analysis", "Complexity curves", "Risk assessment"],
  });
  const feedback = useFeedback(activeClassroom, session.sessionId);
  const { copy } = useCopyToClipboard();
  const role = useRole();
  const previewBlocks = useMemo<ComplexityBlock[]>(
    () => (profile?.schedule ?? []).map((block, index) => ({
      time_slot: block.time_slot,
      activity: block.activity,
      level: index % 3 === 1 ? "medium" : "low",
      contributing_factors: block.ea_available ? ["EA scheduled in this block"] : ["Support coverage may need staging"],
      suggested_mitigation: "Stage the opening move and keep the transition cue close.",
    })),
    [profile?.schedule],
  );

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

  function handleTimelineBlockClick(index: number) {
    const block = result?.forecast.blocks[index] ?? latestTodaySnapshot?.latest_forecast?.blocks[index];
    if (block) {
      setDrillDown({ type: "forecast-block", blockIndex: index, block });
      return;
    }

    const scheduleBlock = profile?.schedule?.[index];
    if (!scheduleBlock) return;
    const watchpoints = (latestTodaySnapshot?.latest_plan?.transition_watchpoints ?? [])
      .filter((watchpoint) => {
        const text = `${scheduleBlock.time_slot} ${scheduleBlock.activity}`.toLowerCase();
        return text.includes(watchpoint.time_or_activity.toLowerCase());
      })
      .map((watchpoint) => watchpoint.risk_description);

    if (watchpoints.length > 0) {
      setDrillDown({
        type: "plan-coverage-section",
        section: "watchpoints",
        label: `${scheduleBlock.time_slot} · ${scheduleBlock.activity}`,
        items: watchpoints,
      });
    }
  }

  return (
    <section className="workspace-page">
      <PageIntro
        title="Forecast Tomorrow's Complexity"
        sectionTone="slate"
        description="Preview where the day will spike, which blocks need proactive mitigation, and what classroom conditions will shape the day before students arrive."
        infoContent={{
          title: "Complexity Forecast",
          body: (
            <p>
              Preview where the day will spike block-by-block. Inputs are
              retrieval-backed from the classroom's recent history; teacher notes
              refine the forecast without overriding the underlying signal.
            </p>
          ),
        }}
      />

      <RoleReadOnlyBanner
        role={role}
        required="canGenerate"
        whatIsBlocked="Generating a new forecast is reserved for the classroom's permanent teacher. Substitutes and reviewers can read the latest forecast."
      />

      <OpsWorkflowStepper activeTab="complexity-forecast" />

      <CoverageTimeline
        title="Forecast timeline"
        schedule={profile?.schedule}
        forecastBlocks={result?.forecast.blocks ?? latestTodaySnapshot?.latest_forecast?.blocks}
        watchpoints={latestTodaySnapshot?.latest_plan?.transition_watchpoints}
        unresolvedFollowups={latestTodaySnapshot?.debt_register.item_count_by_category.stale_followup ?? 0}
        onBlockClick={handleTimelineBlockClick}
      />

      <WorkspaceLayout
        splitState={result ? "output" : "input"}
        rail={(
          role.canGenerate ? (
            <ForecastForm
              selectedClassroom={activeClassroom}
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
              <>
                {previewBlocks.length > 0 ? <ComplexityHeatmap blocks={previewBlocks} /> : null}
                <EmptyStateCard
                  variant="sample"
                  label="Sample forecast block"
                  sampleNode={(
                    <div className="forecast-block forecast-block--high" aria-hidden="true">
                      <div className="forecast-block-header">
                        <span className="forecast-block-time">10:15–11:00</span>
                        <span className="forecast-block-level forecast-block-level--high">
                          {"\u26C8"} High
                        </span>
                      </div>
                      <div className="forecast-block-activity">Math — long division block</div>
                      <ul className="forecast-block-factors">
                        <li>EA out for the block</li>
                        <li>Two students returning from a transition</li>
                      </ul>
                      <p className="forecast-block-mitigation">
                        Front-load the worked example, hold a brain-break before independent practice.
                      </p>
                    </div>
                  )}
                />
              </>
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
                <NextStepBand label="Build EA Briefing" targetTab="ea-briefing" />
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
