function joinClassNames(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

const BRAND_MARK_SRC = "/brand/prairieclassroomos-2026-05-01/prairieclassroomos-favicon-32.png";
const BRAND_MARK_SRCSET = [
  "/brand/prairieclassroomos-2026-05-01/prairieclassroomos-favicon-32.png 1x",
  "/brand/prairieclassroomos-2026-05-01/prairieclassroomos-favicon-64.png 2x",
].join(", ");

export default function BrandMark({ className }: { className?: string }) {
  return (
    <span className={joinClassNames("brand-mark", className)}>
      <img
        className="brand-mark__glyph"
        src={BRAND_MARK_SRC}
        srcSet={BRAND_MARK_SRCSET}
        alt=""
        aria-hidden="true"
        decoding="async"
      />
      <span className="brand-mark__wordmark">PrairieClassroom</span>
      <span className="brand-mark__badge">OS</span>
    </span>
  );
}
