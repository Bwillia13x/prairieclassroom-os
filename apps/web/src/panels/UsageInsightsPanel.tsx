import { useEffect } from "react";
import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { fetchFeedbackSummary, fetchSessionSummary } from "../api";
import type { FeedbackSummary, SessionSummary } from "../api";
import { StatusCard, ProgressBar, Sparkline } from "../components/shared";
import { WorkflowFlowStrip } from "../components/DataVisualizations";
import PageIntro from "../components/PageIntro";
import "./UsageInsightsPanel.css";

export default function UsageInsightsPanel() {
  const { activeClassroom } = useApp();

  const feedback = useAsyncAction<FeedbackSummary>();
  const sessions = useAsyncAction<SessionSummary>();

  useEffect(() => {
    if (!activeClassroom) return;
    feedback.execute((signal) => fetchFeedbackSummary(activeClassroom, signal));
    sessions.execute((signal) => fetchSessionSummary(activeClassroom, signal));
  }, [activeClassroom, feedback.execute, sessions.execute]);

  const feedbackStatus = feedback.loading
    ? "loading" as const
    : feedback.error
      ? "error" as const
      : feedback.result
        ? "success" as const
        : "empty" as const;

  const sessionStatus = sessions.loading
    ? "loading" as const
    : sessions.error
      ? "error" as const
      : sessions.result
        ? "success" as const
        : "empty" as const;

  const panelEntries = feedback.result
    ? Object.entries(feedback.result.by_panel).sort(([, a], [, b]) => b.count - a.count)
    : [];

  const maxPanelCount = panelEntries.length > 0
    ? Math.max(...panelEntries.map(([, v]) => v.count))
    : 1;

  const weeklyRatings = feedback.result?.by_week?.map((w) => w.avg_rating) ?? [];
  const weightedAverageRating = feedback.result && feedback.result.by_week.length > 0
    ? (() => {
        const totals = feedback.result.by_week.reduce(
          (acc, week) => ({
            count: acc.count + week.count,
            weightedRating: acc.weightedRating + (week.avg_rating * week.count),
          }),
          { count: 0, weightedRating: 0 },
        );
        return totals.count > 0 ? (totals.weightedRating / totals.count).toFixed(1) : "—";
      })()
    : "—";

  return (
    <section className="workspace-page usage-insights-panel">
      <PageIntro
        eyebrow="Review"
        title="Usage Insights"
        description="How your classroom uses PrairieClassroom. This view summarises feedback ratings and workflow patterns to help you reflect on which tools are most useful."
        sectionTone="forest"
      />

      {(feedback.result || sessions.result) && (
        <div className="usage-insights-summary-row" data-testid="usage-summary-row">
          {feedback.result && (
            <>
              <div className="usage-insights-summary-stat">
                <span className="usage-insights-summary-value">{feedback.result.total}</span>
                <span className="usage-insights-summary-label">Feedback</span>
              </div>
              <div className="usage-insights-summary-stat">
                <span className="usage-insights-summary-value">
                  {weightedAverageRating}
                </span>
                <span className="usage-insights-summary-label">Avg Rating</span>
              </div>
            </>
          )}
          {sessions.result && (
            <>
              <div className="usage-insights-summary-stat">
                <span className="usage-insights-summary-value">{sessions.result.total_sessions}</span>
                <span className="usage-insights-summary-label">Sessions</span>
              </div>
              <div className="usage-insights-summary-stat">
                <span className="usage-insights-summary-value">{sessions.result.generations_per_session.toFixed(1)}</span>
                <span className="usage-insights-summary-label">Gen / Session</span>
              </div>
            </>
          )}
        </div>
      )}

      <div className="usage-insights-grid">
        <StatusCard
          title="Feedback Overview"
          status={feedbackStatus}
          errorMessage={feedback.error ?? undefined}
          emptyTitle="No feedback yet"
          emptyDescription="Feedback will appear here once you rate outputs across different panels."
        >
          {feedback.result && (
            <>
              <div className="usage-insights-stat">
                <span className="usage-insights-stat__value">{feedback.result.total}</span>
                <span className="usage-insights-stat__label">total ratings</span>
              </div>

              {weeklyRatings.length >= 2 && (
                <div className="usage-insights-sparkline-row">
                  <span className="usage-insights-sparkline-label">Weekly trend</span>
                  <Sparkline data={weeklyRatings} label="Weekly average rating trend" />
                </div>
              )}

              {panelEntries.length > 0 && (
                <div className="usage-insights-breakdown">
                  {panelEntries.map(([panelId, data]) => (
                    <div key={panelId} className="usage-insights-breakdown__row">
                      <span className="usage-insights-breakdown__panel-name">{formatPanelName(panelId)}</span>
                      <div className="usage-insights-breakdown__bar">
                        <ProgressBar
                          value={data.count}
                          max={maxPanelCount}
                          label={`${formatPanelName(panelId)}: ${data.count} ratings, avg ${data.avg_rating.toFixed(1)}`}
                        />
                      </div>
                      <span className="usage-insights-breakdown__count">{data.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </StatusCard>

        <StatusCard
          title="Workflow Patterns"
          status={sessionStatus}
          errorMessage={sessions.error ?? undefined}
          emptyTitle="No sessions recorded"
          emptyDescription="Session patterns will appear here as you use PrairieClassroom workflows."
        >
          {sessions.result && (
            <>
              <div className="usage-insights-stat">
                <span className="usage-insights-stat__value">{sessions.result.total_sessions}</span>
                <span className="usage-insights-stat__label">total sessions</span>
              </div>

              <p className="usage-insights-duration">
                Average session: <strong>{sessions.result.avg_duration_minutes.toFixed(1)} min</strong>
                {" / "}
                {sessions.result.generations_per_session.toFixed(1)} generations per session
              </p>

              {sessions.result.common_flows.length > 0 && (
                <>
                  <p className="usage-insights-sparkline-label" style={{ marginTop: "var(--ds-space-3, var(--space-3))" }}>
                    Common workflows
                  </p>
                  <WorkflowFlowStrip flows={sessions.result.common_flows.slice(0, 5)} />
                  <ol className="usage-insights-flow-list">
                    {sessions.result.common_flows.slice(0, 5).map((flow, i) => (
                      <li key={i}>
                        {flow.sequence.map(formatPanelName).join(" \u2192 ")}
                        <span className="usage-insights-flow-count">({flow.count}x)</span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </>
          )}
        </StatusCard>
      </div>
    </section>
  );
}

function formatPanelName(id: string): string {
  return id
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
