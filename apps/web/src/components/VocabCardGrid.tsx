import { useState } from "react";
import type { VocabCardsResponse } from "../types";
import "./VocabCardGrid.css";

interface Props {
  onSubmit: (
    artifactText: string,
    subject: string,
    targetLanguage: string,
    gradeBand: string,
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!artifactText.trim()) return;
    onSubmit(artifactText.trim(), subject, targetLang, gradeBand);
  }

  return (
    <div className="vocab-card-grid">
      <form className="vocab-form" onSubmit={handleSubmit}>
        <h3>Bilingual Vocabulary Cards</h3>
        <p className="form-hint">
          Paste lesson text to generate bilingual vocabulary cards for EAL students.
        </p>

        <label className="form-label">
          Lesson text
          <textarea
            className="form-textarea"
            rows={5}
            value={artifactText}
            onChange={(e) => setArtifactText(e.target.value)}
            placeholder="Paste the lesson content…"
          />
        </label>

        <div className="form-row">
          <label className="form-label">
            Subject
            <select className="form-select" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option>ELA</option>
              <option>Math</option>
              <option>Science</option>
              <option>Social Studies</option>
              <option>Health</option>
            </select>
          </label>

          <label className="form-label">
            Target language
            <select className="form-select" value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </label>

          <label className="form-label">
            Grade
            <select className="form-select" value={gradeBand} onChange={(e) => setGradeBand(e.target.value)}>
              <option>Grade 1</option>
              <option>Grade 2</option>
              <option>Grade 3</option>
              <option>Grade 4</option>
              <option>Grade 5</option>
              <option>Grade 6</option>
            </select>
          </label>
        </div>

        <button className="form-btn" type="submit" disabled={loading || !artifactText.trim()}>
          {loading ? "Generating…" : "Generate Cards"}
        </button>
      </form>

      {result && (
        <div className="vocab-results">
          <div className="result-header">
            <h4>Vocabulary Cards ({result.card_set.cards.length})</h4>
            <span className="result-meta">
              {result.card_set.subject} · {LANGUAGE_OPTIONS.find((l) => l.code === result.card_set.target_language)?.label ?? result.card_set.target_language} · {Math.round(result.latency_ms)}ms
            </span>
          </div>

          <div className="cards-grid">
            {result.card_set.cards.map((card, i) => (
              <div key={i} className="vocab-card">
                <div className="card-term">{card.term}</div>
                <div className="card-translation">{card.target_translation}</div>
                <div className="card-definition">{card.definition}</div>
                <div className="card-example">
                  <span className="card-label">Example:</span> {card.example_sentence}
                </div>
                <div className="card-visual">
                  <span className="card-label">Visual:</span> {card.visual_hint}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
