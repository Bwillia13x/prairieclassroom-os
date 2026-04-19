import { useEffect, useRef } from "react";
import { useApp } from "../AppContext";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { TAB_META, TAB_ORDER, type ActiveTab } from "../appReducer";
import "./ShortcutSheet.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface GlobalRow {
  keys: string[];
  label: string;
}

const GLOBAL_ROWS: GlobalRow[] = [
  { keys: ["⌘", "K"], label: "Command palette — jump anywhere" },
  { keys: ["?"], label: "Open this shortcut sheet" },
  { keys: ["Esc"], label: "Close any open dialog or overlay" },
];

function shortcutKeyForTab(tab: ActiveTab): string | null {
  const idx = TAB_ORDER.indexOf(tab) + 1;
  if (idx < 1) return null;
  if (idx <= 9) return String(idx);
  if (idx === 10) return "0";
  return null;
}

export default function ShortcutSheet({ open, onClose }: Props) {
  const { dispatch, showSuccess, featuresSeen } = useApp();
  const cardRef = useRef<HTMLDivElement>(null);
  useFocusTrap(cardRef, open);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const panelRows = TAB_ORDER
    .map((tab) => ({ tab, key: shortcutKeyForTab(tab) }))
    .filter((row): row is { tab: ActiveTab; key: string } => row.key !== null);

  const dismissedHintCount = Object.values(featuresSeen).filter(Boolean).length;

  function handleResetTips() {
    dispatch({ type: "RESET_FEATURES_SEEN" });
    showSuccess("Panel tips restored");
    onClose();
  }

  return (
    <div
      className="shortcut-sheet__backdrop"
      data-testid="shortcut-sheet-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="shortcut-sheet__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="shortcut-sheet-title" className="shortcut-sheet__title">Keyboard shortcuts</h2>
        <p className="shortcut-sheet__subtitle">Press <kbd>Esc</kbd> to close.</p>

        <section className="shortcut-sheet__section" aria-label="Global shortcuts">
          <h3 className="shortcut-sheet__section-title">Global</h3>
          <dl className="shortcut-sheet__list">
            {GLOBAL_ROWS.map((row, i) => (
              <div key={i} className="shortcut-sheet__row">
                <dt className="shortcut-sheet__keys">
                  {row.keys.map((k, j) => <kbd key={j}>{k}</kbd>)}
                </dt>
                <dd className="shortcut-sheet__label">{row.label}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="shortcut-sheet__section" aria-label="Jump to panel">
          <h3 className="shortcut-sheet__section-title">Jump to panel</h3>
          <dl className="shortcut-sheet__list shortcut-sheet__list--panels">
            {panelRows.map(({ tab, key }) => (
              <div key={tab} className="shortcut-sheet__row">
                <dt className="shortcut-sheet__keys">
                  <kbd>{key}</kbd>
                </dt>
                <dd className="shortcut-sheet__label">
                  <span className="shortcut-sheet__panel-label">{TAB_META[tab].label}</span>
                  <span className="shortcut-sheet__panel-group">{TAB_META[tab].group}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <footer className="shortcut-sheet__footer">
          <button
            type="button"
            className="shortcut-sheet__reset"
            onClick={handleResetTips}
            disabled={dismissedHintCount === 0}
            aria-label={dismissedHintCount === 0
              ? "No panel tips to restore"
              : `Restore ${dismissedHintCount} dismissed panel tip${dismissedHintCount === 1 ? "" : "s"}`}
          >
            {dismissedHintCount === 0
              ? "All panel tips are visible"
              : `Restore panel tips (${dismissedHintCount})`}
          </button>
        </footer>
      </div>
    </div>
  );
}
