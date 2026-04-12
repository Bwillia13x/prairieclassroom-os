import type { ComplexityBlock } from "../types";
import StatusChip from "./StatusChip";

interface Props {
  block: ComplexityBlock;
}

export default function ForecastBlockView({ block }: Props) {
  const tone =
    block.level === "high"
      ? "warning"
      : block.level === "medium"
        ? "pending"
        : "success";

  return (
    <>
      <div className="drill-down-level-chip">
        <StatusChip label={block.level} tone={tone} />
      </div>

      {block.contributing_factors.length > 0 && (
        <div className="drill-down-section">
          <h4>Contributing factors</h4>
          <ul className="drill-down-list">
            {block.contributing_factors.map((factor, i) => (
              <li key={i}>{factor}</li>
            ))}
          </ul>
        </div>
      )}

      {block.suggested_mitigation && (
        <div className="drill-down-section">
          <h4>Suggested mitigation</h4>
          <p className="drill-down-mitigation-text">
            {block.suggested_mitigation}
          </p>
        </div>
      )}
    </>
  );
}
