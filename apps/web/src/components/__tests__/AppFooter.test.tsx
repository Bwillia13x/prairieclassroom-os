import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppFooter from "../AppFooter";

describe("AppFooter", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("refreshes the runtime rail from orchestrator health", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        status: "ok",
        ready: true,
        inference_provider: "gemini",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AppFooter classroomId="demo-okafor-grade34" />);

    expect(screen.getByText("mock")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("gemini")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/health", expect.any(Object));
  });
});
