import { useState } from "react";
import "./HistoryDrawer.css";

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
            {items.map((item, i) => (
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
          </ul>
        </div>
      )}
    </div>
  );
}
