import type { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  title: string;
  description: string;
  /**
   * Optional numbered steps that render as an institutional ordered list
   * below the description. Use to tell the reader what to do to get
   * content here, turning an empty void into a first-use guide.
   */
  steps?: string[];
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyStateCard({ icon, title, description, steps, actionLabel, onAction }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="empty-state-title">{title}</div>
      <p className="empty-state-description">{description}</p>
      {steps && steps.length > 0 ? (
        <ol className="empty-state-steps">
          {steps.map((step, i) => (
            <li key={i} className="empty-state-steps__item">
              <span className="empty-state-steps__marker" aria-hidden="true">{i + 1}</span>
              <span className="empty-state-steps__text">{step}</span>
            </li>
          ))}
        </ol>
      ) : null}
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
