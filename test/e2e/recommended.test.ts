import type { ConfigObject } from "@eslint/core";
import { Linter } from "eslint";
import { describe, expect, it } from "vitest";
import plugin from "../../src/index.js";

// `Plugin["configs"]` is typed generically as
// `Record<string, LegacyConfigObject | ConfigObject | ConfigObject[]> | undefined`,
// but src/index.ts assigns it synchronously right after building the plugin
// object (before export) via `buildConfigs`, which always produces flat
// `ConfigObject`s for both `recommended` and `strict` -- by the time anything
// can import `plugin`, both are always present and always flat configs.
// These assertions just narrow past the generic type, not past any real
// uncertainty (same `ConfigObject` type used in test/language/integration.test.ts).
const configs = plugin.configs!;
const recommended = configs.recommended as ConfigObject;
const strict = configs.strict as ConfigObject;

/**
 * A single messy, realistic-looking `.gitignore` exercising eleven of the
 * twelve rules in `configs.recommended` at once (every recommended rule
 * except `no-invalid-syntax`, which has its own dedicated coverage
 * elsewhere and isn't needed to clear this test's "at least 6 rules" bar).
 * Line numbers below are 1-based and referenced directly in the assertions,
 * so keep them in sync if this fixture ever changes.
 *
 *  1  foo               -> trailing whitespace
 *  2  #comment          -> missing space after '#'
 *  3  node_modules/     -> (parent of the unreachable negation below)
 *  4  !node_modules/keep -> unreachable negation
 *  5  a\bc              -> backslash path separator
 *  6  (blank)           -> together with line 7, exceeds max consecutive
 *  7  (blank)              blank lines (default max: 1)
 *  8  foo//bar          -> empty path segment
 *  9  a**b              -> misplaced globstar
 * 10  docs              -> (original of the duplicate below)
 * 11  docs              -> duplicate pattern
 * 12  a/*               -> (covers the redundant pattern below)
 * 13  a/b/c             -> redundant pattern
 * 14  /dist/main        -> redundant leading slash
 * 15  # empty heading   -> empty group heading (nothing follows before EOF)
 */
const MESSY = [
  "foo  ",
  "#comment",
  "node_modules/",
  "!node_modules/keep",
  "a\\bc",
  "",
  "",
  "foo//bar",
  "a**b",
  "docs",
  "docs",
  "a/*",
  "a/b/c",
  "/dist/main",
  "# empty heading",
  "",
].join("\n");

const CLEAN = [
  "node_modules/",
  "*.log",
  "",
  "# build artifacts",
  "dist/",
  "build/",
  "",
].join("\n");

function verifyMessy(linter: Linter) {
  return linter.verify(MESSY, recommended, {
    filename: ".gitignore",
  });
}

describe("e2e: configs.recommended against inline fixtures", () => {
  it("flags the exact set of (ruleId, line) findings across 11 different rules on a messy file", () => {
    const linter = new Linter({ configType: "flat" });
    const messages = verifyMessy(linter);

    const findings = messages.map((message) => ({
      ruleId: message.ruleId,
      line: message.line,
    }));

    expect(findings).toEqual([
      { ruleId: "dotignore/no-trailing-whitespace", line: 1 },
      { ruleId: "dotignore/comment-spacing", line: 2 },
      { ruleId: "dotignore/no-unreachable-negation", line: 4 },
      { ruleId: "dotignore/no-backslash-path", line: 5 },
      { ruleId: "dotignore/max-consecutive-blank-lines", line: 7 },
      { ruleId: "dotignore/no-empty-path-segment", line: 8 },
      { ruleId: "dotignore/no-misplaced-globstar", line: 9 },
      { ruleId: "dotignore/no-duplicate-pattern", line: 11 },
      { ruleId: "dotignore/no-redundant-pattern", line: 13 },
      { ruleId: "dotignore/leading-slash-style", line: 14 },
      { ruleId: "dotignore/no-empty-group", line: 15 },
    ]);

    // Sanity check on the "at least 6 different rules" requirement itself.
    expect(new Set(findings.map((f) => f.ruleId)).size).toBeGreaterThanOrEqual(
      6,
    );
  });

  it("converges to the exact fully-fixed text via verifyAndFix (mirrors `eslint --fix`, capped at 10 internal passes)", () => {
    const linter = new Linter({ configType: "flat" });
    const result = linter.verifyAndFix(MESSY, recommended, {
      filename: ".gitignore",
    });

    expect(result.fixed).toBe(true);
    expect(result.output).toBe(
      [
        "foo",
        "# comment",
        "node_modules/",
        "!node_modules/keep",
        "a\\bc",
        "",
        "foo//bar",
        "a*b",
        "docs",
        "a/*",
        "dist/main",
        "",
      ].join("\n"),
    );

    // What's left can only be suggestion-only findings: nothing further is
    // auto-fixable, so re-running fix again would be a no-op.
    const ruleIdsRemaining = result.messages.map((message) => message.ruleId);
    expect(ruleIdsRemaining.sort()).toEqual(
      [
        "dotignore/no-backslash-path",
        "dotignore/no-empty-path-segment",
        "dotignore/no-unreachable-negation",
      ].sort(),
    );

    const second = linter.verifyAndFix(result.output, recommended, {
      filename: ".gitignore",
    });
    expect(second.output).toBe(result.output);
    expect(second.fixed).toBe(false);
  });

  it("produces zero messages for a clean, well-formed file", () => {
    const linter = new Linter({ configType: "flat" });
    const messages = linter.verify(CLEAN, recommended, {
      filename: ".gitignore",
    });

    expect(messages).toEqual([]);
  });

  it("smoke test: configs.strict runs without crashing on the messy fixture", () => {
    const linter = new Linter({ configType: "flat" });

    expect(() => {
      const messages = linter.verify(MESSY, strict, {
        filename: ".gitignore",
      });
      // Every rule in the registry is "error" in `strict`, so it should
      // find at least as much as `recommended` did, across every rule id
      // it reports -- not asserting exact content here since `strict` also
      // includes the filesystem-aware `require-dir-slash`, whose findings
      // depend on the real directory tree next to wherever this test
      // happens to run, and the reordering rules (`sort-patterns`,
      // `group-patterns`), whose findings depend on each other's output.
      // This is intentionally a crash smoke test only.
      expect(Array.isArray(messages)).toBe(true);
    }).not.toThrow();
  });
});

/**
 * Regression coverage for two fix-quality bugs found in a full-tarball
 * consumer check under `configs.strict`. Scoped to the specific rules
 * involved (rather than `strict` itself) so these stay filesystem-free:
 * `strict` also enables the fs-aware `require-dir-slash`, whose findings
 * depend on the real directory tree next to wherever a test runs.
 */
describe("e2e: group-patterns cross-rule fix-quality regressions", () => {
  it("fully alphabetizes a moved-into group instead of leaving a stray interior blank line between its patterns", () => {
    // Bug: group-patterns' move fixer used to insert a relocated pattern
    // right before the NEXT section's heading, landing it after that
    // heading's own leading separator blank instead of right after the
    // destination section's last existing pattern. That stray interior
    // blank made sort-patterns treat the two folders-group patterns as
    // separate blocks (correct behavior for a real blank), leaving the
    // group unalphabetized yet lint-clean.
    const linter = new Linter({ configType: "flat" });
    const config: ConfigObject = {
      files: ["**/.gitignore"],
      plugins: { dotignore: plugin },
      language: "dotignore/gitignore",
      rules: {
        "dotignore/group-patterns": "error",
        "dotignore/sort-patterns": "error",
      },
    };

    const result = linter.verifyAndFix("zebra/\napple\nbanana/\nyak", config, {
      filename: ".gitignore",
    });

    expect(result.output).toBe(
      "# folders\nbanana/\nzebra/\n\n# files\napple\nyak\n",
    );
    expect(result.messages).toEqual([]);
  });

  it("does not leave a stray trailing blank line when a now-empty group heading is removed", () => {
    // Bug: no-empty-group's removal fixer consumed blank lines FOLLOWING
    // an empty heading block, but never one immediately PRECEDING it. When
    // group-patterns had earlier inserted that preceding blank as a
    // section separator, and the section's only pattern was later removed
    // as redundant/duplicate (emptying the heading, which then also gets
    // removed since it reaches EOF), the separator blank was left dangling
    // at EOF with nothing left to separate.
    const linter = new Linter({ configType: "flat" });
    const config: ConfigObject = {
      files: ["**/.gitignore"],
      plugins: { dotignore: plugin },
      language: "dotignore/gitignore",
      rules: {
        "dotignore/group-patterns": "error",
        "dotignore/no-redundant-pattern": "error",
        "dotignore/no-duplicate-pattern": "error",
        "dotignore/no-empty-group": "error",
      },
    };

    for (const input of [
      "dist/\ndist/bundle.js",
      "dist/\ndist/\ndist/bundle.js",
    ]) {
      const result = linter.verifyAndFix(input, config, {
        filename: ".gitignore",
      });
      expect(result.output).toBe("# folders\ndist/\n");
      expect(result.messages).toEqual([]);
    }
  });
});
