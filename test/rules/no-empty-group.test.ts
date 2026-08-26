import { describe } from "vitest";
import rule from "../../src/rules/no-empty-group.js";
import { ruleTester } from "../utils/rule-tester.js";

describe("no-empty-group", () => {
  ruleTester.run("no-empty-group", rule, {
    valid: [
      "# group\nfoo\n",
      "# group\n\nfoo\n",
      "# group\nfoo\n# another group\nbar\n",
      "foo\n",
      "",
      // Two adjacent comment lines with nothing between them merge into
      // ONE block (a maximal run); a pattern right after it means the
      // merged block is not empty.
      "# first\n# second\nfoo\n",
    ],
    invalid: [
      {
        // Trailing remark block at EOF with nothing after it.
        code: "# empty group\n",
        errors: [{ messageId: "emptyGroup" }],
        output: "",
      },
      {
        // A blank line separates these into two distinct blocks: the
        // first has nothing (not even a blank counts) but the second
        // block's heading before it, so it's empty; the second is
        // followed by an actual pattern, so it's fine.
        code: "# empty group\n\n# real group\nfoo\n",
        errors: [{ messageId: "emptyGroup" }],
        output: "# real group\nfoo\n",
      },
      {
        // Blank lines between the block and EOF don't count as content.
        code: "# empty group\n\n\n",
        errors: [{ messageId: "emptyGroup" }],
        output: "",
      },
      {
        // A multi-comment block (maximal run of two adjacent comments,
        // with nothing between them) is removed as one unit when nothing
        // but EOF follows it.
        code: "# line one\n# line two\n",
        errors: [{ messageId: "emptyGroup" }],
        output: "",
      },
      {
        // A blank line between them makes these two SEPARATE blocks, both
        // empty (nothing but the next block, then EOF, follows each).
        // Fix1 removes "# first\n\n" (the block plus its following blank);
        // fix2 removes "# second\n". Their ranges are adjacent, and
        // ESLint's single-pass fixer rejects a fix whose range starts
        // exactly where the previous applied fix ended, so only fix1
        // actually applies in this pass.
        code: "# first\n\n# second\n",
        errors: [{ messageId: "emptyGroup" }, { messageId: "emptyGroup" }],
        output: "# second\n",
      },
      {
        // Regression: a blank line precedes the empty heading and nothing
        // at all follows it (removal reaches EOF). That blank was only
        // ever separating the heading from real content before it -- with
        // the heading and everything after it gone, leaving the blank
        // behind would dangle a trailing blank line at EOF. It must be
        // consumed by the same fix.
        code: "foo\n\n# empty\n",
        errors: [{ messageId: "emptyGroup" }],
        output: "foo\n",
      },
      {
        // Same as above, but with a run of two preceding blank lines --
        // both must be consumed, not just the immediately adjacent one.
        code: "foo\n\n\n# empty\n",
        errors: [{ messageId: "emptyGroup" }],
        output: "foo\n",
      },
    ],
  });
});
