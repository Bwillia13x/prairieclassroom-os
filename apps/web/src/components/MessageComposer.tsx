import { useState, useEffect, useCallback, useId } from "react";
import { useFormPersistence } from "../hooks/useFormPersistence";
import DraftRestoreChip from "./DraftRestoreChip";
import { FormCard } from "./shared";
import type { FamilyMessagePrefill } from "../types";
import "./MessageComposer.css";

interface Props {
  students: { alias: string; family_language?: string }[];
  selectedClassroom: string;
  onSubmit: (
    classroomId: string,
    studentRefs: string[],
    messageType: "routine_update" | "missed_work" | "praise" | "low_stakes_concern",
    targetLanguage: string,
    context?: string,
  ) => void;
  loading: boolean;
  prefill?: FamilyMessagePrefill | null;
}

const MESSAGE_TYPES = [
  { value: "routine_update", label: "Routine Update" },
  { value: "missed_work", label: "Missed Work" },
  { value: "praise", label: "Praise" },
  { value: "low_stakes_concern", label: "Low-Stakes Concern" },
] as const;

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "ar", label: "Arabic" },
  { value: "uk", label: "Ukrainian" },
  { value: "tl", label: "Tagalog" },
  { value: "es", label: "Spanish" },
  { value: "zh", label: "Chinese (Simplified)" },
  { value: "pa", label: "Punjabi" },
] as const;

export default function MessageComposer({
  students,
  selectedClassroom,
  onSubmit,
  loading,
  prefill,
}: Props) {
  const studentListId = useId();
  const [selectedStudents, setSelectedStudents] = useState<string[]>(
    prefill?.student_ref ? [prefill.student_ref] : [],
  );
  const [messageType, setMessageType] = useState<
    "routine_update" | "missed_work" | "praise" | "low_stakes_concern"
  >(
    (prefill?.message_type as
      | "routine_update"
      | "missed_work"
      | "praise"
      | "low_stakes_concern") ?? "routine_update",
  );
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [context, setContext] = useState(prefill?.reason ?? "");
  const [prefillDismissed, setPrefillDismissed] = useState(false);

  const {
    clear: clearDraft,
    restore: restoreDraft,
    dismiss: dismissDraft,
    hasPendingDraft,
  } = useFormPersistence(
    `prairie-message-${selectedClassroom}`,
    { context },
    useCallback((saved: Partial<{ context: string }>) => {
      if (saved.context !== undefined) setContext(saved.context);
    }, []),
    { autoRestore: false, minChars: 20, maxAgeMs: 12 * 60 * 60 * 1000 },
  );

  useEffect(() => {
    if (prefill) {
      setSelectedStudents([prefill.student_ref]);
      setMessageType(
        (prefill.message_type as
          | "routine_update"
          | "missed_work"
          | "praise"
          | "low_stakes_concern") ?? "routine_update",
      );
      setContext(prefill.reason);
      setPrefillDismissed(false);
    }
  }, [prefill]);

  useEffect(() => {
    if (selectedStudents.length === 1) {
      const student = students.find((s) => s.alias === selectedStudents[0]);
      if (student?.family_language) {
        setTargetLanguage(student.family_language);
      }
    }
  }, [selectedStudents, students]);

  function toggleStudent(alias: string) {
    setSelectedStudents((prev) =>
      prev.includes(alias)
        ? prev.filter((student) => student !== alias)
        : [...prev, alias],
    );
  }

  function submitDraft() {
    if (selectedStudents.length === 0) return;
    onSubmit(
      selectedClassroom,
      selectedStudents,
      messageType,
      targetLanguage,
      context.trim() || undefined,
    );
    clearDraft();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitDraft();
  }

  return (
    <FormCard className="message-composer">
      <form onSubmit={handleSubmit}>
        <h2>Compose family message</h2>
        <p className="composer-description form-description">
          Select the student, choose the message type, and review the generated draft before anything leaves this workspace.
        </p>

        <DraftRestoreChip
          show={hasPendingDraft}
          onRestore={restoreDraft}
          onDismiss={dismissDraft}
          label="You had an unsent message drafted. Resume it?"
        />

        {prefill && !prefillDismissed && (
          <div className="prefill-banner">
            <span className="prefill-banner-text">
              Pre-filled from plan: <strong>{prefill.student_ref}</strong> — {prefill.message_type?.replace(/_/g, " ")}
            </span>
            <button className="prefill-banner-dismiss" onClick={() => setPrefillDismissed(true)} aria-label="Dismiss" type="button">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        )}

        <div className={`field${prefill && !prefillDismissed ? " field--prefilled" : ""}`}>
          <span id={`${studentListId}-label`} className="form-label">Students</span>
          <div className="student-checkbox-list" role="group" aria-labelledby={`${studentListId}-label`}>
            {students.map((s) => {
              const selected = selectedStudents.includes(s.alias);
              return (
                <button
                  key={s.alias}
                  type="button"
                  className="student-checkbox"
                  data-testid={`message-student-chip-${s.alias}`}
                  aria-pressed={selected}
                  onClick={() => toggleStudent(s.alias)}
                >
                  <span>{s.alias}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`field${prefill && !prefillDismissed ? " field--prefilled" : ""}`}>
          <label htmlFor="msg-type" className="form-label">Message type</label>
          <select
            id="msg-type"
            value={messageType}
            onChange={(e) => setMessageType(e.target.value as typeof messageType)}
          >
            {MESSAGE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="msg-lang" className="form-label">Language</label>
          <select
            id="msg-lang"
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className={`field${prefill && !prefillDismissed ? " field--prefilled" : ""}`}>
          <label htmlFor="msg-context" className="form-label">
            Context
            <span className="field-optional">(optional)</span>
          </label>
          <textarea
            id="msg-context"
            rows={3}
            placeholder="e.g. 'Ari showed great improvement in reading comprehension this week.'"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || (!e.metaKey && !e.ctrlKey)) return;
              e.preventDefault();
              submitDraft();
            }}
          />
        </div>

        <button
          type="submit"
          className="btn btn--primary"
          disabled={loading}
        >
          {loading ? "Drafting message…" : "Draft family message"}
        </button>
      </form>
    </FormCard>
  );
}
