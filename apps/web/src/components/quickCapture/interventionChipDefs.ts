import type { SectionIconName } from "../SectionIcon";

export type InterventionChipKey =
  | "redirect"
  | "calm_corner"
  | "praise"
  | "break"
  | "check_in"
  | "scaffold";

/**
 * High-level category for chip grouping. Drives the subtle color tint in
 * the tray and lets mobile layouts decide whether to render three sub-rows
 * or one row with larger gutters. 2026-04-19 OPS audit phase 7.2.
 * - behavioral: redirect, calm_corner, break
 * - support:    scaffold, check_in
 * - positive:   praise
 */
export type InterventionChipCategory = "behavioral" | "support" | "positive";

export interface InterventionChipDef {
  key: InterventionChipKey;
  label: string;
  icon: SectionIconName;
  category: InterventionChipCategory;
  starterNote: (studentAliases: string[]) => string;
}

export function formatAliasList(aliases: string[]): string {
  if (aliases.length === 0) return "the student";
  if (aliases.length === 1) return aliases[0];
  if (aliases.length === 2) return `${aliases[0]} and ${aliases[1]}`;
  const head = aliases.slice(0, -1).join(", ");
  const tail = aliases[aliases.length - 1];
  return `${head}, and ${tail}`;
}

export const INTERVENTION_CHIP_DEFS: readonly InterventionChipDef[] = [
  {
    key: "redirect",
    label: "Redirect",
    icon: "alert",
    category: "behavioral",
    starterNote: (names) =>
      `Redirected ${formatAliasList(names)} during the current block — brief verbal cue, returned to task.`,
  },
  {
    key: "calm_corner",
    label: "Calm corner",
    icon: "sun",
    category: "behavioral",
    starterNote: (names) =>
      `${formatAliasList(names)} used the calm corner — took a short reset, re-entered the activity when ready.`,
  },
  {
    key: "praise",
    label: "Praise",
    icon: "star",
    category: "positive",
    starterNote: (names) =>
      `Named effort for ${formatAliasList(names)} in front of the class — specific, task-focused praise.`,
  },
  {
    key: "break",
    label: "Break",
    icon: "clock",
    category: "behavioral",
    starterNote: (names) =>
      `${formatAliasList(names)} took a movement break — returned within the block, ready to continue.`,
  },
  {
    key: "check_in",
    label: "Check-in",
    icon: "info",
    category: "support",
    starterNote: (names) =>
      `Pulled ${formatAliasList(names)} aside for a 1:1 check-in — surfaced what was in the way and set a next step.`,
  },
  {
    key: "scaffold",
    label: "Scaffold",
    icon: "pencil",
    category: "support",
    starterNote: (names) =>
      `Added scaffolding for ${formatAliasList(names)} — broke the task into smaller steps and gave a visible anchor.`,
  },
];
