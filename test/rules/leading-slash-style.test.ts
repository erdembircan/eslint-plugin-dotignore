import { describe } from "vitest";
import rule from "../../src/rules/leading-slash-style.js";
import { ruleTester } from "../utils/rule-tester.js";

describe("leading-slash-style", () => {
  ruleTester.run("leading-slash-style", rule, {
    valid: [
      // "/foo" has no other slash: the leading slash is the only anchor,
      // never touched by either mode.
      "/foo",
      { code: "/foo", options: ["minimal"] },
      { code: "/foo", options: ["explicit"] },
      // Already minimal: no leading slash, but already anchored via the
      // middle slash.
      { code: "foo/bar", options: ["minimal"] },
      // Already explicit.
      { code: "/foo/bar", options: ["explicit"] },
      // Unanchored, no qualifying middle slash either way.
      "foo",
      "*.log",
    ],
    invalid: [
      {
        code: "/foo/bar",
        errors: [{ messageId: "redundantSlash" }],
        output: "foo/bar",
      },
      {
        code: "/foo/bar",
        options: ["minimal"],
        errors: [{ messageId: "redundantSlash" }],
        output: "foo/bar",
      },
      {
        code: "foo/bar",
        options: ["explicit"],
        errors: [{ messageId: "missingSlash" }],
        output: "/foo/bar",
      },
      {
        // '!' prefix must be preserved by the fix.
        code: "!/foo/bar",
        options: ["minimal"],
        errors: [{ messageId: "redundantSlash" }],
        output: "!foo/bar",
      },
      {
        code: "!foo/bar",
        options: ["explicit"],
        errors: [{ messageId: "missingSlash" }],
        output: "!/foo/bar",
      },
    ],
  });
});
