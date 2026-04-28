import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import AppContext from "./AppContext";
import { SessionProvider } from "./SessionContext";
import {
  appReducer,
  createInitialState,
  defaultToolForTab,
  getTabBadgeCount,
  getTabBadgeTone,
  getVisibleTabs,
  isActiveTab,
  isActiveTool,
  isTabVisibleForRole,
  resolveNavTarget,
  shouldSuppressFirstRunModalsFromUrl,
  TAB_META,
  TOOLS_BY_TAB,
  type ActiveTab,
  type ActiveTool,
  type AuthPromptState,
  type ClassroomRole,
  type NavTarget,
} from "./appReducer";
import { configureApiClient, fetchTodaySnapshot, listClassrooms } from "./api";
import { getClassroomLoadErrorMessage } from "./appErrors";
import ErrorBoundary from "./components/ErrorBoundary";
import SectionSkeleton from "./components/SectionSkeleton";
import ToastQueue from "./components/ToastQueue";
import StatusChip from "./components/StatusChip";
import ClassroomAccessDialog from "./components/ClassroomAccessDialog";
import RoleContextPill from "./components/RoleContextPill";
import { Popover } from "./components/popover";
import RoleEscapeBanner from "./components/RoleEscapeBanner";
import RolePromptDialog from "./components/RolePromptDialog";
import ClassroomPanel from "./panels/ClassroomPanel";
import TodayPanel from "./panels/TodayPanel";
import BrandMark from "./components/BrandMark";
import MobileNav from "./components/MobileNav";
import OnboardingOverlay from "./components/OnboardingOverlay";
import ThemeToggle from "./components/ThemeToggle";
import HeaderAction from "./components/shared/HeaderAction";
import SectionIcon from "./components/SectionIcon";
import AppFooter from "./components/AppFooter";
import PageAnchorRail from "./components/PageAnchorRail";
import ShortcutSheet from "./components/ShortcutSheet";
import CommandPalette from "./components/CommandPalette";
import { usePaletteEntries } from "./hooks/usePaletteEntries";
import { useNothingButtonPressAnimation } from "./hooks/useNothingButtonPressAnimation";
import { useAmbientCursorGlow } from "./hooks/useAmbientCursorGlow";
import { reportError } from "./errorReporter";
import { flushFeedbackQueue } from "./hooks/useFeedback";
import { flushSessionQueue } from "./hooks/useSessionContext";
import { PAGE_ANCHORS } from "./pageAnchors";
import type { ClassroomProfile, FamilyMessagePrefill, InterventionPrefill, TomorrowNote } from "./types";

const DEMO_CLASSROOM_ID = "demo-okafor-grade34";
const PAGE_RAIL_COLLAPSED_KEY = "prairie:page-rail-collapsed";
const LEGACY_TODAY_RAIL_COLLAPSED_KEY = "prairie:today-rail-collapsed";
const PAGE_RAIL_TABS: ReadonlySet<ActiveTab> = new Set([
  "classroom",
  "today",
  "tomorrow",
  "week",
]);
const TomorrowPanel = lazy(() => import("./panels/TomorrowPanel"));
const WeekPanel = lazy(() => import("./panels/WeekPanel"));
const PrepPanel = lazy(() => import("./panels/PrepPanel"));
const OpsPanel = lazy(() => import("./panels/OpsPanel"));
const ReviewPanel = lazy(() => import("./panels/ReviewPanel"));
const todaySnapshotRequestCache = new Map<string, ReturnType<typeof fetchTodaySnapshot>>();

function loadTodaySnapshotOnce(classroomId: string) {
  const cached = todaySnapshotRequestCache.get(classroomId);
  if (cached) return cached;

  const request = fetchTodaySnapshot(classroomId).finally(() => {
    if (todaySnapshotRequestCache.get(classroomId) === request) {
      todaySnapshotRequestCache.delete(classroomId);
    }
  });
  todaySnapshotRequestCache.set(classroomId, request);
  return request;
}

function describeClassroom(classroom: ClassroomProfile) {
  return `Grade ${classroom.grade_band} ${classroom.subject_focus.replace(/_/g, " ")}`;
}

function renderPanel(
  activeTab: ActiveTab,
  targetTab: ActiveTab,
  mountedTabs: Set<ActiveTab>,
  panel: ReactNode,
) {
  if (!mountedTabs.has(targetTab)) return null;
  return (
    <div
      role="tabpanel"
      id={`panel-${targetTab}`}
      aria-labelledby={`tab-${targetTab}`}
      data-tab={targetTab}
      hidden={activeTab !== targetTab}
    >
      <ErrorBoundary>
        <Suspense
          fallback={
            <SectionSkeleton
              label={`Loading ${TAB_META[targetTab].label} workspace`}
              variant="story"
              lines={3}
            />
          }
        >
          {panel}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);
  const activeRole: ClassroomRole =
    state.classroomRoles[state.activeClassroom] ?? "teacher";
  useNothingButtonPressAnimation();
  useAmbientCursorGlow();
  const authPromptResolverRef = useRef<((code: string | null) => void) | null>(null);
  const classroomsRef = useRef<ClassroomProfile[]>(state.classrooms);
  const classroomCodesRef = useRef(state.classroomAccessCodes);
  const classroomRolesRef = useRef(state.classroomRoles);
  const classroomTriggerRef = useRef<HTMLButtonElement>(null);
  const appShellRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const queuedFlushPromiseRef = useRef<Promise<void> | null>(null);
  // Ref mirrors visibleTabs so the global keydown handler doesn't need to
  // re-register whenever the role changes (and so the `1…9/0` shortcuts
  // always index into the current role's visible tab list).
  const visibleTabsRef = useRef<ActiveTab[]>([]);
  const [classroomMenuOpen, setClassroomMenuOpen] = useState(false);
  const [shortcutSheetOpen, setShortcutSheetOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [pageRailCollapsed, setPageRailCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return (
        window.localStorage.getItem(PAGE_RAIL_COLLAPSED_KEY) === "1" ||
        window.localStorage.getItem(LEGACY_TODAY_RAIL_COLLAPSED_KEY) === "1"
      );
    } catch {
      return false;
    }
  });
  // state.activeTab already reflects the URL ?tab= via createInitialState,
  // so mounting just the active tab covers deep links without an extra parse.
  const [mountedTabs, setMountedTabs] = useState<Set<ActiveTab>>(
    () => new Set<ActiveTab>([state.activeTab]),
  );

  useEffect(() => {
    classroomsRef.current = state.classrooms;
  }, [state.classrooms]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        PAGE_RAIL_COLLAPSED_KEY,
        pageRailCollapsed ? "1" : "0",
      );
    } catch {
      /* Ignore quota / privacy-mode failures; the drawer still works in memory. */
    }
  }, [pageRailCollapsed]);

  useLayoutEffect(() => {
    const shell = appShellRef.current;
    const header = headerRef.current;
    if (!shell || !header) return;

    const updateStickyOffset = () => {
      shell.style.setProperty("--shell-sticky-offset", `${Math.ceil(header.getBoundingClientRect().height)}px`);
    };

    updateStickyOffset();
    window.addEventListener("resize", updateStickyOffset);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => updateStickyOffset());
      observer.observe(header);
    }

    return () => {
      window.removeEventListener("resize", updateStickyOffset);
      observer?.disconnect();
      shell.style.removeProperty("--shell-sticky-offset");
    };
  }, []);

  useEffect(() => {
    classroomCodesRef.current = state.classroomAccessCodes;
  }, [state.classroomAccessCodes]);

  useEffect(() => {
    classroomRolesRef.current = state.classroomRoles;
  }, [state.classroomRoles]);

  const showSuccess = useCallback((msg: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    dispatch({ type: "PUSH_TOAST", toast: { id, type: "success", message: msg, duration: 4500 } });
  }, []);

  const showError = useCallback((msg: string) => {
    const id = `error-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    dispatch({ type: "PUSH_TOAST", toast: { id, type: "error", message: msg, duration: 7000 } });
  }, []);

  const showUndo = useCallback((label: string, rollback: () => Promise<void>) => {
    const id = `undo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    dispatch({
      type: "PUSH_TOAST",
      toast: { id, type: "undo", message: label, undoAction: { id, label, rollback }, duration: 8000 },
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    dispatch({ type: "DISMISS_TOAST", id });
  }, []);

  const flushQueuedClientArtifacts = useCallback(() => {
    if (queuedFlushPromiseRef.current) return queuedFlushPromiseRef.current;

    queuedFlushPromiseRef.current = Promise.allSettled([
      flushFeedbackQueue(),
      flushSessionQueue(),
    ])
      .then((results) => {
        for (const result of results) {
          if (result.status === "rejected") {
            reportError(result.reason instanceof Error ? result.reason : String(result.reason));
          }
        }
      })
      .finally(() => {
        queuedFlushPromiseRef.current = null;
      });

    return queuedFlushPromiseRef.current;
  }, []);

  const submitFeedback = useCallback((outputId: string, outputType: string, rating: "up" | "down", note?: string) => {
    dispatch({
      type: "ADD_FEEDBACK",
      feedback: { outputId, outputType, rating, note, timestamp: new Date().toISOString() },
    });
  }, []);

  const appendTomorrowNote = useCallback(
    (note: Omit<TomorrowNote, "id" | "createdAt">) => {
      dispatch({
        type: "APPEND_TOMORROW_NOTE",
        note: {
          ...note,
          id: typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
        },
      });
    },
    [],
  );

  const removeTomorrowNote = useCallback((id: string) => {
    dispatch({ type: "REMOVE_TOMORROW_NOTE", id });
  }, []);

  const getTabPanelElement = useCallback(
    (tab: ActiveTab) => document.querySelector(
      `.app-main > [role="tabpanel"][data-tab="${tab}"]`,
    ) as HTMLElement | null,
    [],
  );

  const getTabScrollElement = useCallback(
    (tab: ActiveTab) => {
      const panel = getTabPanelElement(tab);
      if (!panel) return null;

      const appMain = panel.closest<HTMLElement>(".app-main");
      const overflowY = window.getComputedStyle(panel).overflowY;
      const panelOwnsScroll =
        overflowY !== "visible" &&
        overflowY !== "clip" &&
        panel.scrollHeight > panel.clientHeight;

      return panelOwnsScroll ? panel : appMain;
    },
    [getTabPanelElement],
  );

  const saveScrollForTab = useCallback(
    (tab: ActiveTab) => {
      const scrollEl = getTabScrollElement(tab);
      if (!scrollEl) return;
      sessionStorage.setItem(`prairie-scroll-${tab}`, String(scrollEl.scrollTop));
    },
    [getTabScrollElement],
  );

  const setActiveTab = useCallback((target: NavTarget | string, tool?: ActiveTool | null) => {
    const { tab: nextTab, tool: nextTool } = resolveNavTarget(target, tool);
    if (nextTab === state.activeTab && nextTool === state.activeTool) {
      return;
    }

    saveScrollForTab(state.activeTab);

    // Mount the target tab in the same React batch as the active-tab change,
    // so the panel renders on the next frame instead of after a second render.
    // Without this, lazy-mounted panels flash blank for one frame on first visit.
    setMountedTabs((prev) => {
      if (prev.has(nextTab)) return prev;
      const next = new Set(prev);
      next.add(nextTab);
      return next;
    });
    dispatch({ type: "SET_ACTIVE_TAB", tab: nextTab, tool: nextTool });
  }, [saveScrollForTab, state.activeTab, state.activeTool]);

  const setActiveTool = useCallback((nextTool: ActiveTool | null) => {
    dispatch({ type: "SET_ACTIVE_TOOL", tool: nextTool });
  }, []);

  const openAuthPrompt = useCallback((prompt: AuthPromptState, resolver?: (code: string | null) => void) => {
    authPromptResolverRef.current?.(null);
    authPromptResolverRef.current = resolver ?? null;
    dispatch({ type: "OPEN_AUTH_PROMPT", prompt });
  }, []);

  const closeAuthPrompt = useCallback(() => {
    const resolver = authPromptResolverRef.current;
    authPromptResolverRef.current = null;
    dispatch({ type: "CLOSE_AUTH_PROMPT" });
    resolver?.(null);
  }, []);

  const setActiveClassroom = useCallback((classroomId: string, classroomsOverride?: ClassroomProfile[]) => {
    dispatch({ type: "SET_ACTIVE_CLASSROOM", classroomId });

    const classrooms = classroomsOverride ?? classroomsRef.current;
    const classroom = classrooms.find((entry) => entry.classroom_id === classroomId);
    if (!classroom?.requires_access_code || classroomCodesRef.current[classroomId]) {
      return;
    }

    openAuthPrompt({
      classroomId,
      message: `${describeClassroom(classroom)} is protected. Save the classroom access code to unlock planning, messaging, and intervention workflows.`,
      status: 401,
      source: "selection",
    });
  }, [openAuthPrompt]);

  const requestClassroomCode = useCallback((challenge: { classroomId: string; status: number; message: string }) => (
    new Promise<string | null>((resolve) => {
      openAuthPrompt({
        classroomId: challenge.classroomId,
        message: challenge.message,
        status: challenge.status,
        source: "request",
      }, resolve);
    })
  ), [openAuthPrompt]);

  const handleAuthSubmit = useCallback((code: string) => {
    if (!state.authPrompt) return;
    dispatch({ type: "SET_CLASSROOM_ACCESS_CODE", classroomId: state.authPrompt.classroomId, code });
    const resolver = authPromptResolverRef.current;
    authPromptResolverRef.current = null;
    dispatch({ type: "CLOSE_AUTH_PROMPT" });
    resolver?.(code);
    if (!resolver) {
      showSuccess("Classroom access saved");
    }
  }, [showSuccess, state.authPrompt]);

  useEffect(() => {
    let cancelled = false;

    listClassrooms()
      .then((data) => {
        if (cancelled) return;

        dispatch({ type: "SET_CLASSROOMS", classrooms: data });

        const params = new URLSearchParams(window.location.search);
        const requestedClassroomId = params.get("classroom");
        const demoRequested = params.get("demo") === "true";
        const demoClassroom = data.find((entry) => entry.is_demo || entry.classroom_id === DEMO_CLASSROOM_ID);

        const nextClassroomId = requestedClassroomId && data.some((entry) => entry.classroom_id === requestedClassroomId)
          ? requestedClassroomId
          : demoRequested && demoClassroom
            ? demoClassroom.classroom_id
            : data[0]?.classroom_id ?? "";

        if (nextClassroomId) {
          setActiveClassroom(nextClassroomId, data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          dispatch({
            type: "SET_INIT_ERROR",
            error: getClassroomLoadErrorMessage(err),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setActiveClassroom]);

  // Configure the API client synchronously during the layout phase so that
  // any child useEffect (e.g. TodayPanel's snapshot fetch) sees a fully
  // wired client on first mount. Closures read from refs to avoid the
  // cleanup/setup race that would otherwise occur on every code change.
  useLayoutEffect(() => {
    configureApiClient({
      getClassroomCode: (classroomId) => classroomCodesRef.current[classroomId],
      getClassroomRole: (classroomId) => classroomRolesRef.current[classroomId] ?? "teacher",
      requestClassroomCode,
    });

    return () => {
      configureApiClient({
        getClassroomCode: undefined,
        getClassroomRole: undefined,
        requestClassroomCode: undefined,
      });
    };
  }, [requestClassroomCode]);

  // Flush queued telemetry once on mount. Online recovery is handled by the
  // separate 'online' listener below; we intentionally do NOT re-flush on every
  // classroomAccessCodes change because that causes burst writes on first auth.
  useEffect(() => {
    void flushQueuedClientArtifacts();
  }, [flushQueuedClientArtifacts]);

  // One-time GOT-IT migration (2026-04-19 OPS audit): teachers who already
  // dismissed any of the six legacy per-panel hints should not be re-onboarded
  // by the new section-level `ops-section` hint. Runs exactly once per mount.
  useEffect(() => {
    const LEGACY_OPS_KEYS = [
      "tomorrow-plan",
      "ea-briefing",
      "ea-load",
      "complexity-forecast",
      "log-intervention",
      "survival-packet",
    ];
    if (state.featuresSeen["ops-section"]) return;
    const alreadyDismissedLegacy = LEGACY_OPS_KEYS.some((key) => state.featuresSeen[key]);
    if (alreadyDismissedLegacy) {
      dispatch({ type: "MARK_FEATURE_SEEN", feature: "ops-section" });
    }
  }, []);

  useEffect(() => {
    function handleOnline() {
      void flushQueuedClientArtifacts();
    }

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [flushQueuedClientArtifacts]);

  useEffect(() => {
    if (!state.activeClassroom || activeRole === "reviewer") return;
    let cancelled = false;
    loadTodaySnapshotOnce(state.activeClassroom)
      .then((snapshot) => {
        if (!cancelled) dispatch({ type: "SET_TODAY_SNAPSHOT", snapshot });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.warn("Failed to load today snapshot:", err);
        dispatch({ type: "DISMISS_TOAST", id: "debt-load-error" });
        dispatch({
          type: "PUSH_TOAST",
          toast: {
            id: "debt-load-error",
            type: "error",
            message: "Couldn't load today's snapshot. Debt counts may be stale.",
            duration: 6000,
          },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [state.activeClassroom, activeRole]);

  useEffect(() => {
    setClassroomMenuOpen(false);
  }, [state.activeClassroom, state.authPrompt]);

  // Outside-click and ESC handling are now provided by the Popover surface
  // that renders the classroom switcher panel. The previous useEffect was
  // duplicated across five dropdowns in this codebase; centralizing the
  // primitive removed the duplication. 2026-04-25.

  // Canonical URL write — always emit top-level `tab` + optional `tool`.
  // Legacy `?tab=<old-tool>` links get migrated on the first write after
  // createInitialState resolves them.
  useEffect(() => {
    if (!state.activeClassroom) return;
    const params = new URLSearchParams(window.location.search);
    params.set("tab", state.activeTab);
    if (state.activeTool && TOOLS_BY_TAB[state.activeTab]?.includes(state.activeTool)) {
      params.set("tool", state.activeTool);
    } else {
      params.delete("tool");
    }
    params.set("classroom", state.activeClassroom);

    const profile = state.classrooms.find((entry) => entry.classroom_id === state.activeClassroom);
    if (profile?.is_demo) {
      params.set("demo", "true");
    } else {
      params.delete("demo");
    }

    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, [state.activeClassroom, state.activeTab, state.activeTool, state.classrooms]);

  // Restore scroll before paint so page switches do not jump after render.
  useLayoutEffect(() => {
    const scrollEl = getTabScrollElement(state.activeTab);
    if (!scrollEl) return;

    const saved = sessionStorage.getItem(`prairie-scroll-${state.activeTab}`);
    if (saved) {
      scrollEl.scrollTop = parseInt(saved, 10);
      sessionStorage.removeItem(`prairie-scroll-${state.activeTab}`);
      return;
    }

    scrollEl.scrollTop = 0;
  }, [getTabScrollElement, state.activeTab]);

  // Mirror gating state in refs so the keydown handler can read current values
  // without forcing the effect to re-register (and without triggering React's
  // "deps array changed size" HMR warning).
  const paletteGatingRef = useRef({
    authPrompt: state.authPrompt,
    rolePrompt: state.rolePrompt,
    showOnboarding: state.showOnboarding,
    shortcutSheetOpen,
  });
  useEffect(() => {
    paletteGatingRef.current = {
      authPrompt: state.authPrompt,
      rolePrompt: state.rolePrompt,
      showOnboarding: state.showOnboarding,
      shortcutSheetOpen,
    };
  }, [state.authPrompt, state.rolePrompt, state.showOnboarding, shortcutSheetOpen]);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const el = document.activeElement;
      const tag = (el?.tagName ?? "").toLowerCase();
      const isEditable = tag === "input" || tag === "textarea" || tag === "select" || (el as HTMLElement)?.isContentEditable;

      // Cmd/Ctrl+K → command palette (works even when input is focused; gated against other modals)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const g = paletteGatingRef.current;
        if (g.authPrompt || g.rolePrompt || g.showOnboarding || g.shortcutSheetOpen) return;
        setPaletteOpen(true);
        return;
      }

      // "?" → open shortcut sheet (not when typing)
      if (e.key === "?" && !isEditable) {
        e.preventDefault();
        setShortcutSheetOpen(true);
        return;
      }

      if (isEditable) return;

      // "1"–"9" → indexes into the current role's visible top-level tabs.
      // With seven views the list is short enough that a dedicated "0"
      // shortcut is no longer needed; we still guard against shorter lists.
      const visible = visibleTabsRef.current;
      const digit = Number.parseInt(e.key, 10);
      if (digit >= 1 && digit <= 9 && digit <= visible.length) {
        e.preventDefault();
        setActiveTab(visible[digit - 1]);
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [setActiveTab]);

  // Classroom-switcher opener — dispatched from PageIntro "live" Grade badges
  // (see DifferentiatePanel + LanguageToolsPanel). Opens the command palette
  // which already carries classroom-switch entries.
  useEffect(() => {
    function handleOpenClassroomSwitcher() {
      const g = paletteGatingRef.current;
      if (g.authPrompt || g.rolePrompt || g.showOnboarding || g.shortcutSheetOpen) return;
      setPaletteOpen(true);
    }
    document.addEventListener(
      "prairie:open-classroom-switcher",
      handleOpenClassroomSwitcher,
    );
    return () =>
      document.removeEventListener(
        "prairie:open-classroom-switcher",
        handleOpenClassroomSwitcher,
      );
  }, []);

  function handleDismissOnboarding() {
    localStorage.setItem("prairie-onboarding-done", "true");
    dispatch({ type: "SHOW_ONBOARDING", show: false });
  }

  // Embedded tools that render a ContextualHint. Used by Quick Help to
  // restore the dismissed hint for the current page/tool pair.
  const TOOLS_WITH_HINT: Set<ActiveTool> = new Set([
    "differentiate",
    "language-tools",
    "tomorrow-plan",
    "ea-briefing",
    "family-message",
    "log-intervention",
    "support-patterns",
    "survival-packet",
  ]);

  function handleQuickHelpClick() {
    const tool = state.activeTool;
    if (tool && TOOLS_WITH_HINT.has(tool) && state.featuresSeen[tool]) {
      dispatch({ type: "CLEAR_FEATURE_SEEN", feature: tool });
      showSuccess("Panel tip restored");
      return;
    }
    dispatch({ type: "SHOW_ONBOARDING", show: true });
  }

  function handleFollowupClick(prefill: FamilyMessagePrefill) {
    dispatch({ type: "SET_MESSAGE_PREFILL", prefill });
    setActiveTab("family-message");
  }

  function handleInterventionClick(prefill: InterventionPrefill) {
    dispatch({ type: "SET_INTERVENTION_PREFILL", prefill });
    setActiveTab("log-intervention");
  }

  const paletteEntries = usePaletteEntries({
    classrooms: state.classrooms,
    activeClassroom: state.activeClassroom,
    debtRegister: state.latestDebtRegister,
    latestTodaySnapshot: state.latestTodaySnapshot,
    activeRole,
    onNavigate: (target) => {
      setActiveTab(target);
      setPaletteOpen(false);
    },
    onSwitchClassroom: (id) => {
      dispatch({ type: "SET_ACTIVE_CLASSROOM", classroomId: id });
      setPaletteOpen(false);
    },
    onMessagePrefill: (prefill) => {
      dispatch({ type: "SET_MESSAGE_PREFILL", prefill });
      setActiveTab("family-message");
    },
    onInterventionPrefill: (prefill) => {
      dispatch({ type: "SET_INTERVENTION_PREFILL", prefill });
      setActiveTab("log-intervention");
    },
  });

  const { activeClassroom, activeTab, activeTool, authPrompt, debtCounts, initError } = state;
  const activePageAnchors = PAGE_ANCHORS[activeTab];
  const pageRailAvailable =
    !initError &&
    Boolean(activePageAnchors) &&
    PAGE_RAIL_TABS.has(activeTab);
  const showShellLoading =
    state.classrooms.length === 0 &&
    !initError &&
    activeTab !== "today";
  const showAppFooter =
    state.classrooms.length > 0 &&
    !initError &&
    (activeTab !== "today" || Boolean(state.latestTodaySnapshot));
  const profile = state.classrooms.find((entry) => entry.classroom_id === activeClassroom);
  const students = profile?.students ?? [];
  const roleForNav: ClassroomRole = activeRole;
  const visibleTabs = useMemo(() => getVisibleTabs(roleForNav), [roleForNav]);
  const accessSaved = Boolean(activeClassroom && state.classroomAccessCodes[activeClassroom]);
  const activeClassroomLabel = profile ? describeClassroom(profile) : "Choose classroom";
  const activeClassroomMeta = profile?.subject_focus.replace(/_/g, " ") ?? "";
  const suppressFirstRunModals = shouldSuppressFirstRunModalsFromUrl();

  useEffect(() => {
    visibleTabsRef.current = visibleTabs;
  }, [visibleTabs]);

  // If the active tab is not visible for the current role, route to the
  // first visible tab. Avoids dead-ending when the teacher downgrades a
  // classroom to reviewer while sitting on a reviewer-hidden page.
  useEffect(() => {
    if (!isTabVisibleForRole(activeTab, roleForNav) && visibleTabs.length > 0) {
      setActiveTab(visibleTabs[0]);
    }
  }, [activeTab, roleForNav, visibleTabs, setActiveTab]);

  const setClassroomRole = useCallback(
    (classroomId: string, role: ClassroomRole) => {
      dispatch({ type: "SET_CLASSROOM_ROLE", classroomId, role });
    },
    [],
  );

  // First-session demo convenience: a persisted reviewer or substitute role
  // from a previous session would land fresh demo visitors on dead-end
  // tabs. On the first mount of a new session where the demo classroom
  // has a non-teacher stored role, reset it back to teacher exactly once.
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (window.sessionStorage.getItem("prairie-demo-role-welcomed")) return;
      const storedDemoRole = state.classroomRoles[DEMO_CLASSROOM_ID];
      if (storedDemoRole && storedDemoRole !== "teacher") {
        dispatch({
          type: "SET_CLASSROOM_ROLE",
          classroomId: DEMO_CLASSROOM_ID,
          role: "teacher",
        });
      }
      window.sessionStorage.setItem("prairie-demo-role-welcomed", "1");
    } catch {
      /* sessionStorage unavailable — accept the original persisted role */
    }
  }, []);

  // Prompt for role when a classroom is loaded but has no stored role.
  useEffect(() => {
    if (
      activeClassroom &&
      profile &&
      !(suppressFirstRunModals && profile.is_demo) &&
      !state.classroomRoles[activeClassroom] &&
      !state.rolePrompt &&
      !state.showOnboarding
    ) {
      dispatch({ type: "OPEN_ROLE_PROMPT", classroomId: activeClassroom });
    }
  }, [activeClassroom, profile, state.classroomRoles, state.rolePrompt, state.showOnboarding, suppressFirstRunModals]);

  const ctxValue = useMemo(
    () => ({
      classrooms: state.classrooms,
      activeClassroom,
      activeTab,
      activeTool,
      setActiveClassroom,
      setActiveTab,
      setActiveTool,
      latestTodaySnapshot: state.latestTodaySnapshot,
      profile,
      students,
      classroomAccessCodes: state.classroomAccessCodes,
      classroomRoles: state.classroomRoles,
      activeRole,
      setClassroomRole,
      authPrompt,
      showSuccess,
      showError,
      dispatch,
      streaming: state.streaming,
      toasts: state.toasts,
      featuresSeen: state.featuresSeen,
      submitFeedback,
      showUndo,
      dismissToast,
      tomorrowNotes: state.tomorrowNotes,
      appendTomorrowNote,
      removeTomorrowNote,
      messagePrefill: state.messagePrefill,
      interventionPrefill: state.interventionPrefill,
    }),
    [
      activeClassroom,
      activeRole,
      activeTab,
      activeTool,
      appendTomorrowNote,
      authPrompt,
      dismissToast,
      profile,
      removeTomorrowNote,
      setActiveClassroom,
      setActiveTab,
      setActiveTool,
      setClassroomRole,
      showError,
      showSuccess,
      showUndo,
      state.classroomAccessCodes,
      state.classroomRoles,
      state.classrooms,
      state.featuresSeen,
      state.latestTodaySnapshot,
      state.messagePrefill,
      state.interventionPrefill,
      state.streaming,
      state.toasts,
      state.tomorrowNotes,
      students,
      submitFeedback,
    ],
  );

  return (
    <AppContext.Provider value={ctxValue}>
      <SessionProvider classroomId={activeClassroom} enabled={activeRole !== "reviewer"}>
      <div className="app-shell" ref={appShellRef}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ToastQueue />

        <header className="app-header" ref={headerRef}>
          <div className="app-header__inner">
            <div className="shell-bar">
              <div className="shell-brand" aria-label="PrairieClassroom home">
                <BrandMark className="app-logo" />
              </div>

              <div className="shell-classroom-anchor">
                <button
                  ref={classroomTriggerRef}
                  id="shell-classroom-trigger"
                  className={`shell-classroom-pill${classroomMenuOpen ? " shell-classroom-pill--open" : ""}`}
                  type="button"
                  onClick={() => setClassroomMenuOpen((open) => !open)}
                  aria-expanded={classroomMenuOpen}
                  aria-haspopup="dialog"
                  aria-controls="shell-classroom-panel"
                  disabled={!profile}
                >
                  <span className="shell-classroom-pill__switcher" aria-hidden="true">
                    <SectionIcon name="grid" className="shell-classroom-pill__switcher-icon" />
                  </span>
                  <span className="shell-classroom-pill__copy">
                    <span className="shell-classroom-pill__eyebrow">Active classroom</span>
                    <span className="shell-classroom-pill__label">{activeClassroomLabel}</span>
                  </span>
                  <span className="shell-classroom-pill__caret" aria-hidden="true">⌄</span>
                </button>

                <Popover
                  open={classroomMenuOpen && !!profile}
                  onClose={() => setClassroomMenuOpen(false)}
                  anchorRef={classroomTriggerRef}
                  placement="bottom-start"
                  role="dialog"
                  id="shell-classroom-panel"
                  ariaLabel="Switch classroom"
                  surfaceClassName="shell-classroom-popover"
                >
                  {profile ? (
                    <div className="shell-classroom-panel">
                      <div className="field shell-classroom-field">
                        <label htmlFor="shell-classroom">Switch classroom</label>
                        <select
                          id="shell-classroom"
                          value={activeClassroom}
                          onChange={(e) => {
                            setClassroomMenuOpen(false);
                            setActiveClassroom(e.target.value);
                          }}
                          disabled={state.classrooms.length === 0}
                        >
                          {state.classrooms.map((classroom) => (
                            <option key={classroom.classroom_id} value={classroom.classroom_id}>
                              {describeClassroom(classroom)}
                              {classroom.is_demo ? " · demo" : ""}
                              {classroom.requires_access_code ? " · protected" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <section className="shell-classroom-panel__snapshot" aria-label="Active classroom details">
                        <div className="shell-classroom-panel__topline">
                          <span className="shell-classroom-panel__eyebrow">Classroom status</span>
                          <div className="shell-classroom-panel__chips">
                            {profile.is_demo ? <StatusChip label="Demo lane" tone="slate" icon={<SectionIcon name="info" className="shell-nav__group-icon" />} /> : null}
                            <StatusChip
                              label={profile.requires_access_code ? "Protected classroom" : "Open classroom"}
                              tone={profile.requires_access_code ? "pending" : "success"}
                              icon={<SectionIcon name={profile.requires_access_code ? "lock" : "check"} className="shell-nav__group-icon" />}
                            />
                            {accessSaved ? <StatusChip label="Access saved locally" tone="provenance" icon={<SectionIcon name="refresh" className="shell-nav__group-icon" />} /> : null}
                          </div>
                        </div>
                        <div className="shell-classroom-panel__title-row">
                          <strong className="shell-classroom-panel__title">{activeClassroomLabel}</strong>
                          <span className="shell-classroom-panel__id" data-testid="shell-classroom-active-id">{profile.classroom_id}</span>
                        </div>
                        <div className="shell-classroom-panel__details">
                          <span>{students.length} students</span>
                          <span>{activeClassroomMeta}</span>
                          {profile.requires_access_code ? <span>{accessSaved ? "Access saved in this browser" : "Classroom code required"}</span> : null}
                        </div>
                      </section>
                    </div>
                  ) : null}
                </Popover>
              </div>

              <div className="shell-bar__actions">
                <RoleContextPill />
                <HeaderAction
                  label="Search"
                  kbd="⌘K"
                  onClick={() => setPaletteOpen(true)}
                  data-testid="shell-search-trigger"
                >
                  <SectionIcon name="search" />
                </HeaderAction>
                <ThemeToggle />
                <HeaderAction
                  label={
                    state.activeTool && TOOLS_WITH_HINT.has(state.activeTool) && state.featuresSeen[state.activeTool]
                      ? "Restore panel tip"
                      : "Open onboarding tour"
                  }
                  iconOnly
                  onClick={handleQuickHelpClick}
                  data-testid="shell-help-trigger"
                >
                  ?
                </HeaderAction>
              </div>
            </div>

            <nav
              className="shell-nav shell-nav--solo"
              aria-label="PrairieClassroom OS navigation"
              data-active-section={activeTab}
            >
              <div className="shell-nav__groups" role="tablist" aria-label="Primary navigation">
                {visibleTabs.map((tab) => {
                  const meta = TAB_META[tab];
                  const badgeCount = getTabBadgeCount(tab, debtCounts, state.tomorrowNotes.length);
                  const badgeTone = getTabBadgeTone(tab);
                  return (
                    <button
                      key={tab}
                      data-testid={`shell-nav-group-${tab}`}
                      id={`tab-${tab}`}
                      className={`shell-nav__group${activeTab === tab ? " shell-nav__group--active" : ""}`}
                      onClick={() => setActiveTab(tab)}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab}
                      aria-controls={`panel-${tab}`}
                      aria-pressed={activeTab === tab}
                    >
                      <SectionIcon name={meta.icon} className="shell-nav__group-icon" />
                      <span>{meta.label}</span>
                      {badgeCount > 0 ? (
                        <span
                          className={`shell-nav__badge shell-nav__badge--${badgeTone}`}
                          aria-label={`${badgeCount} pending`}
                        >
                          {badgeCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        </header>

        <main
          id="main-content"
          className="app-main"
          data-section={activeTab}
          data-page-rail={pageRailAvailable ? activeTab : undefined}
          data-page-rail-state={pageRailAvailable ? (pageRailCollapsed ? "collapsed" : "expanded") : undefined}
        >
          {pageRailAvailable ? (
            <PageAnchorRail
              anchors={activePageAnchors.anchors}
              topAnchorId={activePageAnchors.topAnchorId}
              label={activePageAnchors.label}
              collapsed={pageRailCollapsed}
              onToggleCollapsed={() => setPageRailCollapsed((value) => !value)}
            />
          ) : null}
          {showShellLoading ? (
            <div className="branded-loading">
              <BrandMark
                className="branded-loading__mark"
              />
              <div className="skeleton-stack">
                <div className="skeleton-card">
                  <div className="skeleton-line skeleton-line--medium" />
                  <div className="skeleton-line skeleton-line--long" />
                  <div className="skeleton-line skeleton-line--short" />
                </div>
              </div>
              <p className="loading-text">Loading classrooms…</p>
            </div>
          ) : null}
          {state.classrooms.length === 0 && initError ? (
            <div className="error-banner">{initError}</div>
          ) : null}

          {state.classrooms.length > 0 && !initError ? <RoleEscapeBanner /> : null}
          {renderPanel(
            activeTab,
            "classroom",
            mountedTabs,
            <ClassroomPanel onTabChange={setActiveTab} onInterventionPrefill={handleInterventionClick} onMessagePrefill={handleFollowupClick} />,
          )}
          {renderPanel(
            activeTab,
            "today",
            mountedTabs,
            <TodayPanel onTabChange={setActiveTab} onInterventionPrefill={handleInterventionClick} onMessagePrefill={handleFollowupClick} />,
          )}
          {renderPanel(
            activeTab,
            "tomorrow",
            mountedTabs,
            <TomorrowPanel onFollowupClick={handleFollowupClick} onInterventionClick={handleInterventionClick} />,
          )}
          {renderPanel(
            activeTab,
            "week",
            mountedTabs,
            <WeekPanel onTabChange={setActiveTab} onInterventionPrefill={handleInterventionClick} onMessagePrefill={handleFollowupClick} />,
          )}
          {renderPanel(
            activeTab,
            "prep",
            mountedTabs,
            <PrepPanel />,
          )}
          {renderPanel(
            activeTab,
            "ops",
            mountedTabs,
            <OpsPanel
              prefillIntervention={state.interventionPrefill}
            />,
          )}
          {renderPanel(
            activeTab,
            "review",
            mountedTabs,
            <ReviewPanel onFollowupClick={handleFollowupClick} onInterventionClick={handleInterventionClick} />,
          )}

          {showAppFooter ? (
            <AppFooter
              onOpenShortcuts={() => setShortcutSheetOpen(true)}
              classroomId={state.activeClassroom || undefined}
            />
          ) : null}
        </main>

        <MobileNav activeTab={activeTab} onTabChange={setActiveTab} debtCounts={debtCounts} />

        <ShortcutSheet open={shortcutSheetOpen} onClose={() => setShortcutSheetOpen(false)} />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} entries={paletteEntries} />

        {state.showOnboarding ? <OnboardingOverlay onDismiss={handleDismissOnboarding} /> : null}
        {state.rolePrompt ? (
          <RolePromptDialog classroomId={state.rolePrompt.classroomId} />
        ) : null}
        <ClassroomAccessDialog
          open={Boolean(authPrompt) && !state.rolePrompt && !state.showOnboarding}
          classroomId={authPrompt?.classroomId ?? activeClassroom}
          message={authPrompt?.message ?? ""}
          initialValue={authPrompt ? state.classroomAccessCodes[authPrompt.classroomId] : ""}
          onClose={closeAuthPrompt}
          onSubmit={handleAuthSubmit}
          onUseDemo={
            authPrompt && authPrompt.classroomId !== DEMO_CLASSROOM_ID &&
            state.classrooms.some((c) => c.classroom_id === DEMO_CLASSROOM_ID || c.is_demo)
              ? () => {
                  closeAuthPrompt();
                  const demo = state.classrooms.find((c) => c.is_demo || c.classroom_id === DEMO_CLASSROOM_ID);
                  if (demo) setActiveClassroom(demo.classroom_id);
                }
              : undefined
          }
        />
      </div>
      </SessionProvider>
    </AppContext.Provider>
  );
}

// Re-export helpers purely to keep tree-shaking happy for modules that
// import `isActiveTab` / `isActiveTool` via `App.tsx`.
export { isActiveTab, isActiveTool, defaultToolForTab };
