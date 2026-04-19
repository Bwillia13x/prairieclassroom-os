import type { RecentRun } from "../hooks/useRecentRuns";
import "./RecentRunsChipRow.css";

interface Props {
  runs: RecentRun[];
  onSelect: (id: string) => void;
}

export default function RecentRunsChipRow({ runs, onSelect }: Props) {
  if (runs.length === 0) return null;
  return (
    <div className="recent-runs" aria-label="Recent runs in this session">
      <span className="recent-runs__label">Recent</span>
      <div className="recent-runs__chips">
        {runs.map((run) => (
          <button
            key={run.id}
            type="button"
            className="recent-runs__chip"
            onClick={() => onSelect(run.id)}
            title={run.label}
          >
            {run.label}
          </button>
        ))}
      </div>
    </div>
  );
}
