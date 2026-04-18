import { useApp } from "../AppContext";
import SectionIcon, { type SectionIconName } from "./SectionIcon";
import "./StreamingIndicator.css";

/**
 * StreamingIndicator — replaces static skeleton for planning-tier requests.
 * Shows progressive disclosure: thinking phase → structuring phase → complete.
 * Displays real thinking text, a progress bar, elapsed time, and cancel control.
 */
interface Props {
  /** Contextual label, e.g. "Generating tomorrow plan" */
  label?: string;
  /** Cancel callback — aborts the in-flight request */
  onCancel?: () => void;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function StreamingIndicator({ label, onCancel }: Props) {
  const { streaming } = useApp();

  if (!streaming.active && streaming.phase !== "complete") return null;

  const elapsed = streaming.elapsedSeconds;
  const showTimeoutHint = elapsed >= 60;

  const phaseLabel =
    streaming.phase === "thinking" ? "Deep reasoning in progress…" :
    streaming.phase === "structuring" ? "Structuring your plan…" :
    streaming.phase === "complete" ? "Complete" : "";

  // SVG over emoji: district Windows/Chromebooks render emoji inconsistently.
  const phaseIconName: SectionIconName =
    streaming.phase === "thinking" ? "star" :
    streaming.phase === "structuring" ? "grid" : "check";

  return (
    <div className="streaming-indicator" role="status" aria-label={label ?? phaseLabel} aria-busy={streaming.active}>
      <div className="streaming-header">
        <span className="streaming-phase-icon" aria-hidden="true">
          <SectionIcon name={phaseIconName} />
        </span>
        <span className="streaming-phase-label">{phaseLabel}</span>
        {streaming.active && (
          <span className="streaming-elapsed" aria-label={`Elapsed: ${formatElapsed(elapsed)}`}>
            {formatElapsed(elapsed)}
          </span>
        )}
        {streaming.active && onCancel && (
          <button className="streaming-cancel" onClick={onCancel} type="button" aria-label="Cancel request">
            Cancel
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="streaming-progress-track" role="progressbar" aria-valuenow={Math.round(streaming.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="streaming-progress-bar"
          style={{ width: `${Math.max(streaming.progress * 100, 2)}%` }}
        />
      </div>

      {/* Timeout hint */}
      {streaming.active && showTimeoutHint && (
        <div className="streaming-timeout-hint" role="alert">
          Planning-tier reasoning can take up to 90 seconds for complex classrooms.{" "}
          {onCancel && "You can cancel and retry if needed."}
        </div>
      )}

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
              <span className="streaming-section-check" aria-hidden="true">
                <SectionIcon name="check" />
              </span>
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
