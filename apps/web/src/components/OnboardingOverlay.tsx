import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import "./OnboardingOverlay.css";

interface Props {
  onDismiss: () => void;
}

const STEPS = [
  {
    title: "Your morning starts here",
    description: "The Today dashboard shows what needs attention first — pending messages, follow-up debt, yesterday's plan, and today's complexity forecast. Start every session here.",
    group: "Today",
  },
  {
    title: "Prep materials for tomorrow",
    description: "Use Differentiate to create adapted versions of lesson artifacts for EAL, chunked, and extension groups. Language Tools simplifies text and builds vocabulary cards.",
    group: "Prep",
  },
  {
    title: "Plan and log your day",
    description: "Reflect on today's wins and challenges to generate tomorrow's support plan. Log interventions, generate EA briefings, forecast complexity, or prep a substitute packet.",
    group: "Daily Ops",
  },
  {
    title: "Review and communicate",
    description: "Draft family messages in any language — every message requires your explicit approval before copying. Track support patterns across students over time.",
    group: "Review",
  },
  {
    title: "Navigate with your keyboard",
    description: "Press 1–0 to jump directly to any panel. Use the classroom pill in the header to switch classrooms. Protected classrooms will prompt for an access code that's saved in your browser.",
    group: "Quick tips",
  },
];

export default function OnboardingOverlay({ onDismiss }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const cardRef = useRef<HTMLDivElement>(null);

  useFocusTrap(cardRef, true);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onDismiss();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onDismiss]);

  return (
    <div className="onboarding-backdrop" onClick={onDismiss}>
      <div ref={cardRef} className="onboarding-card" role="dialog" aria-modal="true" aria-label="Welcome tour" onClick={(e) => e.stopPropagation()}>
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
