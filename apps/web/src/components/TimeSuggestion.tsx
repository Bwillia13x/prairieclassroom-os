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
  onNavigate: (tab: string) => void;
}

interface Suggestion {
  emoji: string;
  message: string;
  primaryAction: { label: string; tab: string };
  secondaryAction?: { label: string; tab: string };
}

function getSuggestion(hour: number): Suggestion | null {
  if (hour >= 5 && hour < 11) {
    return {
      emoji: "☀️",
      message: "Good morning — time to prep for today",
      primaryAction: { label: "Differentiate", tab: "differentiate" },
      secondaryAction: { label: "EA Briefing", tab: "ea-briefing" },
    };
  }
  if (hour >= 11 && hour < 14) {
    return {
      emoji: "📝",
      message: "Mid-day — log interventions while they're fresh",
      primaryAction: { label: "Log Intervention", tab: "log-intervention" },
      secondaryAction: { label: "Language Tools", tab: "language-tools" },
    };
  }
  if (hour >= 14 && hour < 16) {
    return {
      emoji: "📬",
      message: "Afternoon wrap — review messages and patterns",
      primaryAction: { label: "Family Message", tab: "family-message" },
      secondaryAction: { label: "Patterns", tab: "support-patterns" },
    };
  }
  if (hour >= 16 && hour < 21) {
    return {
      emoji: "🌅",
      message: "Evening — reflect on today, plan for tomorrow",
      primaryAction: { label: "Tomorrow Plan", tab: "tomorrow-plan" },
      secondaryAction: { label: "Forecast", tab: "complexity-forecast" },
    };
  }
  return null;
}

export default function TimeSuggestion({ onNavigate }: Props) {
  const suggestion = getSuggestion(new Date().getHours());

  if (!suggestion) return null;

  return (
    <div className="time-suggestion">
      <span className="time-suggestion-emoji" aria-hidden="true">{suggestion.emoji}</span>
      <span className="time-suggestion-text">{suggestion.message}</span>
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
