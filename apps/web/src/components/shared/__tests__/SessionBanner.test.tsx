import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SessionBanner from "../SessionBanner";

describe("SessionBanner", () => {
  it("renders with banner role", () => {
    render(<SessionBanner name="Ms. Johnson" gradeBand="K-2" healthStatus="healthy" />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("displays the name and grade band", () => {
    render(<SessionBanner name="Mr. Park" gradeBand="3-4" healthStatus="warning" />);
    expect(screen.getByText("Mr. Park")).toBeInTheDocument();
    expect(screen.getByText("3-4")).toBeInTheDocument();
  });

  it("renders a HealthDot with the correct status", () => {
    const { container } = render(
      <SessionBanner name="Class A" gradeBand="5-6" healthStatus="critical" />,
    );
    expect(container.querySelector(".dataviz-health-dot--critical")).toBeInTheDocument();
  });

  it("passes health status tooltip to HealthDot", () => {
    render(<SessionBanner name="Class B" gradeBand="K-2" healthStatus="healthy" />);
    expect(screen.getByLabelText("Health: healthy")).toBeInTheDocument();
  });
});
