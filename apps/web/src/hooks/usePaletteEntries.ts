import { useMemo } from "react";
import { TAB_META, TAB_ORDER, type ActiveTab, type ClassroomRole, isTabVisibleForRole } from "../appReducer";
import type { ClassroomProfile, FamilyMessagePrefill, InterventionPrefill, PanelStatus, TodaySnapshot } from "../types";

export type PaletteEntryKind = "panel" | "classroom" | "action";

export interface PaletteEntry {
  kind: PaletteEntryKind;
  id: string;
  label: string;
  group?: string;
  recommended?: boolean;
  keywords: string;
  /** Keyboard shortcut that navigates to this entry's target (panel entries only). */
  shortcut?: string;
  onSelect: () => void;
}

function paletteShortcutForTab(tab: ActiveTab): string | null {
  const idx = TAB_ORDER.indexOf(tab) + 1;
  if (idx < 1) return null;
  if (idx <= 9) return String(idx);
  if (idx === 10) return "0";
  return null;
}

interface DebtItem {
  category: string;
  student_refs: string[];
  age_days: number;
}

interface DebtRegister {
  items: DebtItem[];
}

interface Input {
  classrooms: ClassroomProfile[];
  activeClassroom: string;
  debtRegister: DebtRegister | null;
  latestTodaySnapshot?: TodaySnapshot | null;
  activeRole?: ClassroomRole;
  onNavigate?: (tab: ActiveTab) => void;
  onSwitchClassroom?: (id: string) => void;
  onMessagePrefill?: (prefill: FamilyMessagePrefill) => void;
  onInterventionPrefill?: (prefill: InterventionPrefill) => void;
}

function rankStatus(status: PanelStatus): number {
  switch (status.state) {
    case "needs_action":
      return 4;
    case "stale":
      return 3;
    case "draft_ready":
      return 2;
    case "fresh":
      return 1;
    case "not_applicable":
      return 0;
  }
}

export function usePaletteEntries({
  classrooms,
  activeClassroom,
  debtRegister,
  latestTodaySnapshot,
  activeRole,
  onNavigate,
  onSwitchClassroom,
  onMessagePrefill,
  onInterventionPrefill,
}: Input): PaletteEntry[] {
  return useMemo(() => {
    const entries: PaletteEntry[] = [];

    const recommendedStatus = [...(latestTodaySnapshot?.panel_statuses ?? [])]
      .filter((status) => status.panel_id in TAB_META)
      .filter((status) => activeRole ? isTabVisibleForRole(status.panel_id as ActiveTab, activeRole) : true)
      .sort((a, b) => {
        const rankDiff = rankStatus(b) - rankStatus(a);
        if (rankDiff !== 0) return rankDiff;
        return b.pending_count - a.pending_count;
      })[0];

    if (recommendedStatus && recommendedStatus.panel_id in TAB_META) {
      const targetTab = recommendedStatus.panel_id as ActiveTab;
      entries.push({
        kind: "action",
        id: `action:recommended:${targetTab}`,
        label: `Recommended now: ${TAB_META[targetTab].label}`,
        group: "Now",
        recommended: true,
        keywords: `recommended now next ${TAB_META[targetTab].label} ${recommendedStatus.detail}`.toLowerCase(),
        onSelect: () => onNavigate?.(targetTab),
      });
    }

    for (const tab of TAB_ORDER) {
      const meta = TAB_META[tab];
      const shortcut = paletteShortcutForTab(tab);
      entries.push({
        kind: "panel",
        id: `panel:${tab}`,
        label: meta.label,
        group: meta.group,
        keywords: [meta.label, meta.shortLabel, meta.group, tab].join(" ").toLowerCase(),
        shortcut: shortcut ?? undefined,
        onSelect: () => onNavigate?.(tab),
      });
    }

    for (const c of classrooms) {
      if (c.classroom_id === activeClassroom) continue;
      const label = `Grade ${c.grade_band} — ${c.subject_focus.replace(/_/g, " ")}`;
      entries.push({
        kind: "classroom",
        id: `classroom:${c.classroom_id}`,
        label,
        keywords: [label, c.classroom_id].join(" ").toLowerCase(),
        onSelect: () => onSwitchClassroom?.(c.classroom_id),
      });
    }

    // Debt-backed per-student actions appear before generic actions so the
    // command palette surfaces the most relevant daily workflow items first.
    if (debtRegister) {
      const seen = new Set<string>();
      for (const item of debtRegister.items) {
        for (const ref of item.student_refs) {
          if (!ref) continue;
          const dedupeKey = `${item.category}:${ref}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);
          if (item.category === "unapproved_message") {
            entries.push({
              kind: "action",
              id: `action:message:${ref}`,
              label: `Draft family message for ${ref}`,
              group: "Today",
              keywords: `today debt unapproved message family ${ref}`.toLowerCase(),
              onSelect: () => {
                onMessagePrefill?.({ student_ref: ref, reason: "", message_type: "routine_update" });
              },
            });
          }
          if (item.category === "stale_followup") {
            entries.push({
              kind: "action",
              id: `action:log:${ref}`,
              label: `Log follow-up for ${ref}`,
              group: "Today",
              keywords: `today debt stale follow-up intervention ${ref}`.toLowerCase(),
              onSelect: () => {
                onInterventionPrefill?.({ student_ref: ref, suggested_action: "", reason: "follow-up from Today" });
              },
            });
          }
        }
      }
    }

    const actions: Array<{ label: string; tab: ActiveTab; keywords: string }> = [
      { label: "Start lesson prep", tab: "differentiate", keywords: "prep start lesson differentiate variant adapt" },
      { label: "Simplify text", tab: "language-tools", keywords: "prep simplify language vocab translate" },
      { label: "Log intervention", tab: "log-intervention", keywords: "ops log intervention note behavior" },
      { label: "Plan tomorrow", tab: "tomorrow-plan", keywords: "ops plan tomorrow support priorities" },
      { label: "Forecast tomorrow", tab: "complexity-forecast", keywords: "ops forecast tomorrow complexity risk" },
      { label: "Prepare EA briefing", tab: "ea-briefing", keywords: "ops ea briefing assistant prepare" },
      { label: "Balance EA load", tab: "ea-load", keywords: "ops ea load balance schedule" },
      { label: "Build a sub packet", tab: "survival-packet", keywords: "ops sub substitute packet survival" },
      { label: "Draft family message", tab: "family-message", keywords: "review message family parent send draft" },
      { label: "Review support patterns", tab: "support-patterns", keywords: "review support patterns themes analysis" },
    ];
    for (const a of actions) {
      entries.push({
        kind: "action",
        id: `action:${a.tab}:${a.label}`,
        label: a.label,
        keywords: [a.label, a.keywords, TAB_META[a.tab].group].join(" ").toLowerCase(),
        onSelect: () => onNavigate?.(a.tab),
      });
    }

    return entries;
  }, [classrooms, activeClassroom, debtRegister, latestTodaySnapshot, activeRole, onNavigate, onSwitchClassroom, onMessagePrefill, onInterventionPrefill]);
}
