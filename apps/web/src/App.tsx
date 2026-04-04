import { useState, useEffect, useRef } from "react";
import ArtifactUpload from "./components/ArtifactUpload";
import VariantGrid from "./components/VariantGrid";
import TeacherReflection from "./components/TeacherReflection";
import PlanViewer from "./components/PlanViewer";
import MessageComposer from "./components/MessageComposer";
import MessageDraft from "./components/MessageDraft";
import InterventionLogger from "./components/InterventionLogger";
import InterventionCard from "./components/InterventionCard";
import SimplifiedViewer from "./components/SimplifiedViewer";
import VocabCardGrid from "./components/VocabCardGrid";
import PatternReport from "./components/PatternReport";
import EABriefingView from "./components/EABriefing";
import SkeletonLoader from "./components/SkeletonLoader";
import {
  differentiate,
  listClassrooms,
  generateTomorrowPlan,
  draftFamilyMessage,
  approveFamilyMessage,
  logIntervention,
  simplifyText,
  generateVocabCards,
  detectSupportPatterns,
  generateEABriefing,
} from "./api";
import type {
  LessonArtifact,
  DifferentiateResponse,
  ClassroomProfile,
  TomorrowPlanResponse,
  FamilyMessageResponse,
  FamilyMessagePrefill,
  InterventionResponse,
  InterventionPrefill,
  SimplifyResponse,
  VocabCardsResponse,
  SupportPatternsResponse,
  EABriefingResponse,
} from "./types";
import "./App.css";

type ActiveTab = "differentiate" | "tomorrow-plan" | "family-message" | "log-intervention" | "language-tools" | "support-patterns" | "ea-briefing";

export default function App() {
  const [classrooms, setClassrooms] = useState<ClassroomProfile[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("differentiate");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DifferentiateResponse | null>(null);
  const [planResult, setPlanResult] = useState<TomorrowPlanResponse | null>(null);
  const [msgResult, setMsgResult] = useState<FamilyMessageResponse | null>(null);
  const [artifactTitle, setArtifactTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msgClassroom, setMsgClassroom] = useState("");
  const [messagePrefill, setMessagePrefill] = useState<FamilyMessagePrefill | null>(null);
  const [interventionResult, setInterventionResult] = useState<InterventionResponse | null>(null);
  const [interventionPrefill, setInterventionPrefill] = useState<InterventionPrefill | null>(null);
  const [simplifyResult, setSimplifyResult] = useState<SimplifyResponse | null>(null);
  const [vocabResult, setVocabResult] = useState<VocabCardsResponse | null>(null);
  const [patternResult, setPatternResult] = useState<SupportPatternsResponse | null>(null);
  const [briefingResult, setBriefingResult] = useState<EABriefingResponse | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  useEffect(() => {
    listClassrooms()
      .then((data) => {
        setClassrooms(data);

        // Demo mode: auto-select demo classroom when ?demo=true
        const params = new URLSearchParams(window.location.search);
        const isDemo = params.get("demo") === "true";
        const demoClassroom = data.find((c) => c.classroom_id === "demo-okafor-grade34");

        if (isDemo && demoClassroom) {
          setMsgClassroom(demoClassroom.classroom_id);
        } else if (data.length > 0) {
          setMsgClassroom(data[0].classroom_id);
        }
      })
      .catch(() => setError("Failed to load classrooms. Is the API server running?"));
  }, []);

  const activeClassroomProfile = classrooms.find((c) => c.classroom_id === msgClassroom);
  const studentStubs = activeClassroomProfile?.students ?? [];

  async function handleDifferentiate(artifact: LessonArtifact, classroomId: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    setArtifactTitle(artifact.title);

    try {
      const resp = await differentiate({
        artifact,
        classroom_id: classroomId,
        teacher_goal: artifact.teacher_goal,
      });
      setResult(resp);
      showSuccess("Variants generated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleTomorrowPlan(classroomId: string, reflection: string, teacherGoal?: string) {
    setLoading(true);
    setError(null);
    setPlanResult(null);

    try {
      const resp = await generateTomorrowPlan({
        classroom_id: classroomId,
        teacher_reflection: reflection,
        teacher_goal: teacherGoal,
      });
      setPlanResult(resp);
      showSuccess("Plan generated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleFamilyMessage(
    classroomId: string,
    studentRefs: string[],
    messageType: "routine_update" | "missed_work" | "praise" | "low_stakes_concern",
    targetLanguage: string,
    context?: string,
  ) {
    setLoading(true);
    setError(null);
    setMsgResult(null);

    try {
      const resp = await draftFamilyMessage({
        classroom_id: classroomId,
        student_refs: studentRefs,
        message_type: messageType,
        target_language: targetLanguage,
        context,
      });
      setMsgResult(resp);
      showSuccess("Message drafted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(draftId: string) {
    if (!msgResult) return;
    try {
      await approveFamilyMessage(msgResult.draft.classroom_id, draftId);
    } catch (err) {
      console.warn("Approval persistence failed:", err);
    }
  }

  function handleFollowupClick(prefill: FamilyMessagePrefill) {
    setMessagePrefill(prefill);
    setMsgResult(null);
    setActiveTab("family-message");
  }

  async function handleIntervention(
    classroomId: string,
    studentRefs: string[],
    teacherNote: string,
    context?: string,
  ) {
    setLoading(true);
    setError(null);
    setInterventionResult(null);

    try {
      const resp = await logIntervention({
        classroom_id: classroomId,
        student_refs: studentRefs,
        teacher_note: teacherNote,
        context,
      });
      setInterventionResult(resp);
      showSuccess("Intervention logged");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleInterventionClick(prefill: InterventionPrefill) {
    setInterventionPrefill(prefill);
    setInterventionResult(null);
    setActiveTab("log-intervention");
  }

  async function handleSimplify(sourceText: string, gradeBand: string, ealLevel: "beginner" | "intermediate" | "advanced") {
    setLoading(true);
    setError(null);
    setSimplifyResult(null);

    try {
      const resp = await simplifyText({ source_text: sourceText, grade_band: gradeBand, eal_level: ealLevel });
      setSimplifyResult(resp);
      showSuccess("Text simplified");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleVocabCards(artifactText: string, subject: string, targetLanguage: string, gradeBand: string) {
    setLoading(true);
    setError(null);
    setVocabResult(null);

    try {
      const resp = await generateVocabCards({
        artifact_text: artifactText,
        subject,
        target_language: targetLanguage,
        grade_band: gradeBand,
      });
      setVocabResult(resp);
      showSuccess("Cards generated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleEABriefing(classroomId: string, eaName?: string) {
    setLoading(true);
    setError(null);
    setBriefingResult(null);

    try {
      const resp = await generateEABriefing({
        classroom_id: classroomId,
        ea_name: eaName,
      });
      setBriefingResult(resp);
      showSuccess("Briefing generated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSupportPatterns(classroomId: string, studentFilter?: string, timeWindow?: number) {
    setLoading(true);
    setError(null);
    setPatternResult(null);

    try {
      const resp = await detectSupportPatterns({
        classroom_id: classroomId,
        student_filter: studentFilter,
        time_window: timeWindow,
      });
      setPatternResult(resp);
      showSuccess("Patterns analyzed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      {successMsg && <div className="success-toast" role="status">{successMsg}</div>}
      <header className="app-header">
        <h1>PrairieClassroom OS</h1>
        <p className="app-subtitle">Classroom complexity copilot</p>
        {activeClassroomProfile && (
          <div className="classroom-context">
            <span className="classroom-context-label">Active classroom:</span>{" "}
            <span className="classroom-context-value">
              Grade {activeClassroomProfile.grade_band} — {activeClassroomProfile.subject_focus.replace(/_/g, " ")}
            </span>
            <span className="classroom-context-id">{activeClassroomProfile.classroom_id}</span>
          </div>
        )}
      </header>

      <nav className="app-tabs" role="tablist" aria-label="PrairieClassroom OS sections">
        <div className="tab-group" role="presentation">
          <span className="tab-group-label">Lesson Prep</span>
          <button
            role="tab"
            id="tab-differentiate"
            aria-selected={activeTab === "differentiate"}
            aria-controls="panel-differentiate"
            className={`tab-btn ${activeTab === "differentiate" ? "tab-btn--active" : ""}`}
            onClick={() => setActiveTab("differentiate")}
          >
            Differentiate
          </button>
          <button
            role="tab"
            id="tab-language-tools"
            aria-selected={activeTab === "language-tools"}
            aria-controls="panel-language-tools"
            className={`tab-btn ${activeTab === "language-tools" ? "tab-btn--active" : ""}`}
            onClick={() => setActiveTab("language-tools")}
          >
            Language Tools
          </button>
        </div>
        <div className="tab-group" role="presentation">
          <span className="tab-group-label">Daily Ops</span>
          <button
            role="tab"
            id="tab-tomorrow-plan"
            aria-selected={activeTab === "tomorrow-plan"}
            aria-controls="panel-tomorrow-plan"
            className={`tab-btn ${activeTab === "tomorrow-plan" ? "tab-btn--active" : ""}`}
            onClick={() => setActiveTab("tomorrow-plan")}
          >
            Tomorrow Plan
          </button>
          <button
            role="tab"
            id="tab-ea-briefing"
            aria-selected={activeTab === "ea-briefing"}
            aria-controls="panel-ea-briefing"
            className={`tab-btn ${activeTab === "ea-briefing" ? "tab-btn--active" : ""}`}
            onClick={() => setActiveTab("ea-briefing")}
          >
            EA Briefing
          </button>
          <button
            role="tab"
            id="tab-log-intervention"
            aria-selected={activeTab === "log-intervention"}
            aria-controls="panel-log-intervention"
            className={`tab-btn ${activeTab === "log-intervention" ? "tab-btn--active" : ""}`}
            onClick={() => setActiveTab("log-intervention")}
          >
            Log Intervention
          </button>
        </div>
        <div className="tab-group" role="presentation">
          <span className="tab-group-label">Review</span>
          <button
            role="tab"
            id="tab-family-message"
            aria-selected={activeTab === "family-message"}
            aria-controls="panel-family-message"
            className={`tab-btn ${activeTab === "family-message" ? "tab-btn--active" : ""}`}
            onClick={() => setActiveTab("family-message")}
          >
            Family Message
          </button>
          <button
            role="tab"
            id="tab-support-patterns"
            aria-selected={activeTab === "support-patterns"}
            aria-controls="panel-support-patterns"
            className={`tab-btn ${activeTab === "support-patterns" ? "tab-btn--active" : ""}`}
            onClick={() => setActiveTab("support-patterns")}
          >
            Support Patterns
          </button>
        </div>
      </nav>

      <main className="app-main">
        {classrooms.length === 0 && !error && (
          <p className="loading-text">Loading classrooms…</p>
        )}

        {classrooms.length === 0 && error && (
          <div className="error-banner">{error}</div>
        )}

        <div role="tabpanel" id="panel-differentiate" aria-labelledby="tab-differentiate" hidden={activeTab !== "differentiate"}>
          {activeTab === "differentiate" && classrooms.length > 0 && (
            <div className={result ? "split-pane" : ""}>
              <ArtifactUpload
                classrooms={classrooms}
                onSubmit={handleDifferentiate}
                loading={loading}
              />
              <div aria-live="polite" ref={resultRef}>
                {error && result === null && <div className="error-banner">{error}</div>}
                {loading && result === null && (
                  <SkeletonLoader variant="grid" message="Differentiating lesson into multiple variants..." label="Loading differentiated variants" />
                )}
                {!loading && result === null && !error && (
                  <div className="empty-state">
                    <span className="empty-state-icon">&#9998;</span>
                    <div className="empty-state-title">No variants yet</div>
                    <p className="empty-state-description">
                      Upload a lesson artifact and select a classroom to generate differentiated versions for your students.
                    </p>
                  </div>
                )}
                {result && (
                  <VariantGrid
                    artifactTitle={artifactTitle}
                    variants={result.variants}
                    latencyMs={result.latency_ms}
                    modelId={result.model_id}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div role="tabpanel" id="panel-tomorrow-plan" aria-labelledby="tab-tomorrow-plan" hidden={activeTab !== "tomorrow-plan"}>
          {activeTab === "tomorrow-plan" && classrooms.length > 0 && (
            <div className={planResult ? "split-pane" : ""}>
              <TeacherReflection
                classrooms={classrooms}
                onSubmit={handleTomorrowPlan}
                loading={loading}
              />
              <div aria-live="polite">
                {error && planResult === null && <div className="error-banner">{error}</div>}
                {loading && planResult === null && (
                  <SkeletonLoader variant="stack" message="Deep reasoning in progress — generating your support plan..." label="Generating tomorrow plan" />
                )}
                {!loading && planResult === null && !error && (
                  <div className="empty-state">
                    <span className="empty-state-icon">&#128197;</span>
                    <div className="empty-state-title">No plan yet</div>
                    <p className="empty-state-description">
                      Reflect on today to generate a structured support plan for tomorrow. The planning model uses deep reasoning.
                    </p>
                  </div>
                )}
                {planResult && (
                  <PlanViewer
                    plan={planResult.plan}
                    thinkingSummary={planResult.thinking_summary}
                    patternInformed={planResult.pattern_informed}
                    latencyMs={planResult.latency_ms}
                    modelId={planResult.model_id}
                    onFollowupClick={handleFollowupClick}
                    onInterventionClick={handleInterventionClick}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div role="tabpanel" id="panel-family-message" aria-labelledby="tab-family-message" hidden={activeTab !== "family-message"}>
          {activeTab === "family-message" && classrooms.length > 0 && (
            <div className={msgResult ? "split-pane" : ""}>
              <MessageComposer
                classrooms={classrooms}
                students={studentStubs}
                selectedClassroom={msgClassroom}
                onClassroomChange={setMsgClassroom}
                onSubmit={handleFamilyMessage}
                loading={loading}
                prefill={messagePrefill}
              />
              <div aria-live="polite">
                {error && msgResult === null && <div className="error-banner">{error}</div>}
                {loading && msgResult === null && (
                  <SkeletonLoader variant="single" message="Drafting family message..." label="Drafting family message" />
                )}
                {!loading && msgResult === null && !error && (
                  <div className="empty-state">
                    <span className="empty-state-icon">&#9993;</span>
                    <div className="empty-state-title">No draft yet</div>
                    <p className="empty-state-description">
                      Select a student and provide context to draft a plain-language family message. You'll review it before copying.
                    </p>
                  </div>
                )}
                {msgResult && (
                  <MessageDraft
                    draft={msgResult.draft}
                    latencyMs={msgResult.latency_ms}
                    modelId={msgResult.model_id}
                    onApprove={handleApprove}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div role="tabpanel" id="panel-log-intervention" aria-labelledby="tab-log-intervention" hidden={activeTab !== "log-intervention"}>
          {activeTab === "log-intervention" && classrooms.length > 0 && (
            <div className={interventionResult ? "split-pane" : ""}>
              <InterventionLogger
                classrooms={classrooms}
                students={studentStubs}
                selectedClassroom={msgClassroom}
                onClassroomChange={setMsgClassroom}
                onSubmit={handleIntervention}
                loading={loading}
                prefill={interventionPrefill}
              />
              <div aria-live="polite">
                {error && interventionResult === null && <div className="error-banner">{error}</div>}
                {loading && interventionResult === null && (
                  <SkeletonLoader variant="single" message="Structuring your intervention note..." label="Structuring intervention note" />
                )}
                {!loading && interventionResult === null && !error && (
                  <div className="empty-state">
                    <span className="empty-state-icon">&#128221;</span>
                    <div className="empty-state-title">No intervention logged</div>
                    <p className="empty-state-description">
                      Select students and describe what happened. The system structures your note for classroom memory.
                    </p>
                  </div>
                )}
                {interventionResult && (
                  <InterventionCard
                    record={interventionResult.record}
                    latencyMs={interventionResult.latency_ms}
                    modelId={interventionResult.model_id}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div role="tabpanel" id="panel-language-tools" aria-labelledby="tab-language-tools" hidden={activeTab !== "language-tools"}>
          {activeTab === "language-tools" && (
            <>
              {error && simplifyResult === null && vocabResult === null && (
                <div className="error-banner">{error}</div>
              )}
              <SimplifiedViewer
                onSubmit={handleSimplify}
                result={simplifyResult}
                loading={loading}
              />
              <hr className="section-divider" />
              <VocabCardGrid
                onSubmit={handleVocabCards}
                result={vocabResult}
                loading={loading}
              />
            </>
          )}
        </div>
        <div role="tabpanel" id="panel-support-patterns" aria-labelledby="tab-support-patterns" hidden={activeTab !== "support-patterns"}>
          {activeTab === "support-patterns" && classrooms.length > 0 && (
            <PatternReport
              classrooms={classrooms}
              students={studentStubs}
              selectedClassroom={msgClassroom}
              onClassroomChange={setMsgClassroom}
              onSubmit={handleSupportPatterns}
              loading={loading}
              result={patternResult}
              onInterventionClick={handleInterventionClick}
              onFollowupClick={handleFollowupClick}
            />
          )}
        </div>
        <div role="tabpanel" id="panel-ea-briefing" aria-labelledby="tab-ea-briefing" hidden={activeTab !== "ea-briefing"}>
          {activeTab === "ea-briefing" && classrooms.length > 0 && (
            <EABriefingView
              classrooms={classrooms}
              selectedClassroom={msgClassroom}
              onClassroomChange={setMsgClassroom}
              onSubmit={handleEABriefing}
              loading={loading}
              result={briefingResult}
            />
          )}
        </div>
      </main>
    </div>
  );
}
