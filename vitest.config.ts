import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    include: [
      "services/**/__tests__/**/*.test.ts",
      "packages/**/__tests__/**/*.test.ts",
      "apps/web/src/__tests__/**/*.test.ts",
      "apps/web/src/components/shared/__tests__/**/*.test.tsx",
    ],
    environment: "node",
    environmentMatchGlobs: [
      ["apps/web/src/components/shared/__tests__/**", "jsdom"],
    ],
    setupFiles: ["apps/web/src/components/shared/__tests__/setup.ts"],
  },
  resolve: {
    alias: {
      "@prairie/shared": resolve(__dirname, "packages/shared"),
    },
  },
});
