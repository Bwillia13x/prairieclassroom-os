import type { ActiveTab } from "../appReducer";
import "./TimeSuggestion.css";

/**
 * TimeSuggestion — a smart suggestion card that surfaces the most relevant
 * workflow based on time of day. Shown on the Today panel and on mobile.
 *
 * Morning (5–11):   "Ready to prep? Differentiate a lesson or check the EA briefing."
 * Midday (11–14):   "Mid-day check — log interventions while they're fresh."
 * Afternoon (14–16):"School's ending — draft any family messages or review patterns."
 * Evening (16–21):  "Planning time — reflect on today and generate tomorrow's plan."
 * Late (21–5):      null (no suggestion)
 */

interface Props {
  onNavigate: (tab: ActiveTab) => void;
  compact?: boolean;
  suggestion?: Suggestion | null;
}

export interface Suggestion {
  kind: "morning" | "midday" | "afternoon" | "evening";
  label: string;
  message: string;
  primaryAction: { label: string; tab: ActiveTab };
  secondaryAction?: { label: string; tab: ActiveTab };
}

export function getSuggestion(hour: number): Suggestion | null {
  if (hour >= 5 && hour < 11) {
    return {
      kind: "morning",
      label: "Good morning",
      message: "Time to prep for today.",
      primaryAction: { label: "Differentiate", tab: "differentiate" },
      secondaryAction: { label: "EA Briefing", tab: "ea-briefing" },
    };
  }
  if (hour >= 11 && hour < 14) {
    return {
      kind: "midday",
      label: "Mid-day",
      message: "Log interventions while they're fresh.",
      primaryAction: { label: "Log Intervention", tab: "log-intervention" },
      secondaryAction: { label: "Language Tools", tab: "language-tools" },
    };
  }
  if (hour >= 14 && hour < 16) {
    return {
      kind: "afternoon",
      label: "Afternoon wrap",
      message: "Review messages and patterns before the day closes.",
      primaryAction: { label: "Family Message", tab: "family-message" },
      secondaryAction: { label: "Patterns", tab: "support-patterns" },
    };
  }
  if (hour >= 16 && hour < 21) {
    return {
      kind: "evening",
      label: "Evening",
      message: "Reflect on today and plan for tomorrow.",
      primaryAction: { label: "Tomorrow Plan", tab: "tomorrow-plan" },
      secondaryAction: { label: "Forecast", tab: "complexity-forecast" },
    };
  }
  return null;
}

function renderSuggestionIcon(kind: Suggestion["kind"]) {
  switch (kind) {
    case "morning":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.25" />
          <path d="M12 2.5v2.75M12 18.75v2.75M4.93 4.93l1.94 1.94M17.13 17.13l1.94 1.94M2.5 12h2.75M18.75 12h2.75M4.93 19.07l1.94-1.94M17.13 6.87l1.94-1.94" />
        </svg>
      );
    case "midday":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4.5h7l3 3V19.5H7z" />
          <path d="M14 4.5v3h3" />
          <path d="M9.5 11h5M9.5 14h5" />
        </svg>
      );
    case "afternoon":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6.5h16v11H4z" />
          <path d="m4 8 8 5 8-5" />
        </svg>
      );
    case "evening":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 15.5c2-2.5 4.4-3.75 7-3.75s5 1.25 7 3.75" />
          <path d="M6 18.5h12" />
          <path d="M12 5.5v3.5" />
        </svg>
      );
    default:
      return null;
  }
}

export default function TimeSuggestion({ onNavigate, compact = false, suggestion: providedSuggestion }: Props) {
  const suggestion = providedSuggestion ?? getSuggestion(new Date().getHours());

  if (!suggestion) return null;

  return (
    <div className={`time-suggestion time-suggestion--${suggestion.kind}${compact ? " time-suggestion--compact" : ""}`}>
      <span className="time-suggestion-icon" aria-hidden="true">{renderSuggestionIcon(suggestion.kind)}</span>
      <div className="time-suggestion-copy">
        <span className="time-suggestion-kicker">{suggestion.label}</span>
        <span className="time-suggestion-text">{suggestion.message}</span>
      </div>
      <div className="time-suggestion-actions">
        <button
          className="time-suggestion-btn time-suggestion-btn--primary"
          onClick={() => onNavigate(suggestion.primaryAction.tab)}
          type="button"
        >
          {suggestion.primaryAction.label}
        </button>
        {suggestion.secondaryAction && (
          <button
            className="time-suggestion-btn"
            onClick={() => onNavigate(suggestion.secondaryAction!.tab)}
            type="button"
          >
            {suggestion.secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}
