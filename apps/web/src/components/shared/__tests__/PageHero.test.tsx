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

  it("renders a custom instrument instead of the default pulse stack", () => {
    render(
      <PageHero
        eyebrow="Classroom"
        title="Read the room"
        pulse={{ tone: "warning", state: "Default pulse", meta: "hidden" }}
        instrument={<div>Pressure instrument</div>}
      />,
    );
    expect(screen.getByText(/pressure instrument/i)).toBeInTheDocument();
    expect(screen.queryByText(/default pulse/i)).not.toBeInTheDocument();
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

  it("applies the requested density class", () => {
    const { container } = render(
      <PageHero eyebrow="Review" title="Review queue" variant="review" density="utility" />,
    );
    expect(container.querySelector(".page-hero--density-utility")).toBeInTheDocument();
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

  it("marks exactly one critical group when any metric carries danger or warning tone", () => {
    // Phase β3 (2026-04-28). The danger-bearing group should win over a
    // warning-only group, and only ONE critical class should be applied
    // to the hero — extra warning groups stay at standard scale so the
    // priority signal doesn't collapse into "everything is critical".
    const { container } = render(
      <PageHero
        eyebrow="Classroom"
        title="Operating dashboard"
        metricGroups={[
          {
            label: "Roster",
            metrics: [{ value: 26, label: "Students" }],
          },
          {
            label: "Today",
            metrics: [
              { value: 20, label: "Threads", tone: "danger" },
              { value: 25, label: "Open" },
            ],
          },
          {
            label: "Plan",
            metrics: [{ value: "2/7", label: "Filed", tone: "warning" }],
          },
        ]}
      />,
    );
    const criticalGroups = container.querySelectorAll(
      ".page-hero__metric-group--critical",
    );
    expect(criticalGroups.length).toBe(1);
    expect(criticalGroups[0]?.textContent).toContain("Today");
    expect(criticalGroups[0]?.textContent).toContain("20");
  });

  it("falls back to a warning group when no danger group exists", () => {
    const { container } = render(
      <PageHero
        eyebrow="Tomorrow"
        title="Stage"
        metricGroups={[
          { label: "Plan", metrics: [{ value: 4, label: "Blocks" }] },
          {
            label: "Risk",
            metrics: [{ value: 2, label: "At risk", tone: "warning" }],
          },
        ]}
      />,
    );
    const criticalGroups = container.querySelectorAll(
      ".page-hero__metric-group--critical",
    );
    expect(criticalGroups.length).toBe(1);
    expect(criticalGroups[0]?.textContent).toContain("Risk");
  });

  it("applies no critical class when every metric is neutral or success", () => {
    const { container } = render(
      <PageHero
        eyebrow="Review"
        title="Look back"
        metricGroups={[
          { label: "Approved", metrics: [{ value: 3, label: "Sent", tone: "success" }] },
          { label: "Pending", metrics: [{ value: 1, label: "Drafts" }] },
        ]}
      />,
    );
    expect(
      container.querySelector(".page-hero__metric-group--critical"),
    ).toBeNull();
  });
});
