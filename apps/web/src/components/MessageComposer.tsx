import { useState, useEffect } from "react";
import type { FamilyMessagePrefill } from "../types";
import "./MessageComposer.css";

interface Props {
  classrooms: { classroom_id: string; grade_band: string; subject_focus: string }[];
  students: { alias: string }[];
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
  const [studentRef, setStudentRef] = useState(
    prefill?.student_ref ?? students[0]?.alias ?? "",
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

  useEffect(() => {
    if (prefill) {
      setStudentRef(prefill.student_ref);
      setMessageType(
        (prefill.message_type as
          | "routine_update"
          | "missed_work"
          | "praise"
          | "low_stakes_concern") ?? "routine_update",
      );
      setContext(prefill.reason);
    }
  }, [prefill]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentRef) return;
    onSubmit(
      selectedClassroom,
      [studentRef],
      messageType,
      targetLanguage,
      context.trim() || undefined,
    );
  }

  return (
    <form className="message-composer" onSubmit={handleSubmit}>
      <h2>Family Message</h2>
      <p className="composer-description">
        Draft a plain-language family message. You must review and approve before copying.
      </p>

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

      <div className="field">
        <label htmlFor="msg-student">Student</label>
        <select
          id="msg-student"
          value={studentRef}
          onChange={(e) => setStudentRef(e.target.value)}
        >
          {students.map((s) => (
            <option key={s.alias} value={s.alias}>
              {s.alias}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
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

      <div className="field">
        <label htmlFor="msg-context">Context (optional)</label>
        <textarea
          id="msg-context"
          rows={3}
          placeholder="e.g. 'Ari showed great improvement in reading comprehension this week.'"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Drafting Message…" : "Draft Family Message"}
      </button>
    </form>
  );
}
