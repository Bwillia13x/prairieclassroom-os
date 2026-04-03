import { useState } from "react";
import type { LessonArtifact } from "../types";
import "./ArtifactUpload.css";

interface Props {
  classrooms: { classroom_id: string; grade_band: string; subject_focus: string }[];
  onSubmit: (artifact: LessonArtifact, classroomId: string) => void;
  loading: boolean;
}

export default function ArtifactUpload({ classrooms, onSubmit, loading }: Props) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [rawText, setRawText] = useState("");
  const [teacherGoal, setTeacherGoal] = useState("");
  const [classroomId, setClassroomId] = useState(classrooms[0]?.classroom_id ?? "");

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

    onSubmit(artifact, classroomId);
  }

  return (
    <form className="artifact-upload" onSubmit={handleSubmit}>
      <h2>Upload Lesson Artifact</h2>

      <div className="field">
        <label htmlFor="classroom">Classroom</label>
        <select
          id="classroom"
          value={classroomId}
          onChange={(e) => setClassroomId(e.target.value)}
        >
          {classrooms.map((c) => (
            <option key={c.classroom_id} value={c.classroom_id}>
              Grade {c.grade_band} — {c.subject_focus.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="title">Artifact Title</label>
        <input
          id="title"
          type="text"
          placeholder="e.g. Community Helpers Reading Passage"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
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

      <div className="field">
        <label htmlFor="raw-text">Lesson Content</label>
        <textarea
          id="raw-text"
          rows={6}
          placeholder="Paste or type the lesson content, worksheet text, or instructions…"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          required
        />
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

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Differentiating…" : "Differentiate"}
      </button>
    </form>
  );
}
