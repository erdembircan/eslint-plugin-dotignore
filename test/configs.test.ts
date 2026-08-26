import type { Plugin } from "@eslint/core";
import { describe, expect, it } from "vitest";
import { buildConfigs } from "../src/configs.js";
import { rules } from "../src/rules/index.js";

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

  it("recommended contains exactly the Phase-4 rules present in the registry so far, dotignore/-prefixed", () => {
    // All 10 rules landed in Phase 4 happen to be in recommendedSeverities,
    // so every currently-registered rule name should show up here.
    const expectedKeys = Object.keys(rules)
      .map((name) => `dotignore/${name}`)
      .sort();
    expect(Object.keys(recommended.rules ?? {}).sort()).toEqual(expectedKeys);
  });

  it("filters out recommendedSeverities entries not yet in the registry (Phase 5)", () => {
    // These two are named in recommendedSeverities but their rule modules
    // don't exist until Phase 5 -- this locks in the "configs stay
    // automatically correct as rules land phase by phase" contract.
    expect(rules).not.toHaveProperty("no-redundant-pattern");
    expect(rules).not.toHaveProperty("no-unreachable-negation");
    expect(recommended.rules).not.toHaveProperty(
      "dotignore/no-redundant-pattern",
    );
    expect(recommended.rules).not.toHaveProperty(
      "dotignore/no-unreachable-negation",
    );
  });

  it("all contains every registered rule, each set to error", () => {
    const expectedKeys = Object.keys(rules)
      .map((name) => `dotignore/${name}`)
      .sort();
    expect(Object.keys(all.rules ?? {}).sort()).toEqual(expectedKeys);
    for (const severity of Object.values(all.rules ?? {})) {
      expect(severity).toBe("error");
    }
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
