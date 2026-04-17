import type { MouseEvent, ReactNode } from "react";

export type ActionButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "approve"
  | "soft"
  | "tertiary"
  | "ghost"
  | "link";

export type ActionButtonSize = "sm" | "md" | "lg";

interface ActionButtonProps {
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "data-testid"?: string;
}

function joinClassNames(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function resolveVariantClass(variant: ActionButtonVariant): string {
  if (variant === "secondary") return "btn--ghost";
  return `btn--${variant}`;
}

export default function ActionButton({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  type = "button",
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  onClick,
  children,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "data-testid": dataTestId,
}: ActionButtonProps) {
  const isDisabled = disabled || loading;

  const classes = joinClassNames(
    "btn",
    resolveVariantClass(variant),
    size !== "md" && `btn--${size}`,
    loading && "btn--loading",
    fullWidth && "btn--full-width",
    className,
  );

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading ? "true" : undefined}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      onClick={onClick}
      data-testid={dataTestId}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {leadingIcon && <span className="btn__leading-icon" aria-hidden="true">{leadingIcon}</span>}
      <span className="btn__label">{children}</span>
      {trailingIcon && <span className="btn__trailing-icon" aria-hidden="true">{trailingIcon}</span>}
    </button>
  );
}
