import type { ReactNode } from "react";
import EmptyState from "./EmptyState";
import "./StatusCard.css";

type Status = "idle" | "loading" | "success" | "error" | "empty";

interface EmptyAction {
  label: string;
  onClick: () => void;
}

interface StatusCardProps {
  title: string;
  status: Status;
  errorMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: EmptyAction;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

function SkeletonLines() {
  return (
    <div className="status-card__skeleton" aria-hidden="true">
      <div className="status-card__skeleton-line status-card__skeleton-line--long" />
      <div className="status-card__skeleton-line status-card__skeleton-line--medium" />
      <div className="status-card__skeleton-line status-card__skeleton-line--short" />
    </div>
  );
}

export default function StatusCard({
  title,
  status,
  errorMessage,
  emptyTitle,
  emptyDescription,
  emptyAction,
  actions,
  className,
  children,
}: StatusCardProps) {
  const classes = [
    "status-card",
    status === "error" && "status-card--error",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} aria-busy={status === "loading" ? "true" : undefined}>
      <div className="status-card__header">
        <h3 className="status-card__title">{title}</h3>
        {actions && <div className="status-card__actions">{actions}</div>}
      </div>

      <div className="status-card__body">
        {status === "loading" && <SkeletonLines />}

        {status === "error" && (
          <p className="status-card__error" role="alert">
            {errorMessage ?? "Something went wrong."}
          </p>
        )}

        {status === "empty" && (
          <EmptyState
            title={emptyTitle ?? "No data"}
            description={emptyDescription ?? "Nothing to display yet."}
            action={emptyAction}
          />
        )}

        {(status === "idle" || status === "success") && children}
      </div>
    </div>
  );
}
