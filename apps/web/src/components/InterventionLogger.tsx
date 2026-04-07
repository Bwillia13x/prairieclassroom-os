import { useState, useEffect, useCallback } from "react";
import { useFormPersistence } from "../hooks/useFormPersistence";
import type { InterventionPrefill } from "../types";
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
    if (selectedStudents.length === 0 || !teacherNote.trim()) return;
    const context = prefill
      ? `Plan suggested: ${prefill.suggested_action} (reason: ${prefill.reason})`
      : undefined;
    onSubmit(selectedClassroom, selectedStudents, teacherNote.trim(), context);
    clearDraft();
  }

  return (
    <form className="intervention-logger" onSubmit={handleSubmit}>
      <h2>Log Intervention</h2>
      <p className="logger-description">
        Describe what you observed and what you did. The system will structure your note for classroom memory.
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

      <div className="field">
        <label>Student(s)</label>
        <div className="student-checkboxes">
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
      </div>

      <div className="field">
        <label htmlFor="int-note">What happened?</label>
        <textarea
          id="int-note"
          rows={4}
          placeholder="e.g. 'Ari needed 1:1 support during writing block — used sentence starters and word bank, was able to complete 3 of 5 questions independently by end of period.'"
          value={teacherNote}
          onChange={(e) => setTeacherNote(e.target.value)}
        />
      </div>

      <button
        type="submit"
        className="btn btn--primary"
        disabled={loading || selectedStudents.length === 0 || !teacherNote.trim()}
      >
        {loading ? "Structuring Note…" : "Log Intervention"}
      </button>
    </form>
  );
}
