import { useState } from "react";
import type { SimplifyResponse } from "../types";
import PrintButton from "./PrintButton";
import { FormCard } from "./shared";
import "./SimplifiedViewer.css";

interface Props {
  onSubmit: (sourceText: string, gradeBand: string, ealLevel: "beginner" | "intermediate" | "advanced") => void;
  result: SimplifyResponse | null;
  loading: boolean;
  defaultGradeBand?: string;
}

export default function SimplifiedViewer({ onSubmit, result, loading, defaultGradeBand }: Props) {
  const [sourceText, setSourceText] = useState("");
  const [gradeBand, setGradeBand] = useState(defaultGradeBand ?? "Grade 4");
  const [ealLevel, setEalLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceText.trim()) return;
    onSubmit(sourceText.trim(), gradeBand, ealLevel);
  }

  return (
    <div className="simplified-viewer">
      <FormCard className="simplified-form">
        <form onSubmit={handleSubmit}>
          <h3>Simplify for student</h3>
          <p className="form-hint">
            Paste any classroom text — instructions, a passage, or an assignment — and get an EAL-friendly simplified version.
          </p>

          <div className="field">
            <label htmlFor="simplify-source" className="form-label">Source text</label>
            <textarea
              id="simplify-source"
              rows={6}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Paste the text you want to simplify…"
            />
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="simplify-grade" className="form-label">Grade</label>
              <select id="simplify-grade" value={gradeBand} onChange={(e) => setGradeBand(e.target.value)}>
                <option>Grade 1</option>
                <option>Grade 2</option>
                <option>Grade 3</option>
                <option>Grade 4</option>
                <option>Grade 5</option>
                <option>Grade 6</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="simplify-eal" className="form-label">EAL level</label>
              <select id="simplify-eal" value={ealLevel} onChange={(e) => setEalLevel(e.target.value as "beginner" | "intermediate" | "advanced")}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <button className="btn btn--primary" type="submit" disabled={loading || !sourceText.trim()}>
            {loading ? "Simplifying…" : "Simplify"}
          </button>
        </form>
      </FormCard>

      {result && (
        <div className="simplified-result">
          <div className="result-header">
            <h4>Simplified Version</h4>
            <span className="result-meta">
              EAL {result.simplified.eal_level} · {result.simplified.grade_band}
            </span>
          </div>

          <div className="simplified-text-block">
            {result.simplified.simplified_text}
          </div>

          {result.simplified.key_vocabulary.length > 0 && (
            <div className="vocab-section">
              <h5>Key Vocabulary to Pre-teach</h5>
              <div className="vocab-chips">
                {result.simplified.key_vocabulary.map((word) => (
                  <span key={word} className="vocab-chip">{word}</span>
                ))}
              </div>
            </div>
          )}

          {result.simplified.visual_cue_suggestions.length > 0 && (
            <div className="cues-section">
              <h5>Visual Support Suggestions</h5>
              <ul className="cues-list">
                {result.simplified.visual_cue_suggestions.map((cue, i) => (
                  <li key={i}>{cue}</li>
                ))}
              </ul>
            </div>
          )}

          <PrintButton label="Print Simplified Text" />
        </div>
      )}
    </div>
  );
}
