import { describe } from "vitest";
import rule from "../../src/rules/comment-spacing.js";
import { ruleTester } from "../utils/rule-tester.js";

describe("comment-spacing", () => {
  ruleTester.run("comment-spacing", rule, {
    valid: [
      "# comment",
      "#",
      { code: "# comment", options: ["always"] },
      { code: "#comment", options: ["never"] },
      { code: "#", options: ["never"] },
      { code: "#", options: ["always"] },
    ],
    invalid: [
      {
        code: "#comment",
        errors: [{ messageId: "missingSpace" }],
        output: "# comment",
      },
      {
        code: "#comment",
        options: ["always"],
        errors: [{ messageId: "missingSpace" }],
        output: "# comment",
      },
      {
        code: "# comment",
        options: ["never"],
        errors: [{ messageId: "unexpectedSpace" }],
        output: "#comment",
      },
      {
        code: "#\t\tcomment",
        options: ["never"],
        errors: [{ messageId: "unexpectedSpace" }],
        output: "#comment",
      },
      {
        code: "#  comment",
        errors: [{ messageId: "unexpectedSpace" }],
        options: ["never"],
        output: "#comment",
      },
    ],
  });
});
