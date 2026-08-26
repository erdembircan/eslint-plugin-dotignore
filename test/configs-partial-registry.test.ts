import type { Plugin } from "@eslint/core";
import { describe, expect, it, vi } from "vitest";

// A separate test file (rather than a case inside configs.test.ts) so this
// mock of the rules registry stays isolated from the tests that need the
// real one.
vi.mock("../src/rules/index.js", () => ({
  rules: { "no-invalid-syntax": {} },
}));

describe("buildConfigs with a partial registry", () => {
  it("filters recommendedSeverities entries down to only those actually registered", async () => {
    const { buildConfigs } = await import("../src/configs.js");
    const plugin: Plugin = {
      meta: { name: "eslint-plugin-dotignore", version: "1.0.0" },
    };
    const { recommended, strict } = buildConfigs(plugin);

    // Only "no-invalid-syntax" is "registered" here, even though
    // recommendedSeverities lists many more rule names.
    expect(recommended.rules).toEqual({
      "dotignore/no-invalid-syntax": "error",
    });
    expect(strict.rules).toEqual({ "dotignore/no-invalid-syntax": "error" });
  });
});
