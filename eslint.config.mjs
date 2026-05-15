import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "output/**",
      "tmp/**",
      "**/.venv*/**",
      "**/*.js",
      "**/*.cjs",
      // Sibling git worktrees under .claude/ share the parser root and
      // produce duplicate-TSConfigRootDir noise when lint walks into them.
      ".claude/**",
    ],
  },
  {
    files: ["scripts/**/*.mjs", "eslint.config.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        fetch: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        URL: "readonly",
      },
    },
  },
  {
    files: ["scripts/record-walkthrough.mjs", "scripts/record-demo-video.mjs"],
    languageOptions: {
      globals: {
        document: "readonly",
        Event: "readonly",
        localStorage: "readonly",
        performance: "readonly",
        requestAnimationFrame: "readonly",
        window: "readonly",
      },
    },
  },
  {
    files: [
      "scripts/smoke-browser.mjs",
      "scripts/audit-2026-04-25-sweep.mjs",
      "scripts/validate-today-layout.mjs",
      "qa/final-release/**/*.mjs",
    ],
    languageOptions: {
      globals: {
        document: "readonly",
        getComputedStyle: "readonly",
        localStorage: "readonly",
        process: "readonly",
        console: "readonly",
        sessionStorage: "readonly",
        setTimeout: "readonly",
        URLSearchParams: "readonly",
        window: "readonly",
        PopStateEvent: "readonly",
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
