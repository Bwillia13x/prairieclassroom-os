import type { ReactNode } from "react";
import type { SectionIconName } from "./SectionIcon";
import SectionIcon from "./SectionIcon";
import { ActionButton } from "./shared";

interface PageCommandHubMetric {
  value: ReactNode;
  label: string;
}

interface PageCommandHubAction {
  label: string;
  icon: SectionIconName;
  onClick: () => void;
}

interface Props {
  id: string;
  ariaLabel: string;
  eyebrow: string;
  title: string;
  description: ReactNode;
  metrics: PageCommandHubMetric[];
  actions?: PageCommandHubAction[];
  className?: string;
}

export default function PageCommandHub({
  id,
  ariaLabel,
  eyebrow,
  title,
  description,
  metrics,
  actions = [],
  className = "",
}: Props) {
  const classes = ["page-command-hub", className].filter(Boolean).join(" ");

  return (
    <section className={classes} id={id} aria-label={ariaLabel}>
      <div className="page-command-hub__copy">
        <span className="page-command-hub__eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
        {actions.length ? (
          <div className="page-command-hub__actions" aria-label={`${eyebrow} actions`}>
            {actions.map((action, idx) => (
              <ActionButton
                key={`${action.label}-${idx}`}
                size="sm"
                variant="soft"
                onClick={action.onClick}
              >
                <SectionIcon name={action.icon} className="shell-nav__group-icon" />
                {action.label}
              </ActionButton>
            ))}
          </div>
        ) : null}
      </div>
      <div className="page-command-hub__metrics" aria-label={`${eyebrow} summary`}>
        {metrics.map((metric, idx) => (
          <span className="page-command-hub__metric" key={`${metric.label}-${idx}`}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
