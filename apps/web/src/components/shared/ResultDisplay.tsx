import { useState, type ReactNode } from "react";
import "./ResultDisplay.css";

interface Section {
  heading: string;
  content: string;
}

interface ResultDisplayProps {
  sections: Section[];
  children?: ReactNode;
}

export default function ResultDisplay({ sections, children }: ResultDisplayProps) {
  return (
    <div className="result-display">
      {sections.map((section, i) => (
        <CollapsibleSection key={i} heading={section.heading} content={section.content} />
      ))}
      {children && <div className="result-display__footer">{children}</div>}
    </div>
  );
}

// ---- Internal CollapsibleSection ----

function CollapsibleSection({ heading, content }: Section) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="result-section">
      <div className="result-section__header">
        <button
          type="button"
          className="result-section__toggle"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
        >
          <span className="result-section__chevron" aria-hidden="true">
            {open ? "\u25BC" : "\u25B6"}
          </span>
          {heading}
        </button>
        <button
          type="button"
          className="result-section__copy"
          onClick={handleCopy}
          aria-label={`Copy ${heading}`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {open && (
        <div className="result-section__content">
          {content}
        </div>
      )}
    </div>
  );
}
