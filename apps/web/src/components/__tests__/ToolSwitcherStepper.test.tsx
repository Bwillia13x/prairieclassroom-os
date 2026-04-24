import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ToolSwitcherStepper from "../ToolSwitcherStepper";

describe("ToolSwitcherStepper", () => {
  it("renders one dot per step", () => {
    const { container } = render(
      <ToolSwitcherStepper total={4} activeIndex={1} />,
    );
    expect(container.querySelectorAll(".tool-switcher-stepper__dot")).toHaveLength(4);
  });

  it("marks the active dot", () => {
    const { container } = render(
      <ToolSwitcherStepper total={4} activeIndex={2} />,
    );
    const active = container.querySelector(".tool-switcher-stepper__dot--active");
    expect(active).toBeInTheDocument();
    expect(active?.getAttribute("data-index")).toBe("2");
  });

  it("has an accessible label", () => {
    render(<ToolSwitcherStepper total={4} activeIndex={0} label="Prep tool progress" />);
    expect(screen.getByRole("progressbar", { name: /prep tool progress/i })).toBeInTheDocument();
  });
});
