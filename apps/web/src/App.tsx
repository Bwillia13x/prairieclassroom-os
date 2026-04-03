import { useState, useEffect } from "react";
import ArtifactUpload from "./components/ArtifactUpload";
import VariantGrid from "./components/VariantGrid";
import TeacherReflection from "./components/TeacherReflection";
import PlanViewer from "./components/PlanViewer";
import MessageComposer from "./components/MessageComposer";
import MessageDraft from "./components/MessageDraft";
import {
  differentiate,
  listClassrooms,
  generateTomorrowPlan,
  draftFamilyMessage,
  approveFamilyMessage,
} from "./api";
import type {
  LessonArtifact,
  DifferentiateResponse,
  ClassroomProfile,
  TomorrowPlanResponse,
  FamilyMessageResponse,
  FamilyMessagePrefill,
} from "./types";
import "./App.css";

type ActiveTab = "differentiate" | "tomorrow-plan" | "family-message";

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

  useEffect(() => {
    listClassrooms()
      .then((data) => {
        setClassrooms(data);
        if (data.length > 0) setMsgClassroom(data[0].classroom_id);
      })
      .catch(() => setError("Failed to load classrooms. Is the API server running?"));
  }, []);

  // Student stubs from synthetic data — /api/classrooms returns summaries only
  const studentStubs: { alias: string }[] =
    msgClassroom === "alpha-grade4"
      ? [{ alias: "Ari" }, { alias: "Mika" }, { alias: "Jae" }]
      : msgClassroom === "bravo-grade2"
        ? [{ alias: "Sam" }, { alias: "Lia" }, { alias: "Ravi" }]
        : msgClassroom === "charlie-grade1"
          ? [{ alias: "Kai" }, { alias: "Zara" }, { alias: "Noor" }]
          : msgClassroom === "delta-grade5"
            ? [{ alias: "Tao" }, { alias: "Ines" }, { alias: "Devi" }]
            : msgClassroom === "echo-grade3"
              ? [{ alias: "Yuki" }, { alias: "Omar" }, { alias: "Lily" }]
              : [];

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

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>PrairieClassroom OS</h1>
        <p className="app-subtitle">Classroom complexity copilot</p>
      </header>

      <nav className="app-tabs">
        <button
          className={`tab-btn ${activeTab === "differentiate" ? "tab-btn--active" : ""}`}
          onClick={() => setActiveTab("differentiate")}
        >
          Differentiate
        </button>
        <button
          className={`tab-btn ${activeTab === "tomorrow-plan" ? "tab-btn--active" : ""}`}
          onClick={() => setActiveTab("tomorrow-plan")}
        >
          Tomorrow Plan
        </button>
        <button
          className={`tab-btn ${activeTab === "family-message" ? "tab-btn--active" : ""}`}
          onClick={() => setActiveTab("family-message")}
        >
          Family Message
        </button>
      </nav>

      <main className="app-main">
        {classrooms.length === 0 && !error && (
          <p className="loading-text">Loading classrooms…</p>
        )}

        {classrooms.length === 0 && error && (
          <div className="error-banner">{error}</div>
        )}

        {activeTab === "differentiate" && classrooms.length > 0 && (
          <>
            <ArtifactUpload
              classrooms={classrooms}
              onSubmit={handleDifferentiate}
              loading={loading}
            />
            {error && result === null && <div className="error-banner">{error}</div>}
            {result && (
              <VariantGrid
                artifactTitle={artifactTitle}
                variants={result.variants}
                latencyMs={result.latency_ms}
                modelId={result.model_id}
              />
            )}
          </>
        )}

        {activeTab === "tomorrow-plan" && classrooms.length > 0 && (
          <>
            <TeacherReflection
              classrooms={classrooms}
              onSubmit={handleTomorrowPlan}
              loading={loading}
            />
            {error && planResult === null && <div className="error-banner">{error}</div>}
            {planResult && (
              <PlanViewer
                plan={planResult.plan}
                thinkingSummary={planResult.thinking_summary}
                latencyMs={planResult.latency_ms}
                modelId={planResult.model_id}
                onFollowupClick={handleFollowupClick}
              />
            )}
          </>
        )}

        {activeTab === "family-message" && classrooms.length > 0 && (
          <>
            <MessageComposer
              classrooms={classrooms}
              students={studentStubs}
              selectedClassroom={msgClassroom}
              onClassroomChange={setMsgClassroom}
              onSubmit={handleFamilyMessage}
              loading={loading}
              prefill={messagePrefill}
            />
            {error && msgResult === null && <div className="error-banner">{error}</div>}
            {msgResult && (
              <MessageDraft
                draft={msgResult.draft}
                latencyMs={msgResult.latency_ms}
                modelId={msgResult.model_id}
                onApprove={handleApprove}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
