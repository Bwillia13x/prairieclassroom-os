/**
 * RetrievalTraceCard.tsx — Inline "Sources" disclosure on planning-tier outputs.
 *
 * Answers "did the system actually read my classroom memory?" with a list of
 * the records that were pulled into the prompt before the model generated.
 *
 * The card is intentionally collapsed-by-default: it adds zero visual weight
 * to the standard reading flow but is one click away when a teacher wants
 * to verify a citation. The maintainer's structured walkthrough flagged
 * retrieval transparency as the single biggest first-time-user trust lever.
 *
 * Honesty boundary: the trace reports what was retrieved, NOT what the model
 * actually used. The summary text says exactly that so we do not overstate.
 */

import { useState } from "react";
import type { RetrievalTrace, RetrievalSourceType } from "../types";
import "./RetrievalTraceCard.css";

interface Props {
  trace?: RetrievalTrace;
}

const SOURCE_LABELS: Record<RetrievalSourceType, string> = {
  plan: "Plan",
  intervention: "Intervention",
  pattern_report: "Pattern report",
  forecast: "Forecast",
  scaffold_review: "Scaffold review",
  family_message: "Family message",
  survival_packet: "Survival packet",
};

function formatTimestamp(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const now = Date.now();
  const ageMs = now - date.getTime();
  const dayMs = 86_400_000;
  const days = Math.floor(ageMs / dayMs);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks} weeks ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function RetrievalTraceCard({ trace }: Props) {
  const [open, setOpen] = useState(false);

  if (!trace) return null;
  const count = trace.citations.length;

  if (count === 0) {
    return (
      <aside className="retrieval-trace retrieval-trace--empty" aria-label="Retrieval trace">
        <span className="retrieval-trace__badge" aria-hidden="true">○</span>
        <p className="retrieval-trace__empty-text">
          No classroom memory records were pulled into this generation. The output is
          based on the request and your classroom profile only.
        </p>
      </aside>
    );
  }

  const summaryText = `${count} record${count === 1 ? "" : "s"} pulled from classroom memory`;

  return (
    <aside className="retrieval-trace" aria-label="Retrieval trace">
      <button
        type="button"
        className="retrieval-trace__summary"
        aria-expanded={open}
        aria-controls="retrieval-trace-details"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="retrieval-trace__badge" aria-hidden="true">●</span>
        <span className="retrieval-trace__summary-text">{summaryText}</span>
        <span className="retrieval-trace__chevron" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open ? (
        <div id="retrieval-trace-details" className="retrieval-trace__details">
          <p className="retrieval-trace__hint">
            These are the records the system read into the prompt. The trace reports
            what was retrieved — not what the model actually used.
          </p>
          <ul className="retrieval-trace__list">
            {trace.citations.map((citation) => {
              const ageLabel = formatTimestamp(citation.created_at);
              return (
                <li key={`${citation.source_type}:${citation.record_id}`} className="retrieval-trace__item">
                  <span className={`retrieval-trace__type retrieval-trace__type--${citation.source_type}`}>
                    {SOURCE_LABELS[citation.source_type]}
                  </span>
                  <code className="retrieval-trace__id">{citation.record_id}</code>
                  {ageLabel ? (
                    <span className="retrieval-trace__age">{ageLabel}</span>
                  ) : null}
                  {citation.excerpt ? (
                    <span className="retrieval-trace__excerpt">{citation.excerpt}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {trace.total_records_considered > count ? (
            <p className="retrieval-trace__footnote">
              {trace.total_records_considered - count} additional record(s) were considered but not pulled into this prompt.
            </p>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
