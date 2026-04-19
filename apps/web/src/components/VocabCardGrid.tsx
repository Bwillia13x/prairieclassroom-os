import { useState } from "react";
import type { CurriculumSelection, VocabCardsResponse } from "../types";
import CurriculumPicker from "./CurriculumPicker";
import PrintButton from "./PrintButton";
import "./VocabCardGrid.css";

interface Props {
  onSubmit: (
    artifactText: string,
    subject: string,
    targetLanguage: string,
    gradeBand: string,
    curriculumSelection: CurriculumSelection | null,
  ) => void;
  result: VocabCardsResponse | null;
  loading: boolean;
  defaultGradeBand?: string;
  defaultTargetLanguage?: string;
}

const SUBJECT_CODE_TO_LABEL: Record<string, string> = {
  english_language_arts_and_literature: "ELA",
  mathematics: "Math",
  science: "Science",
  social_studies: "Social Studies",
};

function inferSubjectFromEntryId(entryId: string): string | null {
  if (entryId.includes("ela")) return "english_language_arts_and_literature";
  if (entryId.includes("math")) return "mathematics";
  if (entryId.includes("science")) return "science";
  if (entryId.includes("social")) return "social_studies";
  return null;
}

const LANGUAGE_OPTIONS = [
  { code: "es", label: "Spanish" },
  { code: "ar", label: "Arabic" },
  { code: "pa", label: "Punjabi" },
  { code: "tl", label: "Tagalog" },
  { code: "zh", label: "Chinese (Simplified)" },
  { code: "fr", label: "French" },
  { code: "ur", label: "Urdu" },
  { code: "so", label: "Somali" },
  { code: "vi", label: "Vietnamese" },
  { code: "ko", label: "Korean" },
];

export default function VocabCardGrid({
  onSubmit,
  result,
  loading,
  defaultGradeBand,
  defaultTargetLanguage,
}: Props) {
  const [artifactText, setArtifactText] = useState("");
  const [targetLang, setTargetLang] = useState(defaultTargetLanguage ?? "es");
  const [gradeBand, setGradeBand] = useState(defaultGradeBand ?? "Grade 4");
  const [curriculumSelection, setCurriculumSelection] = useState<CurriculumSelection | null>(null);

  const derivedSubjectCode = curriculumSelection?.entry_id
    ? inferSubjectFromEntryId(curriculumSelection.entry_id)
    : null;
  const subject = derivedSubjectCode
    ? (SUBJECT_CODE_TO_LABEL[derivedSubjectCode] ?? "ELA")
    : "ELA";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!artifactText.trim()) return;
    onSubmit(artifactText.trim(), subject, targetLang, gradeBand, curriculumSelection);
  }

  return (
    <div className="vocab-card-grid">
      <form className="vocab-form" onSubmit={handleSubmit}>
        <h3>Bilingual Vocabulary Cards</h3>
        <p className="form-hint">
          Paste lesson text to generate bilingual vocabulary cards for EAL students.
        </p>

        <div className="field">
          <label htmlFor="vocab-text">Lesson text</label>
          <textarea
            id="vocab-text"
            rows={5}
            value={artifactText}
            onChange={(e) => setArtifactText(e.target.value)}
            placeholder="Paste the lesson content…"
          />
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="vocab-lang">Target language</label>
            <select id="vocab-lang" value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="vocab-grade">Grade</label>
            <select id="vocab-grade" value={gradeBand} onChange={(e) => setGradeBand(e.target.value)}>
              <option>Grade 1</option>
              <option>Grade 2</option>
              <option>Grade 3</option>
              <option>Grade 4</option>
              <option>Grade 5</option>
              <option>Grade 6</option>
            </select>
          </div>
        </div>

        <p className="vocab-form__subject-hint">
          <span aria-hidden="true">Subject</span>
          <strong>{subject}</strong>
          <span className="vocab-form__subject-hint-note">
            — change via Alberta Curriculum below
          </span>
        </p>

        <CurriculumPicker
          value={curriculumSelection}
          onChange={setCurriculumSelection}
          subjectHint={subject}
          gradeHint={gradeBand}
        />

        <button className="btn btn--primary" type="submit" disabled={loading || !artifactText.trim()}>
          {loading ? "Generating…" : "Generate Cards"}
        </button>
      </form>

      {result && (
        <div className="vocab-results">
          <div className="result-header">
            <h4>Vocabulary Cards ({result.card_set.cards.length})</h4>
            <span className="result-meta">
              {result.card_set.subject} · {LANGUAGE_OPTIONS.find((l) => l.code === result.card_set.target_language)?.label ?? result.card_set.target_language}
            </span>
          </div>

          <div className="cards-grid">
            {result.card_set.cards.map((card, i) => (
              <article key={i} className="vocab-card" style={{ animationDelay: `${0.05 * (i + 1)}s` }}>
                <div className="vocab-card-head">
                  <div className="vocab-card-term">{card.term}</div>
                  <div className="vocab-card-translation">{card.target_translation}</div>
                </div>
                <div className="vocab-card-body">
                  <p className="vocab-card-definition">{card.definition}</p>
                  <p className="vocab-card-example">
                    <span className="vocab-card-label">Example</span>
                    {card.example_sentence}
                  </p>
                  <p className="vocab-card-visual">
                    <span className="vocab-card-label">Visual cue</span>
                    {card.visual_hint}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <PrintButton label="Print Vocab Cards" />
        </div>
      )}
    </div>
  );
}
