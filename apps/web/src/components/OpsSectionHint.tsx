/**
 * OpsSectionHint — one section-level introduction shown once per teacher
 * at the top of the Ops group. Replaces six per-panel ContextualHint
 * cards with a single orienting card plus per-panel ⓘ popovers.
 *
 * Mounted at the top of `app-main` in App.tsx when `activeGroup === "ops"`
 * and the `"ops-section"` feature flag hasn't been dismissed yet. Keyed
 * on `ops-section` to survive the legacy-per-panel migration run by
 * App.tsx's one-time effect. 2026-04-19 OPS audit.
 */
import { useApp } from "../AppContext";
import "./ContextualHint.css";

const FEATURE_KEY = "ops-section";

export default function OpsSectionHint() {
  const { featuresSeen, dispatch } = useApp();
  if (featuresSeen[FEATURE_KEY]) return null;

  function handleDismiss() {
    dispatch({ type: "MARK_FEATURE_SEEN", feature: FEATURE_KEY });
  }

  return (
    <div
      className="contextual-hint contextual-hint--slate ops-section-hint"
      role="note"
      aria-label="Tip: Operations tools"
    >
      <span className="contextual-hint-icon" aria-hidden="true">⚙️</span>
      <div className="contextual-hint-body">
        <span className="contextual-hint-title">Operations tools</span>
        <span className="contextual-hint-desc">
          Capture today, plan tomorrow, and brief everyone who steps into your
          room — interventions, forecasts, EA briefings, load balancing, and
          substitute packets in one place. Each panel has an <kbd>ⓘ</kbd> for
          its own how-to.
        </span>
      </div>
      <button
        className="contextual-hint-dismiss"
        onClick={handleDismiss}
        type="button"
        aria-label="Dismiss Operations tip"
      >
        Got it
      </button>
    </div>
  );
}
