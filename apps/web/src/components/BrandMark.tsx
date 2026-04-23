function joinClassNames(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export default function BrandMark({ className }: { className?: string }) {
  return (
    <span className={joinClassNames("brand-mark", className)}>
      <svg
        className="brand-mark__glyph"
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M10 54V34" />
        <path d="M18 54V19" />
        <path d="M28 54V9" />
        <path d="M38 54V25" />
        <path d="M48 54V15" />
        <path d="M16 35L8 23" />
        <path d="M22 29L14 15" />
        <path d="M30 22L23 8" />
        <path d="M38 37L48 24" />
      </svg>
      <span className="brand-mark__wordmark">PrairieClassroom</span>
      <span className="brand-mark__badge">OS</span>
    </span>
  );
}
