/**
 * TabOverflowMenu — "More ▾" dropdown for sub-tabs that don't fit in the
 * visible tabstrip. The parent measures which tabs overflow and passes
 * them in; this component renders the trigger + delegates the floating
 * menu to the shared Popover/Menu primitive.
 *
 * 2026-04-25 — migrated to Popover/Menu. Previously the menu rendered as
 * an inline sibling of the trigger inside the horizontally-scrolling
 * tabstrip; the absolute-positioned overlay was clipped by the scroll
 * container and pushed the nav layout when the user opened it. Popover
 * portals the surface into document.body and positions it via fixed
 * coordinates, so the layout is no longer disturbed.
 */
import { useId, useRef, useState } from "react";
import {
  TAB_META,
  TOOL_META,
  isActiveTab,
  isActiveTool,
  type ActiveTab,
  type NavTarget,
} from "../appReducer";
import { Menu, MenuItem, Popover } from "./popover";

interface Props {
  tabs: NavTarget[];
  activeTab: NavTarget;
  onSelect: (target: NavTarget) => void;
  /** Optional per-tab badge count (so hidden alerts still surface on the trigger). */
  getBadgeCount?: (target: NavTarget) => number;
}

function labelFor(target: NavTarget): string {
  if (isActiveTab(target)) return TAB_META[target as ActiveTab].label;
  if (isActiveTool(target)) return TOOL_META[target].label;
  return String(target);
}

export default function TabOverflowMenu({ tabs, activeTab, onSelect, getBadgeCount }: Props) {
  const [open, setOpen] = useState(false);
  const [initialIdx, setInitialIdx] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const activeInOverflow = tabs.includes(activeTab);
  const hiddenBadgeTotal = getBadgeCount
    ? tabs.reduce((sum, t) => sum + (getBadgeCount(t) || 0), 0)
    : 0;

  function close() {
    setOpen(false);
  }

  function handleTriggerClick() {
    setInitialIdx(Math.max(0, tabs.indexOf(activeTab)));
    setOpen((o) => !o);
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setInitialIdx(0);
      setOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setInitialIdx(tabs.length - 1);
      setOpen(true);
    }
  }

  function choose(tab: NavTarget) {
    onSelect(tab);
    setOpen(false);
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
        onClick={handleTriggerClick}
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
      <Popover
        open={open}
        onClose={close}
        anchorRef={triggerRef}
        placement="bottom-end"
        role="menu"
        id={menuId}
        ariaLabel="More tools"
      >
        <Menu
          ariaLabel="More tools"
          initialActiveIndex={initialIdx}
          onClose={close}
        >
          {tabs.map((tab) => {
            const count = getBadgeCount ? getBadgeCount(tab) : 0;
            return (
              <MenuItem
                key={tab}
                onSelect={() => choose(tab)}
                selected={activeTab === tab}
              >
                <span>{labelFor(tab)}</span>
                {count > 0 ? (
                  <span
                    className="shell-nav__badge shell-nav__badge--alert"
                    aria-label={`${count} pending`}
                  >
                    {count}
                  </span>
                ) : null}
              </MenuItem>
            );
          })}
        </Menu>
      </Popover>
    </div>
  );
}
