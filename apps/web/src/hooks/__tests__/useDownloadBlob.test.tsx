import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDownloadBlob } from "../useDownloadBlob";

describe("useDownloadBlob", () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;
  let rafSpy: ReturnType<typeof vi.fn>;
  let originalCreateObjectURL: typeof URL.createObjectURL | undefined;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL | undefined;
  let originalRAF: typeof requestAnimationFrame | undefined;

  beforeEach(() => {
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    originalRAF = globalThis.requestAnimationFrame;

    createObjectURLSpy = vi.fn().mockReturnValue("blob:mock");
    revokeObjectURLSpy = vi.fn();
    URL.createObjectURL = createObjectURLSpy as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURLSpy as typeof URL.revokeObjectURL;

    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    // Mock requestAnimationFrame so we can control when it fires
    rafSpy = vi.fn();
    globalThis.requestAnimationFrame = rafSpy as unknown as typeof requestAnimationFrame;
  });

  afterEach(() => {
    if (originalCreateObjectURL) URL.createObjectURL = originalCreateObjectURL;
    if (originalRevokeObjectURL) URL.revokeObjectURL = originalRevokeObjectURL;
    if (originalRAF) globalThis.requestAnimationFrame = originalRAF;
    clickSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("happy path: creates a blob URL, sets anchor download attribute, and clicks it", () => {
    const { result } = renderHook(() => useDownloadBlob());
    act(() => {
      result.current.download({
        filename: "variants.md",
        content: "# hi",
        mime: "text/markdown",
      });
    });

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const blobArg = createObjectURLSpy.mock.calls[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe("text/markdown");
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("filename sanitization: strips unsafe characters and replaces with underscore", () => {
    // We need to capture the anchor's download attribute. Intercept createElement.
    const createdAnchors: HTMLAnchorElement[] = [];
    const originalCreate = document.createElement.bind(document);
    const createSpy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreate(tag) as HTMLElement;
      if (tag === "a") createdAnchors.push(el as HTMLAnchorElement);
      return el;
    });

    const { result } = renderHook(() => useDownloadBlob());
    act(() => {
      result.current.download({
        filename: "my plan/../etc.md",
        content: "x",
      });
    });

    expect(createdAnchors).toHaveLength(1);
    expect(createdAnchors[0].getAttribute("download")).toBe("my_plan_.._etc.md");
    createSpy.mockRestore();
  });

  it("requestAnimationFrame revokes the object URL when the frame fires", () => {
    const { result } = renderHook(() => useDownloadBlob());
    act(() => {
      result.current.download({
        filename: "x.txt",
        content: "y",
      });
    });

    // RAF was scheduled, but revoke should not have fired yet
    expect(rafSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).not.toHaveBeenCalled();

    // Execute the scheduled RAF callback
    const rafCallback = rafSpy.mock.calls[0][0] as FrameRequestCallback;
    act(() => {
      rafCallback(performance.now());
    });

    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock");
  });

  it("lastDownloadedAt is non-null after a successful download", () => {
    const { result } = renderHook(() => useDownloadBlob());
    expect(result.current.lastDownloadedAt).toBeNull();

    act(() => {
      result.current.download({
        filename: "x.txt",
        content: "y",
      });
    });

    expect(result.current.lastDownloadedAt).not.toBeNull();
    expect(typeof result.current.lastDownloadedAt).toBe("number");
  });
});
