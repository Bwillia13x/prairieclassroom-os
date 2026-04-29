/**
 * appReducer.ts — Central state management for PrairieClassroom OS.
 *
 * As of the 2026-04-23 seven-view navigation reorg, the shell no longer
 * uses the grouped `Today / Prep / Ops / Review` model. The teacher-facing
 * top-level navigation is a flat row of seven standalone views:
 *
 *   classroom · today · tomorrow · week · prep · ops · review
 *
 * A page may host multiple embedded tools (Prep hosts Differentiate +
 * Language Tools, Tomorrow hosts Plan + Forecast, Ops hosts the four
 * adult-facing ops tools, Review hosts Family Message + Support Patterns
 * + Usage Insights). Tool selection lives in a separate `activeTool`
 * state field and is mirrored onto the URL as an optional `?tool=`
 * parameter. Canonical writes always emit `?tab=<top-level>[&tool=<tool>]`.
 *
 * Legacy deep links (`?tab=tomorrow-plan`, `?tab=differentiate`, etc.)
 * are resolved on load via `resolveLegacyPanel` and redirected to their
 * canonical destinations on the next URL write.
 */

import type { ClassroomProfile, ComplexityDebtRegister, FamilyMessagePrefill, InterventionPrefill, TodaySnapshot, TomorrowNote } from "./types";
import type { SectionIconName } from "./components/SectionIcon";

const DEMO_CLASSROOM_ID = "demo-okafor-grade34";

// ─── Active Tab (top-level) ───

export type ActiveTab =
  | "classroom"
  | "today"
  | "tomorrow"
  | "week"
  | "prep"
  | "ops"
  | "review";

/**
 * Fixed top-level ordering used by the shell nav, mobile nav, command
 * palette, and `1…9` keyboard shortcuts. Do not reorder without updating
 * the corresponding tests and docs.
 */
export const TAB_ORDER: ActiveTab[] = [
  "classroom",
  "today",
  "tomorrow",
  "week",
  "prep",
  "ops",
  "review",
];

// ─── Embedded Tools (per page) ───

/**
 * Tool IDs that live inside a standalone page. These are intentionally
 * the same strings as the prior top-level tab IDs so that backend
 * `panel_id` values (`tomorrow-plan`, `log-intervention`, etc.) continue
 * to map one-to-one onto a concrete UI surface. The teacher-facing
 * top-level navigation never exposes these strings directly.
 */
export type ActiveTool =
  | "differentiate"
  | "language-tools"
  | "tomorrow-plan"
  | "complexity-forecast"
  | "log-intervention"
  | "ea-briefing"
  | "ea-load"
  | "survival-packet"
  | "family-message"
  | "support-patterns"
  | "usage-insights";

/** Alias exported for components that accept either a top-level tab or an embedded tool. */
export type NavTarget = ActiveTab | ActiveTool;

/**
 * Legacy panel/tool ids used by the backend (`panel_id` on
 * `PanelStatus`, `debt_register` targets, saved deep links) and by the
 * pre-reorg UI. They all resolve to exactly one (tab, tool) pair.
 */
export type LegacyPanelId = ActiveTool | "today";

export const ALL_TOOLS: ActiveTool[] = [
  "differentiate",
  "language-tools",
  "tomorrow-plan",
  "complexity-forecast",
  "log-intervention",
  "ea-briefing",
  "ea-load",
  "survival-packet",
  "family-message",
  "support-patterns",
  "usage-insights",
];

/** Ordered tools hosted by each page. First entry = default. */
export const TOOLS_BY_TAB: Partial<Record<ActiveTab, ActiveTool[]>> = {
  prep: ["differentiate", "language-tools"],
  tomorrow: ["tomorrow-plan", "complexity-forecast"],
  ops: ["log-intervention", "ea-briefing", "ea-load", "survival-packet"],
  review: ["family-message", "support-patterns", "usage-insights"],
};

/** First tool for a page, or `null` if the page is single-surface. */
export function defaultToolForTab(tab: ActiveTab): ActiveTool | null {
  const tools = TOOLS_BY_TAB[tab];
  return tools?.[0] ?? null;
}

export function isActiveTab(value: unknown): value is ActiveTab {
  return typeof value === "string" && TAB_ORDER.includes(value as ActiveTab);
}

export function isActiveTool(value: unknown): value is ActiveTool {
  return typeof value === "string" && ALL_TOOLS.includes(value as ActiveTool);
}

/**
 * Parent tab for a given embedded tool. Keeps the legacy panel-id ->
 * navigation mapping in one place so shell / palette / drill-down / etc.
 * can stay consistent.
 */
export function tabForTool(tool: ActiveTool): ActiveTab {
  for (const [tab, tools] of Object.entries(TOOLS_BY_TAB) as [ActiveTab, ActiveTool[]][]) {
    if (tools.includes(tool)) return tab;
  }
  // Defensive fallback — every tool must be hosted somewhere.
  return "today";
}

export interface ResolvedTarget {
  tab: ActiveTab;
  tool: ActiveTool | null;
}

/**
 * Translate any known panel/tool/tab id into its canonical (tab, tool)
 * pair. Accepts:
 *   - a new top-level tab id ("classroom", "today", …)
 *   - a legacy top-level tab id that still names a page ("today")
 *   - an embedded tool id ("tomorrow-plan", "log-intervention", …)
 *
 * Unknown strings fall back to the `today` page with no tool override.
 */
export function resolveLegacyPanel(id: string | null | undefined): ResolvedTarget {
  if (!id) return { tab: "today", tool: null };
  if (isActiveTab(id)) return { tab: id, tool: null };
  if (isActiveTool(id)) return { tab: tabForTool(id), tool: id };
  return { tab: "today", tool: null };
}

/**
 * Variant of `resolveLegacyPanel` used by `setActiveTab`-style
 * navigators: callers may pass an explicit `tool` alongside a top-level
 * tab. The explicit tool wins so long as it is actually hosted by the
 * resolved tab; otherwise the page's default tool is used.
 */
export function resolveNavTarget(target: NavTarget | string, tool?: ActiveTool | null): ResolvedTarget {
  const resolved = resolveLegacyPanel(target);
  if (tool === null) {
    return { tab: resolved.tab, tool: null };
  }
  if (tool && TOOLS_BY_TAB[resolved.tab]?.includes(tool)) {
    return { tab: resolved.tab, tool };
  }
  if (resolved.tool) return resolved;
  return { tab: resolved.tab, tool: defaultToolForTab(resolved.tab) };
}

// ─── TAB_META — shell-level metadata ───

export type SectionTone = "sun" | "sage" | "slate" | "forest" | "muted";

export interface TabMeta {
  label: string;
  shortLabel: string;
  icon: SectionIconName;
  sectionTone: SectionTone;
  /** Roles that should see this tab in the nav. */
  roles: readonly ClassroomRole[];
  /** Short human-readable purpose for command palette + docs. */
  purpose: string;
}

/**
 * Per-tab role visibility. Action-level capability gating inside each
 * embedded tool still runs through `roleCapabilities()` / the
 * orchestrator scope matrix; this only controls whether the tab button
 * appears in the shell.
 *
 * Keep aligned with `SCOPE_MATRIX` in
 * `services/orchestrator/__tests__/auth.test.ts` — this is the UI side
 * of the same contract.
 */
export const TAB_META: Record<ActiveTab, TabMeta> = {
  classroom: {
    label: "Classroom",
    shortLabel: "Classroom",
    icon: "grid",
    sectionTone: "sun",
    roles: ["teacher", "ea", "substitute"],
    purpose: "Bird's-eye dashboard — health, coverage, queues, student watch.",
  },
  today: {
    label: "Today",
    shortLabel: "Today",
    icon: "sun",
    sectionTone: "sun",
    roles: ["teacher", "ea", "substitute"],
    purpose: "Live-day triage — recommended next move, immediate risks, carry-forward.",
  },
  tomorrow: {
    label: "Tomorrow",
    shortLabel: "Tomorrow",
    icon: "calendar",
    sectionTone: "slate",
    roles: ["teacher", "substitute", "reviewer"],
    purpose: "Next-day plan, complexity forecast, and queued carry-forward.",
  },
  week: {
    label: "Week",
    shortLabel: "Week",
    // Phase D2 (2026-04-27) — five-column day-strip glyph replaces
    // the prior `grid` so the Week tab no longer collides with
    // Classroom and Ops, which also used `grid`.
    icon: "week",
    sectionTone: "slate",
    roles: ["teacher", "substitute", "reviewer"],
    purpose: "Multi-day coverage, upcoming events, planning rhythm, pattern pressure.",
  },
  prep: {
    label: "Prep",
    shortLabel: "Prep",
    icon: "pencil",
    sectionTone: "sage",
    roles: ["teacher"],
    purpose: "Lesson adaptation and language supports — differentiate and language tools.",
  },
  ops: {
    label: "Ops",
    shortLabel: "Ops",
    // Phase D2 (2026-04-27) — compass glyph replaces the prior
    // `grid`. Ops is adult coordination, not a dashboard, so the
    // cardinal-marker compass reads as "coordinate" not "view."
    icon: "compass",
    sectionTone: "slate",
    roles: ["teacher", "ea", "substitute"],
    purpose: "Adult coordination — log intervention, EA briefing, EA load, substitute packet.",
  },
  review: {
    label: "Review",
    shortLabel: "Review",
    icon: "bars",
    sectionTone: "forest",
    roles: ["teacher", "ea", "reviewer"],
    purpose: "Family message, support patterns, and usage insights.",
  },
};

export interface ToolMeta {
  label: string;
  shortLabel: string;
}

/**
 * Labels for embedded tools. Used by the Prep / Tomorrow / Ops / Review
 * local tool switchers, the command palette, and the URL restore logic.
 */
export const TOOL_META: Record<ActiveTool, ToolMeta> = {
  differentiate: { label: "Differentiate", shortLabel: "Differentiate" },
  "language-tools": { label: "Language Tools", shortLabel: "Language" },
  "tomorrow-plan": { label: "Tomorrow Plan", shortLabel: "Plan" },
  "complexity-forecast": { label: "Forecast", shortLabel: "Forecast" },
  "log-intervention": { label: "Log Intervention", shortLabel: "Log" },
  "ea-briefing": { label: "EA Briefing", shortLabel: "EA Brief" },
  "ea-load": { label: "EA Load Balance", shortLabel: "EA Load" },
  "survival-packet": { label: "Sub Packet", shortLabel: "Substitute" },
  "family-message": { label: "Family Message", shortLabel: "Message" },
  "support-patterns": { label: "Support Patterns", shortLabel: "Patterns" },
  "usage-insights": { label: "Usage Insights", shortLabel: "Insights" },
};

/**
 * Tabs a given role may see in the nav. If a role ends up with an empty
 * list (shouldn't happen for any defined role), the `today` tab is
 * returned so the nav is never completely blank.
 */
export function getVisibleTabs(role: ClassroomRole): ActiveTab[] {
  const visible = TAB_ORDER.filter((tab) => TAB_META[tab].roles.includes(role));
  return visible.length > 0 ? visible : ["today"];
}

export function isTabVisibleForRole(tab: ActiveTab, role: ClassroomRole): boolean {
  return TAB_META[tab].roles.includes(role);
}

/**
 * Debt-count badge value for the top-level tabs that aggregate over
 * embedded tools.
 *
 * Unified rule (see docs/spec.md → "Top-nav badge counts"): each badge
 * counts only the items the teacher should act on right now, not the
 * broader workload represented on the page. This keeps badges as
 * priority signals rather than inventory dashboards. Patterns,
 * unapproved messages, and EA moves remain visible inside each page's
 * own stat cards but are excluded from the nav badge.
 */
export function getTabBadgeCount(
  tab: ActiveTab,
  debtCounts: Record<string, number>,
  tomorrowNoteCount = 0,
): number {
  switch (tab) {
    case "tomorrow":
      return tomorrowNoteCount;
    case "review":
      return debtCounts.approaching_review ?? 0;
    case "ops":
      return debtCounts.stale_followup ?? 0;
    default:
      return 0;
  }
}

export type TabBadgeTone = "alert" | "count";

export function getTabBadgeTone(tab: ActiveTab): TabBadgeTone {
  switch (tab) {
    case "ops":
      return "alert";
    case "review":
      return "count";
    default:
      return "count";
  }
}

// ─── Undo System ───

export interface UndoAction {
  id: string;
  label: string;
  /** Async callback to reverse the action server-side */
  rollback: () => Promise<void>;
  /** Auto-dismiss timer handle */
  timerId?: ReturnType<typeof setTimeout>;
}

// ─── Feedback ───

export interface OutputFeedback {
  outputId: string;
  outputType: string;
  rating: "up" | "down";
  note?: string;
  timestamp: string;
}

// ─── Streaming State ───

export interface StreamingState {
  active: boolean;
  /** Current phase: "thinking" | "structuring" | "complete" */
  phase: "idle" | "thinking" | "structuring" | "complete";
  /** Raw thinking text streamed incrementally */
  thinkingText: string;
  /** Partial structured output as sections arrive */
  partialSections: string[];
  /** Progress 0–1 (estimated) */
  progress: number;
  /** Elapsed seconds since streaming started */
  elapsedSeconds: number;
}

// ─── Toast Queue ───

export interface ToastItem {
  id: string;
  type: "success" | "undo" | "info" | "error";
  message: string;
  /** For undo toasts */
  undoAction?: UndoAction;
  /** Duration in ms before auto-dismiss (0 = sticky) */
  duration: number;
}

export interface AuthPromptState {
  classroomId: string;
  message: string;
  status: number;
  source: "selection" | "request";
  retry?: (code?: string) => Promise<unknown>;
}

// ─── Classroom Role ───

export type ClassroomRole = "teacher" | "ea" | "substitute" | "reviewer";

export const CLASSROOM_ROLES: readonly ClassroomRole[] = [
  "teacher",
  "ea",
  "substitute",
  "reviewer",
] as const;

export function isClassroomRole(value: unknown): value is ClassroomRole {
  return typeof value === "string" && (CLASSROOM_ROLES as readonly string[]).includes(value);
}

// ─── App State ───

export interface AppState {
  classrooms: ClassroomProfile[];
  activeTab: ActiveTab;
  /** Optional embedded tool for pages that host multiple surfaces. */
  activeTool: ActiveTool | null;
  activeClassroom: string;
  messagePrefill: FamilyMessagePrefill | null;
  interventionPrefill: InterventionPrefill | null;
  initError: string | null;
  debtCounts: Record<string, number>;
  latestDebtRegister: ComplexityDebtRegister | null;
  latestTodaySnapshot: TodaySnapshot | null;
  showOnboarding: boolean;

  // Toast queue (replaces single successMsg)
  toasts: ToastItem[];

  // Streaming state for planning-tier requests
  streaming: StreamingState;

  // Contextual onboarding — tracks which features teacher has used
  featuresSeen: Record<string, boolean>;

  // Feedback store (persisted to localStorage)
  feedbackQueue: OutputFeedback[];

  // Protected classroom access codes (persisted locally)
  classroomAccessCodes: Record<string, string>;

  // Auth prompt state for protected classroom flows
  authPrompt: AuthPromptState | null;

  // Per-classroom role selection (persisted locally)
  classroomRoles: Record<string, ClassroomRole>;

  // Role prompt dialog state
  rolePrompt: { classroomId: string } | null;

  // Tomorrow notes collected from output panels (persisted to localStorage)
  tomorrowNotes: TomorrowNote[];
}

// ─── Actions ───

export type AppAction =
  | { type: "SET_CLASSROOMS"; classrooms: ClassroomProfile[] }
  | { type: "SET_ACTIVE_CLASSROOM"; classroomId: string }
  | { type: "SET_ACTIVE_TAB"; tab: ActiveTab; tool?: ActiveTool | null }
  | { type: "SET_ACTIVE_TOOL"; tool: ActiveTool | null }
  | { type: "SET_INIT_ERROR"; error: string }
  | { type: "SET_TODAY_SNAPSHOT"; snapshot: TodaySnapshot }
  | { type: "SET_DEBT_REGISTER"; register: ComplexityDebtRegister }
  | { type: "SET_MESSAGE_PREFILL"; prefill: FamilyMessagePrefill | null }
  | { type: "SET_INTERVENTION_PREFILL"; prefill: InterventionPrefill | null }
  | { type: "SHOW_ONBOARDING"; show: boolean }
  // Toast queue
  | { type: "PUSH_TOAST"; toast: ToastItem }
  | { type: "DISMISS_TOAST"; id: string }
  // Streaming
  | { type: "STREAM_START"; phase: "thinking" | "structuring" }
  | { type: "STREAM_THINKING_CHUNK"; text: string }
  | { type: "STREAM_SECTION"; section: string }
  | { type: "STREAM_PROGRESS"; progress: number }
  | { type: "STREAM_COMPLETE" }
  | { type: "STREAM_RESET" }
  | { type: "STREAM_TICK" }
  // Contextual onboarding
  | { type: "MARK_FEATURE_SEEN"; feature: string }
  | { type: "CLEAR_FEATURE_SEEN"; feature: string }
  | { type: "RESET_FEATURES_SEEN" }
  // Feedback
  | { type: "ADD_FEEDBACK"; feedback: OutputFeedback }
  | { type: "FLUSH_FEEDBACK" }
  | { type: "SET_CLASSROOM_ACCESS_CODE"; classroomId: string; code: string }
  | { type: "OPEN_AUTH_PROMPT"; prompt: AuthPromptState }
  | { type: "CLOSE_AUTH_PROMPT" }
  | { type: "SET_CLASSROOM_ROLE"; classroomId: string; role: ClassroomRole }
  | { type: "OPEN_ROLE_PROMPT"; classroomId: string }
  | { type: "CLOSE_ROLE_PROMPT" }
  | { type: "APPEND_TOMORROW_NOTE"; note: TomorrowNote }
  | { type: "REMOVE_TOMORROW_NOTE"; id: string }
  | { type: "CLEAR_TOMORROW_NOTES" };

// ─── Initial State ───

// Warn on a corrupted localStorage value so operators can diagnose
// "I'm suddenly being asked for my classroom code" reports from the console.
function warnOnLocalStorageParse(key: string, err: unknown): void {
  if (err instanceof SyntaxError) {
    console.warn(`[appReducer] localStorage "${key}" was corrupted; resetting.`, err);
  } else {
    console.warn(`[appReducer] localStorage "${key}" read failed.`, err);
  }
}

function loadFeaturesSeen(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem("prairie-features-seen");
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    warnOnLocalStorageParse("prairie-features-seen", err);
    return {};
  }
}

function loadFeedbackQueue(): OutputFeedback[] {
  try {
    const raw = localStorage.getItem("prairie-feedback-queue");
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    warnOnLocalStorageParse("prairie-feedback-queue", err);
    return [];
  }
}

function loadClassroomAccessCodes(): Record<string, string> {
  try {
    const raw = localStorage.getItem("prairie-classroom-access-codes");
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    warnOnLocalStorageParse("prairie-classroom-access-codes", err);
    return {};
  }
}

function loadClassroomRoles(): Record<string, ClassroomRole> {
  try {
    const raw = localStorage.getItem("prairie-classroom-roles");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<string, ClassroomRole> = {};
    let hadInvalid = false;
    for (const [classroomId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (isClassroomRole(value)) {
        result[classroomId] = value;
      } else {
        hadInvalid = true;
        result[classroomId] = "teacher";
      }
    }
    if (hadInvalid) {
      console.warn(
        "[appReducer] Dropped unknown role values from prairie-classroom-roles; defaulted to 'teacher'.",
      );
    }
    return result;
  } catch (err) {
    warnOnLocalStorageParse("prairie-classroom-roles", err);
    return {};
  }
}

function loadTomorrowNotes(): TomorrowNote[] {
  try {
    const raw = localStorage.getItem("prairie-tomorrow-notes");
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    warnOnLocalStorageParse("prairie-tomorrow-notes", err);
    return [];
  }
}

/**
 * Restore the active tab + optional embedded tool from the URL.
 *
 * - Missing `?tab=` lands on `classroom` (teacher default).
 * - Top-level new-world tab ids (classroom/today/tomorrow/…) land
 *   directly on that page.
 * - Legacy panel ids (tomorrow-plan, log-intervention, differentiate, …)
 *   are redirected to their host page and the tool id is captured as
 *   `activeTool` so the page opens already pointing at the intended
 *   surface.
 * - An explicit `?tool=` refines the embedded tool when it is valid for
 *   the resolved page.
 */
export function restoreNavFromUrl(): { tab: ActiveTab; tool: ActiveTool | null } {
  if (typeof window === "undefined") {
    return { tab: "classroom", tool: null };
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    const toolParam = params.get("tool");

    if (!tabParam) {
      return { tab: "classroom", tool: null };
    }

    const resolvedFromTab = resolveLegacyPanel(tabParam);
    const resolved: ResolvedTarget = isActiveTool(toolParam) && TOOLS_BY_TAB[resolvedFromTab.tab]?.includes(toolParam)
      ? { tab: resolvedFromTab.tab, tool: toolParam }
      : resolvedFromTab;

    if (resolved.tool) return resolved;
    // If the top-level page declares embedded tools, default to the first
    // so panels that key off `activeTool` render their landing surface.
    return { tab: resolved.tab, tool: defaultToolForTab(resolved.tab) };
  } catch {
    return { tab: "classroom", tool: null };
  }
}

export function shouldSuppressFirstRunModalsFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const truthy = (value: string | null) => ["1", "true", "yes", "on"].includes((value ?? "").toLowerCase());
    return truthy(params.get("demo")) || truthy(params.get("presentation")) || truthy(params.get("judge"));
  } catch {
    return false;
  }
}

function restoreClassroomFromUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    const params = new URLSearchParams(window.location.search);
    const requestedClassroom = params.get("classroom");
    if (requestedClassroom) return requestedClassroom;
    const demoFlag = params.get("demo");
    if (["1", "true", "yes", "on"].includes((demoFlag ?? "").toLowerCase())) {
      return DEMO_CLASSROOM_ID;
    }
  } catch {
    return "";
  }
  return "";
}

export function createInitialState(): AppState {
  const nav = restoreNavFromUrl();
  return {
    classrooms: [],
    activeTab: nav.tab,
    activeTool: nav.tool,
    activeClassroom: restoreClassroomFromUrl(),
    messagePrefill: null,
    interventionPrefill: null,
    initError: null,
    debtCounts: {},
    latestDebtRegister: null,
    latestTodaySnapshot: null,
    showOnboarding: !shouldSuppressFirstRunModalsFromUrl() && !localStorage.getItem("prairie-onboarding-done"),
    toasts: [],
    streaming: {
      active: false,
      phase: "idle",
      thinkingText: "",
      partialSections: [],
      progress: 0,
      elapsedSeconds: 0,
    },
    featuresSeen: loadFeaturesSeen(),
    feedbackQueue: loadFeedbackQueue(),
    classroomAccessCodes: loadClassroomAccessCodes(),
    authPrompt: null,
    classroomRoles: loadClassroomRoles(),
    rolePrompt: null,
    tomorrowNotes: loadTomorrowNotes(),
  };
}

// ─── Reducer ───

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_CLASSROOMS":
      return { ...state, classrooms: action.classrooms };

    case "SET_ACTIVE_CLASSROOM":
      if (action.classroomId === state.activeClassroom) {
        return {
          ...state,
          activeClassroom: action.classroomId,
        };
      }
      return {
        ...state,
        activeClassroom: action.classroomId,
        debtCounts: {},
        latestDebtRegister: null,
        latestTodaySnapshot: null,
      };

    case "SET_TODAY_SNAPSHOT":
      return {
        ...state,
        latestTodaySnapshot: action.snapshot,
        latestDebtRegister: action.snapshot.debt_register,
        debtCounts: action.snapshot.debt_register.item_count_by_category,
      };

    case "SET_ACTIVE_TAB": {
      const nextTab = action.tab;
      const explicitTool = action.tool;
      // When crossing to a new page we refresh the embedded tool to the
      // caller-provided value (if valid) or the page default so the
      // panel renders its landing surface instead of an empty shell.
      if (nextTab === state.activeTab) {
        if (explicitTool === undefined) return state;
        return { ...state, activeTool: explicitTool };
      }
      let nextTool: ActiveTool | null;
      if (explicitTool === undefined) {
        nextTool = defaultToolForTab(nextTab);
      } else if (explicitTool === null) {
        nextTool = defaultToolForTab(nextTab);
      } else if (TOOLS_BY_TAB[nextTab]?.includes(explicitTool)) {
        nextTool = explicitTool;
      } else {
        nextTool = defaultToolForTab(nextTab);
      }
      return { ...state, activeTab: nextTab, activeTool: nextTool };
    }

    case "SET_ACTIVE_TOOL": {
      const nextTool = action.tool;
      if (nextTool && !TOOLS_BY_TAB[state.activeTab]?.includes(nextTool)) {
        return state;
      }
      return { ...state, activeTool: nextTool };
    }

    case "SET_INIT_ERROR":
      return { ...state, initError: action.error };

    case "SET_DEBT_REGISTER":
      return {
        ...state,
        latestDebtRegister: action.register,
        debtCounts: action.register.item_count_by_category,
      };

    case "SET_MESSAGE_PREFILL":
      return { ...state, messagePrefill: action.prefill };

    case "SET_INTERVENTION_PREFILL":
      return { ...state, interventionPrefill: action.prefill };

    case "SHOW_ONBOARDING":
      return { ...state, showOnboarding: action.show };

    // ─── Toast Queue ───

    case "PUSH_TOAST":
      return { ...state, toasts: [...state.toasts, action.toast] };

    case "DISMISS_TOAST":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };

    // ─── Streaming ───

    case "STREAM_START":
      return {
        ...state,
        streaming: {
          active: true,
          phase: action.phase,
          thinkingText: "",
          partialSections: [],
          progress: 0,
          elapsedSeconds: 0,
        },
      };

    case "STREAM_THINKING_CHUNK":
      return {
        ...state,
        streaming: {
          ...state.streaming,
          thinkingText: state.streaming.thinkingText + action.text,
        },
      };

    case "STREAM_SECTION":
      return {
        ...state,
        streaming: {
          ...state.streaming,
          phase: "structuring",
          partialSections: [...state.streaming.partialSections, action.section],
        },
      };

    case "STREAM_PROGRESS":
      return {
        ...state,
        streaming: { ...state.streaming, progress: action.progress },
      };

    case "STREAM_COMPLETE":
      return {
        ...state,
        streaming: { ...state.streaming, active: false, phase: "complete", progress: 1 },
      };

    case "STREAM_TICK":
      if (!state.streaming.active) return state;
      return {
        ...state,
        streaming: { ...state.streaming, elapsedSeconds: state.streaming.elapsedSeconds + 1 },
      };

    case "STREAM_RESET":
      return {
        ...state,
        streaming: {
          active: false,
          phase: "idle",
          thinkingText: "",
          partialSections: [],
          progress: 0,
          elapsedSeconds: 0,
        },
      };

    // ─── Contextual Onboarding ───

    case "MARK_FEATURE_SEEN": {
      const featuresSeen = { ...state.featuresSeen, [action.feature]: true };
      try { localStorage.setItem("prairie-features-seen", JSON.stringify(featuresSeen)); } catch { /* noop */ }
      return { ...state, featuresSeen };
    }

    case "CLEAR_FEATURE_SEEN": {
      if (!state.featuresSeen[action.feature]) return state;
      const { [action.feature]: _removed, ...rest } = state.featuresSeen;
      try {
        if (Object.keys(rest).length === 0) {
          localStorage.removeItem("prairie-features-seen");
        } else {
          localStorage.setItem("prairie-features-seen", JSON.stringify(rest));
        }
      } catch { /* noop */ }
      return { ...state, featuresSeen: rest };
    }

    case "RESET_FEATURES_SEEN": {
      try { localStorage.removeItem("prairie-features-seen"); } catch { /* noop */ }
      return { ...state, featuresSeen: {} };
    }

    // ─── Feedback ───

    case "ADD_FEEDBACK": {
      const feedbackQueue = [...state.feedbackQueue, action.feedback];
      try { localStorage.setItem("prairie-feedback-queue", JSON.stringify(feedbackQueue)); } catch { /* noop */ }
      return { ...state, feedbackQueue };
    }

    case "FLUSH_FEEDBACK":
      try { localStorage.removeItem("prairie-feedback-queue"); } catch { /* noop */ }
      return { ...state, feedbackQueue: [] };

    case "SET_CLASSROOM_ACCESS_CODE": {
      const classroomAccessCodes = {
        ...state.classroomAccessCodes,
        [action.classroomId]: action.code,
      };
      try {
        localStorage.setItem("prairie-classroom-access-codes", JSON.stringify(classroomAccessCodes));
      } catch {
        /* noop */
      }
      return { ...state, classroomAccessCodes };
    }

    case "OPEN_AUTH_PROMPT":
      return { ...state, authPrompt: action.prompt };

    case "CLOSE_AUTH_PROMPT":
      return { ...state, authPrompt: null };

    case "SET_CLASSROOM_ROLE": {
      const classroomRoles = {
        ...state.classroomRoles,
        [action.classroomId]: action.role,
      };
      try {
        localStorage.setItem("prairie-classroom-roles", JSON.stringify(classroomRoles));
      } catch {
        /* noop */
      }
      return { ...state, classroomRoles };
    }

    case "OPEN_ROLE_PROMPT":
      return { ...state, rolePrompt: { classroomId: action.classroomId } };

    case "CLOSE_ROLE_PROMPT":
      return { ...state, rolePrompt: null };

    // ─── Tomorrow Notes ───

    case "APPEND_TOMORROW_NOTE": {
      const tomorrowNotes = [...state.tomorrowNotes, action.note];
      try { localStorage.setItem("prairie-tomorrow-notes", JSON.stringify(tomorrowNotes)); } catch { /* noop */ }
      return { ...state, tomorrowNotes };
    }

    case "REMOVE_TOMORROW_NOTE": {
      const tomorrowNotes = state.tomorrowNotes.filter((n) => n.id !== action.id);
      try { localStorage.setItem("prairie-tomorrow-notes", JSON.stringify(tomorrowNotes)); } catch { /* noop */ }
      return { ...state, tomorrowNotes };
    }

    case "CLEAR_TOMORROW_NOTES":
      try { localStorage.removeItem("prairie-tomorrow-notes"); } catch { /* noop */ }
      return { ...state, tomorrowNotes: [] };

    default:
      return state;
  }
}
