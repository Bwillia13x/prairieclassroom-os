import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import NothingInstrumentButton from "../NothingInstrumentButton";

function DummyIcon() {
  return <svg data-testid="dummy-icon" viewBox="0 0 24 24" />;
}

describe("NothingInstrumentButton", () => {
  it("renders as a button with the provided aria-label and icon slot", () => {
    render(
      <NothingInstrumentButton aria-label="Generate plan">
        <DummyIcon />
      </NothingInstrumentButton>,
    );
    const btn = screen.getByRole("button", { name: /generate plan/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain("nothing-btn");
    expect(btn.className).toContain("nothing-btn--md");
    expect(screen.getByTestId("dummy-icon")).toBeInTheDocument();
  });

  it("applies size, tone, and showTicks modifier classes", () => {
    render(
      <NothingInstrumentButton
        aria-label="Primary"
        size="xl"
        tone="accent"
        showTicks
      >
        <DummyIcon />
      </NothingInstrumentButton>,
    );
    const btn = screen.getByRole("button", { name: /primary/i });
    expect(btn.className).toContain("nothing-btn--xl");
    expect(btn.className).toContain("nothing-btn--accent");
    expect(btn.className).toContain("nothing-btn--ticks");
  });

  it("sets data-anim to the selected fire animation", () => {
    render(
      <NothingInstrumentButton aria-label="X" fireAnim="refresh">
        <DummyIcon />
      </NothingInstrumentButton>,
    );
    expect(screen.getByRole("button")).toHaveAttribute("data-anim", "refresh");
  });

  it("fires onClick and adds is-firing class after click", () => {
    vi.useFakeTimers();
    const onClick = vi.fn();
    render(
      <NothingInstrumentButton aria-label="Confirm" fireAnim="check" onClick={onClick}>
        <DummyIcon />
      </NothingInstrumentButton>,
    );

    const btn = screen.getByRole("button", { name: /confirm/i });
    fireEvent.click(btn);

    expect(onClick).toHaveBeenCalledOnce();
    expect(btn.className).toContain("is-firing");

    // After the fire duration + buffer, the class should be removed.
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(btn.className).not.toContain("is-firing");
    vi.useRealTimers();
  });

  it("does not toggle is-firing when fireAnim='none'", () => {
    render(
      <NothingInstrumentButton aria-label="Plain" fireAnim="none">
        <DummyIcon />
      </NothingInstrumentButton>,
    );
    const btn = screen.getByRole("button", { name: /plain/i });
    fireEvent.click(btn);
    expect(btn.className).not.toContain("is-firing");
  });

  it("disables interaction and does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <NothingInstrumentButton aria-label="Off" disabled onClick={onClick}>
        <DummyIcon />
      </NothingInstrumentButton>,
    );
    const btn = screen.getByRole("button", { name: /off/i });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("sets aria-busy and renders a spinner slot when loading", () => {
    const { container } = render(
      <NothingInstrumentButton aria-label="Wait" loading>
        <DummyIcon />
      </NothingInstrumentButton>,
    );
    const btn = screen.getByRole("button", { name: /wait/i });
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn).toBeDisabled();
    expect(btn.className).toContain("nothing-btn--loading");
    expect(container.querySelector(".nothing-btn__spinner")).toBeInTheDocument();
  });

  it("forwards data-testid to the underlying button", () => {
    render(
      <NothingInstrumentButton aria-label="T" data-testid="today-hero-action">
        <DummyIcon />
      </NothingInstrumentButton>,
    );
    expect(screen.getByTestId("today-hero-action").tagName).toBe("BUTTON");
  });
});
