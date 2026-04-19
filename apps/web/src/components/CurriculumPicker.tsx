import { useEffect, useId, useMemo, useState } from "react";
import { listCurriculumEntries, listCurriculumSubjects } from "../api";
import type {
  CurriculumEntry,
  CurriculumGrade,
  CurriculumSelection,
  CurriculumSubjectCode,
  CurriculumSubjectSummary,
} from "../types";
import "./CurriculumPicker.css";

interface Props {
  value: CurriculumSelection | null;
  onChange: (selection: CurriculumSelection | null) => void;
  subjectHint?: string;
  gradeHint?: string;
  suggestedEntries?: CurriculumEntry[];
}

const GRADE_OPTIONS: Array<{ value: CurriculumGrade; label: string }> = [
  { value: "K", label: "Kindergarten" },
  { value: "1", label: "Grade 1" },
  { value: "2", label: "Grade 2" },
  { value: "3", label: "Grade 3" },
  { value: "4", label: "Grade 4" },
  { value: "5", label: "Grade 5" },
  { value: "6", label: "Grade 6" },
];

function normalizeSubjectHint(subjectHint?: string): CurriculumSubjectCode | "" {
  if (!subjectHint) return "";
  const lowered = subjectHint.toLowerCase();
  if (/\b(ela|english|language|literacy|reading|writing)\b/.test(lowered)) {
    return "english_language_arts_and_literature";
  }
  if (/\b(math|mathematics|numeracy|number)\b/.test(lowered)) {
    return "mathematics";
  }
  if (/\b(science|stem|investigation|experiment)\b/.test(lowered)) {
    return "science";
  }
  if (/\b(social|history|geography|citizenship|community)\b/.test(lowered)) {
    return "social_studies";
  }
  return "";
}

function normalizeGradeHint(gradeHint?: string): CurriculumGrade | "" {
  if (!gradeHint) return "";
  const matches = gradeHint.toUpperCase().match(/\bK\b|\b[1-6]\b/g);
  if (!matches || matches.length !== 1) return "";
  return matches[0] as CurriculumGrade;
}

function defaultFocusIds(entry: CurriculumEntry) {
  return entry.focus_items.slice(0, Math.min(2, entry.focus_items.length)).map((item) => item.focus_id);
}

export default function CurriculumPicker({
  value,
  onChange,
  subjectHint,
  gradeHint,
  suggestedEntries = [],
}: Props) {
  const subjectId = useId();
  const gradeId = useId();
  const entryId = useId();
  const [subjects, setSubjects] = useState<CurriculumSubjectSummary[]>([]);
  const [entries, setEntries] = useState<CurriculumEntry[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<CurriculumSubjectCode | "">(() => normalizeSubjectHint(subjectHint));
  const [selectedGrade, setSelectedGrade] = useState<CurriculumGrade | "">(() => normalizeGradeHint(gradeHint));
  const [filtersTouched, setFiltersTouched] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value?.entry_id) {
      const matchingEntry = entries.find((entry) => entry.entry_id === value.entry_id)
        ?? suggestedEntries.find((entry) => entry.entry_id === value.entry_id);
      if (matchingEntry) {
        setSelectedSubject(matchingEntry.subject_code);
        setSelectedGrade(matchingEntry.grade);
      }
      return;
    }

    if (!filtersTouched) {
      setSelectedSubject(normalizeSubjectHint(subjectHint));
      setSelectedGrade(normalizeGradeHint(gradeHint));
    }
  }, [entries, filtersTouched, gradeHint, suggestedEntries, subjectHint, value?.entry_id]);

  useEffect(() => {
    let active = true;
    setLoadingSubjects(true);
    listCurriculumSubjects()
      .then((nextSubjects) => {
        if (!active) return;
        setSubjects(nextSubjects);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load Alberta curriculum subjects.");
      })
      .finally(() => {
        if (active) setLoadingSubjects(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingEntries(true);
    listCurriculumEntries({
      subjectCode: selectedSubject || undefined,
      grade: selectedGrade || undefined,
    })
      .then((nextEntries) => {
        if (!active) return;
        setEntries(nextEntries);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load Alberta curriculum entries.");
      })
      .finally(() => {
        if (active) setLoadingEntries(false);
      });

    return () => {
      active = false;
    };
  }, [selectedGrade, selectedSubject]);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.entry_id === value?.entry_id) ?? null,
    [entries, value?.entry_id],
  );
  const selectedFocusIds = value && value.entry_id === selectedEntry?.entry_id ? value.selected_focus_ids : [];

  function handleEntrySelect(nextEntryId: string) {
    setFiltersTouched(true);
    if (!nextEntryId) {
      onChange(null);
      return;
    }

    const nextEntry = entries.find((entry) => entry.entry_id === nextEntryId);
    if (!nextEntry) return;

    onChange({
      entry_id: nextEntry.entry_id,
      selected_focus_ids: defaultFocusIds(nextEntry),
    });
  }

  function handleFocusToggle(focusId: string) {
    if (!selectedEntry) return;
    const selectedIds = new Set(selectedFocusIds);
    if (selectedIds.has(focusId)) {
      if (selectedIds.size === 1) return;
      selectedIds.delete(focusId);
    } else {
      if (selectedIds.size >= 3) return;
      selectedIds.add(focusId);
    }

    onChange({
      entry_id: selectedEntry.entry_id,
      selected_focus_ids: Array.from(selectedIds),
    });
  }

  function applySuggestion(entry: CurriculumEntry) {
    setFiltersTouched(true);
    setSelectedSubject(entry.subject_code);
    setSelectedGrade(entry.grade);
    onChange({
      entry_id: entry.entry_id,
      selected_focus_ids: defaultFocusIds(entry),
    });
  }

  return (
    <section className="curriculum-picker" aria-label="Alberta curriculum alignment">
      <div className="curriculum-picker__header">
        <div>
          <h3>Alberta Curriculum Alignment</h3>
          <p className="curriculum-picker__description">
            Optional. Pin differentiation or vocabulary work to a specific Alberta curriculum focus.
          </p>
        </div>
        {value ? (
          <button
            type="button"
            className="curriculum-picker__clear"
            onClick={() => onChange(null)}
          >
            Clear
          </button>
        ) : null}
      </div>

      {suggestedEntries.length ? (
        <div className="curriculum-picker__suggestions" aria-label="Suggested curriculum matches">
          <span className="curriculum-picker__suggestions-label">Suggested from worksheet text</span>
          <div className="curriculum-picker__chip-row">
            {suggestedEntries.map((entry) => (
              <button
                key={entry.entry_id}
                type="button"
                className={`curriculum-picker__chip${value?.entry_id === entry.entry_id ? " curriculum-picker__chip--active" : ""}`}
                onClick={() => applySuggestion(entry)}
              >
                {entry.subject_label} {entry.grade_label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="form-row">
        <div className="field">
          <label htmlFor={subjectId}>Subject</label>
          <select
            id={subjectId}
            value={selectedSubject}
            onChange={(event) => {
              setFiltersTouched(true);
              setSelectedSubject(event.target.value as CurriculumSubjectCode | "");
              onChange(null);
            }}
            disabled={loadingSubjects}
          >
            <option value="">All Alberta subjects</option>
            {subjects.map((subject) => (
              <option key={subject.subject_code} value={subject.subject_code}>
                {subject.subject_label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor={gradeId}>Grade</label>
          <select
            id={gradeId}
            value={selectedGrade}
            onChange={(event) => {
              setFiltersTouched(true);
              setSelectedGrade(event.target.value as CurriculumGrade | "");
              onChange(null);
            }}
          >
            <option value="">All grades</option>
            {GRADE_OPTIONS.map((grade) => (
              <option key={grade.value} value={grade.value}>
                {grade.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor={entryId}>Curriculum focus</label>
        <select
          id={entryId}
          value={value?.entry_id ?? ""}
          onChange={(event) => handleEntrySelect(event.target.value)}
          disabled={loadingEntries}
        >
          <option value="">Select a curriculum focus</option>
          {entries.map((entry) => (
            <option key={entry.entry_id} value={entry.entry_id}>
              {selectedSubject && selectedGrade
                ? entry.title
                : `${entry.subject_label} ${entry.grade_label} — ${entry.title}`}
            </option>
          ))}
        </select>
        {loadingEntries ? (
          <p className="curriculum-picker__status">Loading Alberta curriculum entries…</p>
        ) : null}
        {!loadingEntries && !entries.length ? (
          <p className="curriculum-picker__status">No Alberta entries match this filter yet.</p>
        ) : null}
        {error ? <p className="curriculum-picker__error">{error}</p> : null}
      </div>

      {selectedEntry ? (
        <div className="curriculum-picker__detail">
          <div className="curriculum-picker__meta">
            <span className={`curriculum-picker__status-badge curriculum-picker__status-badge--${selectedEntry.implementation_status}`}>
              {selectedEntry.implementation_status.replace(/_/g, " ")}
            </span>
            <a href={selectedEntry.source_url} target="_blank" rel="noreferrer">
              Alberta source
            </a>
          </div>
          <p className="curriculum-picker__summary">{selectedEntry.summary}</p>
          <fieldset className="curriculum-picker__focus-list">
            <legend>Choose up to three focus statements</legend>
            {selectedEntry.focus_items.map((item) => {
              const checked = selectedFocusIds.includes(item.focus_id);
              const disableUnchecked = !checked && selectedFocusIds.length >= 3;
              return (
                <label key={item.focus_id} className="curriculum-picker__focus-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disableUnchecked}
                    onChange={() => handleFocusToggle(item.focus_id)}
                  />
                  <span>{item.text}</span>
                </label>
              );
            })}
          </fieldset>
          {selectedEntry.implementation_notes ? (
            <p className="curriculum-picker__note">{selectedEntry.implementation_notes}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
