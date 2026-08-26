import { describe } from "vitest";
import rule from "../../src/rules/no-backslash-path.js";
import { ruleTester } from "../utils/rule-tester.js";

describe("no-backslash-path", () => {
  ruleTester.run("no-backslash-path", rule, {
    valid: [
      "foo/bar",
      "foo\\ bar", // escaped space: meaningful escape, not flagged
      "foo\\#bar", // escaped '#': meaningful escape
      "foo\\\\bar", // escaped backslash: meaningful escape
    ],
    invalid: [
      {
        code: "a\\bc",
        errors: [
          {
            messageId: "backslashPath",
            suggestions: [{ messageId: "replaceSeparator", output: "a/bc" }],
          },
        ],
      },
      {
        code: "\\5",
        errors: [
          {
            messageId: "backslashPath",
            suggestions: [{ messageId: "replaceSeparator", output: "/5" }],
          },
        ],
      },
      {
        // A pattern with both a backslash-path issue and an unrelated
        // issue kind (empty-segment): only the backslash-path one is
        // reported by this rule, confirming other issue kinds are
        // filtered out rather than acted on.
        code: "a\\b//c",
        errors: [
          {
            messageId: "backslashPath",
            suggestions: [{ messageId: "replaceSeparator", output: "a/b//c" }],
          },
        ],
      },
    ],
  });
});
