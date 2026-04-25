import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";

export interface MenuProps {
  children: ReactNode;
  ariaLabel?: string;
  /** Initial active index — defaults to 0. Pass the index of the
   *  currently-selected option so the menu opens with that row already
   *  focused. */
  initialActiveIndex?: number;
  /** Called when Tab moves focus out of the menu. Pass the popover's
   *  onClose so Tab continues naturally and the menu closes — this is
   *  the native menu pattern (vs. dialogs, which trap). */
  onClose?: () => void;
}

interface MenuItemRefProps {
  ref: (el: HTMLButtonElement | null) => void;
  "data-active"?: "true" | undefined;
  tabIndex: number;
  onClickCapture: () => void;
}

/**
 * Menu — keyboard-navigable list of MenuItem children.
 *
 * Implements the pattern that TabOverflowMenu got right: arrow Up/Down
 * cycle, Home/End jump, type-ahead by first character, Tab leaves the
 * menu (so focus continues out of the popover). cloneElement injects a
 * ref + tabIndex + data-active onto each MenuItem child without forcing
 * the call site to wire it manually.
 *
 * MenuItem siblings that aren't valid elements (text, fragments, null)
 * are passed through unchanged so callers can mix headers/dividers.
 */
export default function Menu({
  children,
  ariaLabel,
  initialActiveIndex = 0,
  onClose,
}: MenuProps) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeIdx, setActiveIdx] = useState(initialActiveIndex);

  // Build the wrapped children + collect indices of focusable items.
  const { rendered, itemCount } = useMemo(() => {
    const flat = Children.toArray(children);
    let itemCursor = 0;
    const wrapped = flat.map((child) => {
      if (!isValidElement(child)) return child;
      const element = child as ReactElement;
      // Treat any element with a displayName/role of menuitem as focusable.
      // We identify MenuItem by its assigned displayName so dividers/headers
      // pass through untouched.
      const componentType = element.type as { displayName?: string } | string;
      const isMenuItem =
        typeof componentType !== "string" &&
        (componentType as { displayName?: string }).displayName === "MenuItem";
      if (!isMenuItem) return element;
      const myIndex = itemCursor++;
      const enhanced: MenuItemRefProps = {
        ref: (el) => {
          itemRefs.current[myIndex] = el;
        },
        "data-active": activeIdx === myIndex ? "true" : undefined,
        tabIndex: -1,
        onClickCapture: () => setActiveIdx(myIndex),
      };
      return cloneElement(element, enhanced as Partial<unknown>);
    });
    return { rendered: wrapped, itemCount: itemCursor };
  }, [children, activeIdx]);

  // Sync DOM focus to the rover. Skipping this in jsdom would still work,
  // but we want real keyboard users to *see* the focused row.
  useEffect(() => {
    if (itemCount === 0) return;
    itemRefs.current[activeIdx]?.focus();
  }, [activeIdx, itemCount]);

  // Reset rover when the item set changes (e.g. the parent re-opens the menu
  // with a different list).
  useEffect(() => {
    if (activeIdx >= itemCount) {
      setActiveIdx(Math.max(0, itemCount - 1));
    }
  }, [itemCount, activeIdx]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (itemCount === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIdx((i) => (i + 1) % itemCount);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIdx((i) => (i - 1 + itemCount) % itemCount);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIdx(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIdx(itemCount - 1);
    } else if (event.key === "Tab") {
      // Don't preventDefault — let Tab move focus naturally out of the menu.
      // Closing the popover means the menu unmounts, leaving the user on the
      // next focusable element in document order.
      onClose?.();
    } else if (event.key.length === 1 && /\S/.test(event.key)) {
      // Type-ahead: jump to the next item whose visible text starts with the
      // typed character. Cheap to compute on each keystroke since menus are
      // small (typical: 3-12 items).
      const typed = event.key.toLowerCase();
      const start = (activeIdx + 1) % itemCount;
      for (let offset = 0; offset < itemCount; offset += 1) {
        const idx = (start + offset) % itemCount;
        const text = itemRefs.current[idx]?.textContent?.trim().toLowerCase() ?? "";
        if (text.startsWith(typed)) {
          setActiveIdx(idx);
          break;
        }
      }
    }
  }

  return (
    <div
      role="menu"
      aria-label={ariaLabel}
      className="popover-menu"
      onKeyDown={onKeyDown}
    >
      {rendered}
    </div>
  );
}
