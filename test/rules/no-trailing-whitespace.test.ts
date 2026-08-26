import { describe } from "vitest";
import rule from "../../src/rules/no-trailing-whitespace.js";
import { ruleTester } from "../utils/rule-tester.js";

describe("no-trailing-whitespace", () => {
  ruleTester.run("no-trailing-whitespace", rule, {
    valid: [
      "foo",
      "foo\\ ",
      "# comment",
      "#",
      "",
      "foo\nbar\n",
      "foo\n\nbar\n",
    ],
    invalid: [
      {
        code: "foo  ",
        errors: [{ messageId: "trailingPattern" }],
        output: "foo",
      },
      {
        code: "# comment  ",
        errors: [{ messageId: "trailingComment" }],
        output: "# comment",
      },
      {
        code: "   ",
        errors: [{ messageId: "whitespaceOnlyLine" }],
        output: "",
      },
      {
        code: "\t\t",
        errors: [{ messageId: "whitespaceOnlyLine" }],
        output: "",
      },
      {
        // Only the final *unescaped* space is stripped; the escaped one
        // right after the backslash is meaningful and stays.
        code: "foo\\  ",
        errors: [{ messageId: "trailingPattern" }],
        output: "foo\\ ",
      },
      {
        code: "foo  \nbar\n",
        errors: [{ messageId: "trailingPattern" }],
        output: "foo\nbar\n",
      },
    ],
  });
});
