import type { DrillDownContext } from "../types";

type PlanCoverageContext = Extract<DrillDownContext, { type: "plan-coverage-section" }>;

interface Props {
  context: PlanCoverageContext;
}

export default function PlanCoverageSectionView({ context }: Props) {
  return (
    <div className="drill-down-section">
      <h3>
        {context.label} · {context.items.length}
      </h3>
      {context.items.length > 0 ? (
        <ul className="drill-down-list">
          {context.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="drill-down-empty">No items in this section.</p>
      )}
    </div>
  );
}
