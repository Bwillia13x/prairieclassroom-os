import type { ComplexityBlock } from "../types";
import "./ForecastTimeline.css";

interface Props {
  blocks: ComplexityBlock[];
  onBlockClick?: (index: number) => void;
  variant?: "compact" | "viewer";
  showActivity?: boolean;
  ariaLabel?: string;
}

const LEVEL_LABEL: Record<ComplexityBlock["level"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export default function ForecastTimeline({
  blocks,
  onBlockClick,
  variant = "compact",
  showActivity = false,
  ariaLabel = "Complexity timeline for the day",
}: Props) {
  if (blocks.length === 0) return null;

  return (
    <div
      className={`forecast-timeline forecast-timeline--${variant}`}
      role="group"
      aria-label={ariaLabel}
    >
      {blocks.map((block, i) => (
        <button
          key={i}
          className={`forecast-timeline-segment forecast-timeline-segment--${block.level}`}
          onClick={onBlockClick ? () => onBlockClick(i) : undefined}
          aria-label={`${block.time_slot}: ${block.activity} — ${block.level} complexity`}
          title={`${block.time_slot}: ${block.activity} (${LEVEL_LABEL[block.level]})`}
          type="button"
        >
          <span className="forecast-timeline-time">{block.time_slot}</span>
          {showActivity ? (
            <span className="forecast-timeline-activity">{block.activity}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
