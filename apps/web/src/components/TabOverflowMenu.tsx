/**
 * TabOverflowMenu — "More ▾" dropdown for sub-tabs that don't fit in
 * the visible tabstrip. The parent measures which tabs overflow and
 * passes them in; this component renders the trigger + a menu of
 * hidden tabs with arrow-key cycling and Escape-to-close.
 *
 * Accessibility: the trigger is a `button` with `aria-haspopup="menu"`
 * and `aria-expanded`; the menu items are `role="menuitem"`. A hidden
 * tab that is actually selected renders the trigger in an active state
 * so teachers can still tell where they are.
 *
 * 2026-04-19 OPS audit — part of the overflow-safe sub-tab row.
 */
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { TAB_META, type ActiveTab } from "../appReducer";

interface Props {
  tabs: ActiveTab[];
  activeTab: ActiveTab;
  onSelect: (tab: ActiveTab) => void;
  /** Optional per-tab badge count (so hidden alerts still surface on the trigger). */
  getBadgeCount?: (tab: ActiveTab) => number;
}

export default function TabOverflowMenu({ tabs, activeTab, onSelect, getBadgeCount }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();
  const activeInOverflow = tabs.includes(activeTab);
  const hiddenBadgeTotal = getBadgeCount
    ? tabs.reduce((sum, t) => sum + (getBadgeCount(t) || 0), 0)
    : 0;

  const closeMenu = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Outside click + Escape close. Only bind while open to avoid leaking handlers.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, closeMenu]);

  // Move DOM focus to the highlighted menuitem whenever it changes.
  useEffect(() => {
    if (!open) return;
    itemRefs.current[activeIdx]?.focus();
  }, [activeIdx, open]);

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setActiveIdx(0);
      setOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(tabs.length - 1);
      setOpen(true);
    }
  }

  function handleMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % tabs.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + tabs.length) % tabs.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIdx(tabs.length - 1);
    } else if (e.key === "Tab") {
      // Tab away closes the menu so focus goes back to the outer tabstrip.
      setOpen(false);
    }
  }

  function choose(tab: ActiveTab) {
    onSelect(tab);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="shell-nav__tabs-overflow">
      <button
        ref={triggerRef}
        type="button"
        className={`shell-nav__tabs-overflow-trigger${activeInOverflow ? " shell-nav__tabs-overflow-trigger--active" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          setActiveIdx(Math.max(0, tabs.indexOf(activeTab)));
          setOpen((o) => !o);
        }}
        onKeyDown={handleTriggerKeyDown}
        data-testid="shell-nav-tabs-overflow-trigger"
      >
        <span>More</span>
        <span aria-hidden="true" className="shell-nav__tabs-overflow-caret">▾</span>
        {hiddenBadgeTotal > 0 ? (
          <span
            className="shell-nav__badge shell-nav__badge--alert shell-nav__tabs-overflow-badge"
            aria-label={`${hiddenBadgeTotal} pending in overflow`}
          >
            {hiddenBadgeTotal}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          className="shell-nav__tabs-overflow-menu"
          aria-label="More tools"
          onKeyDown={handleMenuKeyDown}
        >
          {tabs.map((tab, i) => {
            const count = getBadgeCount ? getBadgeCount(tab) : 0;
            return (
              <button
                key={tab}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={`shell-nav__tabs-overflow-item${
                  activeTab === tab ? " shell-nav__tabs-overflow-item--active" : ""
                }`}
                onClick={() => choose(tab)}
              >
                <span>{TAB_META[tab].label}</span>
                {count > 0 ? (
                  <span
                    className="shell-nav__badge shell-nav__badge--alert"
                    aria-label={`${count} pending`}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
