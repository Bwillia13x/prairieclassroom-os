import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sparkline, TrendIndicator, HealthDot, ProgressBar } from "../DataViz";

describe("Sparkline", () => {
  it("renders an SVG with a polyline for valid data", () => {
    const { container } = render(<Sparkline data={[1, 3, 2, 5]} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg?.querySelector("polyline")).toBeInTheDocument();
  });

  it("renders empty placeholder when data has fewer than 2 points", () => {
    render(<Sparkline data={[1]} label="Trend" />);
    expect(screen.getByLabelText("Trend")).toHaveTextContent("--");
  });

  it("handles empty data array", () => {
    render(<Sparkline data={[]} label="Empty" />);
    expect(screen.getByLabelText("Empty")).toHaveTextContent("--");
  });

  it("accepts custom width and height", () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} width={120} height={32} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "120");
    expect(svg).toHaveAttribute("height", "32");
  });
});

describe("TrendIndicator", () => {
  it("shows up arrow with positive percentage", () => {
    render(<TrendIndicator value={12.5} direction="up" />);
    const el = screen.getByLabelText(/up.*12\.5%/);
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent("+12.5%");
  });

  it("shows down arrow with negative percentage", () => {
    render(<TrendIndicator value={-3.2} direction="down" />);
    const el = screen.getByLabelText(/down.*-3\.2%/);
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent("-3.2%");
  });

  it("shows flat arrow for zero change", () => {
    render(<TrendIndicator value={0} direction="flat" />);
    expect(screen.getByLabelText(/flat/)).toHaveTextContent("0.0%");
  });
});

describe("HealthDot", () => {
  it("renders with correct status class", () => {
    const { container } = render(<HealthDot status="healthy" />);
    expect(container.querySelector(".dataviz-health-dot--healthy")).toBeInTheDocument();
  });

  it("uses tooltip as title and aria-label", () => {
    render(<HealthDot status="warning" tooltip="Moderate risk" />);
    expect(screen.getByLabelText("Moderate risk")).toBeInTheDocument();
  });

  it("falls back to status name as aria-label when no tooltip", () => {
    render(<HealthDot status="critical" />);
    expect(screen.getByLabelText("critical")).toBeInTheDocument();
  });
});

describe("ProgressBar", () => {
  it("renders with progressbar role and correct aria values", () => {
    render(<ProgressBar value={75} label="Completion" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "75");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("clamps negative value to 0", () => {
    render(<ProgressBar value={-10} label="Clamped low" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  it("clamps value above max to max", () => {
    render(<ProgressBar value={150} label="Clamped high" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("displays the label text", () => {
    render(<ProgressBar value={50} label="Upload" />);
    expect(screen.getByText("Upload")).toBeInTheDocument();
  });

  it("supports custom max value", () => {
    render(<ProgressBar value={5} max={10} label="Steps" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "5");
    expect(bar).toHaveAttribute("aria-valuemax", "10");
  });
});
