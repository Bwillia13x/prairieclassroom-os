/**
 * Format an ISO-ish date string (YYYY-MM-DD from <input type="date">)
 * as a short weekday+month label, e.g. `"Tue, Apr 21, 2026"`.
 *
 * Used beneath the target-date input on the EA Load panel so teachers
 * can confirm they picked the right day without re-reading the ISO
 * value. 2026-04-19 OPS audit (phase 5).
 *
 * Gracefully returns an empty string on unparseable input, so the
 * caller can skip rendering the caption without an explicit guard.
 */
export function formatTargetDate(iso: string): string {
  if (!iso) return "";
  // Avoid timezone drift: build the date in local time by splitting.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  let d: Date;
  if (match) {
    const [, y, m, day] = match;
    d = new Date(Number(y), Number(m) - 1, Number(day));
  } else {
    d = new Date(iso);
  }
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return d.toDateString();
  }
}
