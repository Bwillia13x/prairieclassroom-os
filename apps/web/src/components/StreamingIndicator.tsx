import { useApp } from "../AppContext";
import SectionIcon, { type SectionIconName } from "./SectionIcon";
import NothingSpinner, {
  type NothingSpinnerVariant,
} from "./shared/NothingSpinner";
import "./StreamingIndicator.css";

/**
 * StreamingIndicator — replaces static skeleton for planning-tier requests.
 * Shows progressive disclosure: thinking phase → structuring phase → complete.
 * Teacher-facing copy only. Raw model reasoning text is hidden by default and
 * only renders when an operator sets the `prairie-debug-thinking` toggle in
 * localStorage — never shown to teachers in normal use.
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

/**
 * Operator-only toggle for surfacing raw model reasoning. Kept as a
 * localStorage flag rather than a DEV-only check so the same UI can be
 * debugged against a deployed build by setting:
 *   localStorage.setItem('prairie-debug-thinking', 'true')
 * Safe inside render: localStorage is a sync DOM API and this component
 * re-renders on every streaming tick anyway.
 */
function shouldShowThinkingText(): boolean {
  try {
    return typeof window !== "undefined"
      && window.localStorage?.getItem("prairie-debug-thinking") === "true";
  } catch {
    return false;
  }
}

export default function StreamingIndicator({ label, onCancel }: Props) {
  const { streaming } = useApp();

  if (!streaming.active && streaming.phase !== "complete") return null;

  const elapsed = streaming.elapsedSeconds;
  const showTimeoutHint = elapsed >= 60;

  const phaseLabel =
    streaming.phase === "thinking" ? "Reviewing classroom context…" :
    streaming.phase === "structuring" ? "Preparing your plan…" :
    streaming.phase === "complete" ? "Ready" : "";

  // SVG over emoji: district Windows/Chromebooks render emoji inconsistently.
  const phaseIconName: SectionIconName =
    streaming.phase === "thinking" ? "star" :
    streaming.phase === "structuring" ? "grid" : "check";

  // Per-phase N0thing instrument spinner — the "deep reasoning" moment.
  // Thinking = orbit (exploratory), structuring = seg-ring (committing),
  // complete = hidden (check icon covers the state).
  const phaseSpinnerVariant: NothingSpinnerVariant | null =
    streaming.phase === "thinking" ? "orbit" :
    streaming.phase === "structuring" ? "seg-ring" :
    null;

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

      {/* Operator-only working notes — hidden from teachers by default.
          Renders only when `localStorage['prairie-debug-thinking'] === 'true'`
          so raw model reasoning never leaks into the classroom UI. */}
      {streaming.thinkingText && shouldShowThinkingText() && (
        <div className="streaming-thinking" data-testid="streaming-thinking-debug">
          <div className="streaming-thinking-label">Working notes</div>
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

      {/* N0thing instrument spinner — the "deep reasoning" moment.
          Rendered decoratively: the outer StreamingIndicator already
          exposes role="status" + aria-label, so this avoids a double
          announcement. */}
      {streaming.active && phaseSpinnerVariant && (
        <div className="streaming-pulse">
          <NothingSpinner
            variant={phaseSpinnerVariant}
            size="lg"
            tone="accent"
            decorative
            label={phaseLabel || "Loading"}
          />
        </div>
      )}
    </div>
  );
}
