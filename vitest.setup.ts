import { resolve } from "node:path";

process.env.PRAIRIE_MEMORY_DIR ??= resolve(
  process.cwd(),
  "output",
  "manual-run",
  "vitest-memory",
  String(process.pid),
);
