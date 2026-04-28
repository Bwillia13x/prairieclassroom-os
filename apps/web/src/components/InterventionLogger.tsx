import { useState, useEffect, useCallback } from "react";
import { useFormPersistence } from "../hooks/useFormPersistence";
import DraftRestoreChip from "./DraftRestoreChip";
import SectionIcon from "./SectionIcon";
import type { InterventionPrefill } from "../types";
import { FormCard, ActionButton, NothingInstrumentButton } from "./shared";
import "./InterventionLogger.css";

export interface InterventionLoggerDraft {
  selectedStudents: string[];
  teacherNote: string;
  followUpNeeded: boolean;
  followUpTiming: string;
  memoryDestination: string;
}

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
  variant?: "standard" | "ops-workflow";
  focusStudentAlias?: string | null;
  onDraftChange?: (draft: InterventionLoggerDraft) => void;
}

export default function InterventionLogger({
  students,
  selectedClassroom,
  onSubmit,
  loading,
  prefill,
  canSubmit: canSubmitProp = true,
  variant = "standard",
  focusStudentAlias,
  onDraftChange,
}: Props) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>(
    prefill ? [prefill.student_ref] : [],
  );
  const [teacherNote, setTeacherNote] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [followUpNeeded, setFollowUpNeeded] = useState(true);
  const [followUpTiming, setFollowUpTiming] = useState("Tomorrow morning");
  const [memoryDestination, setMemoryDestination] = useState("Classroom memory + student thread");
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

  useEffect(() => {
    if (!prefill && focusStudentAlias) {
      setSelectedStudents((prev) =>
        prev.includes(focusStudentAlias) ? prev : [focusStudentAlias],
      );
    }
  }, [focusStudentAlias, prefill]);

  useEffect(() => {
    onDraftChange?.({
      selectedStudents,
      teacherNote,
      followUpNeeded,
      followUpTiming,
      memoryDestination,
    });
  }, [
    followUpNeeded,
    followUpTiming,
    memoryDestination,
    onDraftChange,
    selectedStudents,
    teacherNote,
  ]);

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
    const contextParts = [
      prefill
        ? `Plan suggested: ${prefill.suggested_action} (reason: ${prefill.reason})`
        : null,
      `Follow-up needed: ${followUpNeeded ? `yes (${followUpTiming})` : "no"}`,
      `Memory destination: ${memoryDestination}`,
    ].filter(Boolean);
    const context = contextParts.length > 0 ? contextParts.join("\n") : undefined;
    onSubmit(selectedClassroom, selectedStudents, teacherNote.trim(), context);
    clearDraft();
  }

  function handleCancel() {
    setTeacherNote("");
    setSelectedStudents(
      prefill ? [prefill.student_ref] : focusStudentAlias ? [focusStudentAlias] : [],
    );
    setFollowUpNeeded(true);
    setFollowUpTiming("Tomorrow morning");
    setMemoryDestination("Classroom memory + student thread");
    setTouched(false);
    clearDraft();
  }

  const submitDisabled =
    !canSubmitProp || selectedStudents.length === 0 || !teacherNote.trim();
  const filteredStudents = students.filter((student) =>
    student.alias.toLowerCase().includes(studentQuery.trim().toLowerCase()),
  );
  const isOpsWorkflow = variant === "ops-workflow";

  return (
    <FormCard className={`intervention-logger intervention-logger--${variant}`} as="section">
      <form onSubmit={handleSubmit}>
        <header className="intervention-logger__header">
          {isOpsWorkflow ? <span className="intervention-logger__eyebrow">Active state</span> : null}
          <h2>{isOpsWorkflow ? "Log Intervention Notes" : "Capture intervention"}</h2>
          <p className="logger-description form-description">
            {isOpsWorkflow
              ? "Capture the evidence, follow-up timing, and memory destination before the details get fuzzy."
              : "Record the students involved, what happened, and the action taken. The note is structured for classroom memory and follow-up review."}
          </p>
        </header>

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

        {isOpsWorkflow ? (
          <div className="intervention-logger__selected-strip" aria-live="polite">
            <span className="intervention-logger__selected-label">Roster selection</span>
            <div className="intervention-logger__selected-list">
              {selectedStudents.length > 0 ? (
                selectedStudents.map((alias) => (
                  <button
                    key={alias}
                    type="button"
                    className="intervention-logger__selected-chip"
                    onClick={() => toggleStudent(alias)}
                    aria-label={`Remove ${alias}`}
                  >
                    {alias}
                  </button>
                ))
              ) : (
                <span className="intervention-logger__selected-empty">No students selected</span>
              )}
            </div>
          </div>
        ) : null}

        {isOpsWorkflow ? (
          <div className="field intervention-logger__search-field">
            <label htmlFor="int-roster-search" className="form-label">Search roster</label>
            <input
              id="int-roster-search"
              type="search"
              value={studentQuery}
              onChange={(event) => setStudentQuery(event.target.value)}
              placeholder="Find a student alias"
              autoComplete="off"
            />
          </div>
        ) : null}

        <div className={`field${touched && selectedStudents.length === 0 ? " field--error" : ""}`}>
          <label className="form-label">Student(s) <span className="field-required" aria-hidden="true">*</span></label>
          <div
            className={`student-checkboxes${isOpsWorkflow ? " student-checkboxes--ops" : ""}`}
            role="group"
            aria-label="Select students"
            aria-describedby={touched && selectedStudents.length === 0 ? "int-students-error" : undefined}
          >
            {filteredStudents.map((s) => (
              <label key={s.alias} className="student-checkbox">
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(s.alias)}
                  onChange={() => toggleStudent(s.alias)}
                />
                {s.alias}
              </label>
            ))}
            {filteredStudents.length === 0 ? (
              <span className="intervention-logger__no-results">No matching aliases</span>
            ) : null}
          </div>
          {touched && selectedStudents.length === 0 && (
            <span id="int-students-error" className="field-error-hint" role="alert">Select at least one student</span>
          )}
        </div>

        <div className={`field${touched && !teacherNote.trim() ? " field--error" : ""}`}>
          <label htmlFor="int-note" className="form-label">
            {isOpsWorkflow ? "Evidence note (what happened?)" : "What happened?"}
            {" "}
            <span className="field-required" aria-hidden="true">*</span>
          </label>
          <textarea
            id="int-note"
            rows={isOpsWorkflow ? 6 : 4}
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

        {isOpsWorkflow ? (
          <div className="intervention-logger__coordination-grid">
            <div className="field">
              <label htmlFor="int-follow-up-needed" className="form-label">Follow-up needed</label>
              <select
                id="int-follow-up-needed"
                value={followUpNeeded ? "yes" : "no"}
                onChange={(event) => setFollowUpNeeded(event.target.value === "yes")}
              >
                <option value="yes">Yes, keep it visible</option>
                <option value="no">No, record only</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="int-follow-up-timing" className="form-label">Follow-up timing</label>
              <select
                id="int-follow-up-timing"
                value={followUpTiming}
                onChange={(event) => setFollowUpTiming(event.target.value)}
                disabled={!followUpNeeded}
              >
                <option>Tomorrow morning</option>
                <option>Next class block</option>
                <option>Before dismissal</option>
                <option>Within the week</option>
              </select>
            </div>

            <div className="field intervention-logger__destination-field">
              <label htmlFor="int-memory-destination" className="form-label">Classroom memory destination</label>
              <select
                id="int-memory-destination"
                value={memoryDestination}
                onChange={(event) => setMemoryDestination(event.target.value)}
              >
                <option>Classroom memory + student thread</option>
                <option>Follow-up queue only</option>
                <option>EA briefing context</option>
                <option>Sub packet watchpoint</option>
              </select>
            </div>
          </div>
        ) : null}

        <div className="intervention-logger__actions">
          {isOpsWorkflow ? (
            <ActionButton
              variant="ghost"
              type="button"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </ActionButton>
          ) : null}
          <ActionButton
            variant="primary"
            type="submit"
            loading={loading}
            disabled={submitDisabled}
          >
            {loading
              ? "Structuring note…"
              : isOpsWorkflow
                ? "Save note & continue"
                : "Log intervention"}
          </ActionButton>

          {!isOpsWorkflow ? (
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
          ) : null}
        </div>
      </form>
    </FormCard>
  );
}
