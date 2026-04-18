import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";

export interface RosterScope {
  allowedAliases: Set<string>;
  knownAliases: Set<string>;
}

const SINGLE_STUDENT_KEYS = new Set(["student_ref"]);
const MULTI_STUDENT_KEYS = new Set(["student_refs", "primary_students", "ea_student_refs"]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasKnownAliasLeak(value: unknown, scope: RosterScope): boolean {
  const haystack = typeof value === "string" ? value : JSON.stringify(value);
  if (!haystack) return false;

  for (const alias of scope.knownAliases) {
    if (!alias || scope.allowedAliases.has(alias)) continue;
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRegExp(alias)}(?=$|[^\\p{L}\\p{N}_])`, "u");
    if (pattern.test(haystack)) {
      return true;
    }
  }

  return false;
}

function hasStructuralAliasLeak(value: unknown, scope: RosterScope): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => hasStructuralAliasLeak(item, scope));
  }

  if (!isPlainObject(value)) {
    return false;
  }

  for (const [key, child] of Object.entries(value)) {
    if (SINGLE_STUDENT_KEYS.has(key)) {
      if (typeof child === "string" && !scope.allowedAliases.has(child)) {
        return true;
      }
      continue;
    }

    if (MULTI_STUDENT_KEYS.has(key)) {
      if (Array.isArray(child) && child.some((alias) => typeof alias === "string" && !scope.allowedAliases.has(alias))) {
        return true;
      }
      continue;
    }

    if (hasStructuralAliasLeak(child, scope)) {
      return true;
    }
  }

  return false;
}

export function buildRosterScope(
  classroom: ClassroomProfile,
  classrooms: readonly ClassroomProfile[] = [classroom],
): RosterScope {
  return {
    allowedAliases: new Set(classroom.students.map((student) => student.alias).filter(Boolean)),
    knownAliases: new Set(classrooms.flatMap((profile) => profile.students.map((student) => student.alias).filter(Boolean))),
  };
}

export function isRosterScopedValue(value: unknown, scope?: RosterScope): boolean {
  if (!scope) return true;
  if (hasStructuralAliasLeak(value, scope)) return false;
  if (hasKnownAliasLeak(value, scope)) return false;
  return true;
}

export function filterRosterScoped<T>(values: readonly T[], scope?: RosterScope): T[] {
  return scope ? values.filter((value) => isRosterScopedValue(value, scope)) : [...values];
}
