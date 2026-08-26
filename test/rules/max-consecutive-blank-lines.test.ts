import { describe } from "vitest";
import rule from "../../src/rules/max-consecutive-blank-lines.js";
import { ruleTester } from "../utils/rule-tester.js";

describe("max-consecutive-blank-lines", () => {
  ruleTester.run("max-consecutive-blank-lines", rule, {
    valid: [
      "a\nb\n",
      "a\n\nb\n",
      { code: "a\n\nb\n", options: [{ max: 1 }] },
      { code: "a\n\n\nb\n", options: [{ max: 2 }] },
      { code: "a\n\n\n\nb\n", options: [{ max: 3 }] },
      { code: "a\nb\n", options: [{ max: 0 }] },
    ],
    invalid: [
      {
        code: "a\n\n\n\nb\n",
        errors: [{ messageId: "tooMany", data: { count: 3, max: 1 } }],
        output: "a\n\nb\n",
      },
      {
        code: "a\n\n\n\nb\n",
        options: [{ max: 2 }],
        errors: [{ messageId: "tooMany", data: { count: 3, max: 2 } }],
        output: "a\n\n\nb\n",
      },
      {
        code: "a\n\nb\n",
        options: [{ max: 0 }],
        errors: [{ messageId: "tooMany", data: { count: 1, max: 0 } }],
        output: "a\nb\n",
      },
      {
        // Run at the very start of the file.
        code: "\n\nfoo\n",
        options: [{ max: 1 }],
        errors: [{ messageId: "tooMany", data: { count: 2, max: 1 } }],
        output: "\nfoo\n",
      },
      {
        // Run extending to EOF, no trailing newline after it.
        code: "foo\n\n\n",
        options: [{ max: 1 }],
        errors: [{ messageId: "tooMany", data: { count: 2, max: 1 } }],
        output: "foo\n\n",
      },
    ],
  });
});
