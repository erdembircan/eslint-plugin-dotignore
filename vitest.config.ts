import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    // Scoped to the unit suite so the top-level e2e/ directory (its own
    // vitest config, run via `pnpm test:e2e`) is never picked up here --
    // e2e spawns real subprocesses and has no place in a coverage run.
    include: ["test/**/*.test.ts"],
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
