import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCopyToClipboard } from "../useCopyToClipboard";

describe("useCopyToClipboard", () => {
  let originalClipboard: typeof navigator.clipboard | undefined;
  let originalExecCommand: typeof document.execCommand;

  beforeEach(() => {
    originalClipboard = navigator.clipboard;
    originalExecCommand = document.execCommand;
  });

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
    });
    document.execCommand = originalExecCommand;
    vi.useRealTimers();
  });

  it("happy path: uses navigator.clipboard.writeText and transitions status to copied", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current.status).toBe("idle");

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.copy("hello");
    });
    expect(returned).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
    await waitFor(() => expect(result.current.status).toBe("copied"));
  });

  it("fallback path: uses document.execCommand when clipboard is undefined", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    const execSpy = vi.fn().mockReturnValue(true);
    document.execCommand = execSpy as typeof document.execCommand;

    const { result } = renderHook(() => useCopyToClipboard());
    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.copy("hi");
    });
    expect(returned).toBe(true);
    expect(execSpy).toHaveBeenCalledWith("copy");
  });

  it("error path: both clipboard and execCommand fail; error preserves the original clipboard message", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    document.execCommand = vi.fn().mockReturnValue(false) as typeof document.execCommand;

    const { result } = renderHook(() => useCopyToClipboard());
    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.copy("broken");
    });
    expect(returned).toBe(false);
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("denied");
  });

  it("timer resets status from 'copied' to 'idle' after resetMs elapses", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const { result } = renderHook(() => useCopyToClipboard({ resetMs: 1000 }));
    await act(async () => {
      await result.current.copy("hi");
    });
    expect(result.current.status).toBe("copied");
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.status).toBe("idle");
  });
});
