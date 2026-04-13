import type { ActiveTab } from "../appReducer";
import StatusChip from "./StatusChip";
import { ActionButton, Card } from "./shared";

import type { ReactNode } from "react";

interface ActionItem {
  key: string;
  label: string;
  count: number;
  targetTab: ActiveTab;
  icon: ReactNode;
}

interface PrimaryAction {
  description: string;
  tab: ActiveTab;
  cta: string;
  label: string;
  tone: "pending" | "warning" | "analysis" | "provenance" | "success";
}

interface Props {
  items: ActionItem[];
  primaryAction: PrimaryAction;
  onNavigate: (tab: ActiveTab) => void;
  onItemClick?: (item: ActionItem) => void;
  totalCount: number;
  studentsToCheckFirst?: string[];
  onStudentClick?: (studentRef: string) => void;
}

function formatActionCount(totalCount: number): string {
  if (totalCount === 0) return "0 actions waiting";
  if (totalCount === 1) return "1 action waiting";
  return `${totalCount} actions waiting`;
}

export default function PendingActionsCard({
  items,
  primaryAction,
  onNavigate,
  onItemClick,
  totalCount,
  studentsToCheckFirst = [],
  onStudentClick,
}: Props) {
  const activeItems = items.filter((item) => item.count > 0);

  return (
    <Card variant="raised" tone="priority" accent className="today-triage-card">
      <Card.Body className="today-triage-card__body">
        <div className="pending-actions-header-row">
          <div className="today-triage-card__header-copy">
            <div className="today-triage-card__meta">
              <span className="pending-actions-heading">Needs Attention Now</span>
              <StatusChip
                label={formatActionCount(totalCount)}
                tone={totalCount > 0 ? "warning" : "success"}
              />
              <StatusChip label={primaryAction.label} tone={primaryAction.tone} />
            </div>
            <p className="today-triage-card__description">{primaryAction.description}</p>
          </div>
          <ActionButton variant="primary" onClick={() => onNavigate(primaryAction.tab)}>
            Open {primaryAction.cta}
          </ActionButton>
        </div>

        {activeItems.length > 0 ? (
          <div className="today-triage-list motion-stagger">
            {activeItems.map((item) => (
              <button
                key={`${item.key}-${item.targetTab}`}
                className="today-triage-row"
                onClick={() => {
                  if (onItemClick) {
                    onItemClick(item);
                  } else {
                    onNavigate(item.targetTab);
                  }
                }}
                type="button"
              >
                <span className="pending-action-icon" aria-hidden="true">{item.icon}</span>
                <span className="today-triage-row__label">{item.label}</span>
                <span className="today-triage-row__count">{item.count}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="pending-actions pending-actions--clear">
            <p className="pending-actions-clear-text">No pending actions — you're caught up.</p>
          </div>
        )}

        {studentsToCheckFirst.length > 0 ? (
          <div className="today-triage-students">
            <span className="today-triage-students__label">Students to check first</span>
            <div className="today-triage-students__chips">
              {studentsToCheckFirst.map((studentRef) => (
                <button
                  key={studentRef}
                  type="button"
                  className="today-triage-students__chip"
                  onClick={() => onStudentClick?.(studentRef)}
                >
                  {studentRef}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
}
