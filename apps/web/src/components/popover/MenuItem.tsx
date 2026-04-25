import type { ButtonHTMLAttributes, Ref, ReactNode } from "react";

export interface MenuItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "role" | "onSelect" | "type"> {
  /** Fires when the item is clicked or activated by Enter/Space. */
  onSelect: () => void;
  /** Visual selected state — paints the soft-accent fill and sets aria-checked
   *  when the item is in a menuitemradio role. */
  selected?: boolean;
  /** Pass "menuitemradio" or "menuitemcheckbox" for selectable lists.
   *  Defaults to "menuitem". */
  role?: "menuitem" | "menuitemradio" | "menuitemcheckbox";
  children: ReactNode;
  /** Forwarded by Menu's cloneElement; do not pass manually. */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * MenuItem — single row inside a Menu. The ref + tabIndex + data-active are
 * injected by the parent Menu via cloneElement, so callers only need to
 * provide `onSelect` + visible content.
 */
function MenuItem({
  onSelect,
  selected,
  role = "menuitem",
  children,
  ref,
  ...rest
}: MenuItemProps) {
  return (
    <button
      ref={ref}
      type="button"
      role={role}
      className="popover-menu-item"
      data-selected={selected ? "true" : undefined}
      aria-checked={role === "menuitemradio" ? selected ?? false : undefined}
      onClick={onSelect}
      {...rest}
    >
      {children}
    </button>
  );
}

MenuItem.displayName = "MenuItem";

export default MenuItem;
