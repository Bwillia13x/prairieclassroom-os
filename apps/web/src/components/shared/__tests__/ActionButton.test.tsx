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

  it("renders leadingIcon inside an aria-hidden btn__leading-icon span", () => {
    const { container } = render(
      <ActionButton leadingIcon={<svg data-testid="lead" />} onClick={() => {}}>
        Save
      </ActionButton>,
    );
    const slot = container.querySelector(".btn__leading-icon");
    expect(slot).toBeInTheDocument();
    expect(slot).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("lead")).toBeInTheDocument();
  });

  it("renders trailingIcon inside an aria-hidden btn__trailing-icon span", () => {
    const { container } = render(
      <ActionButton trailingIcon={<svg data-testid="trail" />} onClick={() => {}}>
        Next
      </ActionButton>,
    );
    const slot = container.querySelector(".btn__trailing-icon");
    expect(slot).toBeInTheDocument();
    expect(slot).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("trail")).toBeInTheDocument();
  });

  it("forwards data-testid to the underlying button element", () => {
    // scripts/smoke-browser.mjs relies on this pass-through to click
    // "Generate sub packet" via getByTestId. If the prop is dropped,
    // the smoke test silently stops finding the button.
    render(
      <ActionButton data-testid="generate-survival-packet-submit" onClick={() => {}}>
        Generate sub packet
      </ActionButton>,
    );
    const btn = screen.getByTestId("generate-survival-packet-submit");
    expect(btn.tagName).toBe("BUTTON");
  });
});
