import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SectionSkeleton from "../SectionSkeleton";

describe("SectionSkeleton", () => {
  it("renders with an accessible aria-busy container and default label", () => {
    render(<SectionSkeleton />);
    const el = screen.getByRole("status", { name: /loading section/i });
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("aria-busy", "true");
  });

  it("applies the supplied label for screen readers", () => {
    render(<SectionSkeleton label="Loading health summary" />);
    expect(
      screen.getByRole("status", { name: /loading health summary/i }),
    ).toBeInTheDocument();
  });

  it("renders two shimmer lines by default", () => {
    const { container } = render(<SectionSkeleton />);
    expect(container.querySelectorAll(".section-skeleton__line")).toHaveLength(2);
  });

  it("renders the requested number of shimmer lines when lines prop is set", () => {
    const { container } = render(<SectionSkeleton lines={4} />);
    expect(container.querySelectorAll(".section-skeleton__line")).toHaveLength(4);
  });

  it("attaches a data-variant attribute for contextual styling", () => {
    render(<SectionSkeleton variant="health" label="Loading health" />);
    const el = screen.getByRole("status", { name: /loading health/i });
    expect(el).toHaveAttribute("data-variant", "health");
  });

  it("renders without error when prefers-reduced-motion is active", () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    try {
      render(<SectionSkeleton />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
