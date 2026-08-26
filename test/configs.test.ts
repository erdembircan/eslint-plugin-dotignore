import type { Plugin } from "@eslint/core";
import { describe, expect, it } from "vitest";
import { buildConfigs } from "../src/configs.js";
import { rules } from "../src/rules/index.js";

describe("buildConfigs", () => {
  const fakePlugin: Plugin = {
    meta: { name: "eslint-plugin-dotignore", version: "1.0.0" },
  };
  const { recommended, strict } = buildConfigs(fakePlugin);

  it("targets .gitignore files and the plugin's language for both configs", () => {
    for (const config of [recommended, strict]) {
      expect(config.files).toEqual(["**/.gitignore"]);
      expect(config.language).toBe("dotignore/gitignore");
      expect(config.plugins).toEqual({ dotignore: fakePlugin });
    }
  });

  it("self-references the exact plugin instance passed in", () => {
    expect(recommended.plugins?.dotignore).toBe(fakePlugin);
    expect(strict.plugins?.dotignore).toBe(fakePlugin);
  });

  it("recommended contains exactly all 12 recommendedSeverities entries now that every one of them is registered", () => {
    const expectedKeys = [
      "no-invalid-syntax",
      "no-duplicate-pattern",
      "no-redundant-pattern",
      "no-unreachable-negation",
      "no-backslash-path",
      "no-empty-path-segment",
      "no-misplaced-globstar",
      "no-trailing-whitespace",
      "comment-spacing",
      "max-consecutive-blank-lines",
      "no-empty-group",
      "leading-slash-style",
    ]
      .map((name) => `dotignore/${name}`)
      .sort();
    expect(Object.keys(recommended.rules ?? {}).sort()).toEqual(expectedKeys);
  });

  it("excludes the opinionated formatting rules from recommended, but includes them in strict", () => {
    // sort-patterns, group-patterns, and require-dir-slash are
    // deliberately absent from recommendedSeverities (they're formatting
    // preferences, not correctness/consistency rules) even though all
    // three are registered.
    for (const name of [
      "sort-patterns",
      "group-patterns",
      "require-dir-slash",
    ]) {
      expect(rules).toHaveProperty(name);
      expect(recommended.rules).not.toHaveProperty(`dotignore/${name}`);
      expect(strict.rules).toHaveProperty(`dotignore/${name}`, "error");
    }
  });

  it("registers exactly 15 rules in total", () => {
    expect(Object.keys(rules)).toHaveLength(15);
  });

  it("strict contains every registered rule, each set to error", () => {
    const expectedKeys = Object.keys(rules)
      .map((name) => `dotignore/${name}`)
      .sort();
    expect(Object.keys(strict.rules ?? {}).sort()).toEqual(expectedKeys);
    for (const severity of Object.values(strict.rules ?? {})) {
      expect(severity).toBe("error");
    }
  });

  it("never includes rule options, only severities", () => {
    for (const config of [recommended, strict]) {
      for (const value of Object.values(config.rules ?? {})) {
        expect(typeof value === "string" || typeof value === "number").toBe(
          true,
        );
      }
    }
  });
});
