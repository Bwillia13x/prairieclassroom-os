import { useState } from "react";
import "./TeacherReflection.css";

interface Props {
  classrooms: { classroom_id: string; grade_band: string; subject_focus: string }[];
  onSubmit: (classroomId: string, reflection: string, teacherGoal?: string) => void;
  loading: boolean;
}

export default function TeacherReflection({ classrooms, onSubmit, loading }: Props) {
  const [classroomId, setClassroomId] = useState(classrooms[0]?.classroom_id ?? "");
  const [reflection, setReflection] = useState("");
  const [teacherGoal, setTeacherGoal] = useState("");
  const [touched, setTouched] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reflection.trim()) return;
    onSubmit(classroomId, reflection.trim(), teacherGoal.trim() || undefined);
  }

  return (
    <form className="teacher-reflection" onSubmit={handleSubmit}>
      <h2>Tomorrow Plan</h2>
      <p className="reflection-description">
        Reflect on today and get a structured support plan for tomorrow.
      </p>

      <div className="field">
        <label htmlFor="plan-classroom">Classroom</label>
        <select
          id="plan-classroom"
          value={classroomId}
          onChange={(e) => setClassroomId(e.target.value)}
        >
          {classrooms.map((c) => (
            <option key={c.classroom_id} value={c.classroom_id}>
              Grade {c.grade_band} — {c.subject_focus.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className={`field${touched && !reflection.trim() ? " field--error" : ""}`}>
        <label htmlFor="reflection">Today's Reflection</label>
        <textarea
          id="reflection"
          rows={5}
          placeholder="How did today go? What worked, what was hard? Any specific student moments to note…"
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          onBlur={() => setTouched(true)}
          required
        />
        {touched && !reflection.trim() && (
          <span className="field-error-hint">Reflection is required</span>
        )}
      </div>

      <div className="field">
        <label htmlFor="plan-goal">Goal for Tomorrow (optional)</label>
        <textarea
          id="plan-goal"
          rows={2}
          placeholder="e.g. 'Focus on writing task. Mika had a rough afternoon — need smooth transitions.'"
          value={teacherGoal}
          onChange={(e) => setTeacherGoal(e.target.value)}
        />
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Generating Plan…" : "Generate Tomorrow Plan"}
      </button>
    </form>
  );
}
