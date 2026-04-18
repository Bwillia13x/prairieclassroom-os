import type { ReactNode } from "react";

type Tone =
  | "accent"
  | "analysis"
  | "provenance"
  | "pending"
  | "success"
  | "warning"
  | "danger"
  | "muted"
  | "sun"
  | "sage"
  | "slate"
  | "forest";

interface CommonProps {
  tone?: Tone;
  icon?: ReactNode;
}

/**
 * StatusChip accepts *either* a plain-text `label` *or* rich `children`, not
 * both. A discriminated union keeps TypeScript from compiling empty chips or
 * label+children conflicts.
 */
type Props =
  | (CommonProps & { label: string; children?: never })
  | (CommonProps & { label?: never; children: ReactNode });

export default function StatusChip(props: Props) {
  const { tone = "muted", icon } = props;
  const content = "children" in props && props.children !== undefined ? props.children : props.label;
  return (
    <span className={`status-chip status-chip--${tone}`}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <span>{content}</span>
    </span>
  );
}
