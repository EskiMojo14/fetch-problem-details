import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  pack: {
    dts: {
      tsgo: true,
    },
    exports: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
      reportUnusedDisableDirectives: "error",
    },
    categories: {
      correctness: "error",
      suspicious: "warn",
    },
    rules: {
      "typescript/array-type": ["error", { default: "generic" }],
      "typescript/no-unsafe-type-assertion": "off",
      "typescript/consistent-type-imports": ["error", { prefer: "type-imports" }],
    },
    settings: {
      vitest: {
        typecheck: true,
      },
    },
    env: {
      builtin: true,
    },
    overrides: [
      {
        files: ["**/*.test.ts"],
        plugins: ["eslint", "typescript", "unicorn", "vitest"],
        rules: {
          // false positives with imported `it`/`test`
          "vitest/no-standalone-expect": "off",
          "no-restricted-imports": [
            "error",
            {
              name: "vite-plus/test",
              importNames: ["it", "test"],
              message: "Use the `it`/`test` from your fixtures file instead.",
            },
          ],
        },
      },
    ],
  },
  fmt: {
    sortImports: true,
  },
  test: {
    setupFiles: ["./tests/setup.ts"],
  },
});
