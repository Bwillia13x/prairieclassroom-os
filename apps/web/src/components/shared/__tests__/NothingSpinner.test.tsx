import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NothingSpinner from "../NothingSpinner";

describe("NothingSpinner", () => {
  it("renders with role=status and the provided label", () => {
    render(<NothingSpinner label="Generating plan" />);
    const status = screen.getByRole("status", { name: /generating plan/i });
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute("aria-busy", "true");
  });

  it("defaults to the seg-ring variant and md size", () => {
    const { container } = render(<NothingSpinner label="Loading" />);
    const root = container.querySelector(".nothing-spinner");
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute("data-variant", "seg-ring");
    expect(root?.className).toContain("nothing-spinner--md");
    expect(container.querySelector(".nothing-spinner__segring")).toBeInTheDocument();
  });

  it("renders the requested variant's internal marker", () => {
    const variants = [
      { variant: "seg-ring",    selector: ".nothing-spinner__segring" },
      { variant: "dual-arc",    selector: ".nothing-spinner__dual" },
      { variant: "fade-dots",   selector: ".nothing-spinner__fadedots" },
      { variant: "eq-bars",     selector: ".nothing-spinner__eq" },
      { variant: "arc-dash",    selector: ".nothing-spinner__arc" },
      { variant: "pulse-ring",  selector: ".nothing-spinner__pulsering" },
      { variant: "orbit",       selector: ".nothing-spinner__orbit" },
      { variant: "linear",      selector: ".nothing-spinner__linear" },
    ] as const;

    for (const { variant, selector } of variants) {
      const { container, unmount } = render(
        <NothingSpinner variant={variant} label={`variant ${variant}`} />,
      );
      expect(container.querySelector(selector)).toBeInTheDocument();
      unmount();
    }
  });

  it("applies the tone modifier class for non-default tones", () => {
    const { container } = render(
      <NothingSpinner label="Status" tone="accent" />,
    );
    const root = container.querySelector(".nothing-spinner");
    expect(root?.className).toContain("nothing-spinner--accent");
  });

  it("applies the size modifier class for sm/lg", () => {
    const { container, rerender } = render(
      <NothingSpinner label="s" size="sm" />,
    );
    expect(container.querySelector(".nothing-spinner--sm")).toBeInTheDocument();
    rerender(<NothingSpinner label="l" size="lg" />);
    expect(container.querySelector(".nothing-spinner--lg")).toBeInTheDocument();
  });

  it("adds the linear-size-full helper only on linear + lg", () => {
    const { container, rerender } = render(
      <NothingSpinner label="x" variant="linear" size="lg" />,
    );
    expect(
      container.querySelector(".nothing-spinner--linear-size-full"),
    ).toBeInTheDocument();

    rerender(<NothingSpinner label="x" variant="linear" size="md" />);
    expect(
      container.querySelector(".nothing-spinner--linear-size-full"),
    ).not.toBeInTheDocument();

    rerender(<NothingSpinner label="x" variant="seg-ring" size="lg" />);
    expect(
      container.querySelector(".nothing-spinner--linear-size-full"),
    ).not.toBeInTheDocument();
  });

  it("forwards data-testid to the root element", () => {
    render(<NothingSpinner label="test" data-testid="streaming-spinner" />);
    expect(screen.getByTestId("streaming-spinner")).toBeInTheDocument();
  });

  it("renders as aria-hidden with no role when decorative=true", () => {
    render(
      <NothingSpinner
        label="embedded spinner"
        decorative
        data-testid="embedded-spinner"
      />,
    );

    // No role=status exposed.
    expect(
      screen.queryByRole("status", { name: /embedded spinner/i }),
    ).not.toBeInTheDocument();

    const root = screen.getByTestId("embedded-spinner");
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root).not.toHaveAttribute("role");
    expect(root).not.toHaveAttribute("aria-label");
    expect(root).not.toHaveAttribute("aria-busy");
  });
});
