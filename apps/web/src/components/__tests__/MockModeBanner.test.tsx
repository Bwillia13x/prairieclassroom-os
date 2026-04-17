import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MockModeBanner from "../MockModeBanner";

describe("MockModeBanner", () => {
  it("renders nothing on real model lanes", () => {
    const { container } = render(<MockModeBanner modelId="gemma4:4b" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when modelId is undefined", () => {
    const { container } = render(<MockModeBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("surfaces a warning when the inference response was produced by the mock backend", () => {
    render(<MockModeBanner modelId="mock" />);
    expect(screen.getByRole("status", { name: /mock mode notice/i })).toBeInTheDocument();
    expect(screen.getByText(/mock fixture output/i)).toBeInTheDocument();
  });

  it("uses a panel-specific hint when provided so each surface explains what mock mode hides", () => {
    render(
      <MockModeBanner
        modelId="mock"
        panelHint="Translation does not vary by target language in mock mode."
      />,
    );
    expect(
      screen.getByText(/translation does not vary by target language/i),
    ).toBeInTheDocument();
  });
});
