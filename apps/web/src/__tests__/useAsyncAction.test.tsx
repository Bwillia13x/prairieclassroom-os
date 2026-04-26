import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAsyncAction } from "../useAsyncAction";
import { ApiError } from "../api";

describe("useAsyncAction onError callback", () => {
  it("calls onError with the friendly message when the request fails", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useAsyncAction<unknown>({ onError }));
    await act(async () => {
      await result.current.execute(async () => {
        throw new ApiError(500, { error: "boom" });
      });
    });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining("server encountered an error"),
    );
  });

  it("does not call onError when the request succeeds", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useAsyncAction<string>({ onError }));
    await act(async () => {
      await result.current.execute(async () => "ok");
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it("does not call onError on AbortError", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useAsyncAction<unknown>({ onError }));
    await act(async () => {
      await result.current.execute(async () => {
        throw new DOMException("aborted", "AbortError");
      });
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it("does not call onError when an ApiError is already handled", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useAsyncAction<unknown>({ onError }));
    await act(async () => {
      await result.current.execute(async () => {
        throw new ApiError(401, { error: "auth" }, true);
      });
    });
    expect(onError).not.toHaveBeenCalled();
  });
});
