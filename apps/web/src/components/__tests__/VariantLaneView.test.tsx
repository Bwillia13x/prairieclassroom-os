import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import VariantLaneView from "../VariantLaneView";
import type { DrillDownContext } from "../../types";

type VariantLaneContext = Extract<DrillDownContext, { type: "variant-lane" }>;

const ALL_VARIANTS: VariantLaneContext["variants"] = [
  { variant_type: "eal_supported", estimated_minutes: 20, title: "EAL Variant A" },
  { variant_type: "eal_supported", estimated_minutes: 25, title: "EAL Variant B" },
  { variant_type: "eal_supported", estimated_minutes: 15, title: "EAL Variant C" },
  { variant_type: "eal_supported", estimated_minutes: 30, title: "EAL Variant D" },
  { variant_type: "core", estimated_minutes: 45, title: "Core Variant" },
];

const CONTEXT: VariantLaneContext = {
  type: "variant-lane",
  variantType: "eal_supported",
  label: "EAL Supported",
  variants: ALL_VARIANTS,
};

const EMPTY_CONTEXT: VariantLaneContext = {
  type: "variant-lane",
  variantType: "scaffold",
  label: "Scaffold",
  variants: ALL_VARIANTS,
};

describe("VariantLaneView", () => {
  it("renders heading containing the label and filtered count", () => {
    render(<VariantLaneView context={CONTEXT} />);
    const heading = screen.getByRole("heading");
    expect(heading.textContent).toContain("EAL Supported");
    expect(heading.textContent).toContain("4");
  });

  it("renders each of the 4 matching variant titles", () => {
    render(<VariantLaneView context={CONTEXT} />);
    expect(screen.getByText("EAL Variant A")).toBeInTheDocument();
    expect(screen.getByText("EAL Variant B")).toBeInTheDocument();
    expect(screen.getByText("EAL Variant C")).toBeInTheDocument();
    expect(screen.getByText("EAL Variant D")).toBeInTheDocument();
  });

  it("does NOT render the core variant", () => {
    render(<VariantLaneView context={CONTEXT} />);
    expect(screen.queryByText("Core Variant")).not.toBeInTheDocument();
  });

  it("renders estimated_minutes with 'm' suffix for each matching row", () => {
    render(<VariantLaneView context={CONTEXT} />);
    expect(screen.getByText(/20m/)).toBeInTheDocument();
    expect(screen.getByText(/25m/)).toBeInTheDocument();
    expect(screen.getByText(/15m/)).toBeInTheDocument();
    expect(screen.getByText(/30m/)).toBeInTheDocument();
  });

  it("renders empty state when no variants match the lane", () => {
    render(<VariantLaneView context={EMPTY_CONTEXT} />);
    expect(screen.getByText("No variants in this lane.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
