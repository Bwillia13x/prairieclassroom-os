import { useApp } from "../AppContext";
import type { SectionTone } from "../appReducer";
import "./ContextualHint.css";

import type { ReactNode } from "react";

/**
 * ContextualHint — shows a subtle, dismissable tooltip-hint the first time
 * a teacher visits a feature. Replaces the global onboarding modal for
 * per-feature discovery. Once dismissed, never shown again (localStorage).
 */
interface Props {
  /** Unique feature key — must match across renders. */
  featureKey: string;
  /** Short title: "Differentiate a Lesson" */
  title: string;
  /** One-sentence description. */
  description: string;
  /** Optional icon/emoji. */
  icon?: ReactNode;
  tone?: SectionTone;
}

export default function ContextualHint({ featureKey, title, description, icon, tone }: Props) {
  const { featuresSeen, dispatch } = useApp();

  // Already seen — render nothing
  if (featuresSeen[featureKey]) return null;

  function handleDismiss() {
    dispatch({ type: "MARK_FEATURE_SEEN", feature: featureKey });
  }

  return (
    <div className={`contextual-hint${tone ? ` contextual-hint--${tone}` : ""}`} role="note" aria-label={`Tip: ${title}`}>
      {icon && <span className="contextual-hint-icon" aria-hidden="true">{icon}</span>}
      <div className="contextual-hint-body">
        <span className="contextual-hint-title">{title}</span>
        <span className="contextual-hint-desc">{description}</span>
      </div>
      <button
        className="contextual-hint-dismiss"
        onClick={handleDismiss}
        type="button"
        aria-label="Dismiss tip"
      >
        Got it
      </button>
    </div>
  );
}
