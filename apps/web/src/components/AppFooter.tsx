import { useEffect, useState } from "react";
import { TAB_ORDER, TAB_META } from "../appReducer";
import "./AppFooter.css";

interface Props {
  onOpenShortcuts?: () => void;
}

const STORAGE_KEY = "prairie.footer.shortcuts.expanded";

/**
 * AppFooter — persistent footer with a collapsible keyboard-shortcut map and
 * brand meta. Shortcuts collapse by default so the footer stays a calm single
 * line; teachers who rely on the visual map can pin it open, and the choice
 * persists across sessions in localStorage.
 */
export default function AppFooter({ onOpenShortcuts }: Props = {}) {
  const [expanded, setExpanded] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, expanded ? "1" : "0");
    } catch {
      // localStorage may be unavailable (private mode, storage quota); the
      // footer still works without persistence.
    }
  }, [expanded]);

  return (
    <footer className={`app-footer${expanded ? " app-footer--expanded" : ""}`} role="contentinfo">
      {expanded ? (
        <div className="app-footer__shortcuts" aria-label="Keyboard shortcuts">
          <span className="app-footer__shortcuts-label">Shortcuts</span>
          <div className="app-footer__shortcut-list">
            {TAB_ORDER.map((tab, i) => {
              const key = i < 9 ? String(i + 1) : i === 9 ? "0" : null;
              if (!key) return null;
              return (
                <span key={tab} className="app-footer__shortcut">
                  <kbd className="app-footer__key">{key}</kbd>
                  <span className="app-footer__shortcut-name">{TAB_META[tab].shortLabel}</span>
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="app-footer__meta">
        <button
          type="button"
          className="app-footer__toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="app-footer-shortcuts"
          title={expanded ? "Hide shortcut map" : "Show shortcut map"}
        >
          <span className="app-footer__toggle-caret" aria-hidden="true">{expanded ? "▾" : "▸"}</span>
          <span>Shortcuts</span>
        </button>
        <span className="app-footer__sep" aria-hidden="true">·</span>
        <span className="app-footer__brand">PrairieClassroom OS</span>
        <span className="app-footer__sep" aria-hidden="true">·</span>
        <span className="app-footer__context">Built for the Gemma 4 Good Hackathon</span>
        {onOpenShortcuts && (
          <button
            type="button"
            className="app-footer__shortcuts-btn"
            onClick={onOpenShortcuts}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (press ?)"
          >
            ?
          </button>
        )}
      </div>
    </footer>
  );
}
