import type { ElementType, ReactNode } from "react";
import "./FormCard.css";

interface FormCardProps {
  children: ReactNode;
  className?: string;
  /** Render element. Defaults to `div`. Use `section` or `article` for semantic roots. */
  as?: ElementType;
}

/**
 * FormCard — visible form affordance shared across panel intake forms
 * (Workstream F, Phase 1). Pairs with the global `.form-label` class for
 * field labels. Keep this primitive minimal: surface + border + padding.
 */
export default function FormCard({ children, className, as }: FormCardProps) {
  const Component = (as ?? "div") as ElementType;
  const classes = className ? `form-card ${className}` : "form-card";
  return <Component className={classes}>{children}</Component>;
}
