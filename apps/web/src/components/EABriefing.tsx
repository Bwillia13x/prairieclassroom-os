import { useState } from "react";
import type { ClassroomProfile, EABriefingResponse } from "../types";
import PrintButton from "./PrintButton";
import "./EABriefing.css";

interface Props {
  classrooms: ClassroomProfile[];
  selectedClassroom: string;
  onClassroomChange: (id: string) => void;
  onSubmit: (classroomId: string, eaName?: string) => void;
  loading: boolean;
  result: EABriefingResponse | null;
}

export default function EABriefing({
  classrooms,
  selectedClassroom,
  onClassroomChange,
  onSubmit,
  loading,
  result,
}: Props) {
  const [eaName, setEaName] = useState("");

  return (
    <div className={`ea-briefing${result ? " ea-briefing--split" : ""}`}>
      <div className="ea-briefing-form">
        <h2>EA Daily Briefing</h2>
        <p className="ea-briefing-description">
          Generate a printable daily briefing for the educational assistant.
          Synthesizes today's plan, recent interventions, and pattern insights.
        </p>

        <div className="field">
          <label htmlFor="ea-classroom">Classroom</label>
          <select
            id="ea-classroom"
            value={selectedClassroom}
            onChange={(e) => onClassroomChange(e.target.value)}
          >
            {classrooms.map((c) => (
              <option key={c.classroom_id} value={c.classroom_id}>
                {c.classroom_id} ({c.grade_band})
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="ea-name">EA Name <span className="ea-briefing-optional">(optional)</span></label>
          <input
            id="ea-name"
            type="text"
            value={eaName}
            onChange={(e) => setEaName(e.target.value)}
            placeholder="e.g. Ms. Chen"
          />
        </div>

        <button
          className="btn btn--primary"
          onClick={() => onSubmit(selectedClassroom, eaName || undefined)}
          disabled={loading}
        >
          {loading ? "Generating…" : "Generate Briefing"}
        </button>
      </div>

      {result && (
        <div className="ea-briefing-result">
          <header className="ea-briefing-header">
            <h2>Daily Briefing — {result.briefing.classroom_id}</h2>
            <p className="ea-briefing-meta">
              {result.briefing.date}
            </p>
          </header>

          <p className="ea-briefing-disclaimer">
            This is a coordination document synthesized from the teacher's plan and records — not a diagnosis or student report.
          </p>

          {/* Teacher Notes */}
          {result.briefing.teacher_notes_for_ea && (
            <section className="ea-section ea-section--notes">
              <h3><span className="ea-icon">📋</span> Teacher's Notes for Today</h3>
              <p className="ea-notes-text">{result.briefing.teacher_notes_for_ea}</p>
            </section>
          )}

          {/* Schedule Blocks */}
          {result.briefing.schedule_blocks.length > 0 && (
            <section className="ea-section ea-section--schedule">
              <h3><span className="ea-icon">🕐</span> Today's Schedule</h3>
              <div className="ea-cards">
                {result.briefing.schedule_blocks.map((block, i) => (
                  <div key={i} className="ea-card ea-card--schedule">
                    <div className="ea-card-label">
                      {block.time_slot}
                      {block.student_refs.length > 0 && (
                        <span className="ea-card-tag"> · {block.student_refs.join(", ")}</span>
                      )}
                    </div>
                    <p>{block.task_description}</p>
                    {block.materials_needed.length > 0 && (
                      <p className="ea-card-materials">
                        Materials: {block.materials_needed.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Student Watch List */}
          {result.briefing.student_watch_list.length > 0 && (
            <section className="ea-section ea-section--watch">
              <h3><span className="ea-icon">👁</span> Student Watch List</h3>
              <div className="ea-cards">
                {result.briefing.student_watch_list.map((item, i) => (
                  <div key={i} className="ea-card ea-card--watch">
                    <div className="ea-card-label">{item.student_ref}</div>
                    <p className="ea-card-context">{item.context_summary}</p>
                    <p className="ea-card-approach">{item.suggested_approach}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Pending Follow-ups */}
          {result.briefing.pending_followups.length > 0 && (
            <section className="ea-section ea-section--followups">
              <h3><span className="ea-icon">⏰</span> Pending Follow-ups</h3>
              <div className="ea-cards">
                {result.briefing.pending_followups.map((f, i) => (
                  <div key={i} className="ea-card ea-card--followup">
                    <div className="ea-card-label">
                      {f.student_ref}
                      <span className="ea-card-tag"> · {f.days_since} days ago</span>
                    </div>
                    <p className="ea-card-observation">{f.original_observation}</p>
                    <p className="ea-card-action">{f.suggested_action}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <PrintButton label="Print Briefing" />
        </div>
      )}
    </div>
  );
}
