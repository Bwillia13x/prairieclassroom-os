import { useCallback, useEffect, useState } from "react";
import { fetchRecentRuns, saveRun as saveRunRemote } from "../api";

export interface RecentRun {
  id: string;
  label: string;
  at: number;
}

type Tool = "differentiate" | "simplify" | "vocab";

function listStorageKey(tool: Tool, classroomId: string): string {
  return `prairie-recent-${tool}-${classroomId}`;
}

function payloadStorageKey(tool: Tool, classroomId: string, runId: string): string {
  return `prairie-recent-${tool}-${classroomId}-payload-${runId}`;
}

function read(tool: Tool, classroomId: string): RecentRun[] {
  try {
    const raw = sessionStorage.getItem(listStorageKey(tool, classroomId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RecentRun =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as RecentRun).id === "string" &&
        typeof (e as RecentRun).label === "string" &&
        typeof (e as RecentRun).at === "number",
    );
  } catch {
    return [];
  }
}

function write(tool: Tool, classroomId: string, runs: RecentRun[]): void {
  try {
    sessionStorage.setItem(listStorageKey(tool, classroomId), JSON.stringify(runs));
  } catch {
    // Storage quota / private mode — silent no-op.
  }
}

function writePayload<T>(
  tool: Tool,
  classroomId: string,
  runId: string,
  payload: T,
): void {
  try {
    sessionStorage.setItem(
      payloadStorageKey(tool, classroomId, runId),
      JSON.stringify(payload),
    );
  } catch {
    // Payload may be large; if storage is full we silently drop the cache.
    // The chip row still works as a nav hint even without restore.
  }
}

function readPayload<T>(
  tool: Tool,
  classroomId: string,
  runId: string,
): T | null {
  try {
    const raw = sessionStorage.getItem(payloadStorageKey(tool, classroomId, runId));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function pruneOrphanPayloads(
  tool: Tool,
  classroomId: string,
  keepIds: Set<string>,
): void {
  try {
    const prefix = `${listStorageKey(tool, classroomId)}-payload-`;
    const stale: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (!k || !k.startsWith(prefix)) continue;
      const id = k.slice(prefix.length);
      if (!keepIds.has(id)) stale.push(k);
    }
    for (const k of stale) sessionStorage.removeItem(k);
  } catch {
    // silent no-op
  }
}

export function useRecentRuns(tool: Tool, classroomId: string, limit = 3) {
  const [runs, setRuns] = useState<RecentRun[]>(() => read(tool, classroomId));

  useEffect(() => {
    setRuns(read(tool, classroomId));
  }, [tool, classroomId]);

  // Seed from the server on mount / classroom change. Keeps sessionStorage
  // as the optimistic cache so the chip row paints immediately; server runs
  // replace/extend once they arrive. Silent no-op if the endpoint is
  // unavailable (older deployments, network error, classroom not found).
  useEffect(() => {
    if (!classroomId) return;
    let cancelled = false;
    fetchRecentRuns(classroomId, tool, limit)
      .then((remote) => {
        if (cancelled) return;
        if (remote.length === 0) return;
        setRuns((prev) => {
          const seen = new Set<string>();
          const merged: RecentRun[] = [];
          for (const r of [...remote, ...prev]) {
            if (seen.has(r.id)) continue;
            seen.add(r.id);
            merged.push(r);
          }
          merged.sort((a, b) => b.at - a.at);
          const capped = merged.slice(0, limit);
          write(tool, classroomId, capped);
          return capped;
        });
      })
      .catch(() => {
        // Non-fatal — stay on sessionStorage-only.
      });
    return () => {
      cancelled = true;
    };
  }, [tool, classroomId, limit]);

  const record = useCallback(
    <T,>(run: RecentRun, payload?: T) => {
      setRuns((prev) => {
        const next = [run, ...prev.filter((r) => r.id !== run.id)].slice(0, limit);
        write(tool, classroomId, next);
        pruneOrphanPayloads(tool, classroomId, new Set(next.map((r) => r.id)));
        return next;
      });
      if (payload !== undefined) {
        writePayload(tool, classroomId, run.id, payload);
      }
      // Fire-and-forget server persistence. Failure is silent so the UI
      // remains responsive on offline / Ollama-only deployments.
      saveRunRemote(classroomId, {
        run_id: run.id,
        tool,
        label: run.label,
        created_at: new Date(run.at).toISOString(),
      }).catch(() => {
        /* non-fatal */
      });
    },
    [tool, classroomId, limit],
  );

  const clear = useCallback(() => {
    write(tool, classroomId, []);
    pruneOrphanPayloads(tool, classroomId, new Set());
    setRuns([]);
  }, [tool, classroomId]);

  const getPayload = useCallback(
    <T,>(runId: string): T | null => readPayload<T>(tool, classroomId, runId),
    [tool, classroomId],
  );

  return { runs, record, clear, getPayload };
}
