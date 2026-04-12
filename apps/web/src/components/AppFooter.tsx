import { TAB_ORDER, TAB_META } from "../appReducer";
import "./AppFooter.css";

/**
 * AppFooter — persistent footer with keyboard shortcut map and branding.
 * Displays the 1-0 keyboard shortcuts for all nav tabs and hackathon context.
 */
export default function AppFooter() {
  return (
    <footer className="app-footer" role="contentinfo">
      <div className="app-footer__shortcuts" aria-label="Keyboard shortcuts">
        <span className="app-footer__shortcuts-label">Shortcuts</span>
        <div className="app-footer__shortcut-list">
          {TAB_ORDER.map((tab, i) => (
            <span key={tab} className="app-footer__shortcut">
              <kbd className="app-footer__key">{i + 1 <= 9 ? i + 1 : 0}</kbd>
              <span className="app-footer__shortcut-name">{TAB_META[tab].shortLabel}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="app-footer__meta">
        <span className="app-footer__brand">PrairieClassroom OS</span>
        <span className="app-footer__sep" aria-hidden="true">·</span>
        <span className="app-footer__context">Built for the Gemma 4 Good Hackathon</span>
      </div>
    </footer>
  );
}
