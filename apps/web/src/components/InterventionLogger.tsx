import { useState, useEffect, useCallback } from "react";
import { useFormPersistence } from "../hooks/useFormPersistence";
import type { InterventionPrefill } from "../types";
import { Card, ActionButton } from "./shared";
import "./InterventionLogger.css";

interface Props {
  classrooms: { classroom_id: string; grade_band: string; subject_focus: string }[];
  students: { alias: string }[];
  selectedClassroom: string;
  onClassroomChange: (id: string) => void;
  onSubmit: (
    classroomId: string,
    studentRefs: string[],
    teacherNote: string,
    context?: string,
  ) => void;
  loading: boolean;
  prefill?: InterventionPrefill | null;
}

export default function InterventionLogger({
  classrooms,
  students,
  selectedClassroom,
  onClassroomChange,
  onSubmit,
  loading,
  prefill,
}: Props) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>(
    prefill ? [prefill.student_ref] : [],
  );
  const [teacherNote, setTeacherNote] = useState("");
  const [touched, setTouched] = useState(false);

  const { clear: clearDraft } = useFormPersistence(
    `prairie-intervention-${selectedClassroom}`,
    { teacherNote },
    useCallback((saved: Partial<{ teacherNote: string }>) => {
      if (saved.teacherNote !== undefined) setTeacherNote(saved.teacherNote);
    }, []),
  );

  useEffect(() => {
    if (prefill) {
      setSelectedStudents([prefill.student_ref]);
    }
  }, [prefill]);

  function toggleStudent(alias: string) {
    setSelectedStudents((prev) =>
      prev.includes(alias)
        ? prev.filter((s) => s !== alias)
        : [...prev, alias],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (selectedStudents.length === 0 || !teacherNote.trim()) return;
    const context = prefill
      ? `Plan suggested: ${prefill.suggested_action} (reason: ${prefill.reason})`
      : undefined;
    onSubmit(selectedClassroom, selectedStudents, teacherNote.trim(), context);
    clearDraft();
  }

  return (
    <Card variant="raised" className="intervention-logger" as="section">
      <Card.Body>
        <form onSubmit={handleSubmit}>
          <h2>Capture Intervention</h2>
          <p className="logger-description form-description">
            Record the students involved, what happened, and the action taken. The note is structured for classroom memory and follow-up review.
          </p>

          {prefill && (
            <div className="logger-context">
              <div className="logger-context-label">From Tomorrow's Plan</div>
              <p>
                <strong>{prefill.student_ref}</strong>: {prefill.reason}
                <br />
                Suggested: {prefill.suggested_action}
              </p>
            </div>
          )}

          <div className="field">
            <label htmlFor="int-classroom">Classroom</label>
            <select
              id="int-classroom"
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

          <div className={`field${touched && selectedStudents.length === 0 ? " field--error" : ""}`}>
            <label>Student(s) <span className="field-required" aria-hidden="true">*</span></label>
            <div
              className="student-checkboxes"
              role="group"
              aria-label="Select students"
              aria-describedby={touched && selectedStudents.length === 0 ? "int-students-error" : undefined}
            >
              {students.map((s) => (
                <label key={s.alias} className="student-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(s.alias)}
                    onChange={() => toggleStudent(s.alias)}
                  />
                  {s.alias}
                </label>
              ))}
            </div>
            {touched && selectedStudents.length === 0 && (
              <span id="int-students-error" className="field-error-hint" role="alert">Select at least one student</span>
            )}
          </div>

          <div className={`field${touched && !teacherNote.trim() ? " field--error" : ""}`}>
            <label htmlFor="int-note">What happened? <span className="field-required" aria-hidden="true">*</span></label>
            <textarea
              id="int-note"
              rows={4}
              placeholder="e.g. 'Ari needed 1:1 support during writing block — used sentence starters and word bank, was able to complete 3 of 5 questions independently by end of period.'"
              value={teacherNote}
              onChange={(e) => setTeacherNote(e.target.value)}
              onBlur={() => setTouched(true)}
              required
              aria-required="true"
              aria-invalid={touched && !teacherNote.trim() ? "true" : undefined}
              aria-describedby={touched && !teacherNote.trim() ? "int-note-error" : undefined}
            />
            {touched && !teacherNote.trim() && (
              <span id="int-note-error" className="field-error-hint" role="alert">An observation is required</span>
            )}
          </div>

          <ActionButton
            variant="primary"
            type="submit"
            loading={loading}
            disabled={selectedStudents.length === 0 || !teacherNote.trim()}
          >
            {loading ? "Structuring Note…" : "Log Intervention"}
          </ActionButton>
        </form>
      </Card.Body>
    </Card>
  );
}
