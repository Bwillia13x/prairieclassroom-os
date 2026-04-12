import type { MouseEvent, ReactNode } from "react";

export type IconButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "approve"
  | "soft"
  | "tertiary"
  | "ghost";

export type IconButtonSize = "sm" | "md" | "lg";

interface IconButtonProps {
  "aria-label": string;
  children: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

function joinClassNames(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const DEFAULT_VARIANT: IconButtonVariant = "primary";

export default function IconButton({
  "aria-label": ariaLabel,
  children,
  variant = DEFAULT_VARIANT,
  size = "md",
  loading = false,
  disabled = false,
  type = "button",
  onClick,
  className,
}: IconButtonProps) {
  const variantClass = variant === "secondary" ? "btn--ghost" : `btn--${variant}`;
  const classes = joinClassNames(
    "btn",
    variantClass,
    size !== "md" && `btn--${size}`,
    "btn--icon-only",
    loading && "btn--loading",
    className,
  );

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      aria-label={ariaLabel}
      aria-busy={loading ? "true" : undefined}
      disabled={isDisabled}
      className={classes}
      onClick={onClick}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
