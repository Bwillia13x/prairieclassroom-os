import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
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

  it("exposes the collapse/expand control when the parent owns drawer state", async () => {
    const user = userEvent.setup();
    const onToggleCollapsed = vi.fn();

    const { rerender } = render(
      <TodayAnchorRail anchors={anchors} collapsed={false} onToggleCollapsed={onToggleCollapsed} />,
    );

    const collapse = screen.getByRole("button", { name: /collapse today sections navigation/i });
    expect(collapse).toHaveAttribute("aria-expanded", "true");

    await user.click(collapse);
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);

    rerender(
      <TodayAnchorRail anchors={anchors} collapsed onToggleCollapsed={onToggleCollapsed} />,
    );

    const expand = screen.getByRole("button", { name: /expand today sections navigation/i });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: /01.*Command Center/ })).not.toBeInTheDocument();
  });
});
