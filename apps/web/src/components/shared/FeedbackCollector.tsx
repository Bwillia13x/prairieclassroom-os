import { useState } from "react";
import "./FeedbackCollector.css";

/**
 * FeedbackCollector — structured 1-5 star rating + optional comment.
 *
 * This is a presentational component that accepts an onSubmit prop.
 * Panels wire it up by passing the useFeedback hook's submit function.
 * Designed to sit inside ResultDisplay's children slot.
 */

interface FeedbackCollectorProps {
  /** Called when the teacher submits feedback */
  onSubmit: (rating: number, comment?: string) => void;
  /** Whether feedback has already been submitted (optimistic or confirmed) */
  submitted?: boolean;
  /** Panel label shown in the prompt text */
  panelLabel?: string;
}

export default function FeedbackCollector({
  onSubmit,
  submitted = false,
  panelLabel,
}: FeedbackCollectorProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);

  if (submitted) {
    return (
      <div className="feedback-collector feedback-collector--done">
        <span className="feedback-collector__thanks">
          Thanks for the feedback{rating ? ` (${rating}/5)` : ""}
        </span>
      </div>
    );
  }

  function handleStarClick(value: number) {
    setRating(value);
    if (value >= 4) {
      // High rating: submit immediately, no comment needed
      onSubmit(value);
    } else {
      // Lower rating: offer optional comment
      setShowComment(true);
    }
  }

  function handleSubmitComment() {
    if (rating !== null) {
      onSubmit(rating, comment || undefined);
    }
  }

  function handleSkipComment() {
    if (rating !== null) {
      onSubmit(rating);
    }
  }

  const effectiveHover = hovered ?? rating;

  return (
    <div className="feedback-collector">
      {!showComment ? (
        <div className="feedback-collector__row">
          <span className="feedback-collector__prompt">
            {panelLabel ? `Rate this ${panelLabel} output:` : "Rate this output:"}
          </span>
          <div
            className="feedback-collector__stars"
            role="radiogroup"
            aria-label="Rating"
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className={`feedback-collector__star${effectiveHover !== null && value <= effectiveHover ? " feedback-collector__star--filled" : ""}`}
                onClick={() => handleStarClick(value)}
                onMouseEnter={() => setHovered(value)}
                onMouseLeave={() => setHovered(null)}
                aria-label={`${value} star${value !== 1 ? "s" : ""}`}
                role="radio"
                aria-checked={rating === value}
              >
                {effectiveHover !== null && value <= effectiveHover ? "\u2605" : "\u2606"}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="feedback-collector__comment-form">
          <label
            className="feedback-collector__comment-label"
            htmlFor="feedback-comment"
          >
            What could be better?{" "}
            <span className="feedback-collector__optional">(optional)</span>
          </label>
          <div className="feedback-collector__comment-row">
            <input
              id="feedback-comment"
              className="feedback-collector__comment-input"
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Missing student context, too generic..."
              maxLength={200}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmitComment();
              }}
            />
            <button
              className="btn btn--ghost feedback-collector__submit"
              onClick={handleSubmitComment}
              type="button"
            >
              Send
            </button>
            <button
              className="feedback-collector__skip"
              onClick={handleSkipComment}
              type="button"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
