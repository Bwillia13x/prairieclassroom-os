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
    <section className={`variant-grid-wrapper${preview ? " variant-grid-wrapper--preview" : ""}`}>
      <header className="variant-grid-header">
        <div className="variant-grid-header__copy">
          <span className="variant-grid-eyebrow">Result canvas</span>
          <h2>Four ways in. One learning goal.</h2>
          <p className="variant-grid-meta">
            Variants are aligned to <strong>{title}</strong> with intentional differences in support, complexity, and language.
          </p>
        </div>
        <div className="variant-grid-header__actions" aria-label="Variant canvas actions">
          <button type="button" className="variant-grid-action">
            Preview all
          </button>
          <button type="button" className="variant-grid-action">
            Export
          </button>
        </div>
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
        <span>All variants align to the same classroom outcome.</span>
        <button type="button">View alignment details</button>
      </footer>
    </section>
  );
}
