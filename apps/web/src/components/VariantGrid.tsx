import type { DifferentiatedVariant } from "../types";
import VariantCard from "./VariantCard";
import "./VariantGrid.css";

interface Props {
  artifactTitle?: string;
  variants: DifferentiatedVariant[];
  preview?: boolean;
  modelId?: string;
}

export default function VariantGrid({ artifactTitle, variants, preview = false, modelId }: Props) {
  const title = artifactTitle?.trim() || "Lesson artifact";

  return (
    <section
      className={`variant-grid-wrapper${preview ? " variant-grid-wrapper--preview" : ""}`}
      aria-label={preview ? "Sample lesson variant preview" : "Lesson variant result canvas"}
    >
      <header className="variant-grid-header">
        <div className="variant-grid-header__copy">
          <span className="variant-grid-eyebrow">{preview ? "Sample preview" : "Result canvas"}</span>
          <h2>{preview ? "Sample output: four ways in." : "Four ways in. One learning goal."}</h2>
          <p className="variant-grid-meta">
            {preview ? (
              <>
                This is demo sample output for <strong>{title}</strong>. Add your artifact on the left to generate the real classroom version.
              </>
            ) : (
              <>
                Variants are aligned to <strong>{title}</strong> with intentional differences in support, complexity, and language.
              </>
            )}
          </p>
        </div>
        {!preview ? (
          <div className="variant-grid-header__actions" aria-label="Variant canvas actions">
            <button type="button" className="variant-grid-action">
              Preview all
            </button>
            <button type="button" className="variant-grid-action">
              Export
            </button>
          </div>
        ) : null}
      </header>

      <div className="variant-grid">
        {variants.map((v) => (
          <VariantCard
            key={v.variant_id}
            variant={v}
            artifactTitle={title}
            modelId={modelId}
            preview={preview}
          />
        ))}
      </div>

      <footer className="variant-grid-alignment">
        <span className="variant-grid-alignment__mark" aria-hidden="true" />
        <span>
          {preview
            ? "Sample only. Your generated output will replace this preview."
            : "All variants align to the same classroom outcome."}
        </span>
        {!preview ? <button type="button">View alignment details</button> : null}
      </footer>
    </section>
  );
}
