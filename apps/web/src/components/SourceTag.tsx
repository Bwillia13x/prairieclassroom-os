/**
 * SourceTag — one-caption primitive distinguishing AI-generated recommendations
 * from record-derived data (audit finding #34). Nothing-design: Space Mono,
 * ALL CAPS, tertiary color, never competing with content.
 */

interface Props {
  kind: "ai" | "record";
  className?: string;
}

const LABELS: Record<Props["kind"], string> = {
  ai: "AI SNAPSHOT",
  record: "RECORD",
};

export default function SourceTag({ kind, className }: Props) {
  return (
    <span
      className={`source-tag source-tag--${kind}${className ? ` ${className}` : ""}`}
      aria-label={kind === "ai" ? "AI-generated content" : "Record-derived data"}
      data-testid={`source-tag-${kind}`}
    >
      {LABELS[kind]}
    </span>
  );
}
