import type { DifferentiatedVariant } from "../types";
import VariantCard from "./VariantCard";
import PrintButton from "./PrintButton";
import "./VariantGrid.css";

interface Props {
  artifactTitle: string;
  variants: DifferentiatedVariant[];
}

export default function VariantGrid({ artifactTitle, variants }: Props) {
  return (
    <div className="variant-grid-wrapper">
      <header className="variant-grid-header">
        <h2>Differentiated Variants</h2>
        <p className="variant-grid-meta">
          <strong>{artifactTitle}</strong> — {variants.length} variants
        </p>
      </header>

      <div className="variant-grid">
        {variants.map((v) => (
          <VariantCard key={v.variant_id} variant={v} />
        ))}
      </div>

      <PrintButton label="Print Variants" />
    </div>
  );
}
