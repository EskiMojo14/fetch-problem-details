import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  pack: {
    entry: ["src/index.ts", "src/standard.ts"],
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
