import type { SectionIconName } from "../SectionIcon";
import SectionIcon from "../SectionIcon";
import NothingInstrumentButton from "./NothingInstrumentButton";
import type {
  NothingInstrumentAnim,
  NothingInstrumentTone,
} from "./NothingInstrumentButton";
import "./OutputActionBar.css";

export type OutputActionKey =
  | "print"
  | "copy"
  | "download"
  | "refresh"
  | "regenerate"
  | "save-to-tomorrow"
  | "share-with-ea"
  | "review-approval";

export type OutputActionVariant = "primary" | "ghost" | "approve";

export interface OutputAction {
  key: OutputActionKey;
  label: string;
  icon: SectionIconName;
  onClick: () => void | Promise<void>;
  variant?: OutputActionVariant;
  disabled?: boolean;
  disabledReason?: string;
  tooltip?: string;
  fireAnim?: NothingInstrumentAnim;
  instrumentTone?: NothingInstrumentTone;
  renderAsInstrument?: boolean;
  /** When true, the button label is collapsed on narrow viewports but remains as aria-label. */
  collapseOnNarrow?: boolean;
}

export interface OutputActionBarProps {
  actions: OutputAction[];
  /** Label rendered at the start of the bar for screen readers and visible context. */
  contextLabel?: string;
  /** Optional distinct label for the sticky top bar when `position` is `both`. */
  topContextLabel?: string;
  /** Override top quick-action sticky positioning — bottom bars remain in flow. */
  sticky?: boolean;
  /**
   * Where the bar appears relative to the output content.
   * - "bottom" (default): render once beneath the output — pre-phase-4 behavior.
   * - "top":    render once above the output; by default only the "print" and
   *             "download" keys survive so the above-the-fold bar stays focused.
   * - "both":   render a condensed top bar (print + download) plus the full
   *             bottom bar. Useful on long printable outputs like EA Briefing.
   * 2026-04-19 OPS audit (phase 4.2).
   */
  position?: "top" | "bottom" | "both";
  /**
   * Keys to surface in the top bar when `position` is "top" or "both".
   * Defaults to `["print", "download"]`.
   */
  topKeys?: OutputActionKey[];
  /** Optional test id for integration tests. */
  "data-testid"?: string;
}

function renderBar(
  actions: OutputAction[],
  sticky: boolean,
  navLabel: string,
  dataTestId: string | undefined,
  placement: "top" | "bottom",
) {
  const shouldStick = sticky && placement === "top";

  function invokeAction(action: OutputAction) {
    try {
      const result = action.onClick();
      if (result instanceof Promise) {
        result.catch((err) => {
          // Swallow — consumers handle their own errors via disabledReason/tooltips/toasts
          console.warn(`[OutputActionBar] ${action.key} failed:`, err);
        });
      }
    } catch (err) {
      console.warn(`[OutputActionBar] ${action.key} failed:`, err);
    }
  }

  function shouldUseInstrument(action: OutputAction): boolean {
    if (action.renderAsInstrument) return true;
    if (action.key === "refresh" || action.key === "regenerate") return true;
    return /^(refresh|regenerate)\b/i.test(action.label);
  }

  function getInstrumentTone(action: OutputAction): NothingInstrumentTone {
    if (action.instrumentTone) return action.instrumentTone;
    if (action.variant === "approve") return "success";
    if (action.variant === "primary") return "accent";
    return "accent";
  }

  return (
    <nav
      className={`output-action-bar output-action-bar--${placement}${shouldStick ? " output-action-bar--sticky" : ""}`}
      aria-label={navLabel}
      data-testid={dataTestId}
    >
      <ul className="output-action-bar__list">
        {actions.map((action) => {
          const variant = action.variant ?? "ghost";
          const title = action.tooltip ?? (action.disabled ? action.disabledReason : undefined);
          const useInstrument = shouldUseInstrument(action);
          const disabledA11yProps = action.disabled
            ? ({ "aria-disabled": "true" } as const)
            : {};
          return (
            <li key={action.key} className="output-action-bar__item">
              {useInstrument ? (
                <NothingInstrumentButton
                  aria-label={action.label}
                  fireAnim={action.fireAnim ?? "refresh"}
                  tone={getInstrumentTone(action)}
                  size="md"
                  onClick={() => invokeAction(action)}
                  disabled={action.disabled}
                  className="output-action-bar__instrument"
                  data-testid={`output-action-bar-${action.key}`}
                >
                  <SectionIcon name={action.icon} className="output-action-bar__icon" />
                </NothingInstrumentButton>
              ) : (
                <button
                  type="button"
                  className={`output-action-bar__btn output-action-bar__btn--${variant}${action.collapseOnNarrow ? " output-action-bar__btn--collapsible" : ""}`}
                  aria-label={action.label}
                  disabled={action.disabled}
                  title={title}
                  onClick={() => invokeAction(action)}
                  data-action-key={action.key}
                  {...disabledA11yProps}
                >
                  <SectionIcon name={action.icon} className="output-action-bar__icon" />
                  <span className="output-action-bar__label">{action.label}</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function OutputActionBar({
  actions,
  contextLabel,
  topContextLabel,
  sticky = true,
  position = "bottom",
  topKeys = ["print", "download"],
  "data-testid": dataTestId,
}: OutputActionBarProps) {
  const navLabel = contextLabel ?? "Output actions";
  const topNavLabel = topContextLabel ?? navLabel;
  const topSubset = actions.filter((a) => topKeys.includes(a.key));

  if (position === "top") {
    return (
      <>{renderBar(topSubset.length > 0 ? topSubset : actions, sticky, topNavLabel, dataTestId, "top")}</>
    );
  }
  if (position === "both") {
    return (
      <>
        {renderBar(topSubset.length > 0 ? topSubset : actions, sticky, topNavLabel, dataTestId, "top")}
        {renderBar(actions, sticky, navLabel, dataTestId, "bottom")}
      </>
    );
  }
  // Default — preserve pre-phase-4 behavior exactly.
  return <>{renderBar(actions, sticky, navLabel, dataTestId, "bottom")}</>;
}
