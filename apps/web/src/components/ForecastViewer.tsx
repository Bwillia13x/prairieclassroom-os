// apps/web/src/components/ForecastViewer.tsx
import type { ComplexityForecast } from "../types";
import "./ForecastViewer.css";

interface Props {
  forecast: ComplexityForecast;
  thinkingSummary: string | null;
  latencyMs: number;
  modelId: string;
}

const LEVEL_ICON: Record<string, string> = {
  low: "\u2600",
  medium: "\u26C5",
  high: "\u26C8",
};

const LEVEL_LABEL: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export default function ForecastViewer({ forecast, thinkingSummary, latencyMs, modelId }: Props) {
  return (
    <div className="forecast-viewer">
      <header className="forecast-header">
        <h2>Complexity Forecast</h2>
        <p className="forecast-meta">
          {forecast.classroom_id} &middot; {forecast.forecast_date} &middot; {Math.round(latencyMs)}ms &middot; {modelId}
          {forecast.schema_version && ` \u00B7 v${forecast.schema_version}`}
        </p>
      </header>

      {thinkingSummary && (
        <details className="forecast-thinking">
          <summary>Model Thinking</summary>
          <pre>{thinkingSummary}</pre>
        </details>
      )}

      <section className="forecast-section forecast-section--summary">
        <p className="forecast-summary-text">{forecast.overall_summary}</p>
        {forecast.highest_risk_block && (
          <p className="forecast-risk-callout">
            Highest risk: <strong>{forecast.highest_risk_block}</strong>
          </p>
        )}
      </section>

      {forecast.blocks.length > 0 && (
        <section className="forecast-section forecast-section--timeline">
          <h3>Day Timeline</h3>
          <div className="forecast-blocks">
            {forecast.blocks.map((block, i) => (
              <div
                key={i}
                className={`forecast-block forecast-block--${block.level}`}
                aria-label={`${block.time_slot}: ${LEVEL_LABEL[block.level]} complexity`}
              >
                <div className="forecast-block-header">
                  <span className="forecast-block-time">{block.time_slot}</span>
                  <span className={`forecast-block-level forecast-block-level--${block.level}`}>
                    {LEVEL_ICON[block.level]} {LEVEL_LABEL[block.level]}
                  </span>
                </div>
                <div className="forecast-block-activity">{block.activity}</div>
                {block.contributing_factors.length > 0 && (
                  <ul className="forecast-block-factors">
                    {block.contributing_factors.map((f, j) => (
                      <li key={j}>{f}</li>
                    ))}
                  </ul>
                )}
                <p className="forecast-block-mitigation">{block.suggested_mitigation}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <button className="forecast-print" onClick={() => window.print()}>
        Print Forecast
      </button>
    </div>
  );
}
