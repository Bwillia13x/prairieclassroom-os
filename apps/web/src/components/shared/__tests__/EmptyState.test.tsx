import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmptyState from "../EmptyState";

describe("EmptyState", () => {
  it("renders title and description with status role", () => {
    render(<EmptyState title="No results" description="Try a different search." />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByText("Try a different search.")).toBeInTheDocument();
  });

  it("does not render an action button when action is not provided", () => {
    render(<EmptyState title="Empty" description="Nothing here." />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders an action button and fires onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <EmptyState
        title="No data"
        description="Get started."
        action={{ label: "Create", onClick }}
      />,
    );

    const button = screen.getByRole("button", { name: "Create" });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
