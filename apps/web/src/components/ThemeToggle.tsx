import { useCallback, useEffect, useState } from "react";
import SectionIcon, { type SectionIconName } from "./SectionIcon";

type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "prairie-theme";
const LABELS: Record<Theme, string> = { light: "Light", dark: "Dark", system: "Auto" };
const CYCLE: Theme[] = ["system", "light", "dark"];
const ICON_NAME: Record<Theme, SectionIconName> = {
  system: "refresh",
  light: "sun",
  dark: "moon",
};

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
      className="btn btn--ghost btn--sm btn--icon-only theme-toggle"
      onClick={cycle}
      type="button"
      aria-label={`Color theme: ${LABELS[theme]}. Click to change.`}
      title={`Theme: ${LABELS[theme]}`}
    >
      <SectionIcon name={ICON_NAME[theme]} className="theme-toggle__icon" />
    </button>
  );
}
