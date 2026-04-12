import type { MouseEvent, ReactNode } from "react";
import "./Card.css";

export type CardVariant = "flat" | "raised" | "floating" | "inset";

export type CardTone =
  | "neutral"
  | "sun"
  | "sage"
  | "slate"
  | "forest"
  | "priority"
  | "watchpoint"
  | "analysis"
  | "provenance";

export type CardAs = "div" | "article" | "section" | "button";

interface CardProps {
  variant?: CardVariant;
  tone?: CardTone;
  accent?: boolean;
  interactive?: boolean;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  as?: CardAs;
  className?: string;
  children: ReactNode;
}

interface CardSlotProps {
  children: ReactNode;
  className?: string;
}

function joinClassNames(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function CardHeader({ children, className }: CardSlotProps) {
  return <div className={joinClassNames("card__header", className)}>{children}</div>;
}

function CardBody({ children, className }: CardSlotProps) {
  return <div className={joinClassNames("card__body", className)}>{children}</div>;
}

function CardFooter({ children, className }: CardSlotProps) {
  return <div className={joinClassNames("card__footer", className)}>{children}</div>;
}

function Card({
  variant = "raised",
  tone = "neutral",
  accent = false,
  interactive = false,
  onClick,
  as,
  className,
  children,
}: CardProps) {
  const classes = joinClassNames(
    "card",
    `card--${variant}`,
    `card--tone-${tone}`,
    accent && "card--accent",
    interactive && "card--interactive",
    className,
  );

  const Component = (as ?? (interactive && onClick ? "button" : "div")) as CardAs;

  if (Component === "button") {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {children}
      </button>
    );
  }

  // Escape hatch: caller forced as="div"/"article"/"section" but still wants
  // an interactive click target (we already returned early for the button
  // branch). Provide minimum a11y (role + tabIndex) and warn in dev — full
  // keyboard handling is the caller's responsibility.
  const isEscapeHatch = interactive && !!onClick;
  if (isEscapeHatch && process.env.NODE_ENV !== "production") {
    console.warn(
      `[Card] interactive + onClick with as="${Component}" — adding role=button and tabIndex=0, but you must wire your own keyboard handler (Enter/Space).`,
    );
  }

  return (
    <Component
      className={classes}
      onClick={onClick}
      role={isEscapeHatch ? "button" : undefined}
      tabIndex={isEscapeHatch ? 0 : undefined}
    >
      {children}
    </Component>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
