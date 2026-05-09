import { useEffect, useState } from "react";
import { TAB_ORDER, TAB_META } from "../appReducer";
import { normalizeApiBase } from "../api";
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
 * `runtimeEnv` starts from `VITE_PRAIRIE_MODE` if it's exposed at
 * build / dev time, then refreshes from `/api/health` when the
 * orchestrator reports the live inference lane. The fallback remains
 * `"mock"` because that matches the project's documented default
 * no-cost lane.
 */
const APP_VERSION: string = packageJson.version;
const FALLBACK_RUNTIME_ENV: string =
  (import.meta.env.VITE_PRAIRIE_MODE as string | undefined) ?? "mock";
const API_HEALTH_URL = `${normalizeApiBase(import.meta.env.VITE_API_URL)}/health`;

interface HealthPayload {
  inference_provider?: unknown;
}

function readRuntimeEnvFromHealth(payload: HealthPayload): string | null {
  const provider = payload.inference_provider;
  return typeof provider === "string" && provider.trim() ? provider.trim() : null;
}

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
  const [runtimeEnv, setRuntimeEnv] = useState(FALLBACK_RUNTIME_ENV);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, expanded ? "1" : "0");
    } catch {
      // localStorage may be unavailable (private mode, storage quota); the
      // footer still works without persistence.
    }
  }, [expanded]);

  useEffect(() => {
    const controller = new AbortController();

    async function refreshRuntimeEnv() {
      try {
        const res = await fetch(API_HEALTH_URL, { signal: controller.signal });
        if (!res.ok) return;
        const payload = await res.json() as HealthPayload;
        const provider = readRuntimeEnvFromHealth(payload);
        if (provider) setRuntimeEnv(provider);
      } catch {
        // Health is best-effort footer context; never block the app shell.
      }
    }

    void refreshRuntimeEnv();
    return () => controller.abort();
  }, []);

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
            <span className="app-footer__rail-value">{runtimeEnv}</span>
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
