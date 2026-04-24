import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HeaderAction from "../HeaderAction";

describe("HeaderAction", () => {
  it("renders a button with the provided label", () => {
    render(<HeaderAction label="Search" onClick={() => {}} />);
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
  });

  it("exposes an accessible name when using icon-only mode", () => {
    render(
      <HeaderAction
        label="Open theme"
        iconOnly
        onClick={() => {}}
      >
        <span aria-hidden="true">☀</span>
      </HeaderAction>,
    );
    expect(screen.getByRole("button", { name: /open theme/i })).toBeInTheDocument();
  });

  it("invokes onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<HeaderAction label="Search" onClick={onClick} />);
    screen.getByRole("button").click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders a trailing kbd when provided", () => {
    render(
      <HeaderAction
        label="Search"
        kbd="⌘K"
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("⌘K")).toBeInTheDocument();
  });
});
