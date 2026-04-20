import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OutputActionBar, { type OutputAction } from "../OutputActionBar";

function makeAction(overrides: Partial<OutputAction> = {}): OutputAction {
  return {
    key: "print",
    label: "Print",
    icon: "info",
    onClick: vi.fn(),
    ...overrides,
  };
}

describe("OutputActionBar", () => {
  it("renders one action with its label and icon accessible via aria-label", () => {
    render(<OutputActionBar actions={[makeAction({ label: "Print" })]} />);
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
  });

  it("renders three actions and clicking the middle button calls its onClick once", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    const actions: OutputAction[] = [
      makeAction({ key: "print", label: "Print" }),
      makeAction({ key: "copy", label: "Copy", onClick: spy }),
      makeAction({ key: "download", label: "Download" }),
    ];
    render(<OutputActionBar actions={actions} />);
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("applies the correct variant class to each button", () => {
    const actions: OutputAction[] = [
      makeAction({ key: "print", label: "Print", variant: "primary" }),
      makeAction({ key: "copy", label: "Copy", variant: "ghost" }),
      makeAction({ key: "review-approval", label: "Review", variant: "approve" }),
    ];
    render(<OutputActionBar actions={actions} />);
    expect(screen.getByRole("button", { name: "Print" })).toHaveClass("output-action-bar__btn--primary");
    expect(screen.getByRole("button", { name: "Copy" })).toHaveClass("output-action-bar__btn--ghost");
    expect(screen.getByRole("button", { name: "Review" })).toHaveClass("output-action-bar__btn--approve");
  });

  it("disabled action does not invoke onClick", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<OutputActionBar actions={[makeAction({ label: "Print", disabled: true, onClick: spy })]} />);
    const btn = screen.getByRole("button", { name: "Print" });
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(spy).not.toHaveBeenCalled();
  });

  it("async onClick rejection is caught and does not bubble up", async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failing = vi.fn().mockRejectedValue(new Error("boom"));
    render(<OutputActionBar actions={[makeAction({ label: "Print", onClick: failing })]} />);
    await user.click(screen.getByRole("button", { name: "Print" }));
    // Wait a microtask for the promise to reject
    await new Promise((r) => setTimeout(r, 0));
    expect(failing).toHaveBeenCalledTimes(1);
    // console.warn was called (the dispatcher caught the rejection)
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("contextLabel appears as the nav's aria-label", () => {
    render(
      <OutputActionBar
        actions={[makeAction()]}
        contextLabel="Differentiate output"
      />,
    );
    expect(screen.getByRole("navigation", { name: "Differentiate output" })).toBeInTheDocument();
  });

  it("renders refresh-style actions with the Nothing instrument button and refresh fire animation", () => {
    render(
      <OutputActionBar
        actions={[
          makeAction({
            key: "refresh",
            label: "Refresh",
            icon: "refresh",
          }),
        ]}
      />,
    );

    const button = screen.getByRole("button", { name: "Refresh" });
    expect(button).toHaveClass("nothing-btn");
    expect(button).toHaveAttribute("data-anim", "refresh");
  });
});
