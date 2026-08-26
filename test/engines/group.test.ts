import { describe, expect, it } from "vitest";
import { computeGroupViolations } from "../../src/engines/group.js";
import type { GroupOptions, GroupViolation } from "../../src/engines/group.js";
import { parse } from "../../src/parser/index.js";

const DEFAULT_OPTIONS: GroupOptions = {
  folderHeading: "# folders",
  fileHeading: "# files",
  order: ["folders", "files"],
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

  it("reports missingHeading for both groups (in configured order) when neither heading exists", () => {
    const violations = violationsFor("foo\nbar/\n");
    const missing = violations.filter((v) => v.kind === "missingHeading");
    expect(summarize(missing)).toEqual([
      {
        kind: "missingHeading",
        pattern: "bar/",
        group: "folders",
        fixed: true,
      },
      { kind: "missingHeading", pattern: "foo", group: "files", fixed: true },
    ]);
  });

  it("respects the order option for which missing heading is reported first", () => {
    const violations = violationsFor("foo\nbar/\n", {
      ...DEFAULT_OPTIONS,
      order: ["files", "folders"],
    });
    const missing = violations.filter((v) => v.kind === "missingHeading");
    expect(missing.map((v) => v.targetGroup)).toEqual(["files", "folders"]);
  });

  it("sets blankLineBefore correctly: false at file start, true otherwise (unless already blank-preceded)", () => {
    const violations = violationsFor("foo\nbar/\n");
    const filesViolation = violations.find(
      (v) => v.kind === "missingHeading" && v.targetGroup === "files",
    )!;
    const foldersViolation = violations.find(
      (v) => v.kind === "missingHeading" && v.targetGroup === "folders",
    )!;
    expect(filesViolation.fix).toMatchObject({
      kind: "insertHeading",
      blankLineBefore: false,
    });
    expect(foldersViolation.fix).toMatchObject({
      kind: "insertHeading",
      blankLineBefore: true,
    });
  });

  it("does not require a blank line before the heading when one already precedes it", () => {
    const violations = violationsFor("foo\n\nbar/\n");
    const foldersViolation = violations.find(
      (v) => v.kind === "missingHeading" && v.targetGroup === "folders",
    )!;
    expect(foldersViolation.fix).toMatchObject({ blankLineBefore: false });
  });

  it("reports wrongGroup for every pattern when there is no organizational structure at all", () => {
    const violations = violationsFor("foo\nbar/\n");
    const wrong = violations.filter((v) => v.kind === "wrongGroup");
    expect(summarize(wrong)).toEqual([
      { kind: "wrongGroup", pattern: "foo", group: "files", fixed: true },
      { kind: "wrongGroup", pattern: "bar/", group: "folders", fixed: true },
    ]);
    // With no section of either kind existing yet, both fall back to EOF.
    for (const v of wrong) {
      expect(v.fix).toMatchObject({ kind: "move", insertBeforeIndex: 2 });
    }
  });

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
