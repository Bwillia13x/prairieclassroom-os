/**
 * Branded domain ID types for PrairieClassroom OS.
 *
 * These types are structurally identical to string but TypeScript treats them
 * as distinct, preventing accidental cross-assignment (e.g., passing a StudentRef
 * where a ClassroomId is expected).
 *
 * Progressive adoption: use at system boundaries; internal code can remain
 * unbranded until gradually migrated.
 */

/** Unique classroom identifier (e.g., "demo-okafor-grade34") */
export type ClassroomId = string & { readonly __brand: unique symbol };

/** Student alias reference (e.g., "Ari", "Mika") */
export type StudentRef = string & { readonly __brand: unique symbol };

/** Generated plan identifier (e.g., "plan-demo-okafor-grade34-1712345678") */
export type PlanId = string & { readonly __brand: unique symbol };

/** Family message draft identifier */
export type DraftId = string & { readonly __brand: unique symbol };

/** Intervention record identifier */
export type RecordId = string & { readonly __brand: unique symbol };

// Type guard and creation helpers — validate and brand in one step
const CLASSROOM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$/;

export function classroomId(raw: string): ClassroomId {
  if (!CLASSROOM_ID_PATTERN.test(raw)) {
    throw new Error(`Invalid ClassroomId: "${raw}"`);
  }
  return raw as ClassroomId;
}

export function studentRef(raw: string): StudentRef {
  return raw as StudentRef;
}

export function planId(raw: string): PlanId {
  return raw as PlanId;
}

export function draftId(raw: string): DraftId {
  return raw as DraftId;
}

export function recordId(raw: string): RecordId {
  return raw as RecordId;
}

// Escape hatch for trusted internal code that already validated
export function unsafeCastClassroomId(raw: string): ClassroomId {
  return raw as ClassroomId;
}
