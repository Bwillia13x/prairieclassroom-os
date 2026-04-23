import { useApp } from "../AppContext";
import type { NavTarget } from "../appReducer";
import "./NextStepBand.css";

interface Props {
  /** Display label for the action, e.g. "Open Forecast" */
  label: string;
  /**
   * Target for the navigation. Accepts a top-level tab, an embedded
   * tool id, or any legacy panel id — `setActiveTab` resolves the pair.
   */
  targetTab: NavTarget;
}

/**
 * A compact "Next best step" banner shown after a panel's generated output.
 * Uses the app context to navigate — no extra props needed from the parent.
 */
export default function NextStepBand({ label, targetTab }: Props) {
  const { setActiveTab } = useApp();

  return (
    <div className="next-step-band" data-testid="next-step-band">
      <span className="next-step-band__label">Next best step:</span>
      <button
        type="button"
        className="next-step-band__action"
        aria-label={`Next best step: ${label}`}
        onClick={() => setActiveTab(targetTab)}
      >
        {label} →
      </button>
    </div>
  );
}
