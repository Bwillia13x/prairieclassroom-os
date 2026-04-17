import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ShortcutSheet from "../ShortcutSheet";

describe("ShortcutSheet", () => {
  it("renders nothing when closed", () => {
    render(<ShortcutSheet open={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders shortcut rows when open", () => {
    render(<ShortcutSheet open={true} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();
    expect(screen.getByText(/jump to panel/i)).toBeInTheDocument();
    expect(screen.getByText(/command palette/i)).toBeInTheDocument();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<ShortcutSheet open={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<ShortcutSheet open={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("shortcut-sheet-backdrop"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
