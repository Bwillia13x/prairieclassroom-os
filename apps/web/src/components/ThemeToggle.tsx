import { useCallback, useEffect, useState } from "react";
import SectionIcon, { type SectionIconName } from "./SectionIcon";
import {
  NothingInstrumentButton,
  type NothingInstrumentAnim,
} from "./shared";

type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "prairie-theme";
const LABELS: Record<Theme, string> = { light: "Light", dark: "Dark", system: "Auto" };
const CYCLE: Theme[] = ["system", "light", "dark"];
const ICON_NAME: Record<Theme, SectionIconName> = {
  system: "refresh",
  light: "sun",
  dark: "moon",
};

/**
 * Per-theme fire animation:
 *   system → `refresh` (spins through the cycle)
 *   light  → `spark`   (warm flash on)
 *   dark   → `pulse`   (quiet night settle)
 */
const FIRE_ANIM: Record<Theme, NothingInstrumentAnim> = {
  system: "refresh",
  light: "spark",
  dark: "pulse",
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

  // Fire animation tracks the theme we are CURRENTLY showing, i.e. the
  // theme the user just pressed into. We capture it at render time so the
  // instrument spinner runs the right animation for the cycle step.
  return (
    <NothingInstrumentButton
      size="sm"
      tone="accent"
      fireAnim={FIRE_ANIM[theme]}
      onClick={cycle}
      aria-label={`Color theme: ${LABELS[theme]}. Click to change.`}
      className="theme-toggle-instrument"
    >
      <SectionIcon name={ICON_NAME[theme]} className="theme-toggle__icon" />
    </NothingInstrumentButton>
  );
}
