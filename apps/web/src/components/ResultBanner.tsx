import { useEffect, useState } from "react";
import "./ResultBanner.css";

interface Props {
  /** Label for the result, e.g. "Plan generated" */
  label: string;
  /** ISO timestamp or epoch ms when the result was created */
  generatedAt?: string | number;
  /** Optional model identifier */
  modelId?: string;
  /** Optional latency in ms */
  latencyMs?: number;
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ResultBanner({ label, generatedAt, modelId, latencyMs }: Props) {
  const [, setTick] = useState(0);

  // Re-render every 30s to keep relative time fresh
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const timestamp = generatedAt
    ? typeof generatedAt === "number"
      ? new Date(generatedAt)
      : new Date(generatedAt)
    : null;

  return (
    <div className="result-banner" role="status">
      <span className="result-banner__badge" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 8.2l2 2 4-4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="result-banner__label">{label}</span>
      {timestamp ? (
        <span className="result-banner__time" title={timestamp.toLocaleString()}>
          {formatRelativeTime(timestamp)}
        </span>
      ) : null}
      {latencyMs != null && latencyMs > 0 ? (
        <span className="result-banner__latency">
          {latencyMs >= 1000 ? `${(latencyMs / 1000).toFixed(1)}s` : `${latencyMs}ms`}
        </span>
      ) : null}
      {modelId ? (
        <span className="result-banner__model">{modelId}</span>
      ) : null}
    </div>
  );
}
