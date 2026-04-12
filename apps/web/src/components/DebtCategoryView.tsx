import type { DebtItem } from "../types";
import type { ActiveTab } from "../appReducer";

interface Props {
  items: DebtItem[];
  onInterventionPrefill?: (prefill: {
    student_ref: string;
    suggested_action: string;
    reason: string;
  }) => void;
  onNavigate: (tab: ActiveTab) => void;
}

export default function DebtCategoryView({
  items,
  onInterventionPrefill,
  onNavigate,
}: Props) {
  if (items.length === 0) {
    return <p className="drill-down-empty">No items in this category.</p>;
  }

  return (
    <>
      {items.map((item) => {
        const isStaleFollowup = item.category === "stale_followup";

        function handleLogFollowUp() {
          const studentRef = item.student_refs[0] ?? "";
          onInterventionPrefill?.({
            student_ref: studentRef,
            suggested_action: "Log follow-up",
            reason: item.description,
          });
          onNavigate("log-intervention");
        }

        return (
          <div key={item.source_record_id} className="drill-down-debt-item">
            <p className="drill-down-debt-item__description">
              {item.description}
            </p>
            <div className="drill-down-debt-item__meta">
              {item.student_refs.length > 0 && (
                <span className="drill-down-debt-item__refs">
                  {item.student_refs.join(", ")}
                </span>
              )}
              <span className="drill-down-debt-item__age">
                {item.age_days}d ago
              </span>
              {isStaleFollowup && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={handleLogFollowUp}
                >
                  Log follow-up
                </button>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
