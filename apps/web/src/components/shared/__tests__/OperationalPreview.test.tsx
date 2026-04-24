import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import OperationalPreview from "../OperationalPreview";

describe("OperationalPreview", () => {
  it("renders an aria-labelled section landmark", () => {
    render(
      <OperationalPreview
        ariaLabel="Today operational preview"
        groups={[{ eyebrow: "Triage", evidence: [{ label: "Open thread", meta: "8m" }] }]}
      />,
    );
    expect(
      screen.getByRole("region", { name: /today operational preview/i }),
    ).toBeInTheDocument();
  });

  it("renders chip rows with tones and meta", () => {
    const { container } = render(
      <OperationalPreview
        ariaLabel="Watch list"
        groups={[
          {
            eyebrow: "Students to watch",
            chips: [
              { label: "Amira", tone: "watch", meta: "Block 2" },
              { label: "Brody", tone: "danger" },
              { label: "Chantal", tone: "success" },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText("Amira")).toBeInTheDocument();
    expect(screen.getByText("Brody")).toBeInTheDocument();
    expect(screen.getByText("Chantal")).toBeInTheDocument();
    expect(container.querySelector(".preview-chip--watch")).toBeInTheDocument();
    expect(container.querySelector(".preview-chip--danger")).toBeInTheDocument();
    expect(container.querySelector(".preview-chip--success")).toBeInTheDocument();
    expect(screen.getByText(/block 2/i)).toBeInTheDocument();
  });

  it("renders evidence rows with labels and meta", () => {
    render(
      <OperationalPreview
        ariaLabel="Coverage"
        groups={[
          {
            eyebrow: "Coverage",
            evidence: [
              { label: "Adult load", meta: "3 blocks tight" },
              { label: "EA fairness", meta: "balanced" },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText(/adult load/i)).toBeInTheDocument();
    expect(screen.getByText(/3 blocks tight/i)).toBeInTheDocument();
    expect(screen.getByText(/ea fairness/i)).toBeInTheDocument();
    expect(screen.getByText(/balanced/i)).toBeInTheDocument();
  });

  it("renders header, footer, and group meta when provided", () => {
    render(
      <OperationalPreview
        ariaLabel="Demo"
        header={<header data-testid="custom-preview-header">Section</header>}
        groups={[{ eyebrow: "Group", meta: "last sync 5m ago" }]}
        footer={<button type="button">Open queue</button>}
      />,
    );
    expect(screen.getByTestId("custom-preview-header")).toBeInTheDocument();
    expect(screen.getByText(/last sync 5m ago/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open queue/i })).toBeInTheDocument();
  });

  it("renders custom group children when provided", () => {
    render(
      <OperationalPreview
        ariaLabel="Custom"
        groups={[
          {
            eyebrow: "Custom",
            children: <div data-testid="custom-body">custom content</div>,
          },
        ]}
      />,
    );
    expect(screen.getByTestId("custom-body")).toBeInTheDocument();
  });
});
