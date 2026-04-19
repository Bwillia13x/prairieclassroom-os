/**
 * PageFreshness — "LAST UPDATED 8:47 AM · AI SNAPSHOT" tertiary strip.
 * Mounts in the Today hero (audit #4). Space Mono, caption size, edge-anchored.
 */

import SourceTag from "./SourceTag";
import "./PageFreshness.css";

interface Props {
  generatedAt: string | null;
  kind: "ai" | "record";
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function PageFreshness({ generatedAt, kind }: Props) {
  return (
    <p className="page-freshness" data-testid="page-freshness">
      <span className="page-freshness__label">Last updated</span>
      <span className="page-freshness__value">
        {generatedAt ? formatTime(generatedAt) : "not yet generated"}
      </span>
      <span className="page-freshness__divider" aria-hidden="true">·</span>
      <SourceTag kind={kind} className="page-freshness__tag" />
    </p>
  );
}
