import { useApp } from "../AppContext";
import "./StreamingIndicator.css";

/**
 * StreamingIndicator — replaces static skeleton for planning-tier requests.
 * Shows progressive disclosure: thinking phase → structuring phase → complete.
 * Displays real thinking text and a progress bar.
 */
interface Props {
  /** Contextual label, e.g. "Generating tomorrow plan" */
  label?: string;
}

export default function StreamingIndicator({ label }: Props) {
  const { streaming } = useApp();

  if (!streaming.active && streaming.phase !== "complete") return null;

  const phaseLabel =
    streaming.phase === "thinking" ? "Deep reasoning in progress…" :
    streaming.phase === "structuring" ? "Structuring your plan…" :
    streaming.phase === "complete" ? "Complete" : "";

  const phaseIcon =
    streaming.phase === "thinking" ? "🧠" :
    streaming.phase === "structuring" ? "📋" : "✓";

  return (
    <div className="streaming-indicator" role="status" aria-label={label ?? phaseLabel} aria-busy={streaming.active}>
      <div className="streaming-header">
        <span className="streaming-phase-icon" aria-hidden="true">{phaseIcon}</span>
        <span className="streaming-phase-label">{phaseLabel}</span>
      </div>

      {/* Progress bar */}
      <div className="streaming-progress-track" role="progressbar" aria-valuenow={Math.round(streaming.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="streaming-progress-bar"
          style={{ width: `${Math.max(streaming.progress * 100, 2)}%` }}
        />
      </div>

      {/* Thinking text — streams in progressively */}
      {streaming.thinkingText && (
        <div className="streaming-thinking">
          <div className="streaming-thinking-label">Model reasoning</div>
          <p className="streaming-thinking-text">{streaming.thinkingText}</p>
        </div>
      )}

      {/* Partial sections arriving */}
      {streaming.partialSections.length > 0 && (
        <div className="streaming-sections motion-stagger">
          {streaming.partialSections.map((section, i) => (
            <div key={i} className="streaming-section-chip">
              <span className="streaming-section-check" aria-hidden="true">✓</span>
              {section}
            </div>
          ))}
        </div>
      )}

      {/* Pulsing dot when active */}
      {streaming.active && (
        <div className="streaming-pulse" aria-hidden="true">
          <span className="streaming-dot" />
          <span className="streaming-dot" />
          <span className="streaming-dot" />
        </div>
      )}
    </div>
  );
}
