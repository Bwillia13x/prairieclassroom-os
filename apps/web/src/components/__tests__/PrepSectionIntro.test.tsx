import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PrepSectionIntro from "../PrepSectionIntro";

describe("PrepSectionIntro", () => {
  it("renders the PREP label and the short pitch by default", () => {
    const { container } = render(<PrepSectionIntro />);
    const eyebrow = container.querySelector(".prep-intro__eyebrow");
    expect(eyebrow).not.toBeNull();
    expect(eyebrow?.textContent).toMatch(/prep/i);
    expect(screen.getByText(/classroom-ready materials/i)).toBeInTheDocument();
  });

  it("reveals the when-to-use guidance on expand", () => {
    render(<PrepSectionIntro />);
    expect(screen.queryByText(/use differentiate when/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /when to use/i }));
    expect(screen.getByText(/use differentiate when/i)).toBeInTheDocument();
    expect(screen.getByText(/use language tools when/i)).toBeInTheDocument();
  });
});
