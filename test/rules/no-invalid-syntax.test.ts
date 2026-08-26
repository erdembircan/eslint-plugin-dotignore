import { describe } from "vitest";
import rule from "../../src/rules/no-invalid-syntax.js";
import { ruleTester } from "../utils/rule-tester.js";

describe("no-invalid-syntax", () => {
  ruleTester.run("no-invalid-syntax", rule, {
    valid: [
      "foo",
      "[abc]",
      "[a-z]",
      "!foo",
      "/foo",
      "foo/",
      // Other analyze() issue kinds (empty-segment, backslash-path,
      // misplaced-globstar) are out of scope for this rule -- they're
      // handled by their own dedicated rules.
      "foo//bar",
      "a\\b",
      "a**b",
    ],
    invalid: [
      {
        code: "foo\\",
        errors: [{ messageId: "trailingBackslash" }],
      },
      {
        code: "[abc",
        errors: [{ messageId: "unclosedClass" }],
      },
      {
        code: "[]",
        errors: [{ messageId: "emptyClass" }],
      },
      {
        code: "[z-a]",
        errors: [{ messageId: "reversedRange", data: { range: "z-a" } }],
      },
      {
        code: "!",
        errors: [{ messageId: "bareNegation" }],
      },
      {
        code: "/",
        errors: [{ messageId: "bareSlash" }],
      },
    ],
  });
});
