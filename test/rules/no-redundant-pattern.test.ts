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
      // Pathological class expansion: subsumes() throws internally, and
      // this rule must swallow it rather than crash.
      "a\n[ -Ԁ]\n",
      // Comments and blank lines are non-Pattern body nodes and must be
      // skipped when collecting patterns to compare.
      "# comment\nfoo\n\nbar\n",
    ],
    invalid: [
      {
        // Required cascade case: "a/*" matches "a/b" as a directory, so it
        // also covers everything under it, including "a/b/c".
        code: "a/*\na/b/c\n",
        errors: [{ messageId: "redundant", data: { covering: "a/*", line: 1 } }],
        output: "a/*\n",
      },
      {
        // A negation strictly AFTER j does not block the report --
        // last-match-wins means it overrides j regardless of j's removal.
        code: "a/*\na/b/c\n!a/b\n",
        errors: [{ messageId: "redundant", data: { covering: "a/*", line: 1 } }],
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
    ],
  });
});
