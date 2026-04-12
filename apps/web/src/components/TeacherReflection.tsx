import { useState, useCallback } from "react";
import { useFormPersistence } from "../hooks/useFormPersistence";
import "./TeacherReflection.css";

interface Props {
  classrooms: { classroom_id: string; grade_band: string; subject_focus: string }[];
  selectedClassroom: string;
  onClassroomChange: (id: string) => void;
  onSubmit: (classroomId: string, reflection: string, teacherGoal?: string) => void;
  loading: boolean;
}

export default function TeacherReflection({
  classrooms,
  selectedClassroom,
  onClassroomChange,
  onSubmit,
  loading,
}: Props) {
  const [reflection, setReflection] = useState("");
  const [teacherGoal, setTeacherGoal] = useState("");
  const [touched, setTouched] = useState(false);

  const { clear: clearDraft } = useFormPersistence(
    `prairie-reflection-${selectedClassroom}`,
    { reflection, teacherGoal },
    useCallback((saved: Partial<{ reflection: string; teacherGoal: string }>) => {
      if (saved.reflection !== undefined) setReflection(saved.reflection);
      if (saved.teacherGoal !== undefined) setTeacherGoal(saved.teacherGoal);
    }, []),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reflection.trim()) return;
    onSubmit(selectedClassroom, reflection.trim(), teacherGoal.trim() || undefined);
    clearDraft();
  }

  return (
    <form className="teacher-reflection form-panel" onSubmit={handleSubmit}>
      <h2>Build Tomorrow's Plan</h2>
      <p className="reflection-description form-description">
        Capture the day in a few sentences and the planner will turn it into tomorrow's priorities, watchpoints, and follow-through actions.
      </p>

      <div className="field">
        <label htmlFor="plan-classroom">Classroom</label>
        <select
          id="plan-classroom"
          value={selectedClassroom}
          onChange={(e) => onClassroomChange(e.target.value)}
        >
          {classrooms.map((c) => (
            <option key={c.classroom_id} value={c.classroom_id}>
              Grade {c.grade_band} — {c.subject_focus.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className={`field${touched && !reflection.trim() ? " field--error" : ""}`}>
        <label htmlFor="reflection">Today's Reflection <span className="field-required" aria-hidden="true">*</span></label>
        <textarea
          id="reflection"
          rows={5}
          placeholder="How did today go? What worked, what was hard? Any specific student moments to note…"
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
        <label htmlFor="plan-goal">
          Goal for Tomorrow
          <span className="field-optional">(optional)</span>
        </label>
        <textarea
          id="plan-goal"
          rows={2}
          placeholder="e.g. 'Focus on writing task. Mika had a rough afternoon — need smooth transitions.'"
          value={teacherGoal}
          onChange={(e) => setTeacherGoal(e.target.value)}
        />
      </div>

      <button type="submit" className="btn btn--primary" disabled={loading}>
        {loading ? "Generating Plan…" : "Generate Tomorrow Plan"}
      </button>
    </form>
  );
}
