interface Props {
  name: SectionIconName;
  className?: string;
  decorative?: boolean;
}

export type SectionIconName =
  | "sun"
  | "moon"
  | "pencil"
  | "grid"
  | "check"
  | "mail"
  | "alert"
  | "star"
  | "clock"
  | "calendar"
  | "bars"
  | "lock"
  | "info"
  | "refresh"
  /* Phase D2 (2026-04-27) — three new glyphs that retire the
     "grid icon means four different things" overload. `trend`
     replaces `grid` on the FORECAST pivot card; `compass`
     replaces `grid` on the Ops nav; `week` replaces `grid` on
     the Week nav. Classroom keeps `grid` because the 4-quadrant
     mark is the canonical bird's-eye dashboard cue. */
  | "trend"
  | "compass"
  | "week";

export default function SectionIcon({ name, className, decorative = true }: Props) {
  const sharedProps = decorative ? { "aria-hidden": true } : { role: "img" as const };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...sharedProps}
    >
      {name === "sun" ? (
        <>
          <circle cx="12" cy="12" r="4.1" />
          <path d="M12 2.75v2.2M12 19.05v2.2M21.25 12h-2.2M4.95 12h-2.2M18.55 5.45l-1.55 1.55M7 17l-1.55 1.55M18.55 18.55L17 17M7 7L5.45 5.45" />
        </>
      ) : null}
      {name === "moon" ? (
        <path d="M20.5 14.2A8 8 0 1 1 9.8 3.5a6.4 6.4 0 0 0 10.7 10.7Z" />
      ) : null}
      {name === "pencil" ? (
        <>
          <path d="M4 20h4.4l9.7-9.7a1.8 1.8 0 000-2.55l-1.05-1.05a1.8 1.8 0 00-2.55 0L4.8 16.4 4 20z" />
          <path d="M12.9 8.3l2.8 2.8" />
        </>
      ) : null}
      {name === "grid" ? (
        <>
          <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
        </>
      ) : null}
      {name === "check" ? (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M8.5 12.3l2.3 2.4 4.8-5.2" />
        </>
      ) : null}
      {name === "mail" ? (
        <>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 8l9 6 9-6" />
        </>
      ) : null}
      {name === "alert" ? (
        <>
          <path d="M12 3l9 16H3L12 3z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </>
      ) : null}
      {name === "star" ? (
        <>
          <path d="M12 3l2.8 5.7 6.3.9-4.5 4.4 1 6.3-5.6-3-5.6 3 1-6.3-4.5-4.4 6.3-.9L12 3z" />
        </>
      ) : null}
      {name === "clock" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </>
      ) : null}
      {name === "calendar" ? (
        <>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3.5v4" />
          <path d="M16 3.5v4" />
          <path d="M4 10h16" />
          <path d="M8.3 14h.01" />
          <path d="M12 14h.01" />
          <path d="M15.7 14h.01" />
        </>
      ) : null}
      {name === "bars" ? (
        <>
          <path d="M5 19V9" />
          <path d="M12 19V5" />
          <path d="M19 19v-7" />
          <path d="M3.5 19.5h17" />
        </>
      ) : null}
      {name === "lock" ? (
        <>
          <path d="M7 11V7a5 5 0 0110 0v4" />
          <rect x="3" y="11" width="18" height="10" rx="2" />
        </>
      ) : null}
      {name === "info" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </>
      ) : null}
      {name === "refresh" ? (
        <>
          <path d="M21.5 2v6h-6" />
          <path d="M21.34 15.57A9 9 0 1119 7l2.5 1" />
        </>
      ) : null}
      {name === "trend" ? (
        // Rising forecast trace ending at a peak marker — replaces
        // the 4-quadrant grid as the FORECAST pivot card glyph so
        // "Forecast: Week" reads as a forward-looking trace, not as
        // "another dashboard." The dashed baseline anchors the
        // trace visually without competing with the rising line;
        // the path climbs through one consolidation dip so the
        // glyph reads as a real forecast trajectory rather than a
        // straight rising arrow, then ends at the dot marker so
        // the eye lands on "where this is heading."
        <>
          <path d="M3.5 18h17" strokeDasharray="1.5 2.5" opacity="0.55" />
          <path d="M3.5 16.5L7.5 13.8 11 15 14.5 11 19.5 7.5" />
          <circle cx="19.5" cy="7.5" r="1.6" fill="currentColor" stroke="none" />
        </>
      ) : null}
      {name === "compass" ? (
        // Cardinal-marker compass with a slim south-pointing
        // needle — coordinates and adult workflows on Ops. The
        // 3-unit-wide needle reads more like a compass than a
        // diamond, and the four short cardinal ticks separate
        // Ops from Classroom (`grid`) and Week (`week`) at first
        // glance.
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 4.5v3" />
          <path d="M12 16.5v3" />
          <path d="M19.5 12h-3" />
          <path d="M7.5 12h-3" />
          <path d="M12 7.5L13.5 9 12 16.5 10.5 9z" fill="currentColor" stroke="none" opacity="0.85" />
        </>
      ) : null}
      {name === "week" ? (
        // Five-column day strip with a baseline through the
        // middle — reads as a multi-day forecast row. Distinct
        // from `bars` (varying-height analytics bars) and `grid`
        // (4-quadrant dashboard) so the Week tab earns its own
        // glyph at first glance.
        <>
          <rect x="3" y="6.5" width="2.4" height="11" rx="0.6" />
          <rect x="6.6" y="6.5" width="2.4" height="11" rx="0.6" />
          <rect x="10.2" y="6.5" width="2.4" height="11" rx="0.6" />
          <rect x="13.8" y="6.5" width="2.4" height="11" rx="0.6" />
          <rect x="17.4" y="6.5" width="2.4" height="11" rx="0.6" />
          <path d="M2.5 12.5h19" opacity="0.45" />
        </>
      ) : null}
    </svg>
  );
}
