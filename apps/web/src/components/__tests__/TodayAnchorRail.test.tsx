import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TodayAnchorRail, { type Anchor } from "../TodayAnchorRail";

const anchors: Anchor[] = [
  { id: "command-center", number: "01", label: "Command Center" },
  { id: "classroom-pulse", number: "02", label: "Classroom Pulse" },
  { id: "day-arc", number: "03", label: "Today's Shape" },
  { id: "end-of-today", number: "10", label: "End of Today" },
];

describe("TodayAnchorRail", () => {
  it("renders a numbered link for each anchor", () => {
    render(<TodayAnchorRail anchors={anchors} />);
    anchors.forEach((a) => {
      expect(
        screen.getByRole("link", {
          name: new RegExp(`${a.number}.*${a.label}`),
        }),
      ).toBeInTheDocument();
    });
  });

  it("marks the first anchor active by default", () => {
    render(<TodayAnchorRail anchors={anchors} />);
    const first = screen.getByRole("link", {
      name: /01.*Command Center/,
    });
    expect(first).toHaveAttribute("aria-current", "location");
  });

  it("includes a 'Back to top' tail anchor", () => {
    render(<TodayAnchorRail anchors={anchors} />);
    expect(
      screen.getByRole("link", { name: /back to top/i }),
    ).toBeInTheDocument();
  });

  it("renders nothing gracefully when the anchor list is empty", () => {
    render(<TodayAnchorRail anchors={[]} />);
    // Only the Back-to-top tail should appear.
    expect(
      screen.getByRole("link", { name: /back to top/i }),
    ).toBeInTheDocument();
  });

  it("hrefs the fragment id for each anchor", () => {
    render(<TodayAnchorRail anchors={anchors} />);
    const link = screen.getByRole("link", {
      name: /03.*Today's Shape/,
    });
    expect(link.getAttribute("href")).toBe("#day-arc");
  });
});
