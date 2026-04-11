import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusCard from "../StatusCard";

describe("StatusCard", () => {
  it("renders title as h3", () => {
    render(<StatusCard title="Forecast" status="idle">content</StatusCard>);
    expect(screen.getByRole("heading", { level: 3, name: "Forecast" })).toBeInTheDocument();
  });

  it("renders children in idle status", () => {
    render(<StatusCard title="Test" status="idle"><p>Hello</p></StatusCard>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders children in success status", () => {
    render(<StatusCard title="Test" status="success"><p>Done</p></StatusCard>);
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("shows skeleton lines and aria-busy when loading", () => {
    const { container } = render(<StatusCard title="Loading" status="loading" />);
    expect(container.querySelector("[aria-busy='true']")).toBeInTheDocument();
    expect(container.querySelector(".status-card__skeleton")).toBeInTheDocument();
  });

  it("shows error message with error styling", () => {
    render(<StatusCard title="Fail" status="error" errorMessage="Network error" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Network error");
    expect(screen.getByText("Fail").closest(".status-card--error")).toBeInTheDocument();
  });

  it("shows default error message when errorMessage is not provided", () => {
    render(<StatusCard title="Fail" status="error" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong.");
  });

  it("delegates to EmptyState when status is empty", () => {
    const action = vi.fn();
    render(
      <StatusCard
        title="Card"
        status="empty"
        emptyTitle="Nothing here"
        emptyDescription="Add something."
        emptyAction={{ label: "Add", onClick: action }}
      />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Add something.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("renders actions slot in header", () => {
    render(
      <StatusCard title="Header" status="idle" actions={<button>Act</button>}>
        body
      </StatusCard>,
    );
    expect(screen.getByRole("button", { name: "Act" })).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <StatusCard title="Custom" status="idle" className="my-class">x</StatusCard>,
    );
    expect(container.querySelector(".my-class")).toBeInTheDocument();
  });
});
