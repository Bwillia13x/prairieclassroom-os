/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSpeechCapture } from "../useSpeechCapture";

interface ResultLike {
  isFinal: boolean;
  [0]: { transcript: string };
  length: number;
}

class FakeSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: ((e: { results: ResultLike[] }) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => {
    if (this.onend) this.onend();
  });
  abort = vi.fn();
}

describe("useSpeechCapture", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports unsupported when neither SpeechRecognition global exists", () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", undefined);
    const { result } = renderHook(() => useSpeechCapture());
    expect(result.current.supported).toBe(false);
    expect(result.current.recording).toBe(false);
    expect(result.current.transcript).toBe("");
  });

  it("unsupported start() is a safe no-op", () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", undefined);
    const { result } = renderHook(() => useSpeechCapture());
    expect(() => act(() => result.current.start())).not.toThrow();
    expect(result.current.recording).toBe(false);
  });

  it("supported path: start() begins recording and calls fake .start()", () => {
    const fakes: FakeSpeechRecognition[] = [];
    class Trackable extends FakeSpeechRecognition {
      constructor() {
        super();
        fakes.push(this);
      }
    }
    vi.stubGlobal("SpeechRecognition", Trackable);
    const { result } = renderHook(() => useSpeechCapture());
    expect(result.current.supported).toBe(true);
    act(() => result.current.start());
    expect(result.current.recording).toBe(true);
    expect(fakes).toHaveLength(1);
    expect(fakes[0].start).toHaveBeenCalledTimes(1);
    expect(fakes[0].continuous).toBe(false);
    expect(fakes[0].interimResults).toBe(true);
    expect(fakes[0].lang).toBe("en-US");
  });

  it("onresult with a final result appends to transcript", () => {
    const fakes: FakeSpeechRecognition[] = [];
    class Trackable extends FakeSpeechRecognition {
      constructor() {
        super();
        fakes.push(this);
      }
    }
    vi.stubGlobal("SpeechRecognition", Trackable);
    const { result } = renderHook(() => useSpeechCapture());
    act(() => result.current.start());
    act(() => {
      fakes[0].onresult?.({
        results: [
          { isFinal: true, length: 1, 0: { transcript: "Ari needed a reset" } } as ResultLike,
        ],
      });
    });
    expect(result.current.transcript).toContain("Ari needed a reset");
  });

  it("stop() calls fake .stop() and onend transitions recording to false", () => {
    const fakes: FakeSpeechRecognition[] = [];
    class Trackable extends FakeSpeechRecognition {
      constructor() {
        super();
        fakes.push(this);
      }
    }
    vi.stubGlobal("SpeechRecognition", Trackable);
    const { result } = renderHook(() => useSpeechCapture());
    act(() => result.current.start());
    expect(result.current.recording).toBe(true);
    act(() => result.current.stop());
    // The fake's stop() calls onend synchronously, which sets recording=false
    expect(fakes[0].stop).toHaveBeenCalledTimes(1);
    expect(result.current.recording).toBe(false);
  });

  it("onerror sets error and clears recording", () => {
    const fakes: FakeSpeechRecognition[] = [];
    class Trackable extends FakeSpeechRecognition {
      constructor() {
        super();
        fakes.push(this);
      }
    }
    vi.stubGlobal("SpeechRecognition", Trackable);
    const { result } = renderHook(() => useSpeechCapture());
    act(() => result.current.start());
    act(() => {
      fakes[0].onerror?.({ error: "not-allowed" });
    });
    expect(result.current.error).toBeTruthy();
    expect(result.current.recording).toBe(false);
  });

  it("reset() clears transcript and error without changing supported", () => {
    const fakes: FakeSpeechRecognition[] = [];
    class Trackable extends FakeSpeechRecognition {
      constructor() {
        super();
        fakes.push(this);
      }
    }
    vi.stubGlobal("SpeechRecognition", Trackable);
    const { result } = renderHook(() => useSpeechCapture());
    act(() => result.current.start());
    act(() => {
      fakes[0].onresult?.({
        results: [{ isFinal: true, length: 1, 0: { transcript: "hello" } } as ResultLike],
      });
    });
    act(() => {
      fakes[0].onerror?.({ error: "aborted" });
    });
    expect(result.current.transcript).not.toBe("");
    expect(result.current.error).not.toBeNull();
    act(() => result.current.reset());
    expect(result.current.transcript).toBe("");
    expect(result.current.error).toBeNull();
    expect(result.current.supported).toBe(true);
  });

  it("unmount while recording invokes abort (or stop fallback)", () => {
    const fakes: FakeSpeechRecognition[] = [];
    class Trackable extends FakeSpeechRecognition {
      constructor() {
        super();
        fakes.push(this);
      }
    }
    vi.stubGlobal("SpeechRecognition", Trackable);
    const { result, unmount } = renderHook(() => useSpeechCapture());
    act(() => result.current.start());
    unmount();
    // Expect abort to have been called (preferred) OR stop as fallback
    const abortCalled = fakes[0].abort.mock.calls.length > 0;
    const stopCalled = fakes[0].stop.mock.calls.length > 0;
    expect(abortCalled || stopCalled).toBe(true);
  });

  it("double start() creates only one instance (guards against race)", () => {
    const fakes: FakeSpeechRecognition[] = [];
    class Trackable extends FakeSpeechRecognition {
      constructor() {
        super();
        fakes.push(this);
      }
    }
    vi.stubGlobal("SpeechRecognition", Trackable);
    const { result } = renderHook(() => useSpeechCapture());
    act(() => result.current.start());
    act(() => result.current.start());
    // Only one instance should have been created
    expect(fakes).toHaveLength(1);
    // And its start() should have only been called once
    expect(fakes[0].start).toHaveBeenCalledTimes(1);
  });
});
