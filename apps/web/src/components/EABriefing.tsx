import { useState } from "react";
import type { EABriefingResponse } from "../types";
import PrintButton from "./PrintButton";
import OutputMetaRow from "./OutputMetaRow";
import { buildModelMetaItems } from "./buildModelMetaItems";
import { FollowUpDecayIndicators, ScheduleLoadStrip } from "./DataVisualizations";
import { FormCard } from "./shared";
import "./EABriefing.css";

/* ── Form ─────────────────────────────────────────────────────────── */

interface FormProps {
  selectedClassroom: string;
  onSubmit: (classroomId: string, eaName?: string) => void;
  loading: boolean;
}

export function EABriefingForm({ selectedClassroom, onSubmit, loading }: FormProps) {
  const [eaName, setEaName] = useState("");

  return (
    <FormCard className="ea-briefing-form">
      <h2>Generate EA daily briefing</h2>
      <p className="ea-briefing-description form-description">
        Build a coordination brief for the educational assistant from the current classroom plan, intervention history, and watch-list context.
      </p>

      <div className="field">
        <label htmlFor="ea-name" className="form-label">EA name <span className="field-optional">(optional)</span></label>
        <input
          id="ea-name"
          type="text"
          value={eaName}
          onChange={(e) => setEaName(e.target.value)}
          placeholder="e.g. Ms. Chen"
        />
      </div>

      <button
        type="button"
        className="btn btn--primary"
        onClick={() => onSubmit(selectedClassroom, eaName || undefined)}
        disabled={loading}
      >
        {loading ? "Generating briefing…" : "Generate briefing"}
      </button>
    </FormCard>
  );
}

/* ── Result ────────────────────────────────────────────────────────── */

interface ResultProps {
  result: EABriefingResponse;
}

export function EABriefingResult({ result }: ResultProps) {
  return (
    <div className="ea-briefing-result">
      <header className="ea-briefing-header">
        <h2>Daily Briefing — {result.briefing.classroom_id}</h2>
        <p className="ea-briefing-meta">
          {result.briefing.date}
        </p>
        <OutputMetaRow
          items={[
            { label: "Coordination document", tone: "analysis" },
            { label: "Retrieval-backed", tone: "provenance" },
            { label: "Print-ready", tone: "accent" },
            ...buildModelMetaItems(result),
          ]}
          compact
        />
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
          <ScheduleLoadStrip
            blocks={result.briefing.schedule_blocks.map((block) => ({
              time_slot: block.time_slot,
              student_count: block.student_refs.length,
              label: block.task_description,
            }))}
          />
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
          <FollowUpDecayIndicators
            gaps={result.briefing.pending_followups.map((f) => ({
              original_record_id: f.student_ref,
              student_refs: [f.student_ref],
              observation: f.original_observation,
              days_since: f.days_since,
            }))}
          />
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
  );
}

/* ── Legacy default (composes both) ────────────────────────────────── */

interface Props {
  selectedClassroom: string;
  onSubmit: (classroomId: string, eaName?: string) => void;
  loading: boolean;
  result: EABriefingResponse | null;
}

export default function EABriefing({ selectedClassroom, onSubmit, loading, result }: Props) {
  return (
    <div className={`ea-briefing${result ? " ea-briefing--split" : ""}`}>
      <EABriefingForm selectedClassroom={selectedClassroom} onSubmit={onSubmit} loading={loading} />
      {result && <EABriefingResult result={result} />}
    </div>
  );
}
