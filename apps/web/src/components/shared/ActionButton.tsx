import type { ReactNode } from "react";
import "./ActionButton.css";

interface ActionButtonProps {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

export default function ActionButton({
  variant = "primary",
  loading = false,
  disabled = false,
  onClick,
  children,
}: ActionButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      className={`action-button action-button--${variant}`}
      disabled={isDisabled}
      aria-busy={loading ? "true" : undefined}
      onClick={onClick}
    >
      {loading && <span className="action-button__spinner" aria-hidden="true" />}
      <span className={loading ? "action-button__label--loading" : undefined}>
        {children}
      </span>
    </button>
  );
}
