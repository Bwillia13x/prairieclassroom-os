import { useReducer, useEffect, useCallback, useMemo } from "react";
import AppContext from "./AppContext";
import { appReducer, createInitialState, TAB_ORDER, type ActiveTab } from "./appReducer";
import ErrorBoundary from "./components/ErrorBoundary";
import ToastQueue from "./components/ToastQueue";
import DifferentiatePanel from "./panels/DifferentiatePanel";
import TomorrowPlanPanel from "./panels/TomorrowPlanPanel";
import FamilyMessagePanel from "./panels/FamilyMessagePanel";
import InterventionPanel from "./panels/InterventionPanel";
import LanguageToolsPanel from "./panels/LanguageToolsPanel";
import SupportPatternsPanel from "./panels/SupportPatternsPanel";
import EABriefingPanel from "./panels/EABriefingPanel";
import ForecastPanel from "./panels/ForecastPanel";
import SurvivalPacketPanel from "./panels/SurvivalPacketPanel";
import TodayPanel from "./panels/TodayPanel";
import { listClassrooms, fetchTodaySnapshot } from "./api";
import MobileNav from "./components/MobileNav";
import OnboardingOverlay from "./components/OnboardingOverlay";
import type { FamilyMessagePrefill, InterventionPrefill } from "./types";
import "./App.css";

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);

  // ─── Convenience callbacks ───

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

  const submitFeedback = useCallback((outputId: string, outputType: string, rating: "up" | "down", note?: string) => {
    dispatch({ type: "ADD_FEEDBACK", feedback: { outputId, outputType, rating, note, timestamp: new Date().toISOString() } });
  }, []);

  // ─── Init: load classrooms ───

  useEffect(() => {
    listClassrooms()
      .then((data) => {
        dispatch({ type: "SET_CLASSROOMS", classrooms: data });
        const params = new URLSearchParams(window.location.search);
        const isDemo = params.get("demo") === "true";
        const demoClassroom = data.find((c) => c.classroom_id === "demo-okafor-grade34");
        if (isDemo && demoClassroom) {
          dispatch({ type: "SET_ACTIVE_CLASSROOM", classroomId: demoClassroom.classroom_id });
        } else if (data.length > 0) {
          dispatch({ type: "SET_ACTIVE_CLASSROOM", classroomId: data[0].classroom_id });
        }
      })
      .catch(() => dispatch({ type: "SET_INIT_ERROR", error: "Failed to load classrooms. Is the API server running?" }));
  }, []);

  // ─── Load debt counts for active classroom ───

  useEffect(() => {
    if (!state.activeClassroom) return;
    fetchTodaySnapshot(state.activeClassroom)
      .then((snapshot) => dispatch({ type: "SET_DEBT_COUNTS", counts: snapshot.debt_register.item_count_by_category }))
      .catch(() => {}); // Silent fail — badges are informational
  }, [state.activeClassroom]);

  // ─── Derived values ───

  const profile = state.classrooms.find((c) => c.classroom_id === state.activeClassroom);
  const students = profile?.students ?? [];

  // ─── Context value ───

  const ctxValue = useMemo(
    () => ({
      classrooms: state.classrooms,
      activeClassroom: state.activeClassroom,
      setActiveClassroom: (id: string) => dispatch({ type: "SET_ACTIVE_CLASSROOM", classroomId: id }),
      profile,
      students,
      showSuccess,
      dispatch,
      streaming: state.streaming,
      toasts: state.toasts,
      featuresSeen: state.featuresSeen,
      submitFeedback,
      showUndo,
      dismissToast,
    }),
    [state, profile, students, showSuccess, submitFeedback, showUndo, dismissToast],
  );

  // ─── Keyboard shortcuts ───

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const el = document.activeElement;
      const tag = (el?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if ((el as HTMLElement)?.isContentEditable) return;

      const digit = parseInt(e.key, 10);
      if (digit >= 1 && digit <= TAB_ORDER.length) {
        e.preventDefault();
        dispatch({ type: "SET_ACTIVE_TAB", tab: TAB_ORDER[digit - 1] });
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  // ─── Cross-panel navigation handlers ───

  function handleDismissOnboarding() {
    localStorage.setItem("prairie-onboarding-done", "true");
    dispatch({ type: "SHOW_ONBOARDING", show: false });
  }

  function handleFollowupClick(prefill: FamilyMessagePrefill) {
    dispatch({ type: "SET_MESSAGE_PREFILL", prefill });
    dispatch({ type: "SET_ACTIVE_TAB", tab: "family-message" });
  }

  function handleInterventionClick(prefill: InterventionPrefill) {
    dispatch({ type: "SET_INTERVENTION_PREFILL", prefill });
    dispatch({ type: "SET_ACTIVE_TAB", tab: "log-intervention" });
  }

  const { activeTab, debtCounts, initError } = state;

  return (
    <AppContext.Provider value={ctxValue}>
      <div className="app-shell">
        <ToastQueue />
        <header className="app-header">
          <div className="app-header-title-row">
            <svg className="app-mark" viewBox="0 0 40 24" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 18 Q5 10 10 14 Q14 6 18 12 Q22 4 26 10 Q30 6 34 12 Q37 8 40 14" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" fill="none" />
              <line x1="0" y1="20" x2="40" y2="20" stroke="var(--color-border)" strokeWidth="1.5" />
              <circle cx="10" cy="8" r="3" fill="var(--color-accent)" opacity="0.25" />
            </svg>
            <div>
              <h1>PrairieClassroom <span className="app-title-os">OS</span></h1>
              <p className="app-subtitle">Classroom complexity copilot</p>
            </div>
            <button
              className="btn btn--ghost app-help-btn"
              onClick={() => dispatch({ type: "SHOW_ONBOARDING", show: true })}
              type="button"
              aria-label="Show onboarding tour"
            >
              ?
            </button>
          </div>
          {profile && (
            <div className="classroom-context">
              <span className="classroom-context-label">Active classroom</span>
              <span className="classroom-context-value">
                Grade {profile.grade_band} — {profile.subject_focus.replace(/_/g, " ")}
              </span>
              <span className="classroom-context-divider" aria-hidden="true" />
              <span className="classroom-context-id">{profile.classroom_id}</span>
              <span className="classroom-context-count">{students.length} students</span>
            </div>
          )}
        </header>

        <nav className="app-tabs" role="tablist" aria-label="PrairieClassroom OS sections">
          <div className="tab-group" role="presentation">
            <span className="tab-group-label">Today</span>
            <button role="tab" id="tab-today" aria-selected={activeTab === "today"} aria-controls="panel-today" tabIndex={activeTab === "today" ? 0 : -1} className={`tab-btn ${activeTab === "today" ? "tab-btn--active" : ""}`} onClick={() => dispatch({ type: "SET_ACTIVE_TAB", tab: "today" })}>Today</button>
          </div>
          <div className="tab-group" role="presentation">
            <span className="tab-group-label">Lesson Prep</span>
            <button role="tab" id="tab-differentiate" aria-selected={activeTab === "differentiate"} aria-controls="panel-differentiate" tabIndex={activeTab === "differentiate" ? 0 : -1} className={`tab-btn ${activeTab === "differentiate" ? "tab-btn--active" : ""}`} onClick={() => dispatch({ type: "SET_ACTIVE_TAB", tab: "differentiate" })}>Differentiate</button>
            <button role="tab" id="tab-language-tools" aria-selected={activeTab === "language-tools"} aria-controls="panel-language-tools" tabIndex={activeTab === "language-tools" ? 0 : -1} className={`tab-btn ${activeTab === "language-tools" ? "tab-btn--active" : ""}`} onClick={() => dispatch({ type: "SET_ACTIVE_TAB", tab: "language-tools" })}>Language Tools</button>
          </div>
          <div className="tab-group" role="presentation">
            <span className="tab-group-label">Daily Ops</span>
            <button role="tab" id="tab-tomorrow-plan" aria-selected={activeTab === "tomorrow-plan"} aria-controls="panel-tomorrow-plan" tabIndex={activeTab === "tomorrow-plan" ? 0 : -1} className={`tab-btn ${activeTab === "tomorrow-plan" ? "tab-btn--active" : ""}`} onClick={() => dispatch({ type: "SET_ACTIVE_TAB", tab: "tomorrow-plan" })}>Tomorrow Plan</button>
            <button role="tab" id="tab-ea-briefing" aria-selected={activeTab === "ea-briefing"} aria-controls="panel-ea-briefing" tabIndex={activeTab === "ea-briefing" ? 0 : -1} className={`tab-btn ${activeTab === "ea-briefing" ? "tab-btn--active" : ""}`} onClick={() => dispatch({ type: "SET_ACTIVE_TAB", tab: "ea-briefing" })}>EA Briefing</button>
            <button role="tab" id="tab-complexity-forecast" aria-selected={activeTab === "complexity-forecast"} aria-controls="panel-complexity-forecast" tabIndex={activeTab === "complexity-forecast" ? 0 : -1} className={`tab-btn ${activeTab === "complexity-forecast" ? "tab-btn--active" : ""}`} onClick={() => dispatch({ type: "SET_ACTIVE_TAB", tab: "complexity-forecast" })}>Forecast</button>
            <button role="tab" id="tab-log-intervention" aria-selected={activeTab === "log-intervention"} aria-controls="panel-log-intervention" tabIndex={activeTab === "log-intervention" ? 0 : -1} className={`tab-btn ${activeTab === "log-intervention" ? "tab-btn--active" : ""}`} onClick={() => dispatch({ type: "SET_ACTIVE_TAB", tab: "log-intervention" })}>
              Log Intervention
              {(debtCounts["stale_followup"] ?? 0) > 0 && (
                <span className="tab-badge">{debtCounts["stale_followup"]}</span>
              )}
            </button>
            <button role="tab" id="tab-survival-packet" aria-selected={activeTab === "survival-packet"} aria-controls="panel-survival-packet" tabIndex={activeTab === "survival-packet" ? 0 : -1} className={`tab-btn ${activeTab === "survival-packet" ? "tab-btn--active" : ""}`} onClick={() => dispatch({ type: "SET_ACTIVE_TAB", tab: "survival-packet" })}>Sub Packet</button>
          </div>
          <div className="tab-group" role="presentation">
            <span className="tab-group-label">Review</span>
            <button role="tab" id="tab-family-message" aria-selected={activeTab === "family-message"} aria-controls="panel-family-message" tabIndex={activeTab === "family-message" ? 0 : -1} className={`tab-btn ${activeTab === "family-message" ? "tab-btn--active" : ""}`} onClick={() => dispatch({ type: "SET_ACTIVE_TAB", tab: "family-message" })}>
              Family Message
              {(debtCounts["unapproved_message"] ?? 0) > 0 && (
                <span className="tab-badge">{debtCounts["unapproved_message"]}</span>
              )}
            </button>
            <button role="tab" id="tab-support-patterns" aria-selected={activeTab === "support-patterns"} aria-controls="panel-support-patterns" tabIndex={activeTab === "support-patterns" ? 0 : -1} className={`tab-btn ${activeTab === "support-patterns" ? "tab-btn--active" : ""}`} onClick={() => dispatch({ type: "SET_ACTIVE_TAB", tab: "support-patterns" })}>
              Support Patterns
              {((debtCounts["unaddressed_pattern"] ?? 0) + (debtCounts["approaching_review"] ?? 0)) > 0 && (
                <span className="tab-badge">
                  {(debtCounts["unaddressed_pattern"] ?? 0) + (debtCounts["approaching_review"] ?? 0)}
                </span>
              )}
            </button>
          </div>
        </nav>

        <main className="app-main">
          {state.classrooms.length === 0 && !initError && (
            <p className="loading-text">Loading classrooms…</p>
          )}
          {state.classrooms.length === 0 && initError && (
            <div className="error-banner">{initError}</div>
          )}

          <div role="tabpanel" id="panel-today" aria-labelledby="tab-today" hidden={activeTab !== "today"}>
            <ErrorBoundary><TodayPanel onTabChange={(tab) => dispatch({ type: "SET_ACTIVE_TAB", tab: tab as ActiveTab })} /></ErrorBoundary>
          </div>
          <div role="tabpanel" id="panel-differentiate" aria-labelledby="tab-differentiate" hidden={activeTab !== "differentiate"}>
            <ErrorBoundary><DifferentiatePanel /></ErrorBoundary>
          </div>
          <div role="tabpanel" id="panel-tomorrow-plan" aria-labelledby="tab-tomorrow-plan" hidden={activeTab !== "tomorrow-plan"}>
            <ErrorBoundary><TomorrowPlanPanel onFollowupClick={handleFollowupClick} onInterventionClick={handleInterventionClick} /></ErrorBoundary>
          </div>
          <div role="tabpanel" id="panel-family-message" aria-labelledby="tab-family-message" hidden={activeTab !== "family-message"}>
            <ErrorBoundary><FamilyMessagePanel prefill={state.messagePrefill} /></ErrorBoundary>
          </div>
          <div role="tabpanel" id="panel-log-intervention" aria-labelledby="tab-log-intervention" hidden={activeTab !== "log-intervention"}>
            <ErrorBoundary><InterventionPanel prefill={state.interventionPrefill} /></ErrorBoundary>
          </div>
          <div role="tabpanel" id="panel-language-tools" aria-labelledby="tab-language-tools" hidden={activeTab !== "language-tools"}>
            <ErrorBoundary><LanguageToolsPanel /></ErrorBoundary>
          </div>
          <div role="tabpanel" id="panel-support-patterns" aria-labelledby="tab-support-patterns" hidden={activeTab !== "support-patterns"}>
            <ErrorBoundary><SupportPatternsPanel onFollowupClick={handleFollowupClick} onInterventionClick={handleInterventionClick} /></ErrorBoundary>
          </div>
          <div role="tabpanel" id="panel-ea-briefing" aria-labelledby="tab-ea-briefing" hidden={activeTab !== "ea-briefing"}>
            <ErrorBoundary><EABriefingPanel /></ErrorBoundary>
          </div>
          <div role="tabpanel" id="panel-complexity-forecast" aria-labelledby="tab-complexity-forecast" hidden={activeTab !== "complexity-forecast"}>
            <ErrorBoundary><ForecastPanel /></ErrorBoundary>
          </div>
          <div role="tabpanel" id="panel-survival-packet" aria-labelledby="tab-survival-packet" hidden={activeTab !== "survival-packet"}>
            <ErrorBoundary><SurvivalPacketPanel /></ErrorBoundary>
          </div>
        </main>

        <MobileNav activeTab={activeTab} onTabChange={(tab) => dispatch({ type: "SET_ACTIVE_TAB", tab: tab as ActiveTab })} debtCounts={debtCounts} />

        {state.showOnboarding && <OnboardingOverlay onDismiss={handleDismissOnboarding} />}
      </div>
    </AppContext.Provider>
  );
}
