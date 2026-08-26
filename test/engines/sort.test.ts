import { describe, expect, it } from "vitest";
import {
  compareEffectiveText,
  sortBlock,
  sortRun,
  splitIntoRuns,
} from "../../src/engines/sort.js";
import type { SortOptions } from "../../src/engines/sort.js";
import { parse } from "../../src/parser/index.js";
import type { Pattern } from "../../src/parser/index.js";

const DEFAULT_OPTIONS: SortOptions = {
  direction: "asc",
  caseSensitive: false,
  natural: true,
};

/** Builds an array of real Pattern nodes (one per line) from gitignore
 * text, for use as a "block" input to sortBlock. */
function patternsFrom(text: string): Pattern[] {
  return parse(text).body.filter(
    (node): node is Pattern => node.type === "Pattern",
  );
}

function effectiveTexts(patterns: readonly Pattern[]): string[] {
  return patterns.map((p) => p.pattern);
}

describe("compareEffectiveText", () => {
  const cases: Array<[string, string, Partial<SortOptions>, number]> = [
    ["apple", "banana", {}, -1],
    ["banana", "apple", {}, 1],
    ["apple", "apple", {}, 0],
    // Natural: v2 < v10.
    ["v2", "v10", { natural: true }, -1],
    // Without natural: pure code-point compare, "v10" < "v2" ('1' < '2').
    ["v10", "v2", { natural: false }, -1],
    // Leading zeros: equal numeric value, shorter (fewer zeros) first.
    ["img5", "img05", { natural: true }, -1],
    ["img05", "img5", { natural: true }, 1],
    // Same-width numeric chunks, different value, both directions.
    ["file3", "file7", { natural: true }, -1],
    ["file7", "file3", { natural: true }, 1],
    // Case sensitivity: insensitive treats them equal up to the tie-break.
    ["Banana", "apple", { caseSensitive: true }, -1], // 'B' (66) < 'a' (97)
    // desc inverts the primary comparison...
    ["apple", "banana", { direction: "desc" }, 1],
    // ...but not the deterministic tie-break, which stays ascending and
    // case-sensitive even under desc.
    ["Apple", "apple", { direction: "desc", caseSensitive: false }, -1],
    ["apple", "Apple", { direction: "desc", caseSensitive: false }, 1],
  ];

  it.each(cases)(
    "compares %j vs %j with %j as %i",
    (a, b, partialOptions, expectedSign) => {
      const options: SortOptions = { ...DEFAULT_OPTIONS, ...partialOptions };
      const result = compareEffectiveText(a, b, options);
      expect(Math.sign(result)).toBe(expectedSign);
    },
  );

  it("is antisymmetric", () => {
    for (const [a, b] of [
      ["apple", "banana"],
      ["v2", "v10"],
      ["Apple", "apple"],
    ] as const) {
      const forward = compareEffectiveText(a, b, DEFAULT_OPTIONS);
      const backward = compareEffectiveText(b, a, DEFAULT_OPTIONS);
      expect(Math.sign(forward)).toBe(-Math.sign(backward));
    }
  });
});

describe("sortBlock", () => {
  it("returns null for an empty block", () => {
    expect(sortBlock([], DEFAULT_OPTIONS)).toBeNull();
  });

  it("returns null when already sorted", () => {
    const patterns = patternsFrom("apple\nbanana\ncherry\n");
    expect(sortBlock(patterns, DEFAULT_OPTIONS)).toBeNull();
  });

  it("sorts an unsorted block ascending by default", () => {
    const patterns = patternsFrom("banana\napple\ncherry\n");
    const sorted = sortBlock(patterns, DEFAULT_OPTIONS);
    expect(sorted).not.toBeNull();
    expect(effectiveTexts(sorted!)).toEqual(["apple", "banana", "cherry"]);
  });

  it("sorts descending", () => {
    const patterns = patternsFrom("apple\nbanana\ncherry\n");
    const sorted = sortBlock(patterns, {
      ...DEFAULT_OPTIONS,
      direction: "desc",
    });
    expect(sorted).not.toBeNull();
    expect(effectiveTexts(sorted!)).toEqual(["cherry", "banana", "apple"]);
  });

  it("treats negated patterns as immovable barriers, sorting only the runs between them", () => {
    const patterns = patternsFrom("zebra\nfoo\n!bar\ncherry\napple\n");
    const sorted = sortBlock(patterns, DEFAULT_OPTIONS);
    expect(sorted).not.toBeNull();
    expect(effectiveTexts(sorted!)).toEqual([
      "foo",
      "zebra",
      "bar",
      "apple",
      "cherry",
    ]);
    // The barrier node itself is the exact same node instance, unmoved in
    // its slot.
    expect(sorted![2]).toBe(patterns[2]);
  });

  it("returns null when every run is already sorted around barriers", () => {
    const patterns = patternsFrom("foo\nzebra\n!bar\napple\ncherry\n");
    expect(sortBlock(patterns, DEFAULT_OPTIONS)).toBeNull();
  });

  it("returns null when no run has more than one element", () => {
    const patterns = patternsFrom("a\n!b\nc\n");
    expect(sortBlock(patterns, DEFAULT_OPTIONS)).toBeNull();
  });

  it("returns null when the whole block is barriers", () => {
    const patterns = patternsFrom("!a\n!b\n");
    expect(sortBlock(patterns, DEFAULT_OPTIONS)).toBeNull();
  });

  it("sorts naturally with mixed digit widths", () => {
    const patterns = patternsFrom("file10\nfile2\nfile1\n");
    const sorted = sortBlock(patterns, DEFAULT_OPTIONS);
    expect(sorted).not.toBeNull();
    expect(effectiveTexts(sorted!)).toEqual(["file1", "file2", "file10"]);
  });
});

describe("splitIntoRuns", () => {
  it("returns one run for a block with no barriers", () => {
    const patterns = patternsFrom("a\nb\nc\n");
    expect(splitIntoRuns(patterns)).toHaveLength(1);
    expect(effectiveTexts(splitIntoRuns(patterns)[0]!)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("splits on negated barriers, dropping the barriers themselves", () => {
    const patterns = patternsFrom("a\nb\n!x\nc\nd\n");
    const runs = splitIntoRuns(patterns);
    expect(runs).toHaveLength(2);
    expect(effectiveTexts(runs[0]!)).toEqual(["a", "b"]);
    expect(effectiveTexts(runs[1]!)).toEqual(["c", "d"]);
  });

  it("produces no runs when every pattern is a barrier", () => {
    const patterns = patternsFrom("!a\n!b\n");
    expect(splitIntoRuns(patterns)).toEqual([]);
  });

  it("produces no runs for an empty block", () => {
    expect(splitIntoRuns([])).toEqual([]);
  });
});

describe("sortRun", () => {
  it("sorts a run per the given options without mutating the input", () => {
    const patterns = patternsFrom("banana\napple\n");
    const sorted = sortRun(patterns, DEFAULT_OPTIONS);
    expect(effectiveTexts(sorted)).toEqual(["apple", "banana"]);
    expect(effectiveTexts(patterns)).toEqual(["banana", "apple"]);
  });
});
