function joinClassNames(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

const BRAND_MARK_SRC = "/brand/prairieclassroomos-2026-05-01/prairieclassroomos-favicon-128.png";

export default function BrandMark({ className }: { className?: string }) {
  return (
    <span className={joinClassNames("brand-mark", className)}>
      <img
        className="brand-mark__glyph"
        src={BRAND_MARK_SRC}
        alt=""
        aria-hidden="true"
        decoding="async"
      />
      <span className="brand-mark__wordmark">PrairieClassroom</span>
      <span className="brand-mark__badge">OS</span>
    </span>
  );
}
