import { useState, useEffect, useCallback } from "react";
import { useFormPersistence } from "../hooks/useFormPersistence";
import DraftRestoreChip from "./DraftRestoreChip";
import SectionIcon from "./SectionIcon";
import type { InterventionPrefill } from "../types";
import { FormCard, ActionButton, NothingInstrumentButton } from "./shared";
import "./InterventionLogger.css";

interface Props {
  students: { alias: string }[];
  selectedClassroom: string;
  onSubmit: (
    classroomId: string,
    studentRefs: string[],
    teacherNote: string,
    context?: string,
  ) => void;
  loading: boolean;
  prefill?: InterventionPrefill | null;
  /**
   * Role gating — when false, the form still renders but the submit is
   * disabled. Reading the form is still useful for reviewers even
   * though they can't post. Defaults to true. 2026-04-19 OPS audit
   * phase 7.4.
   */
  canSubmit?: boolean;
}

export default function InterventionLogger({
  students,
  selectedClassroom,
  onSubmit,
  loading,
  prefill,
  canSubmit: canSubmitProp = true,
}: Props) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>(
    prefill ? [prefill.student_ref] : [],
  );
  const [teacherNote, setTeacherNote] = useState("");
  const [touched, setTouched] = useState(false);

  const {
    clear: clearDraft,
    restore: restoreDraft,
    dismiss: dismissDraft,
    hasPendingDraft,
  } = useFormPersistence(
    `prairie-intervention-${selectedClassroom}`,
    { teacherNote },
    useCallback((saved: Partial<{ teacherNote: string }>) => {
      if (saved.teacherNote !== undefined) setTeacherNote(saved.teacherNote);
    }, []),
    { autoRestore: false, minChars: 20, maxAgeMs: 12 * 60 * 60 * 1000 },
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

  const submitDisabled =
    !canSubmitProp || selectedStudents.length === 0 || !teacherNote.trim();

  return (
    <FormCard className="intervention-logger" as="section">
      <form onSubmit={handleSubmit}>
        <h2>Capture intervention</h2>
        <p className="logger-description form-description">
          Record the students involved, what happened, and the action taken. The note is structured for classroom memory and follow-up review.
        </p>

        <DraftRestoreChip
          show={hasPendingDraft}
          onRestore={restoreDraft}
          onDismiss={dismissDraft}
          label="Pick up your intervention note where you left off?"
        />

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

        <div className={`field${touched && selectedStudents.length === 0 ? " field--error" : ""}`}>
          <label className="form-label">Student(s) <span className="field-required" aria-hidden="true">*</span></label>
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
          <label htmlFor="int-note" className="form-label">What happened? <span className="field-required" aria-hidden="true">*</span></label>
          <textarea
            id="int-note"
            rows={4}
            placeholder="e.g. 'Ari needed 1:1 support during writing block — used sentence starters and word bank, was able to complete 3 of 5 questions independently by end of period.'"
            value={teacherNote}
            onChange={(e) => setTeacherNote(e.target.value)}
            onBlur={() => setTouched(true)}
            required
            aria-required="true"
            aria-describedby={touched && !teacherNote.trim() ? "int-note-error" : undefined}
          />
          {touched && !teacherNote.trim() && (
            <span id="int-note-error" className="field-error-hint" role="alert">An observation is required</span>
          )}
        </div>

        <div className="intervention-logger__actions">
          <ActionButton
            variant="primary"
            type="submit"
            loading={loading}
            disabled={submitDisabled}
          >
            {loading ? "Structuring note…" : "Log intervention"}
          </ActionButton>

          <NothingInstrumentButton
            aria-label={loading ? "Logging intervention note" : "Log intervention note"}
            fireAnim="signal"
            tone="success"
            size="lg"
            type="submit"
            loading={loading}
            disabled={submitDisabled}
            className="intervention-logger__submit-instrument"
            data-testid="intervention-logger-submit-instrument"
          >
            <SectionIcon name="check" />
          </NothingInstrumentButton>
        </div>
      </form>
    </FormCard>
  );
}
