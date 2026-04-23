/**
 * TabOverflowMenu — keyboard focus + selection smoke test.
 *
 * The measurement logic that decides WHICH tabs overflow lives in App.tsx
 * and is impractical to exercise in jsdom (no real layout widths). This
 * file covers the menu itself: arrow-key cycling, Escape-to-close, and
 * clicking a menu item invoking the callback.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TabOverflowMenu from "../TabOverflowMenu";
import type { NavTarget } from "../../appReducer";

const HIDDEN: NavTarget[] = ["ea-briefing", "ea-load", "survival-packet"];

describe("TabOverflowMenu", () => {
  it("opens on trigger click and shows every overflow tab as a menuitem", () => {
    render(
      <TabOverflowMenu tabs={HIDDEN} activeTab="log-intervention" onSelect={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId("shell-nav-tabs-overflow-trigger"));
    expect(screen.getAllByRole("menuitem")).toHaveLength(HIDDEN.length);
  });

  it("selects a tab when a menuitem is clicked and closes the menu", () => {
    const onSelect = vi.fn();
    render(<TabOverflowMenu tabs={HIDDEN} activeTab="log-intervention" onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId("shell-nav-tabs-overflow-trigger"));
    const eaLoadItem = screen.getByRole("menuitem", { name: /EA Load Balance/i });
    fireEvent.click(eaLoadItem);
    expect(onSelect).toHaveBeenCalledWith("ea-load");
    // Menu should be closed (no menuitems rendered).
    expect(screen.queryAllByRole("menuitem")).toHaveLength(0);
  });

  it("cycles focus with ArrowDown/ArrowUp and closes on Escape", () => {
    render(
      <TabOverflowMenu tabs={HIDDEN} activeTab="log-intervention" onSelect={vi.fn()} />,
    );
    const trigger = screen.getByTestId("shell-nav-tabs-overflow-trigger");
    // Open via ArrowDown on trigger
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(HIDDEN.length);
    // ArrowDown on the menu cycles through items; first is focused by effect
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1], { key: "ArrowUp" });
    expect(document.activeElement).toBe(items[0]);
    // Escape closes the menu (fires on document)
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryAllByRole("menuitem")).toHaveLength(0);
  });

  it("surfaces total pending badge count on trigger when overflowed tab has alerts", () => {
    render(
      <TabOverflowMenu
        tabs={HIDDEN}
        activeTab="log-intervention"
        onSelect={vi.fn()}
        getBadgeCount={(tab) => (tab === "ea-briefing" ? 3 : 0)}
      />,
    );
    const trigger = screen.getByTestId("shell-nav-tabs-overflow-trigger");
    expect(trigger.textContent).toMatch(/3/);
  });
});
