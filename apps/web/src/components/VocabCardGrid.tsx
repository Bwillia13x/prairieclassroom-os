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

export default function VocabCardGrid({ onSubmit, result, loading }: Props) {
  const [artifactText, setArtifactText] = useState("");
  const [subject, setSubject] = useState("ELA");
  const [targetLang, setTargetLang] = useState("es");
  const [gradeBand, setGradeBand] = useState("Grade 4");
  const [curriculumSelection, setCurriculumSelection] = useState<CurriculumSelection | null>(null);

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
            <label htmlFor="vocab-subject">Subject</label>
            <select id="vocab-subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option>ELA</option>
              <option>Math</option>
              <option>Science</option>
              <option>Social Studies</option>
              <option>Health</option>
            </select>
          </div>

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
