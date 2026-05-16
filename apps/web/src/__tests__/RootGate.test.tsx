import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../App", () => ({
  default: () => <main data-testid="app-shell">Today workspace</main>,
}));

import RootGate, {
  CANONICAL_DEMO_ROUTE,
  hasRecognizedAppQuery,
  shouldShowLandingForLocation,
} from "../RootGate";

function setUrl(path: string) {
  window.history.replaceState({}, "", path);
}

describe("RootGate landing route", () => {
  beforeEach(() => {
    setUrl("/");
  });

  it("shows the landing page on bare root without booting the app shell", () => {
    render(<RootGate />);

    expect(
      screen.getByRole("heading", { name: "PrairieClassroom OS" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("app-shell")).not.toBeInTheDocument();
  });

  it("points the primary CTA at the canonical demo route", () => {
    render(<RootGate />);

    expect(
      screen.getByRole("link", { name: "Enter PrairieClassroom" }),
    ).toHaveAttribute("href", CANONICAL_DEMO_ROUTE);
  });

  it("keeps unrecognized bare-root query strings on the landing page", () => {
    setUrl("/?utm_source=teacher");

    render(<RootGate />);

    expect(
      screen.getByRole("heading", { name: "PrairieClassroom OS" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("app-shell")).not.toBeInTheDocument();
  });

  it.each([
    "/?tab=today",
    "/?tool=tomorrow-plan",
    "/?classroom=demo-okafor-grade34",
    "/?demo=true",
    "/?presentation=true",
    "/?judge=true",
    "/?live=true",
    "/?hosted=true",
  ])("bypasses the landing page for app URL %s", async (path) => {
    setUrl(path);

    render(<RootGate />);

    expect(await screen.findByTestId("app-shell")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "PrairieClassroom OS" }),
    ).not.toBeInTheDocument();
  });

  it("treats only root without recognized app params as the landing route", () => {
    expect(
      shouldShowLandingForLocation({ pathname: "/", search: "" }),
    ).toBe(true);
    expect(
      shouldShowLandingForLocation({ pathname: "/", search: "?tab=today" }),
    ).toBe(false);
    expect(
      shouldShowLandingForLocation({ pathname: "/health", search: "" }),
    ).toBe(false);
    expect(hasRecognizedAppQuery("?HOSTED=true")).toBe(true);
  });
});
