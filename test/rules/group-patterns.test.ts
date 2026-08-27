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
        // correctly placed inside the existing "files" section. "bar/"
        // (folders-type) no longer gets its own independent wrongGroup
        // report -- it's entirely swept up into the missing section's
        // single atomic arrange fix, which converges fully in one pass.
        code: "# files\nfoo\nbar/\n",
        errors: [
          { messageId: "missingHeading", data: { heading: "# folders" } },
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
        // No trailing newline on the last line, and neither heading exists
        // (so both groups report missingHeading only -- no independent
        // wrongGroup for either pattern anymore). Both arrange fixes anchor
        // at the same insertion point (the very first pattern) and so
        // conflict with each other; the smaller of the two edits ("files",
        // whose own cluster is just "foo") wins this single pass -- `order`
        // only takes visible effect once one section already exists (see
        // the "arranges the missing section" cases below); it doesn't
        // decide which of two equally-anchored, from-scratch sections wins
        // a same-pass conflict. A second --fix pass picks up "bar/" from
        // where this pass left it (still without a trailing newline) and
        // converges the rest, at which point building its own fresh
        // section unconditionally terminates the last line -- the same
        // established behavior as relocating a pattern to EOF.
        code: "foo\nbar/",
        errors: [
          { messageId: "missingHeading", data: { heading: "# files" } },
          { messageId: "missingHeading", data: { heading: "# folders" } },
        ],
        output: "# files\nfoo\n\nbar/",
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
      {
        // Regression: on a CRLF file, the missing-heading insertion and the
        // arranged pattern's own line must both keep "\r\n", not "\n". The
        // whole section is built in one atomic fix, converging fully in a
        // single pass.
        code: "# files\r\nfoo\r\nbar/\r\n",
        errors: [
          { messageId: "missingHeading", data: { heading: "# folders" } },
        ],
        output: "# files\r\nfoo\r\n\r\n# folders\r\nbar/\r\n",
      },
      {
        // Regression: a glued cluster (anchor + negation) moved as one unit
        // on a CRLF file must join its members with "\r\n".
        code: "# folders\r\nbaz/\r\nfoo\r\n!foo/x\r\n# files\r\n",
        errors: [
          { messageId: "wrongGroup", data: { pattern: "foo", group: "files" } },
        ],
        output: "# folders\r\nbaz/\r\n# files\r\nfoo\r\n!foo/x\r\n",
      },
      {
        // Regression: the trailing-separator-blank-skip fix (see the
        // preceding regression case) must also preserve CRLF -- the moved
        // pattern lands right after "bar/", keeping "\r\n" throughout.
        code: "# folders\r\nbar/\r\n\r\n# files\r\nfoo\r\nbaz/\r\n",
        errors: [
          {
            messageId: "wrongGroup",
            data: { pattern: "baz/", group: "folders" },
          },
        ],
        output: "# folders\r\nbar/\r\nbaz/\r\n\r\n# files\r\nfoo\r\n",
      },
      {
        // Mixed-EOL file: the earlier lines are LF, but the insertion point
        // (right before "bar/", the first folders-type pattern) sits next
        // to a CRLF line. The inserted heading (and its leading blank) must
        // follow that adjacent line's terminator, not the file's LF-using
        // first lines.
        code: "# files\nfoo\nbar/\r\n",
        errors: [
          { messageId: "missingHeading", data: { heading: "# folders" } },
        ],
        output: "# files\nfoo\n\r\n# folders\r\nbar/\r\n",
      },
      {
        // `order` genuinely governs arrangement once one section already
        // exists: with folders sorted first, the missing folders section is
        // inserted BEFORE the existing files section rather than after it.
        // Converges fully in one pass.
        code: "# files\nfoo\nbar/\n",
        options: [
          {
            folderHeading: "# folders",
            fileHeading: "# files",
            order: ["folders", "files"],
          },
        ],
        errors: [
          { messageId: "missingHeading", data: { heading: "# folders" } },
        ],
        output: "# folders\nbar/\n\n# files\nfoo\n",
      },
      {
        // Mirror of the default-order case above, but with the existing
        // section being "folders" and the missing one "files": under the
        // files-first default, the missing files section is inserted
        // BEFORE the existing folders section.
        code: "# folders\nbar/\nfoo\n",
        errors: [{ messageId: "missingHeading", data: { heading: "# files" } }],
        output: "# files\nfoo\n\n# folders\nbar/\n",
      },
      {
        // Same starting file as above, but with folders sorted first: the
        // missing files section is now inserted AFTER the existing folders
        // section instead.
        code: "# folders\nbar/\nfoo\n",
        options: [
          {
            folderHeading: "# folders",
            fileHeading: "# files",
            order: ["folders", "files"],
          },
        ],
        errors: [{ messageId: "missingHeading", data: { heading: "# files" } }],
        output: "# folders\nbar/\n\n# files\nfoo\n",
      },
      {
        // Edge case: "bar/" (folders) is misplaced inside the files
        // section, and the folders section it belongs in is both already
        // fully correct AND the last thing in the file -- moving "bar/"
        // there lands the fix's insertion point at true EOF (there's
        // nothing left after "baz/" for it to land "before"), not merely
        // before some later node. The move must still land right after
        // "baz/", appending its own trailing newline.
        code: "# files\nfoo\nbar/\n# folders\nbaz/\n",
        errors: [
          {
            messageId: "wrongGroup",
            data: { pattern: "bar/", group: "folders" },
          },
        ],
        output: "# files\nfoo\n# folders\nbaz/\nbar/\n",
      },
      {
        // Edge case, no trailing newline: the destination section is the
        // last thing in the file and the file itself doesn't end in a
        // newline, so the move's EOF-fallback insertion point sits right
        // after a non-newline character. The fix must prepend its own
        // newline rather than gluing "bar/" onto the end of "baz/"'s line,
        // and (as with every EOF append in this rule) still terminates its
        // own appended line even though none existed before.
        code: "# files\nfoo\nbar/\n# folders\nbaz/",
        errors: [
          {
            messageId: "wrongGroup",
            data: { pattern: "bar/", group: "folders" },
          },
        ],
        output: "# files\nfoo\n# folders\nbaz/\nbar/\n",
      },
      {
        // Edge case: neither heading exists, but "bar/" (folders) already
        // sits ahead of "foo" (files, correctly the only thing needed once
        // organized) in body order. Once the folders section is built
        // in a later pass and "bar/" pulled into it, the files section
        // ends up as the only thing left -- and when *this* pass instead
        // builds the missing folders section around a *files* pattern
        // that is otherwise last in the file, the new section's insertion
        // point lands at true EOF instead of before some existing node.
        code: "# files\nbar/\nfoo\n",
        errors: [
          { messageId: "missingHeading", data: { heading: "# folders" } },
        ],
        output: "# files\nfoo\n\n# folders\nbar/\n",
      },
    ],
  });
});
