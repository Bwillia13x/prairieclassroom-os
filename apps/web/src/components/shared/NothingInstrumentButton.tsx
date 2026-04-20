import { useCallback, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import NothingSpinner from "./NothingSpinner";
import "./NothingInstrumentButton.css";

/**
 * Circular "N0thing OS" instrument button — dashed inner face,
 * optional compass tick marks, and a fire animation that plays
 * on click. Reserved for high-signal moments: Today hero action,
 * generation CTAs on key panels, primary quick actions.
 *
 * Pass any icon as a child (SectionIcon, SVG, or custom mark).
 */
export type NothingInstrumentAnim =
  | "bounce"
  | "spin"
  | "pulse"
  | "shake"
  | "check"
  | "close"
  | "trash"
  | "refresh"
  | "upload"
  | "drop"
  | "spark"
  | "heartbeat"
  | "slide-right"
  | "back"
  | "signal"
  | "none";

export type NothingInstrumentSize = "sm" | "md" | "lg" | "xl";
export type NothingInstrumentTone =
  | "default"
  | "accent"
  | "success"
  | "warning"
  | "danger";

interface NothingInstrumentButtonProps {
  /** Required — rendered as the button's accessible name. */
  "aria-label": string;
  /** Icon glyph — SectionIcon, inline SVG, or any mark. */
  children: ReactNode;
  /** Fire animation played on click. Defaults to "pulse". */
  fireAnim?: NothingInstrumentAnim;
  /** Well diameter tier: sm 36 / md 48 / lg 56 / xl 72. Defaults to "md". */
  size?: NothingInstrumentSize;
  /** Hover tone accent. Defaults to "default". */
  tone?: NothingInstrumentTone;
  /** Show N/E/S/W compass tick marks (ideal at lg/xl). Defaults to false. */
  showTicks?: boolean;
  /** Click handler. Fires alongside the animation. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Disables interaction and lowers opacity. */
  disabled?: boolean;
  /** Replaces the icon with a segmented-ring spinner. */
  loading?: boolean;
  /** Form type. Defaults to "button". */
  type?: "button" | "submit" | "reset";
  /** Merges into the root class list. */
  className?: string;
  /** Forwarded for tests / smoke selectors. */
  "data-testid"?: string;
  /** ARIA description id if the caller has a separate help text. */
  "aria-describedby"?: string;
}

function joinClassNames(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

// Fire animation nominal durations (ms) matched to the CSS keyframes.
const FIRE_DURATIONS: Record<NothingInstrumentAnim, number> = {
  "bounce": 520,
  "spin": 640,
  "pulse": 460,
  "shake": 480,
  "check": 520,
  "close": 420,
  "trash": 560,
  "refresh": 720,
  "upload": 560,
  "drop": 520,
  "spark": 460,
  "heartbeat": 720,
  "slide-right": 420,
  "back": 420,
  "signal": 560,
  "none": 0,
};

export default function NothingInstrumentButton({
  "aria-label": ariaLabel,
  children,
  fireAnim = "pulse",
  size = "md",
  tone = "default",
  showTicks = false,
  onClick,
  disabled = false,
  loading = false,
  type = "button",
  className,
  "data-testid": dataTestId,
  "aria-describedby": ariaDescribedBy,
}: NothingInstrumentButtonProps) {
  const [firing, setFiring] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDisabled = disabled || loading;

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) return;

      if (fireAnim !== "none") {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        setFiring(true);
        timeoutRef.current = setTimeout(() => {
          setFiring(false);
        }, FIRE_DURATIONS[fireAnim] + 40);
      }

      onClick?.(event);
    },
    [fireAnim, isDisabled, onClick],
  );

  const classes = joinClassNames(
    "nothing-btn",
    `nothing-btn--${size}`,
    tone !== "default" && `nothing-btn--${tone}`,
    showTicks && "nothing-btn--ticks",
    loading && "nothing-btn--loading",
    firing && "is-firing",
    className,
  );

  const spinnerSize = size === "sm" ? "sm" : size === "xl" ? "lg" : "md";

  return (
    <button
      type={type}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading ? "true" : undefined}
      disabled={isDisabled}
      className={classes}
      data-anim={fireAnim}
      data-testid={dataTestId}
      onClick={handleClick}
    >
      <span className="nothing-btn__face" aria-hidden="true" />
      <span className="nothing-btn__icon" aria-hidden="true">
        {children}
      </span>
      {loading && (
        <span className="nothing-btn__spinner">
          <NothingSpinner
            variant="seg-ring"
            size={spinnerSize}
            label="Loading"
            decorative
          />
        </span>
      )}
    </button>
  );
}
