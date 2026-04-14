import { useCallback, useState } from "react";

export type DownloadMime = "text/plain" | "text/markdown" | "application/json";

export interface DownloadBlobOptions {
  filename: string;
  content: string;
  mime?: DownloadMime;
}

export interface UseDownloadBlobResult {
  download: (opts: DownloadBlobOptions) => void;
  lastDownloadedAt: number | null;
}

function sanitizeFilename(filename: string): string {
  // Replace anything not [A-Za-z0-9._-] with _
  const cleaned = filename.replace(/[^A-Za-z0-9._-]/g, "_");
  // Enforce max length of 128
  return cleaned.length > 128 ? cleaned.slice(0, 128) : cleaned;
}

export function useDownloadBlob(): UseDownloadBlobResult {
  const [lastDownloadedAt, setLastDownloadedAt] = useState<number | null>(null);

  const download = useCallback((opts: DownloadBlobOptions) => {
    if (typeof document === "undefined" || typeof URL === "undefined") {
      return;
    }

    const mime = opts.mime ?? "text/plain";
    const blob = new Blob([opts.content], { type: mime });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = sanitizeFilename(opts.filename);
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // Revoke the URL on the next animation frame to ensure the download has started
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() => {
        URL.revokeObjectURL(url);
      });
    } else {
      // Fallback if RAF is not available (e.g., in some test environments)
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    setLastDownloadedAt(Date.now());
  }, []);

  return { download, lastDownloadedAt };
}
