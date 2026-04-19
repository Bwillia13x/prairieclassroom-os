import { useState } from "react";
import { FormCard } from "./shared";
import "./ForecastForm.css";

interface Props {
  selectedClassroom: string;
  onSubmit: (classroomId: string, teacherNotes?: string) => void;
  loading: boolean;
}

export default function ForecastForm({
  selectedClassroom,
  onSubmit,
  loading,
}: Props) {
  const [forecastNotes, setForecastNotes] = useState("");

  const classroomMissing = !selectedClassroom;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (classroomMissing) return;
    onSubmit(selectedClassroom, forecastNotes.trim() || undefined);
  }

  return (
    <FormCard className="forecast-form">
      <form onSubmit={handleSubmit}>
        <h2>Forecast tomorrow's complexity</h2>
        <p className="forecast-form-description form-description">
          Build a per-block outlook from schedule rhythm, active supports, and recent intervention pressure before the day begins.
        </p>

        <div className="field">
          <label htmlFor="forecast-notes" className="form-label">Optional notes for tomorrow</label>
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
    </FormCard>
  );
}
