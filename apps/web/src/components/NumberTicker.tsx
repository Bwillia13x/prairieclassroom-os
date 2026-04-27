import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

/**
 * NumberTicker — animates a numeric value between transitions.
 *
 * Designed for the triage counts, health indicators, and metric figures on
 * the Today dashboard where a snapshot refresh causes the underlying number
 * to change. Rather than flipping instantly (which reads as a page mutation
 * and is easy to miss), the component tweens the displayed value with an
 * ease-out curve so the change is legible and draws the eye for ~500ms.
 *
 * Respects prefers-reduced-motion by snapping to the target on that pref.
 */

interface Props {
  /** Target numeric value. Non-integer values are rendered with the supplied locale + options. */
  value: number;
  /** Tween duration in ms. Defaults to --motion-slow (420ms) visually. */
  durationMs?: number;
  /** Optional className forwarded to the wrapper span. */
  className?: string;
  /** Intl.NumberFormat options (locale-aware formatting). */
  format?: Intl.NumberFormatOptions;
  /** BCP-47 locale. Defaults to en-CA (Alberta). */
  locale?: string;
  /** Accessible label for the final target value. If omitted the value itself is used. */
  ariaLabel?: string;
}

const DEFAULT_DURATION = 420;

function ease(t: number) {
  // cubic-bezier equivalent of --ease-out-expo (0.16, 1, 0.3, 1) approximation.
  return 1 - Math.pow(1 - t, 4);
}

export default function NumberTicker({
  value,
  durationMs = DEFAULT_DURATION,
  className,
  format,
  locale = "en-CA",
  ariaLabel,
}: Props) {
  const [displayValue, setDisplayValue] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced || value === displayValue) {
      setDisplayValue(value);
      fromRef.current = value;
      return;
    }

    fromRef.current = displayValue;
    startRef.current = null;

    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now;
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / durationMs);
      const eased = ease(t);
      const next = fromRef.current + (value - fromRef.current) * eased;
      setDisplayValue(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayValue(value);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // displayValue is intentionally omitted — using it would restart the
    // tween every frame. fromRef captures the starting point at commit.
  }, [value, durationMs, prefersReduced]);

  const formatter = new Intl.NumberFormat(locale, format);
  // When the caller supplies a format, trust it to handle rounding
  // correctly (percent style, decimal style with explicit fraction digits,
  // currency, etc.). Without a format, the component's job is to render
  // an integer in-flight during the tween so the tick doesn't flicker
  // through fractional values.
  const hasExplicitFormat =
    format !== undefined &&
    (format.style !== undefined ||
      format.minimumFractionDigits !== undefined ||
      format.maximumFractionDigits !== undefined);
  const renderValue = hasExplicitFormat
    ? displayValue
    : Math.round(displayValue);

  // aria-label is stable across the tween (it binds to the target `value`,
  // not `displayValue`), so screen readers announce the final number once
  // when the user navigates to the element — not 25× per animation frame
  // as aria-live="polite" would do. The tween is a visual-only enhancement.
  return (
    <span className={className} aria-label={ariaLabel ?? formatter.format(value)}>
      {formatter.format(renderValue)}
    </span>
  );
}
