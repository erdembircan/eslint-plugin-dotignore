import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/**"],
      reporter: ["text", "html", "lcov"],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
        "src/parser/**": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        "src/algebra/**": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        "src/engines/**": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
      },
    },
  },
});
