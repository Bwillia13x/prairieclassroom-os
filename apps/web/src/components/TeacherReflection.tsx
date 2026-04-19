import { useState, useCallback } from "react";
import { useFormPersistence } from "../hooks/useFormPersistence";
import { FormCard } from "./shared";
import DraftRestoreChip from "./DraftRestoreChip";
import ActionButton from "./shared/ActionButton";
import "./TeacherReflection.css";

interface Props {
  selectedClassroom: string;
  onSubmit: (classroomId: string, reflection: string, teacherGoal?: string) => void;
  loading: boolean;
  /**
   * Optional small pill shown next to the Generate button — e.g.
   * `"2 of 14 days planned — keep it"`. Derived by the parent panel
   * from the same `plans14d` that powers PlanStreakCalendar.
   * 2026-04-19 OPS audit (phase 3).
   */
  streakLabel?: string;
}

export default function TeacherReflection({
  selectedClassroom,
  onSubmit,
  loading,
  streakLabel,
}: Props) {
  const [reflection, setReflection] = useState("");
  const [teacherGoal, setTeacherGoal] = useState("");
  const [touched, setTouched] = useState(false);

  const {
    clear: clearDraft,
    restore: restoreDraft,
    dismiss: dismissDraft,
    hasPendingDraft,
  } = useFormPersistence(
    `prairie-reflection-${selectedClassroom}`,
    { reflection, teacherGoal },
    useCallback((saved: Partial<{ reflection: string; teacherGoal: string }>) => {
      if (saved.reflection !== undefined) setReflection(saved.reflection);
      if (saved.teacherGoal !== undefined) setTeacherGoal(saved.teacherGoal);
    }, []),
    { autoRestore: false, minChars: 20, maxAgeMs: 12 * 60 * 60 * 1000 },
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reflection.trim()) return;
    onSubmit(selectedClassroom, reflection.trim(), teacherGoal.trim() || undefined);
    clearDraft();
  }

  return (
    <FormCard className="teacher-reflection">
    <form onSubmit={handleSubmit}>
      {/* 2026-04-19 OPS audit phase 3: dropped the duplicate header +
          description row. PageIntro above already carries that copy;
          spacing over titles. */}
      <DraftRestoreChip
        show={hasPendingDraft}
        onRestore={restoreDraft}
        onDismiss={dismissDraft}
        label="Continue the reflection you started earlier?"
      />

      <div className={`field${touched && !reflection.trim() ? " field--error" : ""}`}>
        <label htmlFor="reflection" className="form-label">Today's reflection <span className="field-required" aria-hidden="true">*</span></label>
        <textarea
          id="reflection"
          rows={5}
          placeholder="What worked today? Which students struggled? Any surprises or changes to flag for tomorrow? (e.g., 'Math went well, but Mika spiraled during writing — need smoother transition tomorrow.')"
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          onBlur={() => setTouched(true)}
          required
          aria-required="true"
          aria-invalid={touched && !reflection.trim() ? "true" : undefined}
          aria-describedby={touched && !reflection.trim() ? "reflection-error" : undefined}
        />
        {touched && !reflection.trim() && (
          <span id="reflection-error" className="field-error-hint" role="alert">Reflection is required</span>
        )}
      </div>

      <div className="field">
        <label htmlFor="plan-goal" className="form-label">Tomorrow's intention</label>
        <textarea
          id="plan-goal"
          rows={2}
          placeholder="e.g., 'Tighter writing block transitions and a slower start for Mika after recess — pair him with the calm-corner cue before the carpet.'"
          value={teacherGoal}
          onChange={(e) => setTeacherGoal(e.target.value)}
        />
      </div>

      <div className="teacher-reflection__submit-row">
        <ActionButton
          type="submit"
          variant="primary"
          loading={loading}
          data-testid="generate-tomorrow-plan-submit"
        >
          {loading ? "Generating plan…" : "Generate plan"}
        </ActionButton>
        {streakLabel ? (
          <span className="teacher-reflection__streak" aria-live="polite">
            {streakLabel}
          </span>
        ) : null}
      </div>
    </form>
    </FormCard>
  );
}
