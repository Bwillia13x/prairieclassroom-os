import "./DifferentiateEmptyState.css";

interface Props {
  onStart: () => void;
}

const STEPS = [
  "Select the classroom and confirm the lesson context.",
  "Add one artifact by photo, file, or pasted text.",
  "Run the differentiator to fill the result canvas with variants.",
];

const PREVIEW_CARDS = [
  { label: "Core", tone: "sage" },
  { label: "Chunked", tone: "sun" },
  { label: "Language", tone: "slate" },
] as const;

export default function DifferentiateEmptyState({ onStart }: Props) {
  return (
    <section className="differentiate-empty-state surface-panel" aria-label="Differentiate onboarding">
      <div className="differentiate-empty-state__preview" aria-hidden="true">
        <div className="differentiate-empty-state__preview-shell">
          {PREVIEW_CARDS.map((card) => (
            <article key={card.label} className="differentiate-empty-state__card">
              <span className={`status-chip status-chip--${card.tone}`}>{card.label}</span>
              <div className="differentiate-empty-state__line differentiate-empty-state__line--title" />
              <div className="differentiate-empty-state__line" />
              <div className="differentiate-empty-state__line differentiate-empty-state__line--short" />
            </article>
          ))}
        </div>
      </div>

      <div className="differentiate-empty-state__copy">
        <span className="differentiate-empty-state__eyebrow">Variant canvas preview</span>
        <h3 className="differentiate-empty-state__title">Build your first variant set</h3>
        <p className="differentiate-empty-state__description">
          The right-side canvas will organize scaffolded, chunked, extension, and language-support versions once the source artifact is ready.
        </p>
        <ol className="differentiate-empty-state__steps">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <button className="btn btn--soft" type="button" onClick={onStart}>
          Start with the intake form
        </button>
      </div>
    </section>
  );
}
