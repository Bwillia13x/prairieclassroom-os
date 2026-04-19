/**
 * PageIntroInfoButton — popover open/close behavior.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PageIntroInfoButton from "../PageIntroInfoButton";

describe("PageIntroInfoButton", () => {
  it("opens the popover on click and closes it again", () => {
    render(<PageIntroInfoButton title="EA Briefing" body={<p>Briefing body copy</p>} />);
    const trigger = screen.getByRole("button", { name: /about ea briefing/i });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/briefing body copy/i)).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the popover when Escape is pressed", () => {
    render(<PageIntroInfoButton title="EA Briefing" body={<p>Briefing body copy</p>} />);
    fireEvent.click(screen.getByRole("button", { name: /about ea briefing/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
