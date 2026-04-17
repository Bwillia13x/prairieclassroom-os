import { useState } from "react";
import "./ForecastForm.css";

interface Props {
  classrooms: { classroom_id: string; grade_band: string; subject_focus: string }[];
  selectedClassroom: string;
  onClassroomChange: (id: string) => void;
  onSubmit: (classroomId: string, teacherNotes?: string) => void;
  loading: boolean;
}

export default function ForecastForm({
  classrooms,
  selectedClassroom,
  onClassroomChange,
  onSubmit,
  loading,
}: Props) {
  const [forecastNotes, setForecastNotes] = useState("");
  const [touched, setTouched] = useState(false);

  const classroomMissing = !selectedClassroom;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (classroomMissing) return;
    onSubmit(selectedClassroom, forecastNotes.trim() || undefined);
  }

  return (
    <form className="forecast-form form-panel" onSubmit={handleSubmit}>
      <h2>Forecast Tomorrow's Complexity</h2>
      <p className="forecast-form-description form-description">
        Build a per-block outlook from schedule rhythm, active supports, and recent intervention pressure before the day begins.
      </p>

      <div className={`field${touched && classroomMissing ? " field--error" : ""}`}>
        <label htmlFor="forecast-classroom">Classroom <span className="field-required" aria-hidden="true">*</span></label>
        <select
          id="forecast-classroom"
          value={selectedClassroom}
          onChange={(e) => onClassroomChange(e.target.value)}
          aria-required="true"
          aria-invalid={touched && classroomMissing ? "true" : undefined}
          aria-describedby={touched && classroomMissing ? "forecast-classroom-error" : undefined}
        >
          {classrooms.map((c) => (
            <option key={c.classroom_id} value={c.classroom_id}>
              Grade {c.grade_band} — {c.subject_focus.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        {touched && classroomMissing && (
          <span id="forecast-classroom-error" className="field-error-hint" role="alert">Select a classroom</span>
        )}
      </div>

      <div className="field">
        <label htmlFor="forecast-notes">Optional notes for tomorrow</label>
        <textarea
          id="forecast-notes"
          value={forecastNotes}
          onChange={(e) => setForecastNotes(e.target.value)}
          placeholder="e.g., Assembly at 10am, new student starting, field trip cancelled..."
          rows={3}
        />
      </div>

      <button type="submit" className="btn btn--primary" disabled={loading || classroomMissing}>
        {loading ? "Generating forecast…" : "Generate forecast"}
      </button>
    </form>
  );
}
