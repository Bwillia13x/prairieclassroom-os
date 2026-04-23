import { useMemo } from "react";
import {
  isActiveTool,
  resolveLegacyPanel,
  TAB_META,
  TAB_ORDER,
  TOOL_META,
  TOOLS_BY_TAB,
  type ActiveTab,
  type ActiveTool,
  type ClassroomRole,
  type NavTarget,
  isTabVisibleForRole,
} from "../appReducer";
import type { ClassroomProfile, FamilyMessagePrefill, InterventionPrefill, PanelStatus, TodaySnapshot } from "../types";

export type PaletteEntryKind = "panel" | "tool" | "classroom" | "action";

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
  onNavigate?: (target: NavTarget) => void;
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
      .filter((status) => isActiveTool(status.panel_id) || TAB_ORDER.includes(status.panel_id as ActiveTab))
      .filter((status) => {
        if (!activeRole) return true;
        const resolved = resolveLegacyPanel(status.panel_id);
        return isTabVisibleForRole(resolved.tab, activeRole);
      })
      .sort((a, b) => {
        const rankDiff = rankStatus(b) - rankStatus(a);
        if (rankDiff !== 0) return rankDiff;
        return b.pending_count - a.pending_count;
      })[0];

    if (recommendedStatus) {
      const target = recommendedStatus.panel_id;
      const resolved = resolveLegacyPanel(target);
      const label = isActiveTool(target) ? TOOL_META[target].label : TAB_META[resolved.tab].label;
      entries.push({
        kind: "action",
        id: `action:recommended:${target}`,
        label: `Recommended now: ${label}`,
        group: "Now",
        recommended: true,
        keywords: `recommended now next ${label} ${recommendedStatus.detail}`.toLowerCase(),
        onSelect: () => onNavigate?.(isActiveTool(target) ? (target as ActiveTool) : resolved.tab),
      });
    }

    // Top-level page entries — one per seven-view surface.
    for (const tab of TAB_ORDER) {
      const meta = TAB_META[tab];
      const shortcut = paletteShortcutForTab(tab);
      entries.push({
        kind: "panel",
        id: `panel:${tab}`,
        label: meta.label,
        group: meta.purpose,
        keywords: [meta.label, meta.shortLabel, meta.purpose, tab].join(" ").toLowerCase(),
        shortcut: shortcut ?? undefined,
        onSelect: () => onNavigate?.(tab),
      });
    }

    // Embedded tool entries — one per tool hosted inside Prep / Tomorrow
    // / Ops / Review. Selecting an entry opens the host page and focuses
    // the named tool.
    for (const [tab, tools] of Object.entries(TOOLS_BY_TAB) as [ActiveTab, ActiveTool[]][]) {
      const tabLabel = TAB_META[tab].label;
      for (const tool of tools) {
        const toolMeta = TOOL_META[tool];
        entries.push({
          kind: "tool",
          id: `tool:${tool}`,
          label: `${tabLabel} · ${toolMeta.label}`,
          group: tabLabel,
          keywords: [tabLabel, toolMeta.label, toolMeta.shortLabel, tool].join(" ").toLowerCase(),
          onSelect: () => onNavigate?.(tool),
        });
      }
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

    const actions: Array<{ label: string; target: NavTarget; keywords: string }> = [
      { label: "Start lesson prep", target: "differentiate", keywords: "prep start lesson differentiate variant adapt" },
      { label: "Simplify text", target: "language-tools", keywords: "prep simplify language vocab translate" },
      { label: "Log intervention", target: "log-intervention", keywords: "ops log intervention note behavior" },
      { label: "Plan tomorrow", target: "tomorrow-plan", keywords: "tomorrow plan support priorities" },
      { label: "Forecast tomorrow", target: "complexity-forecast", keywords: "tomorrow forecast complexity risk" },
      { label: "Prepare EA briefing", target: "ea-briefing", keywords: "ops ea briefing assistant prepare" },
      { label: "Balance EA load", target: "ea-load", keywords: "ops ea load balance schedule" },
      { label: "Build a sub packet", target: "survival-packet", keywords: "ops sub substitute packet survival" },
      { label: "Draft family message", target: "family-message", keywords: "review message family parent send draft" },
      { label: "Review support patterns", target: "support-patterns", keywords: "review support patterns themes analysis" },
    ];
    for (const a of actions) {
      const resolved = resolveLegacyPanel(a.target);
      entries.push({
        kind: "action",
        id: `action:${a.target}:${a.label}`,
        label: a.label,
        keywords: [a.label, a.keywords, TAB_META[resolved.tab].label].join(" ").toLowerCase(),
        onSelect: () => onNavigate?.(a.target),
      });
    }

    return entries;
  }, [classrooms, activeClassroom, debtRegister, latestTodaySnapshot, activeRole, onNavigate, onSwitchClassroom, onMessagePrefill, onInterventionPrefill]);
}
