import type { NavTarget } from "../appReducer";
import StatusChip from "./StatusChip";
import NumberTicker from "./NumberTicker";
import SourceTag from "./SourceTag";
import { Card } from "./shared";

import type { ReactNode } from "react";

interface ActionItem {
  key: string;
  label: string;
  count: number;
  targetTab: NavTarget;
  icon: ReactNode;
}

interface Props {
  items: ActionItem[];
  onItemClick?: (item: ActionItem) => void;
  totalCount: number;
  previousTotal?: number;
}

/**
 * Audit #29: the Classroom Pulse total is `debt_register.items.length`
 * — a count of logged debt entries, not "actions waiting". Previously
 * the label read as a second action queue, which conflicted with the
 * priority-matrix count ("priority students") and the roster footer
 * ("students with open items"). Now all three read as distinct units.
 */
function formatActionCount(totalCount: number): string {
  if (totalCount === 0) return "0 open items";
  if (totalCount === 1) return "1 open item";
  return `${totalCount} open items`;
}

function formatBenchmark(total: number, previous: number): string {
  const delta = total - previous;
  if (delta === 0) return "same as last check";
  return `${delta > 0 ? "up" : "down"} ${Math.abs(delta)} from last check`;
}

export default function PendingActionsCard({
  items,
  onItemClick,
  totalCount,
  previousTotal,
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
              {/* Audit #34: the pulse queue is record-derived (debt
                  register + intervention logs), not AI output. */}
              <SourceTag kind="record" />
            </div>
            {typeof previousTotal === "number" ? (
              <p
                className="today-triage-card__benchmark"
                data-testid="pending-actions-benchmark"
              >
                {formatBenchmark(totalCount, previousTotal)}
              </p>
            ) : null}
          </div>
        </div>

        {activeItems.length > 0 ? (
          <div className="today-triage-list motion-stagger">
            {activeItems.map((item) => (
              <button
                key={`${item.key}-${item.targetTab}`}
                className="today-triage-row"
                onClick={() => onItemClick?.(item)}
                type="button"
              >
                <span className="pending-action-icon" aria-hidden="true">{item.icon}</span>
                <span className="today-triage-row__label">{item.label}</span>
                <NumberTicker
                  value={item.count}
                  className="today-triage-row__count"
                  ariaLabel={`${item.count} ${item.label}`}
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="pending-actions pending-actions--clear">
            <p className="pending-actions-clear-text">No pending actions — you're caught up.</p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
