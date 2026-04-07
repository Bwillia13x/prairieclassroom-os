import { useState } from "react";
import "./OnboardingOverlay.css";

interface Props {
  onDismiss: () => void;
}

const STEPS = [
  {
    title: "Start with Today",
    description: "Your morning dashboard shows what needs attention — pending messages, yesterday's plan, and today's complexity forecast. No clicking around required.",
    group: "Today + Prep",
  },
  {
    title: "Plan your day with Ops",
    description: "Reflect on today to generate tomorrow's support plan. Log interventions, check the EA briefing, forecast complexity, or prep a substitute packet.",
    group: "Daily Ops",
  },
  {
    title: "Review and communicate",
    description: "Draft family messages in any language, review support patterns across students, and track what's working. Every message requires your approval before sending.",
    group: "Review",
  },
];

export default function OnboardingOverlay({ onDismiss }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <div className="onboarding-backdrop" onClick={onDismiss}>
      <div className="onboarding-card" onClick={(e) => e.stopPropagation()}>
        <div className="onboarding-progress">
          {STEPS.map((_, i) => (
            <div key={i} className={`onboarding-dot${i === step ? " onboarding-dot--active" : i < step ? " onboarding-dot--done" : ""}`} />
          ))}
        </div>

        <span className="onboarding-group-label">{current.group}</span>
        <h2 className="onboarding-title">{current.title}</h2>
        <p className="onboarding-description">{current.description}</p>

        <div className="onboarding-actions">
          {step > 0 && (
            <button className="btn btn--ghost" onClick={() => setStep(step - 1)} type="button">
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button className="btn btn--primary" onClick={() => setStep(step + 1)} type="button">
              Next
            </button>
          ) : (
            <button className="btn btn--primary" onClick={onDismiss} type="button">
              Get Started
            </button>
          )}
        </div>

        <button className="onboarding-skip" onClick={onDismiss} type="button">
          Skip tour
        </button>
      </div>
    </div>
  );
}
