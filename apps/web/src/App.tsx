import { useState, useEffect } from "react";
import ArtifactUpload from "./components/ArtifactUpload";
import VariantGrid from "./components/VariantGrid";
import TeacherReflection from "./components/TeacherReflection";
import PlanViewer from "./components/PlanViewer";
import { differentiate, listClassrooms, generateTomorrowPlan } from "./api";
import type { LessonArtifact, DifferentiateResponse, ClassroomProfile, TomorrowPlanResponse } from "./types";
import "./App.css";

type ActiveTab = "differentiate" | "tomorrow-plan";

export default function App() {
  const [classrooms, setClassrooms] = useState<ClassroomProfile[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("differentiate");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DifferentiateResponse | null>(null);
  const [planResult, setPlanResult] = useState<TomorrowPlanResponse | null>(null);
  const [artifactTitle, setArtifactTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listClassrooms()
      .then(setClassrooms)
      .catch(() => setError("Failed to load classrooms. Is the API server running?"));
  }, []);

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
      </nav>

      <main className="app-main">
        {classrooms.length === 0 && !error && (
          <p className="loading-text">Loading classrooms…</p>
        )}

        {classrooms.length === 0 && error && (
          <div className="error-banner">{error}</div>
        )}

        {/* Differentiate tab */}
        {activeTab === "differentiate" && classrooms.length > 0 && (
          <>
            <ArtifactUpload
              classrooms={classrooms}
              onSubmit={handleDifferentiate}
              loading={loading}
            />

            {error && result === null && (
              <div className="error-banner">{error}</div>
            )}

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

        {/* Tomorrow Plan tab */}
        {activeTab === "tomorrow-plan" && classrooms.length > 0 && (
          <>
            <TeacherReflection
              classrooms={classrooms}
              onSubmit={handleTomorrowPlan}
              loading={loading}
            />

            {error && planResult === null && (
              <div className="error-banner">{error}</div>
            )}

            {planResult && (
              <PlanViewer
                plan={planResult.plan}
                thinkingSummary={planResult.thinking_summary}
                latencyMs={planResult.latency_ms}
                modelId={planResult.model_id}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
