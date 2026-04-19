import { useApp } from "../AppContext";
import type { SectionTone } from "../appReducer";
import "./ContextualHint.css";

import type { ReactNode } from "react";

/**
 * ContextualHint — shows a subtle, dismissable tooltip-hint the first time
 * a teacher visits a feature. Replaces the global onboarding modal for
 * per-feature discovery.
 *
 * After workstream E (audit issues #11–#13):
 * - The left-border accent is reserved EXCLUSIVELY for this dismissable
 *   hint and is colored by the optional `tone` (section-coded) so the
 *   border carries semantic meaning instead of being decorative.
 * - Dismissal uses an ✕ icon button (replacing "Got it"), and dismissal
 *   is recoverable via a small ⓘ button that re-expands the hint and
 *   clears the persisted dismissal flag.
 *
 * Persistence is handled by the existing `featuresSeen` reducer, which
 * stores all dismissals under the consolidated `prairie-features-seen`
 * localStorage key. `featureKey` is the stable per-hint id.
 */
interface Props {
  /** Unique feature key — must match across renders. Used as the
   *  stable hint id for dismissal persistence and recovery. */
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
  const isDismissed = Boolean(featuresSeen[featureKey]);

  function handleDismiss() {
    dispatch({ type: "MARK_FEATURE_SEEN", feature: featureKey });
  }

  function handleRestore() {
    dispatch({ type: "CLEAR_FEATURE_SEEN", feature: featureKey });
  }

  if (isDismissed) {
    // Collapsed state: small recovery affordance in the same top-right
    // position as the dismiss button. Click expands the hint again.
    return (
      <div
        className={`contextual-hint contextual-hint--collapsed${tone ? ` contextual-hint--${tone}` : ""}`}
        aria-label={`Tip available: ${title}`}
      >
        <button
          type="button"
          className="contextual-hint-restore"
          onClick={handleRestore}
          aria-label="Show hint"
          title={`Show hint: ${title}`}
        >
          <span aria-hidden="true">ⓘ</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`contextual-hint${tone ? ` contextual-hint--${tone}` : ""}`}
      role="note"
      aria-label={`Tip: ${title}`}
    >
      {icon && <span className="contextual-hint-icon" aria-hidden="true">{icon}</span>}
      <div className="contextual-hint-body">
        <span className="contextual-hint-title">{title}</span>
        <span className="contextual-hint-desc">{description}</span>
      </div>
      <button
        className="contextual-hint-dismiss"
        onClick={handleDismiss}
        type="button"
        aria-label="Dismiss hint"
        title="Dismiss hint"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
}
