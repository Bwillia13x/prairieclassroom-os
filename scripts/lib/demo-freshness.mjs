/**
 * scripts/lib/demo-freshness.mjs — pilot:start preflight helper for stale demo data.
 *
 * Why this exists: `data/demo/seed.ts` is time-relative (uses `NOW = new Date()`)
 * but is upsert-only. A local SQLite memory DB that hasn't been freshly reset
 * keeps stale rows, so teachers and demo judges see relative timestamps like
 * "396d ago" on the Classroom and Today panels. The fix is a one-line operator
 * recommendation: run `npm run pilot:reset`. This module encapsulates the
 * "is it stale?" decision and the read of the demo classroom's most recent
 * intervention timestamp from the orchestrator API.
 */

const STALE_THRESHOLD_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEMO_CLASSROOM_ID = "demo-okafor-grade34";

/**
 * Returns true when the demo classroom's most recent intervention is older
 * than the staleness threshold (or when there is no recorded intervention).
 *
 * @param {object} args
 * @param {string|null} args.latestInterventionAt - ISO timestamp string or null
 * @param {Date} [args.now] - reference time for the comparison (defaults to now)
 * @returns {boolean}
 */
export function isDemoStale({ latestInterventionAt, now = new Date() }) {
  if (!latestInterventionAt) return true;
  const latest = new Date(latestInterventionAt).getTime();
  if (Number.isNaN(latest)) return true;
  const ageDays = (now.getTime() - latest) / MS_PER_DAY;
  return ageDays > STALE_THRESHOLD_DAYS;
}

/**
 * Reads the demo classroom's most recent intervention timestamp from the
 * orchestrator's Today endpoint.
 *
 * The Today response (services/orchestrator/routes/today.ts) does not expose a
 * top-level "latest intervention" timestamp, but each entry in
 * `student_threads` carries `last_intervention_days` — the integer number of
 * whole calendar days since that student's most recent intervention. We scan
 * the threads, take the smallest non-null value (most recent), and convert it
 * back to an approximate ISO timestamp by subtracting that many days from
 * `now`. The returned value is precise enough for a > 7 day staleness check.
 *
 * Returns null if the orchestrator is unreachable or returns no useful data,
 * so the caller can decide whether to skip the check.
 *
 * @param {string} orchestratorBase - e.g. "http://localhost:3100"
 * @param {object} [opts]
 * @param {Date} [opts.now] - reference time used to convert days-ago into ISO
 * @returns {Promise<string|null>}
 */
export async function fetchDemoLatestIntervention(orchestratorBase, opts = {}) {
  const now = opts.now ?? new Date();
  try {
    const res = await fetch(
      `${orchestratorBase}/api/today/${DEMO_CLASSROOM_ID}`,
    );
    if (!res.ok) return null;
    const body = await res.json();
    const threads = Array.isArray(body?.student_threads) ? body.student_threads : [];
    let minDays = Infinity;
    for (const thread of threads) {
      const d = thread?.last_intervention_days;
      if (typeof d === "number" && Number.isFinite(d) && d >= 0 && d < minDays) {
        minDays = d;
      }
    }
    if (!Number.isFinite(minDays)) return null;
    return new Date(now.getTime() - minDays * MS_PER_DAY).toISOString();
  } catch {
    return null;
  }
}
