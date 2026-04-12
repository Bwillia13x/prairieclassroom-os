import { useState, useEffect, useCallback } from "react";
import { useFormPersistence } from "../hooks/useFormPersistence";
import type { FamilyMessagePrefill } from "../types";
import "./MessageComposer.css";

interface Props {
  classrooms: { classroom_id: string; grade_band: string; subject_focus: string }[];
  students: { alias: string; family_language?: string }[];
  selectedClassroom: string;
  onClassroomChange: (id: string) => void;
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
  classrooms,
  students,
  selectedClassroom,
  onClassroomChange,
  onSubmit,
  loading,
  prefill,
}: Props) {
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

  const { clear: clearDraft } = useFormPersistence(
    `prairie-message-${selectedClassroom}`,
    { context },
    useCallback((saved: Partial<{ context: string }>) => {
      if (saved.context !== undefined) setContext(saved.context);
    }, []),
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

  return (
    <form className="message-composer form-panel" onSubmit={handleSubmit}>
      <h2>Compose Family Message</h2>
      <p className="composer-description form-description">
        Select the student, choose the message type, and review the generated draft before anything leaves this workspace.
      </p>

      {prefill && !prefillDismissed && (
        <div className="prefill-banner">
          <span className="prefill-banner-text">
            Pre-filled from plan: <strong>{prefill.student_ref}</strong> — {prefill.message_type?.replace(/_/g, " ")}
          </span>
          <button className="prefill-banner-dismiss" onClick={() => setPrefillDismissed(true)} aria-label="Dismiss" type="button">
            &times;
          </button>
        </div>
      )}

      <div className="field">
        <label htmlFor="msg-classroom">Classroom</label>
        <select
          id="msg-classroom"
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

      <div className={`field${prefill && !prefillDismissed ? " field--prefilled" : ""}`}>
        <label>Students</label>
        <div className="student-checkbox-list">
          {students.map((s) => (
            <label key={s.alias} className="student-checkbox">
              <input
                type="checkbox"
                checked={selectedStudents.includes(s.alias)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedStudents((prev) => [...prev, s.alias]);
                  } else {
                    setSelectedStudents((prev) => prev.filter((r) => r !== s.alias));
                  }
                }}
              />
              <span>{s.alias}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={`field${prefill && !prefillDismissed ? " field--prefilled" : ""}`}>
        <label htmlFor="msg-type">Message Type</label>
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
        <label htmlFor="msg-lang">Language</label>
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
        <label htmlFor="msg-context">
          Context
          <span className="field-optional">(optional)</span>
        </label>
        <textarea
          id="msg-context"
          rows={3}
          placeholder="e.g. 'Ari showed great improvement in reading comprehension this week.'"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
      </div>

      <button type="submit" className="btn btn--primary" disabled={loading}>
        {loading ? "Drafting Message…" : "Draft Family Message"}
      </button>
    </form>
  );
}
