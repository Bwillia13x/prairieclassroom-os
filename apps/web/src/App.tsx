import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import AppContext from "./AppContext";
import { SessionProvider } from "./SessionContext";
import {
  appReducer,
  createInitialState,
  getGroupForTab,
  getTabBadgeCount,
  getTabBadgeTone,
  getVisibleNavGroups,
  getVisibleTabsForGroup,
  getVisibleTabs,
  isTabVisibleForRole,
  NAV_GROUP_META,
  shouldSuppressFirstRunModalsFromUrl,
  TAB_META,
  type ActiveTab,
  type AuthPromptState,
  type ClassroomRole,
} from "./appReducer";
import { configureApiClient, fetchTodaySnapshot, listClassrooms } from "./api";
import { getClassroomLoadErrorMessage } from "./appErrors";
import ErrorBoundary from "./components/ErrorBoundary";
import ToastQueue from "./components/ToastQueue";
import StatusChip from "./components/StatusChip";
import ClassroomAccessDialog from "./components/ClassroomAccessDialog";
import RoleContextPill from "./components/RoleContextPill";
import RolePromptDialog from "./components/RolePromptDialog";
import DifferentiatePanel from "./panels/DifferentiatePanel";
import TomorrowPlanPanel from "./panels/TomorrowPlanPanel";
import FamilyMessagePanel from "./panels/FamilyMessagePanel";
import InterventionPanel from "./panels/InterventionPanel";
import LanguageToolsPanel from "./panels/LanguageToolsPanel";
import SupportPatternsPanel from "./panels/SupportPatternsPanel";
import EABriefingPanel from "./panels/EABriefingPanel";
import EALoadPanel from "./panels/EALoadPanel";
import ForecastPanel from "./panels/ForecastPanel";
import SurvivalPacketPanel from "./panels/SurvivalPacketPanel";
import TodayPanel from "./panels/TodayPanel";
import UsageInsightsPanel from "./panels/UsageInsightsPanel";
import BrandMark from "./components/BrandMark";
import MobileNav from "./components/MobileNav";
import OnboardingOverlay from "./components/OnboardingOverlay";
import ThemeToggle from "./components/ThemeToggle";
import SectionIcon from "./components/SectionIcon";
import AppFooter from "./components/AppFooter";
import ShortcutSheet from "./components/ShortcutSheet";
import CommandPalette from "./components/CommandPalette";
import PrepSectionIntro from "./components/PrepSectionIntro";
import { usePaletteEntries } from "./hooks/usePaletteEntries";
import { useNothingButtonPressAnimation } from "./hooks/useNothingButtonPressAnimation";
import TomorrowChip from "./components/TomorrowChip";
import TabOverflowMenu from "./components/TabOverflowMenu";
import OpsSectionHint from "./components/OpsSectionHint";
import DrillDownDrawer from "./components/DrillDownDrawer";
import { ActionAtlas } from "./components/TriageSurfaces";
import { reportError } from "./errorReporter";
import { flushFeedbackQueue } from "./hooks/useFeedback";
import { flushSessionQueue } from "./hooks/useSessionContext";
import { computeTabScrollFadeState } from "./utils/tabScrollFade";
import type { ClassroomProfile, DrillDownContext, FamilyMessagePrefill, InterventionPrefill, TomorrowNote } from "./types";

const DEMO_CLASSROOM_ID = "demo-okafor-grade34";

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
      <ErrorBoundary>{panel}</ErrorBoundary>
    </div>
  );
}

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);
  const activeRole: ClassroomRole =
    state.classroomRoles[state.activeClassroom] ?? "teacher";
  useNothingButtonPressAnimation();
  const authPromptResolverRef = useRef<((code: string | null) => void) | null>(null);
  const classroomsRef = useRef<ClassroomProfile[]>(state.classrooms);
  const classroomCodesRef = useRef(state.classroomAccessCodes);
  const classroomRolesRef = useRef(state.classroomRoles);
  const classroomMenuRef = useRef<HTMLDivElement>(null);
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
  const [shellDrillDown, setShellDrillDown] = useState<DrillDownContext | null>(null);
  const groupsRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabsFrameRef = useRef<HTMLDivElement>(null);
  // Hidden mirror row used purely for overflow measurement. Holds the same
  // tabs as the visible tablist but never clips — so we can read each tab's
  // natural width even after the real tablist has started truncating.
  const measureRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  // Secondary-tab overflow: indices of tabs that don't fit in the tabstrip
  // and should render inside the "More ▾" menu instead. 0 means all fit.
  // 2026-04-19 OPS audit — keeps e.g. "Substitute" discoverable at narrow widths.
  const [overflowCount, setOverflowCount] = useState<number>(0);
  // state.activeTab already reflects the URL ?tab= via createInitialState,
  // so mounting just the active tab covers deep links without an extra parse.
  const [mountedTabs, setMountedTabs] = useState<Set<ActiveTab>>(
    () => new Set<ActiveTab>([state.activeTab]),
  );

  useEffect(() => {
    classroomsRef.current = state.classrooms;
  }, [state.classrooms]);

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

  const setActiveTab = useCallback((tab: ActiveTab) => {
    if (tab === state.activeTab) {
      return;
    }

    saveScrollForTab(state.activeTab);

    // Mount the target tab in the same React batch as the active-tab change,
    // so the panel renders on the next frame instead of after a second render.
    // Without this, lazy-mounted panels flash blank for one frame on first visit.
    setMountedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
    dispatch({ type: "SET_ACTIVE_TAB", tab });
  }, [saveScrollForTab, state.activeTab]);

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
  // The effect reads `state.featuresSeen` via a ref-less closure and dispatches
  // only when the migration target is absent, so React strict-mode double-mount
  // still results in at most one localStorage write beyond the initial load.
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
    // Intentionally only runs once on mount — featuresSeen mutating later
    // (e.g. teacher dismisses a remaining legacy hint) should NOT re-trigger
    // the migration; the ops-section flag is either set on mount or when the
    // new section hint itself is dismissed.
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
    const controller = new AbortController();
    fetchTodaySnapshot(state.activeClassroom, controller.signal)
      .then((snapshot) => dispatch({ type: "SET_TODAY_SNAPSHOT", snapshot }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.warn("Failed to load today snapshot:", err);
        // Use stable ID so rapid switching doesn't stack duplicate toasts
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
    return () => controller.abort();
  }, [state.activeClassroom, activeRole]);

  useEffect(() => {
    setClassroomMenuOpen(false);
  }, [state.activeClassroom, state.authPrompt]);

  useEffect(() => {
    if (!classroomMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!classroomMenuRef.current?.contains(event.target as Node)) {
        setClassroomMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setClassroomMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [classroomMenuOpen]);

  useEffect(() => {
    if (!state.activeClassroom) return;
    const params = new URLSearchParams(window.location.search);
    params.set("tab", state.activeTab);
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
  }, [state.activeClassroom, state.activeTab, state.classrooms]);

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

      // "1"–"9" → first 9 visible tabs for the active role; "0" → 10th visible.
      // Number-key shortcuts track the visible tab list so they never point at
      // a tab the role can't enter.
      const visible = visibleTabsRef.current;
      if (e.key === "0" && visible.length >= 10) {
        e.preventDefault();
        setActiveTab(visible[9]);
        return;
      }
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
  // which already carries classroom-switch entries. Gated so modals take
  // priority the same way Cmd+K does.
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

  // Panels that render a ContextualHint. Used by Quick Help to restore the
  // dismissed hint for the current panel instead of always replaying the full tour.
  const PANELS_WITH_HINT: Set<ActiveTab> = new Set([
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
    const tab = state.activeTab;
    if (PANELS_WITH_HINT.has(tab) && state.featuresSeen[tab]) {
      dispatch({ type: "CLEAR_FEATURE_SEEN", feature: tab });
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
    onNavigate: (tab) => {
      setActiveTab(tab);
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

  const { activeClassroom, activeTab, authPrompt, debtCounts, initError } = state;
  const profile = state.classrooms.find((entry) => entry.classroom_id === activeClassroom);
  const students = profile?.students ?? [];
  // Role-filtered nav. `activeRole` is computed below; these helpers are
  // recomputed each render but the role changes rarely, so the cost is a
  // small array scan per render — cheaper than threading it through
  // everywhere as memoized state.
  const roleForNav: ClassroomRole = activeRole;
  const visibleTabs = useMemo(() => getVisibleTabs(roleForNav), [roleForNav]);
  const visibleNavGroups = useMemo(() => getVisibleNavGroups(roleForNav), [roleForNav]);
  const activeGroup = isTabVisibleForRole(activeTab, roleForNav)
    ? getGroupForTab(activeTab)
    : visibleNavGroups[0] ?? "today";
  const secondaryTabs = useMemo(
    () => getVisibleTabsForGroup(activeGroup, roleForNav),
    [activeGroup, roleForNav],
  );
  const showSecondaryTabs = secondaryTabs.length > 1;
  const accessSaved = Boolean(activeClassroom && state.classroomAccessCodes[activeClassroom]);
  const activeGroupMeta = NAV_GROUP_META[activeGroup];
  const activeClassroomLabel = profile ? describeClassroom(profile) : "Choose classroom";
  const activeClassroomMeta = profile?.subject_focus.replace(/_/g, " ") ?? "";
  const suppressFirstRunModals = shouldSuppressFirstRunModalsFromUrl();

  useEffect(() => {
    visibleTabsRef.current = visibleTabs;
  }, [visibleTabs]);

  // If the active tab is not visible for the current role (e.g. the user
  // just downgraded from teacher to reviewer while sitting on a tab the
  // reviewer can't enter), route to the first visible tab. Avoids the awkward
  // state where the role changed but the hidden tab still renders.
  useEffect(() => {
    if (!isTabVisibleForRole(activeTab, roleForNav) && visibleTabs.length > 0) {
      setActiveTab(visibleTabs[0]);
    }
  }, [activeTab, roleForNav, visibleTabs, setActiveTab]);

  // Sliding indicator: measure active group button position
  useLayoutEffect(() => {
    function measure() {
      const container = groupsRef.current;
      if (!container) return;
      const activeBtn = container.querySelector(".shell-nav__group--active") as HTMLElement | null;
      if (!activeBtn) return;
      setIndicatorStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeGroup]);

  // Scroll active secondary tab into view within the tab bar
  useEffect(() => {
    const container = tabsRef.current;
    if (!container) return;
    const tabEl = container.querySelector("[aria-selected=\"true\"]") as HTMLElement | null;
    if (!tabEl) return;
    const cLeft = container.scrollLeft;
    const cWidth = container.clientWidth;
    const tLeft = tabEl.offsetLeft;
    const tWidth = tabEl.offsetWidth;
    const pad = 32;
    if (tLeft < cLeft + pad) {
      container.scrollTo({ left: Math.max(0, tLeft - pad), behavior: "smooth" });
    } else if (tLeft + tWidth > cLeft + cWidth - pad) {
      container.scrollTo({ left: tLeft + tWidth - cWidth + pad, behavior: "smooth" });
    }
  }, [activeTab]);

  // Expose overflow state so CSS fades can signal "more tabs this way"
  // on both ends of the secondary nav. Without this the rail silently
  // clips — teachers have no way to know e.g. "Sub Packet" exists.
  useEffect(() => {
    const container = tabsRef.current;
    if (!container) return;
    const frame = container.parentElement;
    if (!frame) return;
    function update() {
      if (!container) return;
      const maxScroll = container.scrollWidth - container.clientWidth;
      const overflow = maxScroll > 1;
      frame!.dataset.overflow = overflow ? "true" : "false";
      frame!.dataset.scrolledStart = overflow && container.scrollLeft > 2 ? "true" : "false";
      frame!.dataset.scrolledEnd = overflow && container.scrollLeft < maxScroll - 2 ? "true" : "false";
    }
    update();
    container.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      container.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [activeGroup, activeTab]);

  // Overflow-aware tab splitting — if the full secondary tab row wouldn't
  // fit, hide the trailing tabs and surface them via the "More ▾" dropdown.
  // Measured from a hidden mirror row so the computation is stable even as
  // the visible tablist re-renders with fewer items.
  // 2026-04-19 OPS audit — makes "Substitute" reachable at narrow widths
  // without relying on horizontal scroll.
  useLayoutEffect(() => {
    const container = tabsRef.current;
    const mirror = measureRef.current;
    if (!container) {
      setOverflowCount(0);
      return;
    }

    function measure() {
      const c = tabsRef.current;
      if (!c) return;
      // Prefer the mirror (always contains every tab); fall back to the
      // visible list if the mirror isn't mounted yet.
      const source = measureRef.current ?? c;
      const tabButtons = Array.from(
        source.querySelectorAll<HTMLElement>(".shell-nav__tab"),
      );
      if (tabButtons.length <= 1) {
        setOverflowCount(0);
        return;
      }
      const containerWidth = c.clientWidth;
      // Reserve ~128px for the "More ▾" trigger when overflow kicks in.
      // Matches trigger's real min-width + padding + caret + 1rem breathing room.
      const reservedForTrigger = 128;
      // First pass: do all tabs fit as-is?
      const gap = 3; // 0.15rem tab gap ≈ 2.4px; 3px gives a forgiving fudge
      const totalWithGap = tabButtons.reduce((sum, btn) => sum + btn.offsetWidth, 0)
        + gap * (tabButtons.length - 1);
      if (totalWithGap <= containerWidth) {
        setOverflowCount(0);
        return;
      }
      // Overflow mode — reserve trigger space and count how many tabs fit.
      const available = Math.max(0, containerWidth - reservedForTrigger);
      let used = 0;
      let fit = 0;
      for (const btn of tabButtons) {
        const next = used + btn.offsetWidth + (fit === 0 ? 0 : gap);
        if (next <= available) {
          used = next;
          fit += 1;
        } else {
          break;
        }
      }
      const overflow = Math.max(0, tabButtons.length - fit);
      setOverflowCount(overflow);
    }

    measure();

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(container);
      if (mirror) ro.observe(mirror);
    }
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeGroup, secondaryTabs]);

  // Scroll-indicator fades — toggle data-scrolled-start/-end on the frame so
  // the ::before/::after gradients appear only when the tabstrip has actually
  // been scrolled past an edge. Defensive: with the "More ▾" overflow menu,
  // the tabstrip rarely scrolls, but when it does these fades cue the user
  // that more tabs are off-canvas. Re-runs when the active group swaps the
  // tab list.
  useLayoutEffect(() => {
    const container = tabsRef.current;
    const frame = tabsFrameRef.current;
    if (!container || !frame) return;

    function update() {
      const c = tabsRef.current;
      const f = tabsFrameRef.current;
      if (!c || !f) return;
      const { atStart, atEnd } = computeTabScrollFadeState(
        c.scrollLeft,
        c.scrollWidth,
        c.clientWidth,
      );
      if (!atStart) {
        f.setAttribute("data-scrolled-start", "true");
      } else {
        f.removeAttribute("data-scrolled-start");
      }
      if (!atEnd) {
        f.setAttribute("data-scrolled-end", "true");
      } else {
        f.removeAttribute("data-scrolled-end");
      }
    }

    update();
    container.addEventListener("scroll", update, { passive: true });
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(update);
      ro.observe(container);
    }
    return () => {
      container.removeEventListener("scroll", update);
      ro?.disconnect();
    };
  }, [activeGroup, secondaryTabs, overflowCount]);

  // WAI-ARIA arrow key navigation within the tablist
  function handleTabKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const currentIdx = secondaryTabs.indexOf(activeTab);
    let nextIdx = -1;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIdx = (currentIdx + 1) % secondaryTabs.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIdx = (currentIdx - 1 + secondaryTabs.length) % secondaryTabs.length;
        break;
      case "Home":
        nextIdx = 0;
        break;
      case "End":
        nextIdx = secondaryTabs.length - 1;
        break;
    }
    if (nextIdx >= 0) {
      e.preventDefault();
      setActiveTab(secondaryTabs[nextIdx]);
      document.getElementById(`tab-${secondaryTabs[nextIdx]}`)?.focus();
    }
  }

  const setClassroomRole = useCallback(
    (classroomId: string, role: ClassroomRole) => {
      dispatch({ type: "SET_CLASSROOM_ROLE", classroomId, role });
    },
    [],
  );

  // Prompt for role when a classroom is loaded but has no stored role
  // Wait for the onboarding tour to finish before asking the user to pick
  // their role — stacking both modals simultaneously feels like an ambush.
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
      setActiveClassroom,
      setActiveTab,
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
    }),
    [
      activeClassroom,
      activeRole,
      activeTab,
      appendTomorrowNote,
      authPrompt,
      dismissToast,
      profile,
      removeTomorrowNote,
      setActiveClassroom,
      setActiveTab,
      setClassroomRole,
      showError,
      showSuccess,
      showUndo,
      state.classroomAccessCodes,
      state.classroomRoles,
      state.classrooms,
      state.featuresSeen,
      state.latestTodaySnapshot,
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

              <div className="shell-classroom-anchor" ref={classroomMenuRef}>
                <button
                  id="shell-classroom-trigger"
                  className={`shell-classroom-pill${classroomMenuOpen ? " shell-classroom-pill--open" : ""}`}
                  type="button"
                  onClick={() => setClassroomMenuOpen((open) => !open)}
                  aria-expanded={classroomMenuOpen}
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

                {classroomMenuOpen && profile ? (
                  <div
                    id="shell-classroom-panel"
                    className="shell-classroom-panel"
                  >
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
              </div>

              <div className="shell-bar__actions">
                <RoleContextPill />
                <span className="shell-bar__divider" aria-hidden="true" />
                <button
                  type="button"
                  className="shell-bar__palette-btn"
                  onClick={() => setPaletteOpen(true)}
                  aria-label="Jump to command palette. Open command palette."
                  title="Command palette (⌘K)"
                >
                  <span className="shell-bar__palette-btn-label">Jump to</span>
                  <kbd className="shell-bar__palette-btn-kbd" aria-hidden="true">⌘K</kbd>
                </button>
                <TomorrowChip
                  notes={state.tomorrowNotes}
                  onRemove={(id) => dispatch({ type: "REMOVE_TOMORROW_NOTE", id })}
                  onReviewAll={() => setActiveTab("tomorrow-plan")}
                />
                <ThemeToggle />
                <button
                  className="btn btn--ghost btn--sm btn--icon-only app-help-btn app-help-btn--icon"
                  onClick={handleQuickHelpClick}
                  type="button"
                  aria-label={
                    PANELS_WITH_HINT.has(state.activeTab) && state.featuresSeen[state.activeTab]
                      ? "Restore panel tip for the current page"
                      : "Open onboarding tour"
                  }
                  title={
                    PANELS_WITH_HINT.has(state.activeTab) && state.featuresSeen[state.activeTab]
                      ? "Restore tip for this panel"
                      : "Replay onboarding tour"
                  }
                >
                  <span aria-hidden="true">?</span>
                </button>
              </div>
            </div>

            <nav
              className={`shell-nav${showSecondaryTabs ? "" : " shell-nav--solo"}`}
              aria-label="PrairieClassroom OS navigation"
              data-active-section={activeGroup}
            >
              <div className="shell-nav__groups" role="toolbar" aria-label="Primary navigation groups" ref={groupsRef}>
                <div
                  className="shell-nav__group-indicator"
                  aria-hidden="true"
                  style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                />
                {visibleNavGroups.map((group) => {
                  const meta = NAV_GROUP_META[group];
                  const firstVisible = getVisibleTabsForGroup(group, roleForNav)[0];
                  return (
                    <button
                      key={group}
                      data-testid={`shell-nav-group-${group}`}
                      className={`shell-nav__group${activeGroup === group ? " shell-nav__group--active" : ""}`}
                      onClick={() => firstVisible && setActiveTab(firstVisible)}
                      type="button"
                      aria-pressed={activeGroup === group}
                      disabled={!firstVisible}
                    >
                      <SectionIcon name={meta.icon} className="shell-nav__group-icon" />
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>

              {showSecondaryTabs ? (
                <div className="shell-nav__tabs-frame" key={activeGroup} ref={tabsFrameRef}>
                  <div className="shell-nav__tabs" role="tablist" aria-label={`${activeGroupMeta.label} tools`} ref={tabsRef} onKeyDown={handleTabKeyDown}>
                    {(() => {
                      const visibleSecondaryTabs = overflowCount > 0
                        ? secondaryTabs.slice(0, secondaryTabs.length - overflowCount)
                        : secondaryTabs;
                      const overflowTabs = overflowCount > 0
                        ? secondaryTabs.slice(secondaryTabs.length - overflowCount)
                        : [];
                      return (
                        <>
                          {visibleSecondaryTabs.map((tab) => {
                            const count = getTabBadgeCount(tab, debtCounts);
                            const tabIndex1Based = visibleTabs.indexOf(tab) + 1;
                            // Only tabs 1–10 have a keyboard shortcut ("1"–"9", "0").
                            // Tabs 11+ render no kbd badge to avoid a visual lie.
                            const shortcutKey =
                              tabIndex1Based <= 9
                                ? String(tabIndex1Based)
                                : tabIndex1Based === 10
                                  ? "0"
                                  : null;
                            return (
                              <button
                                key={tab}
                                role="tab"
                                id={`tab-${tab}`}
                                aria-selected={activeTab === tab}
                                aria-controls={`panel-${tab}`}
                                tabIndex={activeTab === tab ? 0 : -1}
                                className={`shell-nav__tab${activeTab === tab ? " shell-nav__tab--active" : ""}`}
                                onClick={() => setActiveTab(tab)}
                                type="button"
                              >
                                <span>{TAB_META[tab].label}</span>
                                {count > 0 ? (
                                  <span
                                    className={`shell-nav__badge shell-nav__badge--${getTabBadgeTone(tab)}`}
                                    aria-label={`${count} pending`}
                                  >
                                    {count}
                                  </span>
                                ) : null}
                                {shortcutKey ? (
                                  <kbd
                                    className="shell-nav__kbd"
                                    aria-label={`Keyboard shortcut ${shortcutKey}`}
                                    title={`Press ${shortcutKey} to jump here`}
                                  >
                                    {shortcutKey}
                                  </kbd>
                                ) : null}
                              </button>
                            );
                          })}
                          {overflowTabs.length > 0 ? (
                            <TabOverflowMenu
                              tabs={overflowTabs}
                              activeTab={activeTab}
                              onSelect={setActiveTab}
                              getBadgeCount={(tab) => getTabBadgeCount(tab, debtCounts)}
                            />
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                  {/* Hidden mirror row used purely for width measurement. */}
                  <div
                    className="shell-nav__tabs-measure"
                    aria-hidden="true"
                    ref={measureRef}
                    role="presentation"
                  >
                    {secondaryTabs.map((tab) => {
                      const tabIndex1Based = visibleTabs.indexOf(tab) + 1;
                      const shortcutKey =
                        tabIndex1Based <= 9
                          ? String(tabIndex1Based)
                          : tabIndex1Based === 10
                            ? "0"
                            : null;
                      return (
                        <span
                          key={tab}
                          className="shell-nav__tab"
                          // Keep natural width close to real: same label text,
                          // same font, same kbd badge. No interactivity and no
                          // event surface.
                        >
                          <span>{TAB_META[tab].label}</span>
                          {shortcutKey ? (
                            <kbd className="shell-nav__kbd" aria-hidden="true">
                              {shortcutKey}
                            </kbd>
                          ) : null}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </nav>
          </div>
        </header>

        <main id="main-content" className="app-main">
          {state.classrooms.length === 0 && !initError ? (
            <div className="branded-loading">
              <img
                className="branded-loading__mark"
                src="/brand/prairieclassroom-mark.png"
                alt=""
                width="512"
                height="512"
                aria-hidden="true"
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

          {activeGroup === "prep" ? <PrepSectionIntro /> : null}
          {activeGroup === "ops" ? <OpsSectionHint /> : null}
          {state.classrooms.length > 0 && !initError && activeRole !== "reviewer" ? (
            <ActionAtlas
              snapshot={state.latestTodaySnapshot}
              activeRole={activeRole}
              onTabChange={setActiveTab}
              onOpenContext={setShellDrillDown}
              onInterventionPrefill={handleInterventionClick}
              onMessagePrefill={handleFollowupClick}
            />
          ) : null}
          {renderPanel(activeTab, "today", mountedTabs, <TodayPanel onTabChange={setActiveTab} onInterventionPrefill={handleInterventionClick} onMessagePrefill={handleFollowupClick} />)}
          {renderPanel(activeTab, "differentiate", mountedTabs, <DifferentiatePanel />)}
          {renderPanel(
            activeTab,
            "tomorrow-plan",
            mountedTabs,
            <TomorrowPlanPanel onFollowupClick={handleFollowupClick} onInterventionClick={handleInterventionClick} />,
          )}
          {renderPanel(activeTab, "family-message", mountedTabs, <FamilyMessagePanel prefill={state.messagePrefill} />)}
          {renderPanel(activeTab, "log-intervention", mountedTabs, <InterventionPanel prefill={state.interventionPrefill} />)}
          {renderPanel(activeTab, "language-tools", mountedTabs, <LanguageToolsPanel />)}
          {renderPanel(
            activeTab,
            "support-patterns",
            mountedTabs,
            <SupportPatternsPanel onFollowupClick={handleFollowupClick} onInterventionClick={handleInterventionClick} />,
          )}
          {renderPanel(activeTab, "ea-briefing", mountedTabs, <EABriefingPanel />)}
          {renderPanel(activeTab, "ea-load", mountedTabs, <EALoadPanel />)}
          {renderPanel(activeTab, "complexity-forecast", mountedTabs, <ForecastPanel />)}
          {renderPanel(activeTab, "survival-packet", mountedTabs, <SurvivalPacketPanel />)}
          {renderPanel(activeTab, "usage-insights", mountedTabs, <UsageInsightsPanel />)}

          <AppFooter onOpenShortcuts={() => setShortcutSheetOpen(true)} />
        </main>

        <MobileNav activeTab={activeTab} onTabChange={setActiveTab} debtCounts={debtCounts} />

        <ShortcutSheet open={shortcutSheetOpen} onClose={() => setShortcutSheetOpen(false)} />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} entries={paletteEntries} />
        <DrillDownDrawer
          context={shellDrillDown}
          onClose={() => setShellDrillDown(null)}
          onNavigate={(tab) => {
            setShellDrillDown(null);
            setActiveTab(tab);
          }}
          onContextChange={setShellDrillDown}
          onInterventionPrefill={handleInterventionClick}
          onMessagePrefill={handleFollowupClick}
        />

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
