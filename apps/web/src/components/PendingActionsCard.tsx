import type { ActiveTab } from "../appReducer";

import type { ReactNode } from "react";
import Sparkline from "./Sparkline";

interface ActionItem {
  label: string;
  count: number;
  targetTab: ActiveTab;
  icon: ReactNode;
}

interface Props {
  items: ActionItem[];
  onNavigate: (tab: ActiveTab) => void;
  onItemClick?: (label: string) => void;
  sparklineData?: number[];
}

export default function PendingActionsCard({ items, onNavigate, onItemClick, sparklineData }: Props) {
  const activeItems = items.filter((item) => item.count > 0);

  if (activeItems.length === 0) {
    return (
      <div className="pending-actions pending-actions--clear">
        <p className="pending-actions-clear-text">No pending actions — you're caught up.</p>
      </div>
    );
  }

  return (
    <div className="pending-actions">
      <div className="pending-actions-header-row">
        <h3 className="pending-actions-heading">Needs Attention</h3>
        {sparklineData && sparklineData.length >= 3 ? (
          <Sparkline data={sparklineData} label="Debt trend over 14 days" />
        ) : null}
      </div>
      <div className="pending-actions-grid motion-stagger">
        {activeItems.map((item) => (
          <button
            key={`${item.targetTab}-${item.label}`}
            className="pending-action-card"
            onClick={() => {
              if (onItemClick) {
                onItemClick(item.label);
              } else {
                onNavigate(item.targetTab);
              }
            }}
            type="button"
          >
            <span className="pending-action-icon" aria-hidden="true">{item.icon}</span>
            <span className="pending-action-count">{item.count}</span>
            <span className="pending-action-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
