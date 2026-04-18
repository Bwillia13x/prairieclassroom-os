import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import NumberTicker from "../NumberTicker";

/**
 * NumberTicker tests — lock the three behaviors that matter for correctness
 * and accessibility. Display tweening is tested by observing the final
 * snapped value (we don't assert intermediate raf frames to avoid a timing-
 * flake). Reduced-motion path is tested by stubbing matchMedia. Locale path
 * is tested by asserting formatted output on a value that distinguishes
 * locales.
 */

describe("NumberTicker", () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("renders the target value on mount", () => {
    render(<NumberTicker value={42} />);
    expect(screen.getByLabelText("42")).toBeInTheDocument();
    expect(screen.getByLabelText("42")).toHaveTextContent("42");
  });

  it("uses the supplied aria-label when provided", () => {
    render(<NumberTicker value={7} ariaLabel="7 open follow-ups" />);
    expect(screen.getByLabelText("7 open follow-ups")).toBeInTheDocument();
  });

  it("forwards the supplied className to the rendered span", () => {
    render(<NumberTicker value={1} className="metric__value" />);
    const el = screen.getByLabelText("1");
    expect(el).toHaveClass("metric__value");
    expect(el.tagName).toBe("SPAN");
  });

  it("snaps to the final value when prefers-reduced-motion is active", async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as typeof window.matchMedia;

    const { rerender } = render(<NumberTicker value={10} />);
    expect(screen.getByLabelText("10")).toHaveTextContent("10");

    await act(async () => {
      rerender(<NumberTicker value={100} />);
    });

    expect(screen.getByLabelText("100")).toHaveTextContent("100");
  });

  it("formats with the en-CA locale by default", () => {
    render(<NumberTicker value={1234567} />);
    const el = screen.getByLabelText(/1,234,567/);
    expect(el).toHaveTextContent("1,234,567");
  });

  it("respects the supplied locale", () => {
    render(<NumberTicker value={1234567} locale="de-DE" />);
    const el = screen.getByLabelText(/1\.234\.567/);
    expect(el).toHaveTextContent("1.234.567");
  });

  it("respects Intl.NumberFormat options for decimals", () => {
    render(
      <NumberTicker
        value={0.75}
        format={{ style: "percent", minimumFractionDigits: 0 }}
      />,
    );
    expect(screen.getByLabelText("75%")).toHaveTextContent("75%");
  });

  it("does not use aria-live (would spam screen readers during tween)", () => {
    // The tween updates state ~25× per animation; aria-live="polite" would
    // announce each intermediate frame. Screen readers instead get the
    // stable aria-label bound to the target value.
    render(<NumberTicker value={3} />);
    const el = screen.getByLabelText("3");
    expect(el).not.toHaveAttribute("aria-live");
    expect(el).toHaveAttribute("aria-label", "3");
  });

  it("does not throw when window.matchMedia is undefined", () => {
    // @ts-expect-error — deliberately remove matchMedia to simulate a
    // minimal test environment without the stub.
    delete window.matchMedia;

    expect(() => render(<NumberTicker value={5} />)).not.toThrow();
    expect(screen.getByLabelText("5")).toHaveTextContent("5");
  });
});
