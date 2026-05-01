import { useEffect, useState } from "react";
import { TAB_ORDER, TAB_META } from "../appReducer";
import packageJson from "../../package.json";
import "./AppFooter.css";

interface Props {
  onOpenShortcuts?: () => void;
  classroomId?: string;
}

const STORAGE_KEY = "prairie.footer.shortcuts.expanded";

/**
 * Phase E1 (2026-04-27) — mono rail constants.
 *
 * `version` flows from apps/web/package.json so the rail stays in
 * sync with the workspace's actual published version. The package
 * import uses `resolveJsonModule` (already enabled in tsconfig) so
 * Vite tree-shakes everything except the `version` field.
 *
 * `runtimeEnv` reads `VITE_PRAIRIE_MODE` if it's exposed at build /
 * dev time. The orchestrator selects its real inference lane
 * server-side and the web client doesn't currently learn that mode
 * over the wire (`/api/health` exposes uptime/memory only). Until
 * a `/api/runtime` endpoint surfaces the canonical mode, we default
 * to `"mock"` because that matches the project's documented default
 * (CLAUDE.md "Current State Of Development" — release-gate runs in
 * mock mode, the cheapest no-cost lane). When the orchestrator
 * starts publishing the runtime mode, swap this constant for a
 * fetched value without touching the rail's visual contract.
 */
const APP_VERSION: string = packageJson.version;
const RUNTIME_ENV: string =
  (import.meta.env.VITE_PRAIRIE_MODE as string | undefined) ?? "mock";

/**
 * AppFooter — persistent footer with a collapsible keyboard-shortcut map and
 * brand meta. Shortcuts collapse by default so the footer stays a calm single
 * line; teachers who rely on the visual map can pin it open, and the choice
 * persists across sessions in localStorage.
 */
export default function AppFooter({ onOpenShortcuts, classroomId }: Props = {}) {
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
        <div
          id="app-footer-shortcuts"
          className="app-footer__shortcuts"
          aria-label="Keyboard shortcuts"
        >
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
      <div className="app-footer__body">
        <div className="app-footer__meta">
          <div className="app-footer__identity" aria-label="Application context">
            <span className="app-footer__brand">PrairieClassroom OS</span>
            <span className="app-footer__context">Gemma 4 Good Hackathon demo build</span>
          </div>
          <div className="app-footer__actions">
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
        </div>
        {/* Phase E1 (2026-04-27) — mono identity rail. Three quiet
            slots (classroom code, runtime env, version) anchor the bottom
            of the footer as a build-stamp / status rail. The rail renders
            when at least one slot has a value; when classroomId is missing
            we still show env + version so support and judging contexts
            stay legible. */}
        <div className="app-footer__rail" role="group" aria-label="Build context">
          {classroomId ? (
            <span className="app-footer__rail-slot" data-rail-slot="classroom">
              <span className="app-footer__rail-key">classroom</span>
              <span className="app-footer__rail-value">{classroomId}</span>
            </span>
          ) : null}
          <span className="app-footer__rail-slot" data-rail-slot="env">
            <span className="app-footer__rail-key">env</span>
            <span className="app-footer__rail-value">{RUNTIME_ENV}</span>
          </span>
          <span className="app-footer__rail-slot" data-rail-slot="version">
            <span className="app-footer__rail-key">v</span>
            <span className="app-footer__rail-value">{APP_VERSION}</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
