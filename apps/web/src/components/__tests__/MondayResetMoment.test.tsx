import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MondayResetMoment from "../MondayResetMoment";

describe("MondayResetMoment", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("renders on Monday when not dismissed this week", () => {
    vi.setSystemTime(new Date("2026-04-20T12:00:00"));
    render(<MondayResetMoment classroomId="demo" />);
    expect(screen.getByText(/fresh week/i)).toBeInTheDocument();
  });

  it("does not render on Tuesday", () => {
    vi.setSystemTime(new Date("2026-04-21T12:00:00"));
    const { container } = render(<MondayResetMoment classroomId="demo" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("does not render after dismissal", () => {
    vi.setSystemTime(new Date("2026-04-20T12:00:00"));
    window.localStorage.setItem("prairie:monday-reset:demo:2026-W17", "dismissed");
    const { container } = render(<MondayResetMoment classroomId="demo" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("persists dismissal for the classroom and week", () => {
    vi.setSystemTime(new Date("2026-04-20T12:00:00"));
    render(<MondayResetMoment classroomId="demo" />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss fresh week banner/i }));
    expect(window.localStorage.getItem("prairie:monday-reset:demo:2026-W17")).toBe("dismissed");
    expect(screen.queryByText(/fresh week/i)).not.toBeInTheDocument();
  });
});