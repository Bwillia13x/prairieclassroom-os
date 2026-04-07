import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { generateComplexityForecast } from "../api";
import ForecastForm from "../components/ForecastForm";
import ForecastTimeline from "../components/ForecastTimeline";
import ForecastViewer from "../components/ForecastViewer";
import SkeletonLoader from "../components/SkeletonLoader";
import type { ComplexityForecastResponse } from "../types";

export default function ForecastPanel() {
  const { classrooms, activeClassroom, setActiveClassroom, showSuccess } = useApp();
  const { loading, error, result, execute } = useAsyncAction<ComplexityForecastResponse>();

  if (classrooms.length === 0) return null;

  async function handleSubmit(classroomId: string, teacherNotes?: string) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const forecastDate = tomorrow.toISOString().split("T")[0];

    const resp = await execute((signal) =>
      generateComplexityForecast({
        classroom_id: classroomId,
        forecast_date: forecastDate,
        teacher_notes: teacherNotes || undefined,
      }, signal)
    );
    if (resp) showSuccess("Forecast generated");
  }

  return (
    <div className={result ? "split-pane" : ""}>
      <ForecastForm
        classrooms={classrooms}
        selectedClassroom={activeClassroom}
        onClassroomChange={setActiveClassroom}
        onSubmit={handleSubmit}
        loading={loading}
      />
      <div aria-live="polite">
        {error && result === null && <div className="error-banner">{error}</div>}
        {loading && result === null && (
          <SkeletonLoader variant="stack" message="Generating complexity forecast with deep reasoning..." label="Generating complexity forecast" />
        )}
        {!loading && result === null && !error && (
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M4 36 Q12 22 20 30 Q28 18 36 26 Q40 22 44 28" stroke="var(--color-border)" strokeWidth="1.5" strokeLinecap="round"/><line x1="4" y1="38" x2="44" y2="38" stroke="var(--color-border)" strokeWidth="1.5"/><circle cx="14" cy="14" r="6" stroke="var(--color-accent)" strokeWidth="2" fill="none"/><path d="M14 11v6M11 14h6" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round"/><path d="M28 10a6 6 0 01-1 12h-2" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
            <div className="empty-state-title">No forecast yet</div>
            <p className="empty-state-description">
              Select a classroom and generate a per-block complexity forecast for tomorrow.
            </p>
          </div>
        )}
        {result && (
          <>
          <ForecastTimeline blocks={result.forecast.blocks} />
          <ForecastViewer
            forecast={result.forecast}
            thinkingSummary={result.thinking_summary}
            latencyMs={result.latency_ms}
            modelId={result.model_id}
          />
          </>
        )}
      </div>
    </div>
  );
}
