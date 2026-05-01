import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import ThemeToggle from "../ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders a dark mode action with descriptive aria-label", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /switch to dark mode/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent(/dark/i);
    expect(btn.querySelector("svg")).not.toBeNull();
  });

  it("toggles dark and light mode", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /switch to dark mode/i });
    fireEvent.click(btn);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(btn.getAttribute("aria-label")).toMatch(/light/i);
    fireEvent.click(btn);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(btn.getAttribute("aria-label")).toMatch(/dark/i);
  });
});
