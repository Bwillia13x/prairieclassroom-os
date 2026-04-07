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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClassroom) return;
    onSubmit(selectedClassroom, forecastNotes.trim() || undefined);
  }

  return (
    <form className="forecast-form" onSubmit={handleSubmit}>
      <h2>Complexity Forecast</h2>
      <p className="forecast-form-description">
        Generate a per-block complexity forecast for tomorrow based on schedule, student needs, and intervention history.
      </p>

      <div className="field">
        <label htmlFor="forecast-classroom">Classroom</label>
        <select
          id="forecast-classroom"
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

      <button type="submit" className="btn btn--primary" disabled={loading || !selectedClassroom}>
        {loading ? "Generating Forecast..." : "Generate Forecast"}
      </button>
    </form>
  );
}
