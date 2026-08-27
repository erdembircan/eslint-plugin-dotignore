import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["e2e/**/*.test.ts"],
    // Real subprocesses, a real install, real git -- each is orders of
    // magnitude slower than an in-process unit test, and cheap operations
    // (npm install, a full ESLint run) can occasionally take a while on a
    // loaded CI runner.
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // All tests share one scaffolded consumer project (built and installed
    // once in globalSetup) and drive it via real subprocesses -- running
    // multiple files/workers at once would just contend for the same
    // project directory and the same npm cache for no benefit.
    fileParallelism: false,
    globalSetup: ["e2e/global-setup.ts"],
  },
});
