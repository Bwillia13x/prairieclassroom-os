import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSentryTransport } from "../sentry";

vi.mock("@sentry/browser", () => ({
  init: vi.fn(),
  captureException: vi.fn(),
}));

describe("sentryTransport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards errors to Sentry.captureException with structured context", async () => {
    const sentry = await import("@sentry/browser");
    const transport = createSentryTransport({ dsn: "https://test@example.com/1" });

    transport({
      message: "boom",
      stack: "Error: boom\n  at test",
      url: "/api/today/demo-okafor-grade34",
      timestamp: "2026-04-25T00:00:00.000Z",
      userAgent: "vitest",
    });

    expect(sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        extra: expect.objectContaining({ url: "/api/today/demo-okafor-grade34" }),
      }),
    );
  });

  it("no-ops when dsn is empty (lets dev environments skip Sentry init)", async () => {
    const sentry = await import("@sentry/browser");
    const transport = createSentryTransport({ dsn: "" });

    transport({
      message: "x",
      url: "/",
      timestamp: "2026-04-25T00:00:00.000Z",
      userAgent: "vitest",
    });

    expect(sentry.captureException).not.toHaveBeenCalled();
  });
});
