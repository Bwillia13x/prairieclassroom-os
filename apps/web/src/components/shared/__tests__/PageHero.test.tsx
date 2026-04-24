import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PageHero from "../PageHero";

describe("PageHero", () => {
  it("renders eyebrow, title, and description", () => {
    render(
      <PageHero
        eyebrow="Classroom command"
        title="The room at a glance"
        description={<>Bird's-eye view of today.</>}
      />,
    );
    expect(screen.getByText(/classroom command/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /the room at a glance/i })).toBeInTheDocument();
    expect(screen.getByText(/bird's-eye view of today/i)).toBeInTheDocument();
  });

  it("renders pulse when provided", () => {
    render(
      <PageHero
        eyebrow="Ops"
        title="Coordinate"
        pulse={{ tone: "success", state: "Coordinated", meta: "5 EA moves" }}
      />,
    );
    expect(screen.getByText(/coordinated/i)).toBeInTheDocument();
    expect(screen.getByText(/5 ea moves/i)).toBeInTheDocument();
  });

  it("renders metrics grid when provided", () => {
    render(
      <PageHero
        eyebrow="Ops"
        title="Coordinate"
        metrics={[
          { value: 4, label: "Tools" },
          { value: "—", label: "Blocks" },
        ]}
      />,
    );
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Tools")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders pivots and fires onClick", () => {
    const onTodayClick = vi.fn();
    render(
      <PageHero
        eyebrow="Classroom"
        title="Today"
        pivots={[
          { eyebrow: "Now", label: "Today", icon: "sun", onClick: onTodayClick },
        ]}
      />,
    );
    screen.getByRole("button", { name: /today/i }).click();
    expect(onTodayClick).toHaveBeenCalledTimes(1);
  });

  it("applies variant-specific class for ops", () => {
    const { container } = render(
      <PageHero eyebrow="Ops" title="Coord" variant="ops" />,
    );
    expect(container.querySelector(".page-hero--ops")).toBeInTheDocument();
  });
});
