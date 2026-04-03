import type { DifferentiatedVariant } from "../types";
import VariantCard from "./VariantCard";
import "./VariantGrid.css";

interface Props {
  artifactTitle: string;
  variants: DifferentiatedVariant[];
  latencyMs: number;
  modelId: string;
}

export default function VariantGrid({ artifactTitle, variants, latencyMs, modelId }: Props) {
  return (
    <div className="variant-grid-wrapper">
      <header className="variant-grid-header">
        <h2>Differentiated Variants</h2>
        <p className="variant-grid-meta">
          <strong>{artifactTitle}</strong> — {variants.length} variants ·{" "}
          {Math.round(latencyMs)}ms · {modelId}
        </p>
      </header>

      <div className="variant-grid">
        {variants.map((v) => (
          <VariantCard key={v.variant_id} variant={v} />
        ))}
      </div>
    </div>
  );
}
