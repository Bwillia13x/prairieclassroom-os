import { useState } from "react";
import "./HistoryDrawer.css";

function getDateGroup(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Earlier";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const weekAgo = new Date(today.getTime() - 6 * 86_400_000);

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= weekAgo) return "This week";
  return "Earlier";
}

interface Props<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey: (item: T) => string;
  getTimestamp: (item: T) => string;
  onSelect: (item: T) => void;
  label: string;
}

export default function HistoryDrawer<T>({
  items, loading, error, renderItem, getKey, getTimestamp, onSelect, label,
}: Props<T>) {
  const [open, setOpen] = useState(false);

  return (
    <div className="history-drawer-container">
      <button
        className="history-drawer-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        type="button"
      >
        <svg className="history-drawer-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="10" cy="10" r="8" />
          <path d="M10 6v4l2.5 1.5" strokeLinecap="round" />
        </svg>
        {label}
      </button>

      {open && (
        <div className="history-drawer" role="region" aria-label={label}>
          {loading && <p className="history-drawer-loading">Loading...</p>}
          {error && <p className="history-drawer-error">{error}</p>}
          {!loading && items.length === 0 && (
            <p className="history-drawer-empty">No history yet.</p>
          )}
          <ul className="history-drawer-list">
            {(() => {
              const grouped: { group: string; items: T[] }[] = [];
              let lastGroup = "";
              for (const item of items) {
                const ts = getTimestamp(item);
                const group = getDateGroup(ts);
                if (group !== lastGroup) {
                  grouped.push({ group, items: [item] });
                  lastGroup = group;
                } else {
                  grouped[grouped.length - 1].items.push(item);
                }
              }
              return grouped.map((section) => (
                <div key={section.group}>
                  <div className="history-drawer-group-label">{section.group}</div>
                  {section.items.map((item, i) => (
                    <li key={getKey(item)} className="history-drawer-item">
                      <button
                        className="history-drawer-item-btn"
                        onClick={() => { onSelect(item); setOpen(false); }}
                        type="button"
                      >
                        <span className="history-drawer-item-time">
                          {new Date(getTimestamp(item)).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="history-drawer-item-preview">
                          {renderItem(item, i)}
                        </span>
                      </button>
                    </li>
                  ))}
                </div>
              ));
            })()}
          </ul>
        </div>
      )}
    </div>
  );
}
