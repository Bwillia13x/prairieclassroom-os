import type { ComplexityBlock } from "../types";
import "./ForecastTimeline.css";

interface Props {
  blocks: ComplexityBlock[];
  onBlockClick?: (index: number) => void;
}

export default function ForecastTimeline({ blocks, onBlockClick }: Props) {
  if (blocks.length === 0) return null;

  return (
    <div className="forecast-timeline" role="img" aria-label="Complexity timeline for the day">
      {blocks.map((block, i) => (
        <button
          key={i}
          className={`forecast-timeline-segment forecast-timeline-segment--${block.level}`}
          onClick={onBlockClick ? () => onBlockClick(i) : undefined}
          aria-label={`${block.time_slot}: ${block.activity} — ${block.level} complexity`}
          type="button"
        >
          <span className="forecast-timeline-time">{block.time_slot}</span>
        </button>
      ))}
    </div>
  );
}
