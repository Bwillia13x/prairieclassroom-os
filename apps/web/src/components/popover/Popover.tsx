import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useFloatingPosition, type Placement } from "../../hooks/useFloatingPosition";
import "./Popover.css";

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  /** The trigger element. Position is computed from its bounding rect. */
  anchorRef: RefObject<HTMLElement | null>;
  /** Default: bottom-start. Flips to top automatically if no room below. */
  placement?: Placement;
  /** Trap Tab/Shift+Tab inside the popover. Defaults to true for `role="dialog"`
   *  and false for `role="menu"` — menus should let Tab continue outside
   *  naturally so the user keeps moving through the page tab order. */
  trapFocus?: boolean;
  /** "auto" (default) shows a backdrop only on coarse pointers (touch);
   *  "always" forces it; "never" suppresses it. */
  scrim?: "auto" | "always" | "never";
  /** ARIA role on the surface. Most call sites want "menu". Use "dialog"
   *  for content-rich popovers (info, summary, form), and "alertdialog"
   *  for destructive/important confirmations. */
  role?: "menu" | "dialog" | "alertdialog";
  /** Optional id assigned to the surface so the trigger can reference it
   *  via `aria-controls`. */
  id?: string;
  /** Extra className applied to the surface alongside `popover-surface`.
   *  Use for content-rich popovers that need wider width or custom
   *  padding (e.g. a switcher with embedded form fields). */
  surfaceClassName?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  children: ReactNode;
  "data-testid"?: string;
}

/**
 * Popover — portaled, viewport-fixed surface anchored to a trigger.
 *
 * Concentrates the four primitives every dropdown in this codebase used
 * to reimplement: portal escape from clipped ancestors, ESC-to-close,
 * outside-click-to-close, and focus return on close. Position + flip is
 * delegated to useFloatingPosition.
 *
 * Caller owns the trigger and the open state. The trigger should set
 * aria-expanded={open} and aria-haspopup={role}.
 */
export default function Popover({
  open,
  onClose,
  anchorRef,
  placement = "bottom-start",
  trapFocus,
  scrim = "auto",
  role = "menu",
  id,
  surfaceClassName,
  ariaLabel,
  ariaLabelledBy,
  children,
  "data-testid": testId,
}: PopoverProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const fallbackId = useId();
  // Menus should NOT trap focus — Tab continues out naturally and the menu
  // closes (handled by the Menu component). Dialogs (incl. alertdialogs)
  // default to trapping.
  const shouldTrapFocus = trapFocus ?? role !== "menu";
  useFocusTrap(surfaceRef, open && shouldTrapFocus);

  const { top, left, transformOrigin, resolvedPlacement, ready } = useFloatingPosition({
    anchorRef,
    popoverRef: surfaceRef,
    open,
    placement,
  });

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (surfaceRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const showScrim =
    scrim === "always" ||
    (scrim === "auto" /* CSS gates scrim on (pointer: coarse) */);

  const surface = (
    <div
      className="popover-root"
      data-testid={testId}
      data-placement={resolvedPlacement}
      data-ready={ready ? "true" : "false"}
    >
      {showScrim ? (
        <div
          className="popover-scrim"
          data-scrim-mode={scrim}
          aria-hidden="true"
          onMouseDown={onClose}
        />
      ) : null}
      <div
        ref={surfaceRef}
        id={id}
        className={surfaceClassName ? `popover-surface ${surfaceClassName}` : "popover-surface"}
        role={role}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ?? (ariaLabel ? undefined : fallbackId)}
        style={{ top, left, transformOrigin }}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(surface, document.body);
}
