import { describe } from "vitest";
import rule from "../../src/rules/no-unreachable-negation.js";
import { ruleTester } from "../utils/rule-tester.js";

describe("no-unreachable-negation", () => {
  ruleTester.run("no-unreachable-negation", rule, {
    valid: [
      // No cascade relationship at all.
      "foo\n!bar\n",
      // No earlier pattern to check against.
      "!foo\n",
      // "a/*" only excludes a's immediate children, not "a" itself, so
      // Git still descends into "a" and re-checks "!a/b".
      "a/*\n!a/b\n",
      // Disqualified: n's final segment is a globstar.
      "foo/\n!bar/**\n",
      // Disqualified: n has fewer than 2 effective segments even after
      // anchor preprocessing (anchored via leading '/', 1 real segment).
      "x/\n!/y\n",
      // Intervening negation ("!temp") bails the (node_modules/, !node_modules/keep) pair.
      "node_modules/\n!temp\n!node_modules/keep\n",
      // An escaped slash near the end of n's text forces the last-unescaped-
      // slash scan to reject it and keep looking further back.
      "qux\n!foo/bar\\/baz\n",
      // Pathological class expansion inside the parent-pattern comparison:
      // subsumes() throws internally, and this rule must swallow it.
      "a\n![ -Ԁ]/y\n",
      // Comments and blank lines are non-Pattern body nodes and must be
      // skipped when collecting patterns to check.
      "# comment\nfoo\n\n!bar\n",
    ],
    invalid: [
      {
        // A same-polarity (non-negated) intervening pattern is harmless
        // and does not block the report (unlike an intervening negation).
        code: "node_modules/\nbar\n!node_modules/keep\n",
        errors: [
          {
            messageId: "unreachable",
            data: { parent: "node_modules/" },
            suggestions: [
              {
                messageId: "excludeContents",
                data: { replacement: "node_modules/*" },
                output: "node_modules/*\nbar\n!node_modules/keep\n",
              },
            ],
          },
        ],
      },
      {
        // Canonical real-world case.
        code: "node_modules/\n!node_modules/keep\n",
        errors: [
          {
            messageId: "unreachable",
            data: { parent: "node_modules/" },
            suggestions: [
              {
                messageId: "excludeContents",
                data: { replacement: "node_modules/*" },
                output: "node_modules/*\n!node_modules/keep\n",
              },
            ],
          },
        ],
      },
      {
        // Non-dirOnly covering pattern: replacement gets "/*" appended.
        code: "build\n!build/keep.txt\n",
        errors: [
          {
            messageId: "unreachable",
            data: { parent: "build" },
            suggestions: [
              {
                messageId: "excludeContents",
                data: { replacement: "build/*" },
                output: "build/*\n!build/keep.txt\n",
              },
            ],
          },
        ],
      },
      {
        // A trailing globstar on the covering pattern still cascades to
        // the negation's parent directory.
        code: "a/**\n!a/b/c\n",
        errors: [
          {
            messageId: "unreachable",
            data: { parent: "a/**" },
            suggestions: [
              {
                messageId: "excludeContents",
                data: { replacement: "a/**/*" },
                output: "a/**/*\n!a/b/c\n",
              },
            ],
          },
        ],
      },
    ],
  });
});
