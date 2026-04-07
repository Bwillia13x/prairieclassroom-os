import { useState, useCallback } from "react";
import { useFormPersistence } from "../hooks/useFormPersistence";
import type { LessonArtifact } from "../types";
import FileUploadZone from "./FileUploadZone";
import "./ArtifactUpload.css";

interface Props {
  classrooms: { classroom_id: string; grade_band: string; subject_focus: string }[];
  selectedClassroom: string;
  onClassroomChange: (id: string) => void;
  onSubmit: (artifact: LessonArtifact, classroomId: string) => void;
  loading: boolean;
}

export default function ArtifactUpload({
  classrooms,
  selectedClassroom,
  onClassroomChange,
  onSubmit,
  loading,
}: Props) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [rawText, setRawText] = useState("");
  const [teacherGoal, setTeacherGoal] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { clear: clearDraft } = useFormPersistence(
    `prairie-artifact-${selectedClassroom}`,
    { title, subject, rawText, teacherGoal },
    useCallback((saved: Partial<{ title: string; subject: string; rawText: string; teacherGoal: string }>) => {
      if (saved.title !== undefined) setTitle(saved.title);
      if (saved.subject !== undefined) setSubject(saved.subject);
      if (saved.rawText !== undefined) setRawText(saved.rawText);
      if (saved.teacherGoal !== undefined) setTeacherGoal(saved.teacherGoal);
    }, []),
  );

  function handleFileExtracted(text: string, filename: string) {
    setRawText(text);
    if (!title.trim()) {
      setTitle(filename.replace(/\.(txt|pdf)$/, ""));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !rawText.trim()) return;

    const artifact: LessonArtifact = {
      artifact_id: `artifact-${Date.now()}`,
      title: title.trim(),
      subject: subject.trim() || "general",
      source_type: "text",
      raw_text: rawText.trim(),
      teacher_goal: teacherGoal.trim() || undefined,
    };

    onSubmit(artifact, selectedClassroom);
    clearDraft();
  }

  return (
    <form className="artifact-upload" onSubmit={handleSubmit}>
      <h2>Upload Lesson Artifact</h2>

      <div className="field">
        <label htmlFor="classroom">Classroom</label>
        <select
          id="classroom"
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

      <div className={`field${touched.title && !title.trim() ? " field--error" : ""}`}>
        <label htmlFor="title">Artifact Title</label>
        <input
          id="title"
          type="text"
          placeholder="e.g. Community Helpers Reading Passage"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, title: true }))}
          aria-describedby={touched.title && !title.trim() ? "title-error" : undefined}
          aria-invalid={touched.title && !title.trim() ? true : undefined}
          required
        />
        {touched.title && !title.trim() && (
          <span id="title-error" className="field-error-hint">Title is required</span>
        )}
      </div>

      <div className="field">
        <label htmlFor="subject">Subject</label>
        <input
          id="subject"
          type="text"
          placeholder="e.g. literacy, math, science"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className={`field${touched.rawText && !rawText.trim() ? " field--error" : ""}`}>
        <label htmlFor="raw-text">Lesson Content</label>
        <FileUploadZone onTextExtracted={handleFileExtracted} />
        <p className="field-divider">or paste text directly</p>
        <textarea
          id="raw-text"
          rows={6}
          placeholder="Paste or type the lesson content, worksheet text, or instructions…"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, rawText: true }))}
          aria-describedby={touched.rawText && !rawText.trim() ? "rawtext-error" : undefined}
          aria-invalid={touched.rawText && !rawText.trim() ? true : undefined}
          required
        />
        {touched.rawText && !rawText.trim() && (
          <span id="rawtext-error" className="field-error-hint">Lesson content is required</span>
        )}
      </div>

      <div className="field">
        <label htmlFor="teacher-goal">Teacher Goal (optional)</label>
        <textarea
          id="teacher-goal"
          rows={2}
          placeholder="What do you want from differentiation? e.g. 'Simplify for EAL, add extension for strong readers'"
          value={teacherGoal}
          onChange={(e) => setTeacherGoal(e.target.value)}
        />
      </div>

      <button type="submit" className="btn btn--primary" disabled={loading}>
        {loading ? "Differentiating…" : "Differentiate"}
      </button>
    </form>
  );
}
