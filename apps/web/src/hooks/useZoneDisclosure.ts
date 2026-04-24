import { useCallback, useEffect, useState } from "react";

interface Options {
  defaultOpen: boolean;
}

interface ZoneDisclosure {
  open: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

function storageKey(pageKey: string, zoneKey: string): string {
  return `prairie:disclosure:${pageKey}:${zoneKey}`;
}

export function useZoneDisclosure(
  pageKey: string,
  zoneKey: string,
  options: Options,
): ZoneDisclosure {
  const [open, setOpenState] = useState<boolean>(() => {
    if (typeof window === "undefined") return options.defaultOpen;
    try {
      const saved = window.localStorage.getItem(storageKey(pageKey, zoneKey));
      if (saved === "open") return true;
      if (saved === "closed") return false;
    } catch {
      /* private browsing / quota */
    }
    return options.defaultOpen;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey(pageKey, zoneKey), open ? "open" : "closed");
    } catch {
      /* ignore */
    }
  }, [open, pageKey, zoneKey]);

  const setOpen = useCallback((next: boolean) => setOpenState(next), []);
  const toggle = useCallback(() => setOpenState((prev) => !prev), []);

  return { open, toggle, setOpen };
}
