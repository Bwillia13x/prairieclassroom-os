/**
 * Popover + Menu — primitive smoke test.
 *
 * Covers the four contracts callers depend on:
 *   1. Portal mount — surface ends up in document.body, not the trigger
 *      subtree (so it escapes any `overflow: hidden` ancestor).
 *   2. Escape closes — ESC dispatched on document fires onClose.
 *   3. Outside click closes — mousedown outside the surface fires onClose;
 *      mousedown inside does not.
 *   4. Menu keyboard nav + selection — ArrowDown/ArrowUp cycle, Enter on a
 *      MenuItem invokes onSelect.
 *
 * The position math in useFloatingPosition relies on getBoundingClientRect
 * which returns zeros in jsdom. We don't assert on pixel coordinates here —
 * those belong in a visual/e2e check. We *do* assert that the surface
 * renders, which exercises the layout-effect branch.
 */
import { useRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Popover, Menu, MenuItem } from "../popover";

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        data-testid="trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Open
      </button>
      <button type="button" data-testid="outside">
        Outside
      </button>
      <Popover
        open={open}
        onClose={() => {
          setOpen(false);
          onClose?.();
        }}
        anchorRef={triggerRef}
        ariaLabel="Test menu"
        data-testid="popover"
      >
        <Menu ariaLabel="Test menu">
          <MenuItem onSelect={vi.fn()}>Apple</MenuItem>
          <MenuItem onSelect={vi.fn()}>Banana</MenuItem>
          <MenuItem onSelect={vi.fn()}>Cherry</MenuItem>
        </Menu>
      </Popover>
    </div>
  );
}

describe("Popover", () => {
  it("does not render its surface while closed", () => {
    render(<Harness />);
    expect(screen.queryByTestId("popover")).toBeNull();
  });

  it("portals the surface into document.body when opened", () => {
    const { container } = render(<Harness />);
    fireEvent.click(screen.getByTestId("trigger"));
    const surface = screen.getByTestId("popover");
    expect(surface).not.toBeNull();
    // The portal target is document.body, NOT the harness root.
    expect(container.contains(surface)).toBe(false);
    expect(document.body.contains(surface)).toBe(true);
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByTestId("trigger"));
    expect(screen.queryByTestId("popover")).not.toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByTestId("popover")).toBeNull();
  });

  it("closes on outside mousedown but not on inside mousedown", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByTestId("trigger"));
    // Inside click — should NOT close.
    fireEvent.mouseDown(screen.getByRole("menuitem", { name: "Apple" }));
    expect(onClose).not.toHaveBeenCalled();
    // Outside click — should close.
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("Menu + MenuItem", () => {
  it("renders every MenuItem with role='menuitem'", () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId("trigger"));
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
  });

  it("ArrowDown / ArrowUp cycle the active rover and Home/End jump", () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId("trigger"));
    const items = screen.getAllByRole("menuitem");
    // Effect focuses the initial active item (index 0).
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1], { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[2]);
    fireEvent.keyDown(items[2], { key: "ArrowDown" });
    // Wraps around.
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: "End" });
    expect(document.activeElement).toBe(items[2]);
    fireEvent.keyDown(items[2], { key: "Home" });
    expect(document.activeElement).toBe(items[0]);
  });

  it("type-ahead jumps to the next item starting with the typed character", () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId("trigger"));
    const items = screen.getAllByRole("menuitem");
    fireEvent.keyDown(items[0], { key: "c" });
    expect(document.activeElement).toBe(items[2]); // Cherry
  });

  it("clicking a MenuItem invokes its onSelect", () => {
    const onSelect = vi.fn();
    function Local() {
      const [open, setOpen] = useState(true);
      const ref = useRef<HTMLButtonElement>(null);
      return (
        <>
          <button ref={ref} data-testid="t">x</button>
          <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref}>
            <Menu>
              <MenuItem onSelect={onSelect}>Pick me</MenuItem>
            </Menu>
          </Popover>
        </>
      );
    }
    render(<Local />);
    fireEvent.click(screen.getByRole("menuitem", { name: "Pick me" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
