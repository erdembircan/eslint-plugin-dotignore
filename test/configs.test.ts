import type { Plugin } from "@eslint/core";
import { describe, expect, it } from "vitest";
import { buildConfigs } from "../src/configs.js";

describe("buildConfigs", () => {
  const fakePlugin: Plugin = {
    meta: { name: "eslint-plugin-dotignore", version: "1.0.0" },
  };
  const { recommended, all } = buildConfigs(fakePlugin);

  it("targets .gitignore files and the plugin's language for both configs", () => {
    for (const config of [recommended, all]) {
      expect(config.files).toEqual(["**/.gitignore"]);
      expect(config.language).toBe("dotignore/gitignore");
      expect(config.plugins).toEqual({ dotignore: fakePlugin });
    }
  });

  it("self-references the exact plugin instance passed in", () => {
    expect(recommended.plugins?.dotignore).toBe(fakePlugin);
    expect(all.plugins?.dotignore).toBe(fakePlugin);
  });

  it("only includes rules that exist in the registry (currently none, pre-Phase-4/5)", () => {
    // The registry is empty at this point in the plugin's development, so
    // both configs' rule sets are empty too -- this locks in the "configs
    // stay automatically correct as rules land phase by phase" contract:
    // nothing here should need to change once rules are added.
    expect(recommended.rules).toEqual({});
    expect(all.rules).toEqual({});
  });

  it("never includes rule options, only severities", () => {
    for (const config of [recommended, all]) {
      for (const value of Object.values(config.rules ?? {})) {
        expect(typeof value === "string" || typeof value === "number").toBe(
          true,
        );
      }
    }
  });
});
