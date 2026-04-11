import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActionButton from "../ActionButton";

describe("ActionButton", () => {
  it("renders children and fires onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<ActionButton onClick={onClick}>Save</ActionButton>);

    const btn = screen.getByRole("button", { name: /save/i });
    expect(btn).toBeEnabled();

    await user.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("applies the correct variant class", () => {
    render(<ActionButton variant="danger" onClick={() => {}}>Delete</ActionButton>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("action-button--danger");
  });

  it("defaults to primary variant", () => {
    render(<ActionButton onClick={() => {}}>Go</ActionButton>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("action-button--primary");
  });

  it("disables the button when disabled prop is true", () => {
    render(<ActionButton disabled onClick={() => {}}>Nope</ActionButton>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("disables button and sets aria-busy when loading", () => {
    render(<ActionButton loading onClick={() => {}}>Loading</ActionButton>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("renders a spinner element when loading", () => {
    const { container } = render(
      <ActionButton loading onClick={() => {}}>Wait</ActionButton>,
    );
    expect(container.querySelector(".action-button__spinner")).toBeInTheDocument();
  });

  it("does not fire onClick when loading", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<ActionButton loading onClick={onClick}>Click</ActionButton>);
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});
