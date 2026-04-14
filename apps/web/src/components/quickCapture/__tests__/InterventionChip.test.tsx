import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InterventionChip from "../InterventionChip";
import type { InterventionChipDef } from "../interventionChipDefs";

const REDIRECT_DEF: InterventionChipDef = {
  key: "redirect",
  label: "Redirect",
  icon: "alert",
  starterNote: (names) => `Redirected ${names.join(", ")}`,
};

describe("InterventionChip", () => {
  it("renders the chip label text", () => {
    render(<InterventionChip def={REDIRECT_DEF} selected={false} onSelect={vi.fn()} />);
    expect(screen.getByText("Redirect")).toBeInTheDocument();
  });

  it("reflects aria-pressed=false when not selected", () => {
    render(<InterventionChip def={REDIRECT_DEF} selected={false} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Redirect" })).toHaveAttribute("aria-pressed", "false");
  });

  it("reflects aria-pressed=true when selected", () => {
    render(<InterventionChip def={REDIRECT_DEF} selected={true} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Redirect" })).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onSelect once with the chip's key on click", async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<InterventionChip def={REDIRECT_DEF} selected={false} onSelect={spy} />);
    await user.click(screen.getByRole("button"));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("redirect");
  });

  it("has explicit type='button' (never submits a form)", () => {
    render(<InterventionChip def={REDIRECT_DEF} selected={false} onSelect={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("renders an svg icon element from SectionIcon", () => {
    const { container } = render(
      <InterventionChip def={REDIRECT_DEF} selected={false} onSelect={vi.fn()} />,
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
