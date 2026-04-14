import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import AppContext from "./AppContext";
import { SessionProvider } from "./SessionContext";
import {
  appReducer,
  createInitialState,
  getGroupForTab,
  getTabBadgeCount,
  getTabsForGroup,
  NAV_GROUP_META,
  NAV_GROUP_ORDER,
  TAB_META,
  TAB_ORDER,
  type ActiveTab,
  type AuthPromptState,
} from "./appReducer";
import { configureApiClient, fetchTodaySnapshot, listClassrooms } from "./api";
import ErrorBoundary from "./components/ErrorBoundary";
import ToastQueue from "./components/ToastQueue";
import StatusChip from "./components/StatusChip";
import ClassroomAccessDialog from "./components/ClassroomAccessDialog";
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
import MobileNav from "./components/MobileNav";
import OnboardingOverlay from "./components/OnboardingOverlay";
import ThemeToggle from "./components/ThemeToggle";
import SectionIcon from "./components/SectionIcon";
import AppFooter from "./components/AppFooter";
import { reportError } from "./errorReporter";
import { flushFeedbackQueue } from "./hooks/useFeedback";
import { flushSessionQueue } from "./hooks/useSessionContext";
import type { ClassroomProfile, FamilyMessagePrefill, InterventionPrefill, TomorrowNote } from "./types";

const DEMO_CLASSROOM_ID = "demo-okafor-grade34";

function isActiveTab(value: string | null): value is ActiveTab {
  return value !== null && value in TAB_META;
}

function describeClassroom(classroom: ClassroomProfile) {
  return `Grade ${classroom.grade_band} ${classroom.subject_focus.replace(/_/g, " ")}`;
}

function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      {locked ? (
        <>
          <path d="M5.5 8V5.9a3.5 3.5 0 117 0V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="4" y="8" width="10" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
        </>
      ) : (
        <>
          <path d="M11.5 8V5.9a3.5 3.5 0 00-6.27-2.14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M6.2 10.1L4.8 8.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="4" y="8" width="10" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
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
      hidden={activeTab !== targetTab}
    >
      <ErrorBoundary>{panel}</ErrorBoundary>
    </div>
  );
}

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);
  const authPromptResolverRef = useRef<((code: string | null) => void) | null>(null);
  const classroomsRef = useRef<ClassroomProfile[]>(state.classrooms);
  const classroomCodesRef = useRef(state.classroomAccessCodes);
  const classroomMenuRef = useRef<HTMLDivElement>(null);
  const queuedFlushPromiseRef = useRef<Promise<void> | null>(null);
  const [classroomMenuOpen, setClassroomMenuOpen] = useState(false);
  const groupsRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const [mountedTabs, setMountedTabs] = useState<Set<ActiveTab>>(() => {
    const initial = new Set<ActiveTab>([state.activeTab]);
    const urlTab = new URLSearchParams(window.location.search).get("tab");
    if (urlTab && urlTab in TAB_META) initial.add(urlTab as ActiveTab);
    return initial;
  });

  useEffect(() => {
    classroomsRef.current = state.classrooms;
  }, [state.classrooms]);

  useEffect(() => {
    classroomCodesRef.current = state.classroomAccessCodes;
  }, [state.classroomAccessCodes]);

  const showSuccess = useCallback((msg: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    dispatch({ type: "PUSH_TOAST", toast: { id, type: "success", message: msg, duration: 4500 } });
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

  const setActiveTab = useCallback((tab: ActiveTab) => {
    dispatch({ type: "SET_ACTIVE_TAB", tab });
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
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab");
    if (isActiveTab(requestedTab)) {
      dispatch({ type: "SET_ACTIVE_TAB", tab: requestedTab });
    }
  }, []);

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
      .catch(() => {
        if (!cancelled) {
          dispatch({ type: "SET_INIT_ERROR", error: "Failed to load classrooms. Is the API server running?" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setActiveClassroom]);

  useEffect(() => {
    configureApiClient({
      getClassroomCode: (classroomId) => state.classroomAccessCodes[classroomId],
      requestClassroomCode,
    });

    return () => {
      configureApiClient({
        getClassroomCode: undefined,
        requestClassroomCode: undefined,
      });
    };
  }, [requestClassroomCode, state.classroomAccessCodes]);

  useEffect(() => {
    void flushQueuedClientArtifacts();
  }, [flushQueuedClientArtifacts, state.classroomAccessCodes]);

  useEffect(() => {
    function handleOnline() {
      void flushQueuedClientArtifacts();
    }

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [flushQueuedClientArtifacts]);

  useEffect(() => {
    if (!state.activeClassroom) return;
    const controller = new AbortController();
    fetchTodaySnapshot(state.activeClassroom, controller.signal)
      .then((snapshot) => dispatch({ type: "SET_DEBT_COUNTS", counts: snapshot.debt_register.item_count_by_category }))
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
  }, [state.activeClassroom]);

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

  // Lazily mount panels on first activation
  useEffect(() => {
    setMountedTabs((prev) => {
      if (prev.has(state.activeTab)) return prev;
      const next = new Set(prev);
      next.add(state.activeTab);
      return next;
    });
  }, [state.activeTab]);

  // Save scroll position before tab switch and restore on return
  const prevTabRef = useRef(state.activeTab);
  useEffect(() => {
    const prev = prevTabRef.current;
    if (prev !== state.activeTab) {
      sessionStorage.setItem(`prairie-scroll-${prev}`, String(window.scrollY));
    }
    prevTabRef.current = state.activeTab;

    const saved = sessionStorage.getItem(`prairie-scroll-${state.activeTab}`);
    if (saved) {
      window.scrollTo(0, parseInt(saved, 10));
      sessionStorage.removeItem(`prairie-scroll-${state.activeTab}`);
    } else {
      const main = document.querySelector(".app-main");
      if (main) {
        main.scrollIntoView({ behavior: "instant", block: "start" });
      }
    }
  }, [state.activeTab]);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const el = document.activeElement;
      const tag = (el?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if ((el as HTMLElement)?.isContentEditable) return;

      const digit = Number.parseInt(e.key, 10);
      if (digit >= 1 && digit <= TAB_ORDER.length) {
        e.preventDefault();
        setActiveTab(TAB_ORDER[digit - 1]);
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [setActiveTab]);

  function handleDismissOnboarding() {
    localStorage.setItem("prairie-onboarding-done", "true");
    dispatch({ type: "SHOW_ONBOARDING", show: false });
  }

  function handleFollowupClick(prefill: FamilyMessagePrefill) {
    dispatch({ type: "SET_MESSAGE_PREFILL", prefill });
    setActiveTab("family-message");
  }

  function handleInterventionClick(prefill: InterventionPrefill) {
    dispatch({ type: "SET_INTERVENTION_PREFILL", prefill });
    setActiveTab("log-intervention");
  }

  const { activeClassroom, activeTab, authPrompt, debtCounts, initError } = state;
  const activeGroup = getGroupForTab(activeTab);
  const profile = state.classrooms.find((entry) => entry.classroom_id === activeClassroom);
  const students = profile?.students ?? [];
  const secondaryTabs = getTabsForGroup(activeGroup);
  const showSecondaryTabs = secondaryTabs.length > 1;
  const accessSaved = Boolean(activeClassroom && state.classroomAccessCodes[activeClassroom]);
  const activeGroupMeta = NAV_GROUP_META[activeGroup];
  const activeClassroomLabel = profile ? describeClassroom(profile) : "Choose classroom";
  const activeClassroomMeta = profile?.subject_focus.replace(/_/g, " ") ?? "";

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

  const ctxValue = useMemo(
    () => ({
      classrooms: state.classrooms,
      activeClassroom,
      activeTab,
      setActiveClassroom,
      setActiveTab,
      profile,
      students,
      classroomAccessCodes: state.classroomAccessCodes,
      authPrompt,
      showSuccess,
      dispatch,
      streaming: state.streaming,
      toasts: state.toasts,
      featuresSeen: state.featuresSeen,
      submitFeedback,
      showUndo,
      dismissToast,
      tomorrowNotes: state.tomorrowNotes,
      appendTomorrowNote,
    }),
    [
      activeClassroom,
      activeTab,
      appendTomorrowNote,
      authPrompt,
      dismissToast,
      profile,
      setActiveClassroom,
      setActiveTab,
      showSuccess,
      showUndo,
      state.classroomAccessCodes,
      state.classrooms,
      state.featuresSeen,
      state.streaming,
      state.toasts,
      state.tomorrowNotes,
      students,
      submitFeedback,
    ],
  );

  return (
    <AppContext.Provider value={ctxValue}>
      <SessionProvider classroomId={activeClassroom}>
      <div className="app-shell">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ToastQueue />

        <header className="app-header">
          <div className="app-header__inner">
            <div className="shell-bar">
              <div className="shell-brand" aria-label="PrairieGem OS home">
                <picture>
                  <source srcSet="/prairiegem-logo.webp" type="image/webp" />
                  <img
                    className="app-logo"
                    src="/prairiegem-logo.png"
                    alt="PrairieGem OS"
                    width={583}
                    height={400}
                    decoding="async"
                    fetchPriority="high"
                  />
                </picture>
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
                  <span className={`shell-classroom-pill__lock${profile?.requires_access_code ? " shell-classroom-pill__lock--locked" : ""}`}>
                    <LockIcon locked={Boolean(profile?.requires_access_code)} />
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
                        <span className="shell-classroom-panel__id">{profile.classroom_id}</span>
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
                <ThemeToggle />
                <button
                  className="btn btn--ghost app-help-btn"
                  onClick={() => dispatch({ type: "SHOW_ONBOARDING", show: true })}
                  type="button"
                  aria-label="Show onboarding tour"
                >
                  Quick Help
                </button>
              </div>
            </div>

            <nav className="shell-nav" aria-label="PrairieGem OS navigation">
              <div className="shell-nav__groups" role="toolbar" aria-label="Primary navigation groups" ref={groupsRef}>
                <div
                  className="shell-nav__group-indicator"
                  aria-hidden="true"
                  style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                />
                {NAV_GROUP_ORDER.map((group) => {
                  const meta = NAV_GROUP_META[group];
                  return (
                    <button
                      key={group}
                      className={`shell-nav__group${activeGroup === group ? " shell-nav__group--active" : ""}`}
                      onClick={() => setActiveTab(getTabsForGroup(group)[0])}
                      type="button"
                      aria-pressed={activeGroup === group}
                    >
                      <SectionIcon name={meta.icon} className="shell-nav__group-icon" />
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>

              {showSecondaryTabs ? (
                <div className="shell-nav__tabs-frame" key={activeGroup}>
                  <div className="shell-nav__tabs" role="tablist" aria-label={`${activeGroupMeta.label} tools`} ref={tabsRef} onKeyDown={handleTabKeyDown}>
                    {secondaryTabs.map((tab) => {
                      const count = getTabBadgeCount(tab, debtCounts);
                      const tabIndex1Based = TAB_ORDER.indexOf(tab) + 1;
                      const shortcutKey = tabIndex1Based <= 9 ? String(tabIndex1Based) : "0";
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
                          {count > 0 ? <span className="shell-nav__badge">{count}</span> : null}
                          <kbd className="shell-nav__kbd" aria-hidden="true">{shortcutKey}</kbd>
                        </button>
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
              <svg className="branded-loading__mark" viewBox="0 0 40 24" aria-hidden="true" fill="none">
                <path d="M0 18 Q5 10 10 14 Q14 6 18 12 Q22 4 26 10 Q30 6 34 12 Q37 8 40 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                <line x1="0" y1="20" x2="40" y2="20" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
                <circle cx="10" cy="8" r="3" fill="currentColor" opacity="0.2" />
              </svg>
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
        </main>

        <AppFooter />

        <MobileNav activeTab={activeTab} onTabChange={setActiveTab} debtCounts={debtCounts} />

        {state.showOnboarding ? <OnboardingOverlay onDismiss={handleDismissOnboarding} /> : null}
        <ClassroomAccessDialog
          open={Boolean(authPrompt)}
          classroomId={authPrompt?.classroomId ?? activeClassroom}
          message={authPrompt?.message ?? ""}
          initialValue={authPrompt ? state.classroomAccessCodes[authPrompt.classroomId] : ""}
          onClose={closeAuthPrompt}
          onSubmit={handleAuthSubmit}
        />
      </div>
      </SessionProvider>
    </AppContext.Provider>
  );
}
