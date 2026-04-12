import type { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyStateCard({ icon, title, description, actionLabel, onAction }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="empty-state-title">{title}</div>
      <p className="empty-state-description">{description}</p>
      {actionLabel && onAction ? (
        <div className="empty-state-actions">
          <button className="btn btn--soft" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
