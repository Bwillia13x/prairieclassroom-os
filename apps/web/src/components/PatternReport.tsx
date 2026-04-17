import { useState } from "react";
import type {
  SupportPatternsResponse,
  InterventionPrefill,
  FamilyMessagePrefill,
} from "../types";
import PrintButton from "./PrintButton";
import OutputMetaRow from "./OutputMetaRow";
import { buildModelMetaItems } from "./buildModelMetaItems";
import { SupportPatternRadar, FollowUpDecayIndicators, ScaffoldEffectivenessChart, StudentThemeHeatmap } from "./DataVisualizations";
import "./PatternReport.css";

/* ------------------------------------------------------------------ */
/*  Form                                                               */
/* ------------------------------------------------------------------ */

interface FormProps {
  classrooms: { classroom_id: string; grade_band: string; subject_focus: string }[];
  students: { alias: string }[];
  selectedClassroom: string;
  onClassroomChange: (id: string) => void;
  onSubmit: (classroomId: string, studentFilter?: string, timeWindow?: number) => void;
  loading: boolean;
}

export function PatternReportForm({
  classrooms,
  students,
  selectedClassroom,
  onClassroomChange,
  onSubmit,
  loading,
}: FormProps) {
  const [studentFilter, setStudentFilter] = useState("");
  const [timeWindow, setTimeWindow] = useState(10);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(selectedClassroom, studentFilter || undefined, timeWindow);
  }

  return (
    <form className="pattern-form form-panel" onSubmit={handleSubmit}>
      <h2>Review Support Patterns</h2>
      <p className="pattern-form-description form-description">
        Review patterns across your intervention records and support plans.
        This reflects your own documentation — not a diagnosis.
      </p>

      <div className="field">
        <label htmlFor="pat-classroom">Classroom</label>
        <select
          id="pat-classroom"
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
        <label htmlFor="pat-student">Filter by student (optional)</label>
        <select
          id="pat-student"
          value={studentFilter}
          onChange={(e) => setStudentFilter(e.target.value)}
        >
          <option value="">All students</option>
          {students.map((s) => (
            <option key={s.alias} value={s.alias}>
              {s.alias}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="pat-window">Time window</label>
        <select
          id="pat-window"
          value={timeWindow}
          onChange={(e) => setTimeWindow(Number(e.target.value))}
        >
          <option value={5}>Last 5 records</option>
          <option value={10}>Last 10 records</option>
          <option value={20}>Last 20 records</option>
        </select>
      </div>

      <button
        type="submit"
        className="btn btn--primary"
        disabled={loading}
        data-testid="detect-patterns-submit"
      >
        {loading ? "Analyzing Patterns..." : "Detect Patterns"}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Result                                                             */
/* ------------------------------------------------------------------ */

interface ResultProps {
  result: SupportPatternsResponse;
  onInterventionClick?: (prefill: InterventionPrefill) => void;
  onFollowupClick?: (prefill: FamilyMessagePrefill) => void;
}

export function PatternReportResult({
  result,
  onInterventionClick,
  onFollowupClick,
}: ResultProps) {
  const report = result.report;

  return (
    <div>
      <header className="pattern-header">
        <h2>Pattern Report</h2>
        <p className="pattern-meta">
          {report.classroom_id}
          {report.student_filter && ` · ${report.student_filter}`}
          {" · "}last {report.time_window} records
        </p>
        <OutputMetaRow
          items={[
            { label: "Analysis suite", tone: "analysis" },
            { label: "Retrieval-backed", tone: "provenance" },
            { label: "Teacher review only", tone: "pending" },
            ...buildModelMetaItems(result),
          ]}
          compact
        />
      </header>

      {result.thinking_summary && (
        <details className="pattern-thinking">
          <summary>Model Thinking</summary>
          <pre>{result.thinking_summary}</pre>
        </details>
      )}

      {/* Visual overview: radar + heatmap + decay */}
      {report.recurring_themes.length > 0 && (
        <SupportPatternRadar themes={report.recurring_themes} />
      )}

      {report.recurring_themes.length > 1 && (
        <StudentThemeHeatmap themes={report.recurring_themes} />
      )}

      {report.follow_up_gaps.length > 0 && (
        <FollowUpDecayIndicators
          gaps={report.follow_up_gaps}
          onStudentClick={onInterventionClick ? (alias) =>
            onInterventionClick({
              student_ref: alias,
              suggested_action: "Follow up on previous intervention",
              reason: "Flagged by follow-up decay indicator",
            }) : undefined}
        />
      )}

      {report.recurring_themes.length > 0 && (
        <section className="pattern-section pattern-section--themes">
          <h3>Recurring Themes</h3>
          {report.recurring_themes.map((theme, i) => (
            <div key={i} className="pattern-card">
              <div className="pattern-card-label">
                {theme.theme}
                <span className="pattern-card-tag">
                  {" · "}{theme.student_refs.join(", ")} · {theme.evidence_count} records
                </span>
              </div>
              {theme.example_observations.map((obs, j) => (
                <p key={j} className="pattern-evidence">"{obs}"</p>
              ))}
            </div>
          ))}
        </section>
      )}

      {report.follow_up_gaps.length > 0 && (
        <section className="pattern-section pattern-section--gaps">
          <h3>Follow-up Gaps</h3>
          {report.follow_up_gaps.map((gap, i) => (
            <div key={i} className="pattern-card">
              <div className="pattern-card-label">
                {gap.student_refs.join(", ")}
                <span className="pattern-card-tag"> · {gap.days_since} days ago</span>
              </div>
              <p>{gap.observation}</p>
              {onInterventionClick && gap.student_refs.length > 0 && (
                <button
                  type="button"
                  className="pattern-card-action-btn"
                  aria-label={`Log follow-up for ${gap.student_refs.join(", ")}`}
                  onClick={() =>
                    onInterventionClick({
                      student_ref: gap.student_refs[0],
                      suggested_action: "Follow up on previous intervention",
                      reason: gap.observation,
                    })
                  }
                >
                  Log Follow-up
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {report.positive_trends.length > 0 && (
        <section className="pattern-section pattern-section--trends">
          <h3>Positive Trends</h3>
          {report.positive_trends.map((trend, i) => (
            <div key={i} className="pattern-card">
              <div className="pattern-card-label">{trend.student_ref}</div>
              <p>{trend.description}</p>
              {trend.evidence.map((ev, j) => (
                <p key={j} className="pattern-evidence">"{ev}"</p>
              ))}
              {onFollowupClick && (
                <button
                  type="button"
                  className="pattern-card-action-btn"
                  aria-label={`Share positive trend for ${trend.student_ref} with family`}
                  data-testid="pattern-share-positive-trend"
                  onClick={() =>
                    onFollowupClick({
                      student_ref: trend.student_ref,
                      reason: trend.description,
                      message_type: "praise",
                    })
                  }
                >
                  Share with family
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {report.suggested_focus.length > 0 && (
        <section className="pattern-section pattern-section--focus">
          <h3>Suggested Focus</h3>
          {report.suggested_focus.map((focus, i) => (
            <div key={i} className="pattern-card">
              <div className="pattern-card-label">
                {focus.student_ref}{" "}
                <span className={`priority-badge priority-badge--${focus.priority}`}>
                  {focus.priority}
                </span>
              </div>
              <p>{focus.reason}</p>
              <p><strong>Next step:</strong> {focus.suggested_action}</p>
              {onInterventionClick && (
                <button
                  type="button"
                  className="pattern-card-action-btn"
                  aria-label={`Log intervention for ${focus.student_ref}`}
                  onClick={() =>
                    onInterventionClick({
                      student_ref: focus.student_ref,
                      suggested_action: focus.suggested_action,
                      reason: focus.reason,
                    })
                  }
                >
                  Log Intervention
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {report.recurring_themes.length > 0 && (
        <ScaffoldEffectivenessChart
          scaffolds={report.recurring_themes.map((t) => ({
            name: t.theme,
            count: t.evidence_count,
          }))}
        />
      )}

      <PrintButton label="Print Report" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Legacy default (composes both)                                     */
/* ------------------------------------------------------------------ */

interface Props {
  classrooms: { classroom_id: string; grade_band: string; subject_focus: string }[];
  students: { alias: string }[];
  selectedClassroom: string;
  onClassroomChange: (id: string) => void;
  onSubmit: (classroomId: string, studentFilter?: string, timeWindow?: number) => void;
  loading: boolean;
  result: SupportPatternsResponse | null;
  onInterventionClick?: (prefill: InterventionPrefill) => void;
  onFollowupClick?: (prefill: FamilyMessagePrefill) => void;
}

export default function PatternReport({
  classrooms,
  students,
  selectedClassroom,
  onClassroomChange,
  onSubmit,
  loading,
  result,
  onInterventionClick,
  onFollowupClick,
}: Props) {
  return (
    <div className={`pattern-report${result ? " pattern-report--split" : ""}`}>
      <PatternReportForm
        classrooms={classrooms}
        students={students}
        selectedClassroom={selectedClassroom}
        onClassroomChange={onClassroomChange}
        onSubmit={onSubmit}
        loading={loading}
      />
      {result && (
        <PatternReportResult
          result={result}
          onInterventionClick={onInterventionClick}
          onFollowupClick={onFollowupClick}
        />
      )}
    </div>
  );
}
