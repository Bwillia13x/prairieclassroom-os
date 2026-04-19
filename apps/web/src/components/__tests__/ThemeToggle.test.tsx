import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import ThemeToggle from "../ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders an icon-only button with descriptive aria-label", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /color theme/i });
    expect(btn).toBeInTheDocument();
    expect(btn.textContent?.trim()).toMatch(/^$/);
    expect(btn.querySelector("svg")).not.toBeNull();
  });

  it("cycles system → light → dark and updates icon role", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /color theme/i });
    expect(btn.getAttribute("aria-label")).toMatch(/auto/i);
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-label")).toMatch(/light/i);
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-label")).toMatch(/dark/i);
  });
});
