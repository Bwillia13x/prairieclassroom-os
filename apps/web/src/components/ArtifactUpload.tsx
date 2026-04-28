import { useState, useCallback, type Ref } from "react";
import { useFormPersistence } from "../hooks/useFormPersistence";
import type { ClassroomProfile, CurriculumEntry, CurriculumSelection, LessonArtifact } from "../types";
import FileUploadZone from "./FileUploadZone";
import WorksheetUpload from "./WorksheetUpload";
import CurriculumPicker from "./CurriculumPicker";
import DraftRestoreChip from "./DraftRestoreChip";
import { FormCard, ActionButton } from "./shared";
import "./ArtifactUpload.css";

type ArtifactSourceMode = "file" | "paste" | "link";

interface Props {
  classrooms: { classroom_id: string; grade_band: string; subject_focus: string }[];
  selectedClassroom: string;
  classroomProfile?: ClassroomProfile | null;
  onSubmit: (artifact: LessonArtifact, classroomId: string, curriculumSelection: CurriculumSelection | null) => void;
  loading: boolean;
  formRef?: Ref<HTMLFormElement>;
}

export default function ArtifactUpload({
  classrooms,
  selectedClassroom,
  classroomProfile,
  onSubmit,
  loading,
  formRef,
}: Props) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [rawText, setRawText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceLabel, setSourceLabel] = useState("No source attached yet");
  const [teacherGoal, setTeacherGoal] = useState("");
  const [curriculumSelection, setCurriculumSelection] = useState<CurriculumSelection | null>(null);
  const [curriculumSuggestions, setCurriculumSuggestions] = useState<CurriculumEntry[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [sourceMode, setSourceMode] = useState<ArtifactSourceMode>("file");
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const selectedClassroomProfile = classrooms.find((classroom) => classroom.classroom_id === selectedClassroom);
  const readinessGroups = getReadinessGroups(classroomProfile);

  const {
    clear: clearDraft,
    restore: restoreDraft,
    dismiss: dismissDraft,
    hasPendingDraft,
  } = useFormPersistence(
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
    { autoRestore: false, minChars: 20, maxAgeMs: 12 * 60 * 60 * 1000 },
  );

  function handleFileExtracted(text: string, filename: string) {
    setRawText(text);
    setSourceLabel(filename);
    if (!title.trim()) {
      setTitle(filename.replace(/\.(txt|pdf)$/, ""));
    }
  }

  function handleWorksheetText(text: string) {
    setRawText(text);
    setSourceLabel("Worksheet photo extraction");
    if (!title.trim()) setTitle("Extracted Worksheet");
  }

  function handleSourceUrlChange(value: string) {
    setSourceUrl(value);
    setRawText(value.trim() ? `Source URL: ${value.trim()}` : "");
    setSourceLabel(value.trim() || "Web source");
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
    <FormCard className="artifact-upload">
    <form className="artifact-upload__form" onSubmit={handleSubmit} ref={formRef}>
      <div className="artifact-upload__header">
        <div className="artifact-upload__header-copy">
          <span className="artifact-upload__eyebrow">Artifact intake</span>
          <h2>Start with what you have</h2>
          <p className="form-description">
            Bring in one artifact and PrairieClassroom will organize classroom-ready variants around the same outcome.
          </p>
        </div>
      </div>
      <p className="artifact-upload__legend">
        <span aria-hidden="true">*</span> Required
      </p>

      <DraftRestoreChip
        show={hasPendingDraft}
        onRestore={restoreDraft}
        onDismiss={dismissDraft}
        label="Resume the lesson artifact you were setting up?"
      />

      <section className={`artifact-upload__section field${touched.rawText && !rawText.trim() ? " field--error" : ""}`}>
        <label htmlFor="raw-text" className="form-label">
          Artifact source
          <span className="field-required" aria-hidden="true">*</span>
        </label>
        <div className="artifact-source-switcher" role="tablist" aria-label="Artifact input method">
          {[
            { id: "file", label: "Upload file", hint: "PDF or Word text" },
            { id: "paste", label: "Paste text", hint: "Paste text directly" },
            { id: "link", label: "Web link", hint: "Add a URL" },
          ].map((mode) => (
            <button
              key={mode.id}
              className={`artifact-source-switcher__tab${sourceMode === mode.id ? " artifact-source-switcher__tab--active" : ""}`}
              type="button"
              role="tab"
              aria-selected={sourceMode === mode.id}
              onClick={() => setSourceMode(mode.id as ArtifactSourceMode)}
            >
              <span className="artifact-source-switcher__label">{mode.label}</span>
              <span className="artifact-source-switcher__hint">{mode.hint}</span>
            </button>
          ))}
        </div>

        <div className="artifact-source-panel">
          {sourceMode === "file" ? (
            <>
              <FileUploadZone onTextExtracted={handleFileExtracted} />
              <details className="artifact-upload__worksheet-scan">
                <summary>Scan worksheet photo <span>Photo of a worksheet</span></summary>
                <WorksheetUpload
                  classroomId={selectedClassroom}
                  onTextExtracted={handleWorksheetText}
                  onCurriculumSuggested={(entries) => setCurriculumSuggestions(entries)}
                />
              </details>
            </>
          ) : null}

          {sourceMode === "paste" ? (
            <textarea
              id="raw-text"
              rows={6}
              placeholder="Paste or type the lesson content, worksheet text, or instructions…"
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setSourceLabel(e.target.value.trim() ? "Pasted source text" : "No source attached yet");
              }}
              onBlur={() => setTouched((t) => ({ ...t, rawText: true }))}
              aria-describedby={touched.rawText && !rawText.trim() ? "rawtext-error" : undefined}
              aria-invalid={touched.rawText && !rawText.trim() ? true : undefined}
              required
            />
          ) : null}

          {sourceMode === "link" ? (
            <div className="artifact-upload__link-source">
              <label htmlFor="source-url" className="form-label">Source URL</label>
              <input
                id="source-url"
                type="url"
                placeholder="https://..."
                value={sourceUrl}
                onChange={(e) => handleSourceUrlChange(e.target.value)}
              />
              <p>
                Add the URL for provenance, then paste the relevant passage or instructions if the page requires sign-in.
              </p>
            </div>
          ) : null}

          {rawText.trim() ? (
            <div className="artifact-source-panel__status" aria-live="polite">
              <span className="artifact-source-panel__status-icon">{sourceMode === "paste" ? "TXT" : sourceMode === "link" ? "URL" : "SRC"}</span>
              <span>
                <strong>{sourceLabel}</strong>
                <small>{estimatePages(rawText)} pages · {formatBytes(rawText.length)}</small>
              </span>
              <button type="button" onClick={() => { setRawText(""); setSourceLabel("No source attached yet"); }}>
                Remove
              </button>
            </div>
          ) : null}
        </div>

        {touched.rawText && !rawText.trim() && (
          <span id="rawtext-error" className="field-error-hint">Lesson content is required</span>
        )}
      </section>

      <section className="artifact-upload__section artifact-upload__context" aria-label="Curriculum context">
        <div className="artifact-upload__section-heading">
          <h3>Curriculum context</h3>
        </div>
        <div className={`field${touched.title && !title.trim() ? " field--error" : ""}`}>
          <label htmlFor="title" className="form-label">
            Artifact title
            <span className="field-required" aria-hidden="true">*</span>
          </label>
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

        <div className="artifact-upload__context-grid">
          <div className="field">
            <label htmlFor="subject" className="form-label">Subject</label>
            <input
              id="subject"
              type="text"
              placeholder="e.g. literacy, math, science"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="artifact-upload__context-card">
            <span>Curriculum</span>
            <strong>Alberta Program of Studies</strong>
          </div>

          <div className="artifact-upload__context-card artifact-upload__context-card--wide">
            <span>Class profile</span>
            <strong>
              {classroomProfile?.students.length
                ? `${classroomProfile.students.length} students · mixed readiness`
                : "Mixed readiness"}
            </strong>
          </div>
        </div>

      <div className="field">
        <label htmlFor="teacher-goal" className="form-label">
          Outcome focus
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

      <div className="artifact-upload__advanced">
        <button
          type="button"
          className="artifact-upload__advanced-toggle"
          aria-expanded={curriculumOpen}
          onClick={() => setCurriculumOpen((v) => !v)}
        >
          Alberta Curriculum Alignment
          <span aria-hidden="true">{curriculumOpen ? "−" : "+"}</span>
        </button>
        {curriculumOpen ? (
          <CurriculumPicker
            value={curriculumSelection}
            onChange={setCurriculumSelection}
            subjectHint={subject || selectedClassroomProfile?.subject_focus}
            gradeHint={selectedClassroomProfile?.grade_band}
            suggestedEntries={curriculumSuggestions}
          />
        ) : null}
      </div>
      </section>

      <section className="artifact-upload__section artifact-readiness" aria-label="Student readiness controls">
        <div className="artifact-upload__section-heading artifact-upload__section-heading--inline">
          <h3>Student readiness</h3>
          <span>{classroomProfile?.students.length ?? "—"} students</span>
        </div>
        <div className="artifact-readiness__grid">
          {readinessGroups.map((group) => (
            <div
              className={`artifact-readiness__card artifact-readiness__card--${group.tone}`}
              key={group.label}
            >
              <strong>{group.label}</strong>
              <span>{group.countLabel}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="artifact-upload__section artifact-output-includes" aria-label="Output includes">
        <div className="artifact-upload__section-heading">
          <h3>Output includes</h3>
        </div>
        <ul className="artifact-output-includes__list">
          <li>
            <span>Four readiness lanes</span>
            <strong>Same goal</strong>
          </li>
          <li>
            <span>Teacher notes</span>
            <strong>Included</strong>
          </li>
          <li>
            <span>Materials list</span>
            <strong>Included</strong>
          </li>
        </ul>
      </section>

      <ActionButton
        type="submit"
        variant="primary"
        size="lg"
        loading={loading}
        fullWidth
        className="artifact-upload__submit"
        aria-label="Generate variants"
      >
        {loading ? "Generating variants…" : "Generate lesson variants"}
      </ActionButton>
    </form>
    </FormCard>
  );
}

function estimatePages(text: string): number {
  return Math.max(1, Math.ceil(text.trim().length / 1800));
}

function formatBytes(chars: number): string {
  const bytes = chars * 2;
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.round(bytes / 1024)} KB`;
}

function getReadinessGroups(classroomProfile?: ClassroomProfile | null) {
  const students = classroomProfile?.students ?? [];
  const total = students.length;
  const eal = students.filter((student) => student.eal_flag).length;
  const tagged = students.filter((student) => (student.support_tags ?? []).length > 0).length;
  const extension = students.filter((student) =>
    (student.support_tags ?? []).some((tag) => /extension|enrich|advanced/i.test(tag)),
  ).length;
  const core = Math.max(0, total - Math.max(eal, tagged));

  return [
    { label: "Core", countLabel: total ? `${core || total} students` : "Included", tone: "core" },
    { label: "Chunked", countLabel: tagged ? `${tagged} students` : "Available", tone: "chunked" },
    { label: "Extension", countLabel: extension ? `${extension} students` : "Available", tone: "extension" },
    { label: "EAL Supported", countLabel: eal ? `${eal} students` : "Available", tone: "eal" },
  ];
}
