import { useState, useCallback, type Ref } from "react";
import { useFormPersistence } from "../hooks/useFormPersistence";
import type { CurriculumEntry, CurriculumSelection, LessonArtifact } from "../types";
import FileUploadZone from "./FileUploadZone";
import WorksheetUpload from "./WorksheetUpload";
import CurriculumPicker from "./CurriculumPicker";
import { Card, ActionButton } from "./shared";
import "./ArtifactUpload.css";

type ArtifactSourceMode = "photo" | "file" | "paste";

interface Props {
  classrooms: { classroom_id: string; grade_band: string; subject_focus: string }[];
  selectedClassroom: string;
  onClassroomChange: (id: string) => void;
  onSubmit: (artifact: LessonArtifact, classroomId: string, curriculumSelection: CurriculumSelection | null) => void;
  loading: boolean;
  formRef?: Ref<HTMLFormElement>;
}

export default function ArtifactUpload({
  classrooms,
  selectedClassroom,
  onClassroomChange,
  onSubmit,
  loading,
  formRef,
}: Props) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [rawText, setRawText] = useState("");
  const [teacherGoal, setTeacherGoal] = useState("");
  const [curriculumSelection, setCurriculumSelection] = useState<CurriculumSelection | null>(null);
  const [curriculumSuggestions, setCurriculumSuggestions] = useState<CurriculumEntry[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [sourceMode, setSourceMode] = useState<ArtifactSourceMode>("photo");
  const selectedClassroomProfile = classrooms.find((classroom) => classroom.classroom_id === selectedClassroom);

  const { clear: clearDraft } = useFormPersistence(
    `prairie-artifact-${selectedClassroom}`,
    { title, subject, rawText, teacherGoal, curriculumSelection },
    useCallback((saved: Partial<{
      title: string;
      subject: string;
      rawText: string;
      teacherGoal: string;
      curriculumSelection: CurriculumSelection | null;
    }>) => {
      if (saved.title !== undefined) setTitle(saved.title);
      if (saved.subject !== undefined) setSubject(saved.subject);
      if (saved.rawText !== undefined) setRawText(saved.rawText);
      if (saved.teacherGoal !== undefined) setTeacherGoal(saved.teacherGoal);
      if (saved.curriculumSelection !== undefined) setCurriculumSelection(saved.curriculumSelection);
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
    if (!title.trim() || !rawText.trim()) {
      setTouched((current) => ({ ...current, title: true, rawText: true }));
      return;
    }

    const artifact: LessonArtifact = {
      artifact_id: `artifact-${Date.now()}`,
      title: title.trim(),
      subject: subject.trim() || "general",
      source_type: "text",
      raw_text: rawText.trim(),
      teacher_goal: teacherGoal.trim() || undefined,
    };

    onSubmit(artifact, selectedClassroom, curriculumSelection);
    clearDraft();
  }

  return (
    <Card variant="raised" tone="sage" className="artifact-upload">
    <Card.Body>
    <form className="artifact-upload__form" onSubmit={handleSubmit} ref={formRef}>
      <h2>Prepare Lesson Artifact</h2>
      <p className="form-description">
        Choose the classroom first, then bring in one artifact through a single intake path. The result canvas will organize differentiated versions around this source.
      </p>

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
        <label htmlFor="raw-text">Artifact Source</label>
        <div className="artifact-source-switcher" role="tablist" aria-label="Artifact input method">
          {[
            { id: "photo", label: "Photo" },
            { id: "file", label: "File" },
            { id: "paste", label: "Paste" },
          ].map((mode) => (
            <button
              key={mode.id}
              className={`artifact-source-switcher__tab${sourceMode === mode.id ? " artifact-source-switcher__tab--active" : ""}`}
              type="button"
              role="tab"
              aria-selected={sourceMode === mode.id}
              onClick={() => setSourceMode(mode.id as ArtifactSourceMode)}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="artifact-source-panel">
          {sourceMode === "photo" ? (
            <WorksheetUpload
              classroomId={selectedClassroom}
              onTextExtracted={(text) => {
                setRawText(text);
                if (!title.trim()) setTitle("Extracted Worksheet");
              }}
              onCurriculumSuggested={(entries) => setCurriculumSuggestions(entries)}
            />
          ) : null}

          {sourceMode === "file" ? (
            <FileUploadZone onTextExtracted={handleFileExtracted} />
          ) : null}

          {sourceMode === "paste" ? (
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
          ) : null}

          {sourceMode !== "paste" && rawText.trim() ? (
            <p className="artifact-source-panel__status">
              Source text captured. Switch to <strong>Paste</strong> if you want to review or edit the extracted content before running differentiation.
            </p>
          ) : null}
        </div>

        {touched.rawText && !rawText.trim() && (
          <span id="rawtext-error" className="field-error-hint">Lesson content is required</span>
        )}
      </div>

      <div className="field">
        <label htmlFor="teacher-goal">
          Instructional Focus
          <span className="field-optional">(optional)</span>
        </label>
        <textarea
          id="teacher-goal"
          rows={2}
          placeholder="What do you want from differentiation? e.g. 'Simplify for EAL, add extension for strong readers'"
          value={teacherGoal}
          onChange={(e) => setTeacherGoal(e.target.value)}
        />
      </div>

      <CurriculumPicker
        value={curriculumSelection}
        onChange={setCurriculumSelection}
        subjectHint={subject || selectedClassroomProfile?.subject_focus}
        gradeHint={selectedClassroomProfile?.grade_band}
        suggestedEntries={curriculumSuggestions}
      />

      <ActionButton
        type="submit"
        variant="primary"
        size="lg"
        loading={loading}
        fullWidth
      >
        {loading ? "Differentiating…" : "Differentiate"}
      </ActionButton>
    </form>
    </Card.Body>
    </Card>
  );
}
