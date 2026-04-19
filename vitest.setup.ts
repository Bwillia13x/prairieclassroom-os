import { resolve } from "node:path";

process.env.PRAIRIE_MEMORY_DIR ??= resolve(
  process.cwd(),
  "output",
  "manual-run",
  "vitest-memory",
  String(process.pid),
);

// Node 25 ships an experimental `globalThis.localStorage` that lacks `clear()`
// and shadows the jsdom Storage in component tests. Replace it with a complete
// in-memory Storage implementation so spec-conformant tests work in either env.
{
  const needsPolyfill =
    typeof (globalThis as { localStorage?: Storage }).localStorage === "undefined" ||
    typeof (globalThis as { localStorage?: Storage }).localStorage?.clear !== "function";

  if (needsPolyfill) {
    const store = new Map<string, string>();
    const storage: Storage = {
      get length() {
        return store.size;
      },
      clear() {
        store.clear();
      },
      getItem(key) {
        return store.has(key) ? (store.get(key) as string) : null;
      },
      key(index) {
        return Array.from(store.keys())[index] ?? null;
      },
      removeItem(key) {
        store.delete(key);
      },
      setItem(key, value) {
        store.set(String(key), String(value));
      },
    };
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      writable: true,
      value: storage,
    });
  }
}
