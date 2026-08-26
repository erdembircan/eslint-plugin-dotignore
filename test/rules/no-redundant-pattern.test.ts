import { describe } from "vitest";
import rule from "../../src/rules/no-redundant-pattern.js";
import { ruleTester } from "../utils/rule-tester.js";

describe("no-redundant-pattern", () => {
  ruleTester.run("no-redundant-pattern", rule, {
    valid: [
      // Negative must: no directory cascade possible here.
      "a/*.js\na/b/c.js\n",
      // Negated later pattern is skipped entirely.
      "foo\n!foo/bar\n",
      // Negated earlier pattern never counts as a covering candidate.
      "!foo\nfoo/bar\n",
      // Intervening negation bails the pair.
      "a/*\n!a/b\na/b/c\n",
      // Equivalent (not exact-duplicate) patterns are left to
      // no-duplicate-pattern entirely.
      "**/foo\nfoo\n",
      // Comments and blank lines are non-Pattern body nodes and must be
      // skipped when collecting patterns to compare.
      "# comment\nfoo\n\nbar\n",
    ],
    invalid: [
      {
        // Required cascade case: "a/*" matches "a/b" as a directory, so it
        // also covers everything under it, including "a/b/c".
        code: "a/*\na/b/c\n",
        errors: [
          { messageId: "redundant", data: { covering: "a/*", line: 1 } },
        ],
        output: "a/*\n",
      },
      {
        // A negation strictly AFTER j does not block the report --
        // last-match-wins means it overrides j regardless of j's removal.
        code: "a/*\na/b/c\n!a/b\n",
        errors: [
          { messageId: "redundant", data: { covering: "a/*", line: 1 } },
        ],
        output: "a/*\n!a/b\n",
      },
      {
        // "foo" (unanchored) cascades to cover both deeper lines directly,
        // each reported against line1 (first covering i wins). The two
        // fixes' ranges are adjacent, so only the first applies in this
        // single pass (as found in Phase 4 with no-duplicate-pattern).
        code: "foo\nfoo/bar\nfoo/bar/baz\n",
        errors: [
          { messageId: "redundant", data: { covering: "foo", line: 1 } },
          { messageId: "redundant", data: { covering: "foo", line: 1 } },
        ],
        output: "foo\nfoo/bar/baz\n",
      },
      {
        // Reverse direction: the EARLIER pattern ("a/b/c") is covered by a
        // LATER one ("a/*"). Positive patterns are pure set-union, so which
        // one is redundant doesn't depend on file order -- the earlier one
        // is flagged and removed, covering data pointing at the later line.
        code: "a/b/c\na/*\n",
        errors: [
          { messageId: "redundant", data: { covering: "a/*", line: 2 } },
        ],
        output: "a/*\n",
      },
      {
        // Proof case: unlike the forward direction, a negation strictly
        // BETWEEN the pair does NOT block a reverse-direction report. With
        // "a/b/c" present, match order is "a/b/c", "!a/b", "a/*" -- "a/*" is
        // last and covers "a/b/c", so that path ends up ignored regardless
        // of the negation. Without "a/b/c", the order is just "!a/b",
        // "a/*" -- "a/*" still comes last and still ignores the same path.
        // Both orders agree, so removing "a/b/c" is always safe here.
        code: "a/b/c\n!a/b\na/*\n",
        errors: [
          { messageId: "redundant", data: { covering: "a/*", line: 3 } },
        ],
        output: "!a/b\na/*\n",
      },
      {
        // Chain case, sanity check: "a/*" (direct children of "a" only) is
        // itself covered by "a/**" (any depth under "a", including direct
        // children) -- a one-way relationship, not mutual, so this reports
        // exactly once (no double-report risk from checking both
        // directions on the same pair).
        code: "a/*\na/**\n",
        errors: [
          { messageId: "redundant", data: { covering: "a/**", line: 2 } },
        ],
        output: "a/**\n",
      },
      {
        // Pathological class expansion: subsumes(earlier, later) throws
        // internally trying to expand the huge class as the COVERED side,
        // and is swallowed rather than crashing the lint run (no forward
        // report results). subsumes(later, earlier) doesn't hit that
        // expansion at all here -- "a" is just a literal char being tested
        // for class membership, not expanded -- and correctly finds "a"
        // covered by the class, which legitimately matches it.
        code: "a\n[ -Ԁ]\n",
        errors: [
          { messageId: "redundant", data: { covering: "[ -Ԁ]", line: 2 } },
        ],
        output: "[ -Ԁ]\n",
      },
    ],
  });
});
