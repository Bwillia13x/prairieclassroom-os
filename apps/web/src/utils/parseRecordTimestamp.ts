/**
 * Extract a timestamp from a PrairieClassroom record ID.
 *
 * Record IDs follow the pattern `type-classroomId-epochMs`.
 * Returns an ISO string if the trailing segment is a valid epoch,
 * otherwise returns undefined.
 */
export function parseRecordTimestamp(recordId: string | undefined | null): string | undefined {
  if (!recordId) return undefined;
  const lastSegment = recordId.split("-").pop();
  if (!lastSegment || !/^\d{10,}$/.test(lastSegment)) return undefined;
  const epoch = Number(lastSegment);
  if (!Number.isFinite(epoch)) return undefined;
  const date = new Date(epoch);
  if (date.getFullYear() < 2020 || date.getFullYear() > 2100) return undefined;
  return date.toISOString();
}
