interface ActionItem {
  label: string;
  count: number;
  targetTab: string;
  icon: string;
}

interface Props {
  items: ActionItem[];
  onNavigate: (tab: string) => void;
}

export default function PendingActionsCard({ items, onNavigate }: Props) {
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
      <h3 className="pending-actions-heading">Needs Attention</h3>
      <div className="pending-actions-grid">
        {activeItems.map((item) => (
          <button
            key={item.targetTab}
            className="pending-action-card"
            onClick={() => onNavigate(item.targetTab)}
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
