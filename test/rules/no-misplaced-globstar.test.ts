import { describe } from "vitest";
import rule from "../../src/rules/no-misplaced-globstar.js";
import { ruleTester } from "../utils/rule-tester.js";

describe("no-misplaced-globstar", () => {
  ruleTester.run("no-misplaced-globstar", rule, {
    valid: ["**", "**/foo", "foo/**", "a/**/b", "a*b", "*"],
    invalid: [
      {
        code: "a**b",
        errors: [{ messageId: "misplaced" }],
        output: "a*b",
      },
      {
        code: "***",
        errors: [{ messageId: "misplaced" }],
        output: "*",
      },
      {
        code: "**a",
        errors: [{ messageId: "misplaced" }],
        output: "*a",
      },
      {
        // A pattern with both a misplaced-globstar issue and an unrelated
        // issue kind (empty-segment): only the misplaced-globstar one is
        // reported by this rule.
        code: "a**//b",
        errors: [{ messageId: "misplaced" }],
        output: "a*//b",
      },
    ],
  });
});
