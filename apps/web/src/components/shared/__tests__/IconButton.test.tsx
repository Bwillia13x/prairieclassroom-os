import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IconButton from "../IconButton";

describe("IconButton", () => {
  it("renders an accessible button with the given aria-label", () => {
    render(
      <IconButton aria-label="Print" onClick={() => {}}>
        <svg data-testid="print-icon" />
      </IconButton>,
    );
    const btn = screen.getByRole("button", { name: "Print" });
    expect(btn).toBeInTheDocument();
    expect(screen.getByTestId("print-icon")).toBeInTheDocument();
  });

  it("applies the icon-only and default primary classes", () => {
    render(
      <IconButton aria-label="Open" onClick={() => {}}>
        <svg />
      </IconButton>,
    );
    const btn = screen.getByRole("button", { name: "Open" });
    expect(btn.className).toContain("btn");
    expect(btn.className).toContain("btn--primary");
    expect(btn.className).toContain("btn--icon-only");
  });

  it("fires onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Close" onClick={onClick}>
        <svg />
      </IconButton>,
    );
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("honors size and variant props", () => {
    render(
      <IconButton aria-label="Delete" variant="danger" size="sm" onClick={() => {}}>
        <svg />
      </IconButton>,
    );
    const btn = screen.getByRole("button", { name: "Delete" });
    expect(btn.className).toContain("btn--danger");
    expect(btn.className).toContain("btn--sm");
  });

  it("disables onClick when loading", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Load" loading onClick={onClick}>
        <svg />
      </IconButton>,
    );
    const btn = screen.getByRole("button", { name: "Load" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});
