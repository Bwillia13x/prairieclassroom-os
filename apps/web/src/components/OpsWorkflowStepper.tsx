import { useApp } from "../AppContext";
import type { ActiveTab } from "../appReducer";
import "./OpsWorkflowStepper.css";

/**
 * Ordered Ops workflow steps. Single source of truth — consumed by the
 * stepper component and available to tests via the named export.
 */
export const OPS_STEPS: ReadonlyArray<{ tab: ActiveTab; label: string }> = [
  { tab: "log-intervention", label: "Log" },
  { tab: "tomorrow-plan", label: "Plan" },
  { tab: "complexity-forecast", label: "Forecast" },
  { tab: "ea-briefing", label: "EA Brief" },
  { tab: "ea-load", label: "EA Load" },
  { tab: "survival-packet", label: "Sub Packet" },
] as const;

interface Props {
  /** Currently active tab — determines which step is highlighted. */
  activeTab: ActiveTab;
}

/**
 * OpsWorkflowStepper — a lightweight horizontal stepper that sits below
 * PageIntro on every Ops panel. Non-active steps are clickable and
 * navigate via setActiveTab from AppContext.
 *
 * Completed state is visual-only: any step before the active step is
 * marked "completed" to convey progress without new global state.
 */
export default function OpsWorkflowStepper({ activeTab }: Props) {
  const { setActiveTab } = useApp();
  const activeIdx = OPS_STEPS.findIndex((s) => s.tab === activeTab);

  return (
    <nav className="ops-stepper" aria-label="Ops workflow" data-testid="ops-workflow-stepper">
      <ol className="ops-stepper__list">
        {OPS_STEPS.map((step, i) => {
          const isActive = step.tab === activeTab;
          const isCompleted = activeIdx >= 0 && i < activeIdx;
          const stateClass = isActive
            ? "ops-stepper__step--active"
            : isCompleted
              ? "ops-stepper__step--completed"
              : "";

          if (!isActive) {
            return (
              <li key={step.tab} className={`ops-stepper__step ${stateClass}`}>
                <button
                  type="button"
                  className="ops-stepper__btn"
                  onClick={() => setActiveTab(step.tab)}
                  aria-label={`Step ${i + 1}: ${step.label}`}
                  aria-current={undefined}
                >
                  <span className="ops-stepper__number">{i + 1}</span>
                  <span className="ops-stepper__label">{step.label}</span>
                </button>
              </li>
            );
          }

          return (
            <li
              key={step.tab}
              className={`ops-stepper__step ${stateClass}`}
              aria-label={`Current step ${i + 1}: ${step.label}`}
              aria-current="step"
            >
              <span className="ops-stepper__indicator">
                <span className="ops-stepper__number">{i + 1}</span>
                <span className="ops-stepper__label">{step.label}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
