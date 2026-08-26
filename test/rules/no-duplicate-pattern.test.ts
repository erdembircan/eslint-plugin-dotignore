import { describe } from "vitest";
import rule from "../../src/rules/no-duplicate-pattern.js";
import { ruleTester } from "../utils/rule-tester.js";

describe("no-duplicate-pattern", () => {
  ruleTester.run("no-duplicate-pattern", rule, {
    valid: [
      "foo\nbar\n",
      // Opposite polarity: not a duplicate at all.
      "foo\n!foo\n",
      // Soundness guard: an intervening opposite-polarity pattern makes the
      // later "foo" load-bearing, so it must not be flagged.
      "foo\n!foo\nfoo\n",
      // Equivalence disabled: "**/foo" and "foo" are equivalent but not an
      // exact duplicate, and includeEquivalents is off.
      { code: "**/foo\nfoo\n", options: [{ includeEquivalents: false }] },
      // Comments and blank lines are non-Pattern body nodes and must be
      // skipped when collecting patterns to compare.
      "# comment\nfoo\n\nbar\n",
    ],
    invalid: [
      {
        code: "foo\nfoo\n",
        errors: [
          { messageId: "duplicate", data: { original: "foo", line: 1 } },
        ],
        output: "foo\n",
      },
      {
        // A same-polarity intervening pattern is harmless and does not
        // block the report (unlike an opposite-polarity one).
        code: "foo\nbar\nfoo\n",
        errors: [
          { messageId: "duplicate", data: { original: "foo", line: 1 } },
        ],
        output: "foo\nbar\n",
      },
      {
        // Trailing-whitespace-stripped effective text still counts as an
        // exact duplicate.
        code: "foo\nfoo  \n",
        errors: [
          { messageId: "duplicate", data: { original: "foo", line: 1 } },
        ],
        output: "foo\n",
      },
      {
        // Both lines are reported, but ESLint's single-pass fixer rejects a
        // fix whose range starts exactly where the previous applied fix
        // ended (touching ranges count as conflicting), so only the first
        // (line2's) fix actually applies in this pass -- a second
        // eslint --fix pass would remove the rest.
        code: "foo\nfoo\nfoo\n",
        errors: [
          { messageId: "duplicate", data: { original: "foo", line: 1 } },
          { messageId: "duplicate", data: { original: "foo", line: 2 } },
        ],
        output: "foo\nfoo\n",
      },
      {
        // Equivalent (not an exact duplicate) by default.
        code: "**/foo\nfoo\n",
        errors: [
          { messageId: "equivalent", data: { original: "**/foo", line: 1 } },
        ],
        output: "**/foo\n",
      },
      {
        // line2 dup of line1 is reported normally. line4 vs line2
        // (closest same-polarity candidate) is blocked by the intervening
        // "!foo" on line3, and line4 vs line1 is blocked by that very same
        // line3 -- so line4 gets no report at all.
        code: "foo\nfoo\n!foo\nfoo\n",
        errors: [
          { messageId: "duplicate", data: { original: "foo", line: 1 } },
        ],
        output: "foo\n!foo\nfoo\n",
      },
      {
        // line2 dup of line1, and line3 dup of line2 (its closest
        // same-polarity match) are both reported; line5 vs line3 is
        // blocked by the intervening "!foo" on line4, so line5 gets no
        // report. As above, the fixer's touching-range rejection means
        // only line2's fix applies in this single pass.
        code: "foo\nfoo\nfoo\n!foo\nfoo\n",
        errors: [
          { messageId: "duplicate", data: { original: "foo", line: 1 } },
          { messageId: "duplicate", data: { original: "foo", line: 2 } },
        ],
        output: "foo\nfoo\n!foo\nfoo\n",
      },
    ],
  });
});
