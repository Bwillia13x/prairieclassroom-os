import { resolve } from "node:path";

process.env.PRAIRIE_MEMORY_DIR ??= resolve(
  process.cwd(),
  "output",
  "manual-run",
  "vitest-memory",
  String(process.pid),
);

// Node 25 ships an experimental `globalThis.localStorage` getter that warns
// unless Node is launched with --localstorage-file. Inspect the descriptor
// instead of reading the getter, then replace it with the in-memory Storage
// implementation expected by component tests.
{
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const localStorageValue =
    localStorageDescriptor && "value" in localStorageDescriptor
      ? (localStorageDescriptor.value as Storage | undefined)
      : undefined;
  const needsPolyfill =
    !localStorageDescriptor ||
    !("value" in localStorageDescriptor) ||
    typeof localStorageValue?.clear !== "function";

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
