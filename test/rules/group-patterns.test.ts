import { describe } from "vitest";
import rule from "../../src/rules/group-patterns.js";
import { ruleTester } from "../utils/rule-tester.js";

describe("group-patterns", () => {
  ruleTester.run("group-patterns", rule, {
    valid: [
      // Single-kind file, no headings: nothing to organize.
      "foo\nbar\n",
      "",
      // Both headings exist, every pattern correctly sectioned, including
      // a cleanly-glued negation that moves silently (it doesn't, because
      // nothing needs fixing here).
      "# folders\nbar/\n# files\nfoo\n!foo/x\n",
    ],
    invalid: [
      {
        // Only the "folders" heading is missing; "foo" is already
        // correctly placed inside the existing "files" section, but
        // "bar/" (folders-type) has nowhere correct to live yet. Both
        // fixes touch the same region (inserting the heading right where
        // "bar/" already sits, and moving "bar/" from there to EOF, a
        // no-op since it's already last) -- only the heading-insert
        // fix survives this single pass; a second --fix pass converges
        // the rest.
        code: "# files\nfoo\nbar/\n",
        errors: [
          { messageId: "missingHeading", data: { heading: "# folders" } },
          {
            messageId: "wrongGroup",
            data: { pattern: "bar/", group: "folders" },
          },
        ],
        output: "# files\nfoo\n\n# folders\nbar/\n",
      },
      {
        // Both headings exist; two patterns sit in the wrong section.
        // Both fixes apply in this single pass (their ranges don't
        // conflict), directly converging to the correct arrangement.
        code: "# folders\nfoo\n# files\nbar/\n",
        errors: [
          { messageId: "wrongGroup", data: { pattern: "foo", group: "files" } },
          {
            messageId: "wrongGroup",
            data: { pattern: "bar/", group: "folders" },
          },
        ],
        output: "# folders\n# files\nbar/\nfoo\n",
      },
      {
        // The anchor is misplaced; its glued negation must move with it as
        // one cluster and is never independently reported. This one
        // converges fully in a single pass.
        code: "# folders\nbaz/\nfoo\n!foo/x\n# files\n",
        errors: [
          { messageId: "wrongGroup", data: { pattern: "foo", group: "files" } },
        ],
        output: "# folders\nbaz/\n# files\nfoo\n!foo/x\n",
      },
      {
        // No trailing newline on the last line, and no organizational
        // structure at all (so both missingHeading and wrongGroup fire for
        // both patterns, same as the plain "foo\nbar/\n" case). What this
        // case specifically exercises: moving "bar/" to the EOF fallback
        // destination must prepend its own newline rather than gluing
        // onto the previous line, since the file doesn't already end in one.
        code: "foo\nbar/",
        errors: [
          { messageId: "missingHeading", data: { heading: "# files" } },
          { messageId: "wrongGroup", data: { pattern: "foo", group: "files" } },
          { messageId: "missingHeading", data: { heading: "# folders" } },
          {
            messageId: "wrongGroup",
            data: { pattern: "bar/", group: "folders" },
          },
        ],
        output: "# files\nfoo\n\n# folders\nbar/",
      },
      {
        // An anchor-less negation sitting in the wrong section is
        // reported but has no fix at all, so the file is left unchanged
        // even though the rule reports it.
        code: "# folders\nbaz/\n!zzz\n# files\nfoo\n",
        errors: [
          { messageId: "wrongGroup", data: { pattern: "zzz", group: "files" } },
        ],
      },
      {
        // Regression: a blank line already separates the folders section
        // from "# files". Moving "baz/" into the folders section must
        // land it right after "bar/" (before that blank), not after the
        // blank -- otherwise the separator ends up sandwiched between two
        // folders-group patterns instead of marking the section boundary.
        code: "# folders\nbar/\n\n# files\nfoo\nbaz/\n",
        errors: [
          {
            messageId: "wrongGroup",
            data: { pattern: "baz/", group: "folders" },
          },
        ],
        output: "# folders\nbar/\nbaz/\n\n# files\nfoo\n",
      },
    ],
  });
});
