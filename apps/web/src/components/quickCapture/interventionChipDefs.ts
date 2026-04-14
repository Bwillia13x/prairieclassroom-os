import type { SectionIconName } from "../SectionIcon";

export type InterventionChipKey =
  | "redirect"
  | "calm_corner"
  | "praise"
  | "break"
  | "check_in"
  | "scaffold";

export interface InterventionChipDef {
  key: InterventionChipKey;
  label: string;
  icon: SectionIconName;
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
    starterNote: (names) =>
      `Redirected ${formatAliasList(names)} during the current block — brief verbal cue, returned to task.`,
  },
  {
    key: "calm_corner",
    label: "Calm corner",
    icon: "sun",
    starterNote: (names) =>
      `${formatAliasList(names)} used the calm corner — took a short reset, re-entered the activity when ready.`,
  },
  {
    key: "praise",
    label: "Praise",
    icon: "star",
    starterNote: (names) =>
      `Named effort for ${formatAliasList(names)} in front of the class — specific, task-focused praise.`,
  },
  {
    key: "break",
    label: "Break",
    icon: "clock",
    starterNote: (names) =>
      `${formatAliasList(names)} took a movement break — returned within the block, ready to continue.`,
  },
  {
    key: "check_in",
    label: "Check-in",
    icon: "info",
    starterNote: (names) =>
      `Pulled ${formatAliasList(names)} aside for a 1:1 check-in — surfaced what was in the way and set a next step.`,
  },
  {
    key: "scaffold",
    label: "Scaffold",
    icon: "pencil",
    starterNote: (names) =>
      `Added scaffolding for ${formatAliasList(names)} — broke the task into smaller steps and gave a visible anchor.`,
  },
];
