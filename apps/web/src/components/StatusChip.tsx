import type { ReactNode } from "react";

interface Props {
  label: string;
  tone?: "accent" | "analysis" | "provenance" | "pending" | "success" | "warning" | "danger" | "muted" | "sun" | "sage" | "slate" | "forest";
  icon?: ReactNode;
}

export default function StatusChip({ label, tone = "muted", icon }: Props) {
  return (
    <span className={`status-chip status-chip--${tone}`}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <span>{label}</span>
    </span>
  );
}
