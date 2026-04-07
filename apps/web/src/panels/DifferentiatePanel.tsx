import { useState, useRef } from "react";
import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { differentiate } from "../api";
import ArtifactUpload from "../components/ArtifactUpload";
import VariantGrid from "../components/VariantGrid";
import SkeletonLoader from "../components/SkeletonLoader";
import type { LessonArtifact, DifferentiateResponse } from "../types";

export default function DifferentiatePanel() {
  const { classrooms, activeClassroom, setActiveClassroom, showSuccess } = useApp();
  const { loading, error, result, execute } = useAsyncAction<DifferentiateResponse>();
  const [artifactTitle, setArtifactTitle] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  if (classrooms.length === 0) return null;

  async function handleDifferentiate(artifact: LessonArtifact, classroomId: string) {
    setArtifactTitle(artifact.title);
    const resp = await execute((signal) =>
      differentiate({
        artifact,
        classroom_id: classroomId,
        teacher_goal: artifact.teacher_goal,
      }, signal)
    );
    if (resp) showSuccess("Variants generated");
  }

  return (
    <div className={result ? "split-pane" : ""}>
      <ArtifactUpload
        classrooms={classrooms}
        selectedClassroom={activeClassroom}
        onClassroomChange={setActiveClassroom}
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
            <svg className="empty-state-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="10" y="6" width="22" height="30" rx="2" stroke="var(--color-border)" strokeWidth="2"/><path d="M16 14h10M16 20h8M16 26h6" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round"/><path d="M34 30l4-4-2-2-4 4v2h2z" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinejoin="round"/></svg>
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
          />
        )}
      </div>
    </div>
  );
}
