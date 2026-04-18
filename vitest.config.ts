import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    include: [
      "services/**/__tests__/**/*.test.ts",
      "packages/**/__tests__/**/*.test.ts",
      "apps/web/src/__tests__/**/*.test.ts",
      "apps/web/src/__tests__/**/*.test.tsx",
      "apps/web/src/components/__tests__/**/*.test.tsx",
      "apps/web/src/components/shared/__tests__/**/*.test.tsx",
      "apps/web/src/components/quickCapture/__tests__/**/*.test.ts",
      "apps/web/src/components/quickCapture/__tests__/**/*.test.tsx",
      "apps/web/src/panels/__tests__/**/*.test.ts",
      "apps/web/src/panels/__tests__/**/*.test.tsx",
      "apps/web/src/hooks/__tests__/**/*.test.ts",
      "apps/web/src/hooks/__tests__/**/*.test.tsx",
      "apps/web/src/utils/__tests__/**/*.test.ts",
    ],
    environment: "node",
    environmentMatchGlobs: [
      ["apps/web/src/__tests__/**/*.tsx", "jsdom"],
      ["apps/web/src/components/__tests__/**", "jsdom"],
      ["apps/web/src/components/shared/__tests__/**", "jsdom"],
      ["apps/web/src/components/quickCapture/__tests__/**/*.test.ts", "node"],
      ["apps/web/src/components/quickCapture/__tests__/**/*.test.tsx", "jsdom"],
      ["apps/web/src/panels/__tests__/**", "jsdom"],
      ["apps/web/src/hooks/__tests__/**", "jsdom"],
    ],
    setupFiles: [
      "vitest.setup.ts",
      "apps/web/src/components/shared/__tests__/setup.ts",
    ],
  },
  resolve: {
    alias: {
      "@prairie/shared": resolve(__dirname, "packages/shared"),
    },
  },
});
