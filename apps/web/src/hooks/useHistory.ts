import { useState, useEffect, useCallback } from "react";

interface UseHistoryResult<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useHistory<T>(
  fetchFn: (classroomId: string, limit: number, signal: AbortSignal) => Promise<T[]>,
  classroomId: string,
  limit: number,
): UseHistoryResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!classroomId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchFn(classroomId, limit, controller.signal)
      .then((data) => { setItems(data); setLoading(false); })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load history");
        setLoading(false);
      });

    return () => controller.abort();
  }, [classroomId, limit, fetchFn, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  return { items, loading, error, refresh };
}
