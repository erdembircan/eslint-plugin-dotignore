import { describe, expect, it } from "vitest";
import { computeGroupViolations } from "../../src/engines/group.js";
import type { GroupOptions, GroupViolation } from "../../src/engines/group.js";
import { parse } from "../../src/parser/index.js";

const DEFAULT_OPTIONS: GroupOptions = {
  folderHeading: "# folders",
  fileHeading: "# files",
  order: ["files", "folders"],
};

function violationsFor(
  text: string,
  options: GroupOptions = DEFAULT_OPTIONS,
): GroupViolation[] {
  return computeGroupViolations(parse(text).body, options);
}

function summarize(
  violations: GroupViolation[],
): Array<{ kind: string; pattern: string; group: string; fixed: boolean }> {
  return violations.map((v) => ({
    kind: v.kind,
    pattern: v.node.pattern,
    group: v.targetGroup,
    fixed: v.fix !== undefined,
  }));
}

describe("computeGroupViolations", () => {
  it("reports nothing for a single-kind file with no headings", () => {
    expect(violationsFor("foo\nbar\n")).toEqual([]);
  });

  it("reports nothing when both headings exist and every pattern is correctly sectioned", () => {
    expect(violationsFor("# folders\nbar/\n# files\nfoo\n")).toEqual([]);
  });

  describe("both headings missing: arrange", () => {
    it("reports only missingHeading (never wrongGroup) for either group's own patterns, in configured order, under the files-first default", () => {
      const violations = violationsFor("foo\nbar/\n");
      expect(summarize(violations)).toEqual([
        { kind: "missingHeading", pattern: "foo", group: "files", fixed: true },
        {
          kind: "missingHeading",
          pattern: "bar/",
          group: "folders",
          fixed: true,
        },
      ]);
    });

    it("respects an explicit folders-first order for which group is reported (and arranged) first", () => {
      const violations = violationsFor("foo\nbar/\n", {
        ...DEFAULT_OPTIONS,
        order: ["folders", "files"],
      });
      expect(violations.map((v) => v.targetGroup)).toEqual([
        "folders",
        "files",
      ]);
    });

    it("builds each group's arrange fix from a whole-section clusters list, anchored at the first organizable pattern since neither section exists yet", () => {
      const violations = violationsFor("foo\nbar/\n");
      const filesViolation = violations.find((v) => v.targetGroup === "files")!;
      const foldersViolation = violations.find(
        (v) => v.targetGroup === "folders",
      )!;

      expect(filesViolation.fix).toMatchObject({
        kind: "arrange",
        heading: "# files",
        insertBeforeIndex: 0,
        blankLineBefore: false,
        blankLineAfter: true,
        staleBlankLines: [],
      });
      expect(foldersViolation.fix).toMatchObject({
        kind: "arrange",
        heading: "# folders",
        insertBeforeIndex: 0,
        blankLineBefore: false,
        blankLineAfter: true,
        staleBlankLines: [],
      });
    });

    it("keeps non-heading comments in place, arranging patterns around them", () => {
      // Body: "# note" (0, non-heading comment), "foo" (1), "# mid" (2,
      // also non-heading), "bar/" (3). Both arrange fixes anchor right
      // before the first organizable pattern (index 1), leaving both
      // comments untouched wherever they already sit.
      const violations = violationsFor("# note\nfoo\n# mid\nbar/\n");
      const filesViolation = violations.find((v) => v.targetGroup === "files")!;
      const foldersViolation = violations.find(
        (v) => v.targetGroup === "folders",
      )!;

      expect(filesViolation.fix).toMatchObject({
        kind: "arrange",
        insertBeforeIndex: 1,
        blankLineBefore: true,
      });
      expect(foldersViolation.fix).toMatchObject({
        kind: "arrange",
        insertBeforeIndex: 1,
        blankLineBefore: true,
      });
    });

    it("keeps a negation glued to its anchor within the arrange fix's cluster list", () => {
      const violations = violationsFor("foo\n!foo/x\nbar/\n");
      const filesViolation = violations.find((v) => v.targetGroup === "files")!;
      expect(filesViolation.fix).toMatchObject({ kind: "arrange" });
      if (filesViolation.fix?.kind === "arrange") {
        expect(
          filesViolation.fix.clusters.map((c) => c.map((p) => p.pattern)),
        ).toEqual([["foo", "foo/x"]]);
      }
    });

    it("reports an anchor-less negation without a fix, alongside both groups' arrange fixes", () => {
      const violations = violationsFor("foo\nbar/\n!zzz\n");
      expect(summarize(violations)).toEqual([
        { kind: "missingHeading", pattern: "foo", group: "files", fixed: true },
        {
          kind: "missingHeading",
          pattern: "bar/",
          group: "folders",
          fixed: true,
        },
        { kind: "wrongGroup", pattern: "zzz", group: "files", fixed: false },
      ]);
    });
  });

  describe("one heading present, the other missing: arrange relative to it", () => {
    it("inserts the missing folders section right before the existing files section when folders sorts first in order", () => {
      const violations = violationsFor("# files\nfoo\nbar/\n", {
        ...DEFAULT_OPTIONS,
        order: ["folders", "files"],
      });
      expect(violations).toHaveLength(1);
      expect(violations[0]!.fix).toMatchObject({
        kind: "arrange",
        heading: "# folders",
        insertBeforeIndex: 0, // before "# files"'s own heading index
        blankLineBefore: false,
        blankLineAfter: true, // the existing files section follows
      });
    });

    it("inserts the missing folders section right after the existing files section when files sorts first in order", () => {
      const violations = violationsFor("# files\nfoo\nbar/\n", {
        ...DEFAULT_OPTIONS,
        order: ["files", "folders"],
      });
      expect(violations).toHaveLength(1);
      expect(violations[0]!.fix).toMatchObject({
        kind: "arrange",
        heading: "# folders",
        insertBeforeIndex: 2, // right after "foo", where "bar/" already sits
        blankLineBefore: true,
        blankLineAfter: false,
      });
    });

    it("inserts the missing files section right before the existing folders section when files sorts first in order", () => {
      const violations = violationsFor("# folders\nbar/\nfoo\n", {
        ...DEFAULT_OPTIONS,
        order: ["files", "folders"],
      });
      expect(violations).toHaveLength(1);
      expect(violations[0]!.fix).toMatchObject({
        kind: "arrange",
        heading: "# files",
        insertBeforeIndex: 0, // before "# folders"'s own heading index
        blankLineBefore: false,
        blankLineAfter: true,
      });
    });

    it("inserts the missing files section right after the existing folders section when folders sorts first in order", () => {
      const violations = violationsFor("# folders\nbar/\nfoo\n", {
        ...DEFAULT_OPTIONS,
        order: ["folders", "files"],
      });
      expect(violations).toHaveLength(1);
      expect(violations[0]!.fix).toMatchObject({
        kind: "arrange",
        heading: "# files",
        insertBeforeIndex: 2, // right after "bar/", where "foo" already sits
        blankLineBefore: true,
        blankLineAfter: false,
      });
    });

    it("computes blankLineBefore correctly when the missing group's own stray pattern sits immediately before the existing heading", () => {
      // "foo" (files, missing its heading) sits right before "# folders",
      // and is itself part of the cluster being removed to build the new
      // files section right there. Walking backward from the insertion
      // point to find what precedes it must skip over that
      // about-to-be-removed pattern rather than stopping on it, landing at
      // the true start of file (nothing remains) -- so no separator blank
      // is needed before the new heading.
      const violations = violationsFor("foo\n# folders\nbar/\n");
      expect(violations).toHaveLength(1);
      expect(violations[0]!.fix).toMatchObject({
        kind: "arrange",
        heading: "# files",
        insertBeforeIndex: 1,
        blankLineBefore: false,
        blankLineAfter: true,
      });
    });

    it("never moves the existing section itself -- only the missing one is arranged", () => {
      const violations = violationsFor("# files\nfoo\nbar/\n");
      expect(violations).toHaveLength(1);
      expect(violations[0]!.targetGroup).toBe("folders");
      // No violation ever targets "files" here: the existing section and
      // its already-correct pattern are left completely alone.
    });
  });

  describe("staleBlankLines: orphaned separators left behind by a removed cluster", () => {
    it("sweeps a blank line that sits between a removed cluster and EOF, with nothing real left after it", () => {
      // The folders section already exists up front; the misplaced files
      // pattern sits at the very tail, separated from it by a blank line.
      // Once that pattern is pulled out and re-homed right after the
      // folders heading, the blank it left behind at EOF has nothing real
      // left to separate and must be swept away with it.
      const violations = violationsFor(
        "# folders\n.claude/\ncoverage/\n\n.DS_Store\n",
      );
      expect(violations).toHaveLength(1);
      const fix = violations[0]!.fix;
      expect(fix).toMatchObject({ kind: "arrange", heading: "# files" });
      if (fix?.kind === "arrange") {
        expect(fix.staleBlankLines).toHaveLength(1);
      }
    });

    it("sweeps a pre-existing blank line left dangling at the tail once its neighboring cluster is relocated, even though it originally separated two real patterns", () => {
      // Neither heading exists yet. The folders fix relocates "bar/" (at
      // EOF) into its own fresh section; the blank line that used to sit
      // between "foo" and "bar/" has nothing real left after it once
      // "bar/" is gone, so it is swept alongside it -- independent of
      // where the new section is actually inserted (here, before "foo").
      const violations = violationsFor("foo\n\nbar/\n");
      const foldersViolation = violations.find(
        (v) => v.targetGroup === "folders",
      )!;
      if (foldersViolation.fix?.kind === "arrange") {
        expect(foldersViolation.fix.staleBlankLines).toHaveLength(1);
      }

      // "foo" itself is never removed by the files fix, so nothing after
      // its own insertion point at EOF is ever orphaned.
      const filesViolation = violations.find((v) => v.targetGroup === "files")!;
      if (filesViolation.fix?.kind === "arrange") {
        expect(filesViolation.fix.staleBlankLines).toEqual([]);
      }
    });
  });

  describe("both headings exist: order never rearranges existing structure", () => {
    it("reports wrongGroup for a pattern sitting in the wrong existing section", () => {
      const violations = violationsFor("# folders\nfoo\n# files\nbar/\n");
      expect(summarize(violations)).toEqual([
        { kind: "wrongGroup", pattern: "foo", group: "files", fixed: true },
        { kind: "wrongGroup", pattern: "bar/", group: "folders", fixed: true },
      ]);
      const fooViolation = violations.find((v) => v.node.pattern === "foo")!;
      expect(fooViolation.fix).toMatchObject({
        kind: "move",
        insertBeforeIndex: 4,
      });
      const barViolation = violations.find((v) => v.node.pattern === "bar/")!;
      expect(barViolation.fix).toMatchObject({
        kind: "move",
        insertBeforeIndex: 2,
      });
    });
  });

  describe("move destination skips a trailing separator blank line", () => {
    it("lands a move right after the destination section's last pattern, before the blank line separating it from the next heading", () => {
      // Body: 0 "# folders", 1 "bar/", 2 BlankLine, 3 "# files", 4 "foo",
      // 5 "baz/" (misplaced folders-type pattern). Naively using the
      // section's endIndex (3, the "# files" heading) would insert "baz/"
      // right before "# files" -- landing it AFTER the blank line and
      // sandwiching that blank between "bar/" and "baz/", two patterns of
      // the same group. It must land at index 2 instead (right after
      // "bar/", before the blank).
      const violations = violationsFor(
        "# folders\nbar/\n\n# files\nfoo\nbaz/\n",
      );
      expect(violations).toHaveLength(1);
      const violation = violations[0]!;
      expect(violation.node.pattern).toBe("baz/");
      expect(violation.targetGroup).toBe("folders");
      expect(violation.fix).toMatchObject({
        kind: "move",
        insertBeforeIndex: 2,
      });
    });

    it("skips a run of multiple trailing blank lines, not just one", () => {
      const violations = violationsFor(
        "# folders\nbar/\n\n\n# files\nfoo\nbaz/\n",
      );
      const violation = violations.find((v) => v.node.pattern === "baz/")!;
      // Body: 0 heading, 1 "bar/", 2 BlankLine, 3 BlankLine, 4 "# files",
      // 5 "foo", 6 "baz/" -- both blanks must be skipped, landing at 2.
      expect(violation.fix).toMatchObject({
        kind: "move",
        insertBeforeIndex: 2,
      });
    });
  });

  describe("clustering", () => {
    it("glues a negation to its nearest matching-anchor preceding pattern and moves it silently with no independent violation", () => {
      const violations = violationsFor(
        "# folders\nbar/\n# files\nfoo\n!foo/x\n",
      );
      expect(violations).toEqual([]);
    });

    it("moves a glued cluster (anchor + negation) as one atomic unit when the anchor is misplaced", () => {
      const violations = violationsFor(
        "# folders\nbaz/\nfoo\n!foo/x\n# files\n",
      );
      expect(violations).toHaveLength(1);
      const violation = violations[0]!;
      expect(violation.kind).toBe("wrongGroup");
      expect(violation.node.pattern).toBe("foo");
      expect(violation.fix).toMatchObject({
        kind: "move",
        insertBeforeIndex: 5,
      });
      if (violation.fix?.kind === "move") {
        expect(violation.fix.cluster.map((p) => p.pattern)).toEqual([
          "foo",
          "foo/x",
        ]);
      }
    });

    it("normalizes anchors: leading '/' and leading '**/' both strip to the same first segment", () => {
      const violations = violationsFor(
        "# folders\nbaz/\n/foo\n!**/foo/x\n# files\n",
      );
      // "/foo" normalizes to first segment "foo"; "**/foo/x" also
      // normalizes (strip "**/") to first segment "foo" -- they glue.
      expect(violations).toHaveLength(1);
      const violation = violations[0]!;
      if (violation.fix?.kind === "move") {
        expect(violation.fix.cluster.map((p) => p.pattern)).toEqual([
          "/foo",
          "**/foo/x",
        ]);
      }
    });

    it("skips over an intervening negated pattern while searching backward for an anchor", () => {
      const violations = violationsFor(
        "# folders\nbaz/\nfoo\n!other\n!foo/x\n# files\n",
      );
      // "foo" is itself misplaced (inside the folders section) and gets
      // its own violation. "!other" has no anchor of its own (reported, no
      // fix). "!foo/x" must look past "!other" to find "foo" and glues to
      // it silently (moving with it, no independent violation).
      expect(summarize(violations)).toEqual([
        { kind: "wrongGroup", pattern: "foo", group: "files", fixed: true },
        { kind: "wrongGroup", pattern: "other", group: "files", fixed: false },
      ]);
      const fooViolation = violations.find((v) => v.node.pattern === "foo")!;
      if (fooViolation.fix?.kind === "move") {
        expect(fooViolation.fix.cluster.map((p) => p.pattern)).toEqual([
          "foo",
          "foo/x",
        ]);
      }
    });

    it("compares anchors using the raw text's unescaped slash, skipping an escaped one first", () => {
      const violations = violationsFor(
        "# folders\nbaz/\na\\/b/x\n!a\\/b/c\n# files\n",
      );
      // The anchor itself is misplaced (inside the folders section), so it
      // gets one violation; the negation glues to it (escaped slash
      // correctly not treated as a segment separator) and moves silently.
      expect(violations).toHaveLength(1);
      const violation = violations[0]!;
      expect(violation.node.pattern).toBe("a\\/b/x");
      if (violation.fix?.kind === "move") {
        expect(violation.fix.cluster.map((p) => p.pattern)).toEqual([
          "a\\/b/x",
          "a\\/b/c",
        ]);
      }
    });

    it("glues multiple negations to the same anchor into one cluster", () => {
      const violations = violationsFor(
        "# folders\nbaz/\nfoo\n!foo/a\n!foo/b\n# files\n",
      );
      expect(violations).toHaveLength(1);
      const violation = violations[0]!;
      expect(violation.node.pattern).toBe("foo");
      if (violation.fix?.kind === "move") {
        expect(violation.fix.cluster.map((p) => p.pattern)).toEqual([
          "foo",
          "foo/a",
          "foo/b",
        ]);
      }
    });

    it("reports an anchor-less negation without a fix, while unrelated patterns still get fixed", () => {
      const violations = violationsFor("# folders\nbaz/\nqux\n!zzz\n# files\n");
      expect(summarize(violations)).toEqual([
        { kind: "wrongGroup", pattern: "qux", group: "files", fixed: true },
        { kind: "wrongGroup", pattern: "zzz", group: "files", fixed: false },
      ]);
      const zzzViolation = violations.find((v) => v.node.pattern === "zzz")!;
      expect(zzzViolation.fix).toBeUndefined();
    });
  });

  describe("heading detection is an exact match after trimming surrounding whitespace", () => {
    it("matches a heading with extra surrounding whitespace", () => {
      const violations = violationsFor("   # folders   \nbar/\n# files\nfoo\n");
      expect(violations).toEqual([]);
    });

    it("does not match a heading with different case or extra text", () => {
      const violations = violationsFor("# Folders\nbar/\n# files\nfoo\n");
      const missing = violations.filter((v) => v.kind === "missingHeading");
      expect(missing).toHaveLength(1);
      expect(missing[0]!.targetGroup).toBe("folders");
    });
  });
});
