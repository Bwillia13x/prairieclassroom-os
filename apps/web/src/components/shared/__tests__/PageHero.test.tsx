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

  it("renders metric groups with labeled clusters", () => {
    const { container } = render(
      <PageHero
        eyebrow="Classroom"
        title="Operating dashboard"
        metricGroups={[
          {
            label: "Today",
            metrics: [
              { value: 34, label: "Open threads" },
              { value: "72%", label: "Plan readiness" },
            ],
          },
          {
            label: "Tomorrow",
            metrics: [{ value: 3, label: "Blocks at risk", tone: "warning" }],
          },
        ]}
      />,
    );
    // Group eyebrows render
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
    // Metric values render
    expect(screen.getByText("34")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByText("Blocks at risk")).toBeInTheDocument();
    // Tone class applied to warning metric
    expect(container.querySelector(".page-hero__metric--warning")).toBeInTheDocument();
  });

  it("renders status rows under pulse", () => {
    render(
      <PageHero
        eyebrow="Today"
        title="Triage cockpit"
        pulse={{ tone: "warning", state: "Crowded morning", meta: "live" }}
        statusRows={[
          { label: "Open threads", value: "34", tone: "warning" },
          { label: "Last sync", value: "8m ago" },
        ]}
      />,
    );
    expect(screen.getByText("Open threads")).toBeInTheDocument();
    expect(screen.getByText("34")).toBeInTheDocument();
    expect(screen.getByText("Last sync")).toBeInTheDocument();
    expect(screen.getByText("8m ago")).toBeInTheDocument();
  });

  it("renders metric meta when provided on flat metrics", () => {
    render(
      <PageHero
        eyebrow="Ops"
        title="Coordinate"
        metrics={[{ value: 4, label: "Tools", meta: "+1 this week" }]}
      />,
    );
    expect(screen.getByText("+1 this week")).toBeInTheDocument();
  });
});
