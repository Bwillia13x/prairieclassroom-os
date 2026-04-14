import type { DrillDownContext } from "../types";

type VariantLaneContext = Extract<DrillDownContext, { type: "variant-lane" }>;

interface Props {
  context: VariantLaneContext;
}

export default function VariantLaneView({ context }: Props) {
  const filtered = context.variants.filter(
    (v) => v.variant_type === context.variantType
  );

  return (
    <div className="drill-down-section">
      <h3>
        {context.label} · {filtered.length} variants
      </h3>
      {filtered.length > 0 ? (
        <ul className="drill-down-list">
          {filtered.map((variant, index) => (
            <li key={index}>
              <span>{variant.title}</span>
              <span>{variant.estimated_minutes}m</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="drill-down-empty">No variants in this lane.</p>
      )}
    </div>
  );
}
