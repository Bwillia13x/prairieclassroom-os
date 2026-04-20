import { useApp } from "../AppContext";
import type { ActiveTab } from "../appReducer";
import "./NextStepBand.css";

interface Props {
  /** Display label for the action, e.g. "Open Forecast" */
  label: string;
  /** Tab to navigate to when clicked. */
  targetTab: ActiveTab;
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
