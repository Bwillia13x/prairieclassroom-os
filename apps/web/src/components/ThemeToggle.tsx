import { useCallback, useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "prairie-theme";
const ICONS: Record<Theme, string> = { light: "L", dark: "D", system: "A" };
const LABELS: Record<Theme, string> = { light: "Light", dark: "Dark", system: "Auto" };
const CYCLE: Theme[] = ["system", "light", "dark"];

function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch { /* noop */ }
  return "system";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(loadTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const cycle = useCallback(() => {
    setTheme((current) => {
      const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* noop */ }
      return next;
    });
  }, []);

  return (
    <button
      className="btn btn--ghost theme-toggle"
      onClick={cycle}
      type="button"
      aria-label={`Color theme: ${LABELS[theme]}. Click to change.`}
      title={`Theme: ${LABELS[theme]}`}
    >
      <span aria-hidden="true">{ICONS[theme]}</span>
      <span className="theme-toggle-label">{LABELS[theme]}</span>
    </button>
  );
}
