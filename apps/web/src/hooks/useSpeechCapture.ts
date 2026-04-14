import { useState, useRef, useEffect, useCallback } from "react";

// Minimal structural type for the SpeechRecognition instance so we can call
// its methods without importing @types/dom-speech-recognition.
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: SpeechRecognitionResultLike[] }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort?: () => void;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string };
}

export interface UseSpeechCaptureResult {
  supported: boolean;
  recording: boolean;
  transcript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | undefined {
  if (typeof window === "undefined") return undefined;
  const ctor =
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
  return typeof ctor === "function"
    ? (ctor as new () => SpeechRecognitionInstance)
    : undefined;
}

const noop = () => undefined;

export function useSpeechCapture(): UseSpeechCaptureResult {
  // Feature detection — evaluated on each render so vi.stubGlobal works in tests.
  const SpeechRecognitionCtor = getSpeechRecognitionCtor();
  const supported = SpeechRecognitionCtor !== undefined;

  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  // Ref to the active SpeechRecognition instance.
  const recognizerRef = useRef<SpeechRecognitionInstance | null>(null);

  // Track whether the hook is still mounted so state setters are safe.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const recognizer = recognizerRef.current;
      if (recognizer) {
        if (typeof recognizer.abort === "function") {
          recognizer.abort();
        } else {
          recognizer.stop();
        }
        recognizerRef.current = null;
      }
    };
  }, []);

  const start = useCallback(() => {
    if (recognizerRef.current) return; // already recording — ignore double-start
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return; // unsupported — safe no-op

    const recognizer = new Ctor();

    recognizer.continuous = false;
    recognizer.interimResults = true;
    recognizer.lang = "en-US";

    recognizer.onresult = (e: { results: SpeechRecognitionResultLike[] }) => {
      if (!mountedRef.current) return;
      let nextFinal = "";
      for (const result of e.results) {
        if (result.isFinal) {
          nextFinal += result[0].transcript;
        }
      }
      if (nextFinal) {
        setTranscript((prev) => prev + nextFinal);
      }
    };

    recognizer.onerror = (e: { error: string }) => {
      if (!mountedRef.current) return;
      setError(e.error);
      setRecording(false);
    };

    recognizer.onend = () => {
      if (!mountedRef.current) return;
      setRecording(false);
    };

    recognizerRef.current = recognizer;
    recognizer.start();
    setRecording(true);
  }, []);

  const stop = useCallback(() => {
    const recognizer = recognizerRef.current;
    if (recognizer) {
      recognizer.stop();
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setError(null);
  }, []);

  if (!supported) {
    return {
      supported: false,
      recording: false,
      transcript: "",
      error: null,
      start: noop,
      stop: noop,
      reset: noop,
    };
  }

  return { supported: true, recording, transcript, error, start, stop, reset };
}
