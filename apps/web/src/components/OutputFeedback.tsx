import { useState } from "react";
import { useApp } from "../AppContext";
import "./OutputFeedback.css";

/**
 * OutputFeedback — lightweight thumbs up/down on any AI-generated output.
 * Captures rating + optional one-line note. Stored to localStorage for later analysis.
 */
interface Props {
  outputId: string;
  outputType: string;
}

export default function OutputFeedback({ outputId, outputType }: Props) {
  const { submitFeedback } = useApp();
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleRate(r: "up" | "down") {
    setRating(r);
    if (r === "up") {
      // Positive feedback — submit immediately, no note needed
      submitFeedback(outputId, outputType, r);
      setSubmitted(true);
    } else {
      // Negative feedback — offer optional note
      setShowNote(true);
    }
  }

  function handleSubmitNote() {
    if (rating) {
      submitFeedback(outputId, outputType, rating, note || undefined);
      setSubmitted(true);
      setShowNote(false);
    }
  }

  function handleSkipNote() {
    if (rating) {
      submitFeedback(outputId, outputType, rating);
      setSubmitted(true);
      setShowNote(false);
    }
  }

  if (submitted) {
    return (
      <div className="output-feedback output-feedback--done">
        <span className="output-feedback-thanks">
          {rating === "up" ? "👍" : "👎"} Thanks for the feedback
        </span>
      </div>
    );
  }

  return (
    <div className="output-feedback">
      {!showNote ? (
        <div className="output-feedback-row">
          <span className="output-feedback-prompt">Was this helpful?</span>
          <button
            className={`output-feedback-btn${rating === "up" ? " output-feedback-btn--selected" : ""}`}
            onClick={() => handleRate("up")}
            type="button"
            aria-label="Thumbs up — this was helpful"
          >
            👍
          </button>
          <button
            className={`output-feedback-btn${rating === "down" ? " output-feedback-btn--selected" : ""}`}
            onClick={() => handleRate("down")}
            type="button"
            aria-label="Thumbs down — this was not helpful"
          >
            👎
          </button>
        </div>
      ) : (
        <div className="output-feedback-note-form">
          <label className="output-feedback-note-label" htmlFor={`feedback-note-${outputId}`}>
            What could be better? <span className="output-feedback-optional">(optional)</span>
          </label>
          <div className="output-feedback-note-row">
            <input
              id={`feedback-note-${outputId}`}
              className="output-feedback-note-input"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Missing student context, too generic…"
              maxLength={200}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmitNote(); }}
            />
            <button className="btn btn--ghost output-feedback-submit" onClick={handleSubmitNote} type="button">
              Send
            </button>
            <button className="output-feedback-skip" onClick={handleSkipNote} type="button">
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
