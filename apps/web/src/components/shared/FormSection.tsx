import type { ReactNode } from "react";
import "./FormSection.css";

interface FormSectionProps {
  label: string;
  description?: string;
  error?: string;
  charCount?: number;
  maxChars?: number;
  children: ReactNode;
}

export default function FormSection({
  label,
  description,
  error,
  charCount,
  maxChars,
  children,
}: FormSectionProps) {
  const showCounter = maxChars != null;
  const atWarning = showCounter && charCount != null && charCount > maxChars * 0.9;
  const overLimit = showCounter && charCount != null && charCount > maxChars;

  return (
    <div
      className={`form-section${error ? " form-section--error" : ""}`}
      role="group"
      aria-label={label}
    >
      <div className="form-section__header">
        <label className="form-section__label">{label}</label>
        {showCounter && (
          <span
            className={`form-section__counter${atWarning ? " form-section__counter--warn" : ""}${overLimit ? " form-section__counter--over" : ""}`}
          >
            {charCount ?? 0} / {maxChars}
          </span>
        )}
      </div>

      {description && (
        <p className="form-section__description">{description}</p>
      )}

      <div className="form-section__content">{children}</div>

      {error && (
        <p className="form-section__error" role="alert">{error}</p>
      )}
    </div>
  );
}
