import type { SectionIconName } from "../SectionIcon";
import SectionIcon from "../SectionIcon";
import "./OutputActionBar.css";

export type OutputActionKey =
  | "print"
  | "copy"
  | "download"
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
  /** When true, the button label is collapsed on narrow viewports but remains as aria-label. */
  collapseOnNarrow?: boolean;
}

export interface OutputActionBarProps {
  actions: OutputAction[];
  /** Label rendered at the start of the bar for screen readers and visible context. */
  contextLabel?: string;
  /** Override sticky positioning — default true. */
  sticky?: boolean;
  /** Optional test id for integration tests. */
  "data-testid"?: string;
}

export default function OutputActionBar({
  actions,
  contextLabel,
  sticky = true,
  "data-testid": dataTestId,
}: OutputActionBarProps) {
  const navLabel = contextLabel ?? "Output actions";

  return (
    <nav
      className={`output-action-bar${sticky ? " output-action-bar--sticky" : ""}`}
      aria-label={navLabel}
      data-testid={dataTestId}
    >
      <ul className="output-action-bar__list">
        {actions.map((action) => {
          const variant = action.variant ?? "ghost";
          const title = action.tooltip ?? (action.disabled ? action.disabledReason : undefined);
          return (
            <li key={action.key} className="output-action-bar__item">
              <button
                type="button"
                className={`output-action-bar__btn output-action-bar__btn--${variant}${action.collapseOnNarrow ? " output-action-bar__btn--collapsible" : ""}`}
                aria-label={action.label}
                aria-disabled={action.disabled ? "true" : undefined}
                disabled={action.disabled}
                title={title}
                onClick={() => {
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
                }}
                data-action-key={action.key}
              >
                <SectionIcon name={action.icon} className="output-action-bar__icon" />
                <span className="output-action-bar__label">{action.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
