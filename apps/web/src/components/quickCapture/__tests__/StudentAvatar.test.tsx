import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StudentAvatar from "../StudentAvatar";

describe("StudentAvatar", () => {
  it("renders the first letter of the alias", () => {
    render(<StudentAvatar alias="Ari" selected={false} onToggle={vi.fn()} />);
    // The initial span is aria-hidden but findable by text
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("falls back to '?' when alias is empty string", () => {
    render(<StudentAvatar alias="" selected={false} onToggle={vi.fn()} />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("reflects an unselected state with 'Select' label and aria-pressed=false", () => {
    render(<StudentAvatar alias="Ari" selected={false} onToggle={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "Select Ari" });
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("reflects a selected state with 'Unselect' label and aria-pressed=true", () => {
    render(<StudentAvatar alias="Ari" selected={true} onToggle={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "Unselect Ari" });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onToggle exactly once with the alias on click", async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<StudentAvatar alias="Ari" selected={false} onToggle={spy} />);
    await user.click(screen.getByRole("button"));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("Ari");
  });

  it("does not call onToggle when disabled", async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<StudentAvatar alias="Ari" selected={false} onToggle={spy} disabled />);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(spy).not.toHaveBeenCalled();
  });
});
