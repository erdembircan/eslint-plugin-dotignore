import { describe } from "vitest";
import rule from "../../src/rules/no-empty-path-segment.js";
import { ruleTester } from "../utils/rule-tester.js";

describe("no-empty-path-segment", () => {
  ruleTester.run("no-empty-path-segment", rule, {
    valid: ["foo/bar", "/foo", "foo/", "**/foo"],
    invalid: [
      {
        code: "foo//bar",
        errors: [
          {
            messageId: "emptySegment",
            suggestions: [{ messageId: "collapseSegment", output: "foo/bar" }],
          },
        ],
      },
      {
        // Negated pattern: the '!' offset must be accounted for when
        // mapping the issue's pattern-relative span back to the source.
        code: "!foo//bar",
        errors: [
          {
            messageId: "emptySegment",
            suggestions: [{ messageId: "collapseSegment", output: "!foo/bar" }],
          },
        ],
      },
      {
        // A pattern with both an empty-segment issue and an unrelated
        // issue kind (backslash-path): only the empty-segment one is
        // reported by this rule.
        code: "a\\b//c",
        errors: [
          {
            messageId: "emptySegment",
            suggestions: [{ messageId: "collapseSegment", output: "a\\b/c" }],
          },
        ],
      },
      {
        // Three consecutive slashes produce two adjacent-pair issues;
        // collapsing either pair individually yields the same result.
        code: "foo///bar",
        errors: [
          {
            messageId: "emptySegment",
            suggestions: [{ messageId: "collapseSegment", output: "foo//bar" }],
          },
          {
            messageId: "emptySegment",
            suggestions: [{ messageId: "collapseSegment", output: "foo//bar" }],
          },
        ],
      },
    ],
  });
});
