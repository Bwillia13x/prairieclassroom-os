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
    render(
      <ActionButton variant="danger" onClick={() => {}}>
        Delete
      </ActionButton>,
    );
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("btn");
    expect(btn.className).toContain("btn--danger");
  });

  it("defaults to primary variant", () => {
    render(<ActionButton onClick={() => {}}>Go</ActionButton>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("btn--primary");
  });

  it("maps secondary variant to ghost class", () => {
    render(
      <ActionButton variant="secondary" onClick={() => {}}>
        Sec
      </ActionButton>,
    );
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("btn--ghost");
  });

  it("supports the new approve, soft, tertiary, and link variants", () => {
    const { rerender } = render(
      <ActionButton variant="approve" onClick={() => {}}>
        A
      </ActionButton>,
    );
    expect(screen.getByRole("button").className).toContain("btn--approve");
    rerender(
      <ActionButton variant="soft" onClick={() => {}}>
        S
      </ActionButton>,
    );
    expect(screen.getByRole("button").className).toContain("btn--soft");
    rerender(
      <ActionButton variant="tertiary" onClick={() => {}}>
        T
      </ActionButton>,
    );
    expect(screen.getByRole("button").className).toContain("btn--tertiary");
    rerender(
      <ActionButton variant="link" onClick={() => {}}>
        L
      </ActionButton>,
    );
    expect(screen.getByRole("button").className).toContain("btn--link");
  });

  it("applies size modifiers", () => {
    const { rerender } = render(
      <ActionButton size="sm" onClick={() => {}}>
        S
      </ActionButton>,
    );
    expect(screen.getByRole("button").className).toContain("btn--sm");
    rerender(
      <ActionButton size="lg" onClick={() => {}}>
        L
      </ActionButton>,
    );
    expect(screen.getByRole("button").className).toContain("btn--lg");
  });

  it("disables the button when disabled prop is true", () => {
    render(
      <ActionButton disabled onClick={() => {}}>
        Nope
      </ActionButton>,
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("disables button and sets aria-busy when loading", () => {
    render(
      <ActionButton loading onClick={() => {}}>
        Loading
      </ActionButton>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn.className).toContain("btn--loading");
  });

  it("renders a .btn__spinner element when loading", () => {
    const { container } = render(
      <ActionButton loading onClick={() => {}}>
        Wait
      </ActionButton>,
    );
    expect(container.querySelector(".btn__spinner")).toBeInTheDocument();
  });

  it("does not fire onClick when loading", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <ActionButton loading onClick={onClick}>
        Click
      </ActionButton>,
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("honors the fullWidth prop via an explicit class", () => {
    render(
      <ActionButton fullWidth onClick={() => {}}>
        Wide
      </ActionButton>,
    );
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("btn--full-width");
  });
});
