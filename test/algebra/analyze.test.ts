import { describe, expect, it } from "vitest";
import { analyze } from "../../src/algebra/analyze.js";
import type { Issue, IssueKind, Segment } from "../../src/algebra/types.js";

function issueKinds(issues: Issue[]): IssueKind[] {
  return issues.map((issue) => issue.kind);
}

describe("analyze: trailing-backslash", () => {
  it("flags a single dangling trailing backslash", () => {
    const result = analyze("foo\\");
    expect(result.issues).toEqual([
      { kind: "trailing-backslash", index: 3, length: 1 },
    ]);
  });

  it("does not flag an even (paired) run of trailing backslashes", () => {
    const result = analyze("foo\\\\");
    expect(issueKinds(result.issues)).not.toContain("trailing-backslash");
  });

  it("does not flag a pattern with no trailing backslash", () => {
    const result = analyze("foo");
    expect(issueKinds(result.issues)).not.toContain("trailing-backslash");
  });
});

describe("analyze: bare-negation", () => {
  it("flags an empty effective pattern when negated", () => {
    const result = analyze("", { negated: true });
    expect(result.issues).toEqual([
      { kind: "bare-negation", index: 0, length: 0 },
    ]);
  });

  it("flags when trailing whitespace strips down to empty and negated", () => {
    const result = analyze(" ", { negated: true });
    expect(result.issues).toEqual([
      { kind: "bare-negation", index: 0, length: 1 },
    ]);
  });

  it("does not flag an empty pattern when not negated", () => {
    const result = analyze("", { negated: false });
    expect(issueKinds(result.issues)).not.toContain("bare-negation");
  });

  it("does not flag a non-empty negated pattern", () => {
    const result = analyze("foo", { negated: true });
    expect(issueKinds(result.issues)).not.toContain("bare-negation");
  });
});

describe("analyze: bare-slash", () => {
  it("flags a lone slash", () => {
    const result = analyze("/");
    expect(result.issues).toEqual([
      { kind: "bare-slash", index: 0, length: 1 },
    ]);
  });

  it("flags a lone slash with stripped trailing whitespace", () => {
    const result = analyze("/ ");
    expect(result.issues).toEqual([
      { kind: "bare-slash", index: 0, length: 2 },
    ]);
  });

  it("does not flag a longer anchored pattern", () => {
    const result = analyze("/foo");
    expect(issueKinds(result.issues)).not.toContain("bare-slash");
  });
});

describe("analyze: empty-segment", () => {
  it("flags a doubled slash", () => {
    const result = analyze("foo//bar");
    expect(result.issues).toEqual([
      { kind: "empty-segment", index: 3, length: 2 },
    ]);
  });

  it("flags each adjacent pair in a run of three slashes", () => {
    const result = analyze("foo///bar");
    expect(result.issues).toEqual([
      { kind: "empty-segment", index: 3, length: 2 },
      { kind: "empty-segment", index: 4, length: 2 },
    ]);
  });

  it("does not flag a single leading slash", () => {
    const result = analyze("/foo");
    expect(issueKinds(result.issues)).not.toContain("empty-segment");
  });

  it("does not flag a single internal slash", () => {
    const result = analyze("foo/bar");
    expect(issueKinds(result.issues)).not.toContain("empty-segment");
  });
});

describe("analyze: unclosed-class", () => {
  it("flags a class with no closing bracket", () => {
    const result = analyze("[abc");
    expect(result.issues).toEqual([
      { kind: "unclosed-class", index: 0, length: 4 },
    ]);
    const segments = result.segments;
    expect(segments).toEqual<Segment[]>([
      {
        kind: "tokens",
        tokens: [
          { kind: "lit", char: "[" },
          { kind: "lit", char: "a" },
          { kind: "lit", char: "b" },
          { kind: "lit", char: "c" },
        ],
      },
    ]);
  });

  it("flags a negated class whose only content is the literal-first ']'", () => {
    const result = analyze("[^]");
    expect(result.issues).toEqual([
      { kind: "unclosed-class", index: 0, length: 3 },
    ]);
  });

  it("flags '[!]' as unclosed, not empty-class", () => {
    const result = analyze("[!]");
    expect(result.issues).toEqual([
      { kind: "unclosed-class", index: 0, length: 3 },
    ]);
  });

  it("does not flag a properly closed class", () => {
    const result = analyze("[abc]");
    expect(issueKinds(result.issues)).not.toContain("unclosed-class");
  });

  it("stops the literal fallback at the next unescaped slash, starting a new segment", () => {
    const result = analyze("[abc/def");
    expect(result.issues).toEqual([
      { kind: "unclosed-class", index: 0, length: 4 },
    ]);
    expect(result.segments).toEqual<Segment[]>([
      {
        kind: "tokens",
        tokens: [
          { kind: "lit", char: "[" },
          { kind: "lit", char: "a" },
          { kind: "lit", char: "b" },
          { kind: "lit", char: "c" },
        ],
      },
      {
        kind: "tokens",
        tokens: [
          { kind: "lit", char: "d" },
          { kind: "lit", char: "e" },
          { kind: "lit", char: "f" },
        ],
      },
    ]);
  });
});

describe("analyze: empty-class", () => {
  it("flags a bare '[]'", () => {
    const result = analyze("[]");
    expect(result.issues).toEqual([
      { kind: "empty-class", index: 0, length: 2 },
    ]);
    expect(result.segments).toEqual<Segment[]>([
      {
        kind: "tokens",
        tokens: [
          { kind: "lit", char: "[" },
          { kind: "lit", char: "]" },
        ],
      },
    ]);
  });

  it("flags '[]' embedded after other characters", () => {
    const result = analyze("a[]");
    expect(result.issues).toEqual([
      { kind: "empty-class", index: 1, length: 2 },
    ]);
  });

  it("does not flag a non-empty class", () => {
    const result = analyze("[a]");
    expect(issueKinds(result.issues)).not.toContain("empty-class");
  });
});

describe("analyze: reversed-range", () => {
  it("flags a range whose bounds are reversed", () => {
    const result = analyze("[z-a]");
    expect(result.issues).toEqual([
      { kind: "reversed-range", index: 1, length: 3 },
    ]);
  });

  it("does not flag a properly ordered range", () => {
    const result = analyze("[a-z]");
    expect(issueKinds(result.issues)).not.toContain("reversed-range");
  });

  it("does not flag a single-character range", () => {
    const result = analyze("[a-a]");
    expect(issueKinds(result.issues)).not.toContain("reversed-range");
  });
});

describe("analyze: misplaced-globstar", () => {
  it("flags a run embedded within a segment", () => {
    const result = analyze("a**b");
    expect(result.issues).toEqual([
      { kind: "misplaced-globstar", index: 1, length: 2 },
    ]);
    expect(result.segments).toEqual<Segment[]>([
      {
        kind: "tokens",
        tokens: [
          { kind: "lit", char: "a" },
          { kind: "star" },
          { kind: "lit", char: "b" },
        ],
      },
    ]);
  });

  it("flags a whole-segment run of three stars", () => {
    const result = analyze("***");
    expect(result.issues).toEqual([
      { kind: "misplaced-globstar", index: 0, length: 3 },
    ]);
    expect(result.segments).toEqual<Segment[]>([
      { kind: "tokens", tokens: [{ kind: "star" }] },
    ]);
  });

  it("flags a leading two-star run followed by other content", () => {
    const result = analyze("**a");
    expect(result.issues).toEqual([
      { kind: "misplaced-globstar", index: 0, length: 2 },
    ]);
  });

  it("does not flag a lone star", () => {
    const result = analyze("a*b");
    expect(issueKinds(result.issues)).not.toContain("misplaced-globstar");
  });

  it("does not flag a whole-segment two-star globstar", () => {
    const result = analyze("**");
    expect(issueKinds(result.issues)).not.toContain("misplaced-globstar");
    expect(result.segments).toEqual<Segment[]>([{ kind: "globstar" }]);
  });

  it("does not flag a bounded globstar segment among other segments", () => {
    const result = analyze("a/**/b");
    expect(issueKinds(result.issues)).not.toContain("misplaced-globstar");
    expect(result.segments).toEqual<Segment[]>([
      { kind: "tokens", tokens: [{ kind: "lit", char: "a" }] },
      { kind: "globstar" },
      { kind: "tokens", tokens: [{ kind: "lit", char: "b" }] },
    ]);
  });
});

describe("analyze: backslash-path", () => {
  it("flags an escaped letter", () => {
    const result = analyze("\\a");
    expect(result.issues).toEqual([
      { kind: "backslash-path", index: 0, length: 2 },
    ]);
    expect(result.segments).toEqual<Segment[]>([
      { kind: "tokens", tokens: [{ kind: "lit", char: "a" }] },
    ]);
  });

  it("flags an escaped digit", () => {
    const result = analyze("\\5");
    expect(result.issues).toEqual([
      { kind: "backslash-path", index: 0, length: 2 },
    ]);
  });

  it("flags an escaped alnum char inside a class", () => {
    const result = analyze("[\\a]");
    expect(result.issues).toEqual([
      { kind: "backslash-path", index: 1, length: 2 },
    ]);
  });

  it.each([
    ["\\#"],
    ["\\!"],
    ["\\\\"],
    ["\\/"],
    ["\\*"],
    ["\\?"],
    ["\\["],
    ["\\]"],
    ["\\-"],
  ])("does not flag the meaningful escape %s", (input) => {
    const result = analyze(input);
    expect(issueKinds(result.issues)).not.toContain("backslash-path");
  });

  it("does not flag an escaped space", () => {
    const result = analyze("\\ ");
    expect(issueKinds(result.issues)).not.toContain("backslash-path");
    expect(result.effective).toBe("\\ ");
  });
});

describe("analyze: tokenization of escaped metacharacters", () => {
  it.each([
    ["\\*", "*"],
    ["\\?", "?"],
    ["\\[", "["],
    ["\\]", "]"],
    ["\\-", "-"],
    ["\\\\", "\\"],
  ])("treats %s as a literal %s", (input, expectedChar) => {
    const result = analyze(input);
    expect(result.segments).toEqual<Segment[]>([
      { kind: "tokens", tokens: [{ kind: "lit", char: expectedChar }] },
    ]);
  });

  it("treats an escaped slash as a literal character, not a segment separator", () => {
    const result = analyze("foo\\/bar");
    expect(result.segments).toEqual<Segment[]>([
      {
        kind: "tokens",
        tokens: [
          { kind: "lit", char: "f" },
          { kind: "lit", char: "o" },
          { kind: "lit", char: "o" },
          { kind: "lit", char: "/" },
          { kind: "lit", char: "b" },
          { kind: "lit", char: "a" },
          { kind: "lit", char: "r" },
        ],
      },
    ]);
    expect(result.anchored).toBe(false);
  });

  it("treats a trailing lone backslash as a literal backslash for matching", () => {
    const result = analyze("foo\\");
    expect(result.segments).toEqual<Segment[]>([
      {
        kind: "tokens",
        tokens: [
          { kind: "lit", char: "f" },
          { kind: "lit", char: "o" },
          { kind: "lit", char: "o" },
          { kind: "lit", char: "\\" },
        ],
      },
    ]);
  });
});

describe("analyze: class member tokenization", () => {
  it("treats a ']' immediately after '[' as a literal member", () => {
    const result = analyze("[]a]");
    expect(result.issues).toEqual([]);
    expect(result.segments).toEqual<Segment[]>([
      {
        kind: "tokens",
        tokens: [
          {
            kind: "class",
            negated: false,
            members: [
              { kind: "char", char: "]" },
              { kind: "char", char: "a" },
            ],
          },
        ],
      },
    ]);
  });

  it("treats a ']' immediately after '[!' as a literal member", () => {
    const result = analyze("[!]a]");
    expect(result.segments).toEqual<Segment[]>([
      {
        kind: "tokens",
        tokens: [
          {
            kind: "class",
            negated: true,
            members: [
              { kind: "char", char: "]" },
              { kind: "char", char: "a" },
            ],
          },
        ],
      },
    ]);
  });

  it("treats a leading '-' as a literal '-'", () => {
    const result = analyze("[-a]");
    expect(result.segments).toEqual<Segment[]>([
      {
        kind: "tokens",
        tokens: [
          {
            kind: "class",
            negated: false,
            members: [
              { kind: "char", char: "-" },
              { kind: "char", char: "a" },
            ],
          },
        ],
      },
    ]);
  });

  it("treats a trailing '-' as a literal '-'", () => {
    const result = analyze("[a-]");
    expect(result.segments).toEqual<Segment[]>([
      {
        kind: "tokens",
        tokens: [
          {
            kind: "class",
            negated: false,
            members: [
              { kind: "char", char: "a" },
              { kind: "char", char: "-" },
            ],
          },
        ],
      },
    ]);
  });

  it("parses 'a-b' as a range", () => {
    const result = analyze("[a-z]");
    expect(result.segments).toEqual<Segment[]>([
      {
        kind: "tokens",
        tokens: [
          {
            kind: "class",
            negated: false,
            members: [{ kind: "range", from: "a", to: "z" }],
          },
        ],
      },
    ]);
  });

  it("parses a negated class using '^'", () => {
    const result = analyze("[^abc]");
    expect(result.segments).toEqual<Segment[]>([
      {
        kind: "tokens",
        tokens: [
          {
            kind: "class",
            negated: true,
            members: [
              { kind: "char", char: "a" },
              { kind: "char", char: "b" },
              { kind: "char", char: "c" },
            ],
          },
        ],
      },
    ]);
  });

  it("parses a negated class using '!'", () => {
    const result = analyze("[!abc]");
    expect(result.segments).toEqual<Segment[]>([
      {
        kind: "tokens",
        tokens: [
          {
            kind: "class",
            negated: true,
            members: [
              { kind: "char", char: "a" },
              { kind: "char", char: "b" },
              { kind: "char", char: "c" },
            ],
          },
        ],
      },
    ]);
  });

  it("parses '?' as a question token", () => {
    const result = analyze("a?b");
    expect(result.segments).toEqual<Segment[]>([
      {
        kind: "tokens",
        tokens: [
          { kind: "lit", char: "a" },
          { kind: "question" },
          { kind: "lit", char: "b" },
        ],
      },
    ]);
  });
});

describe("analyze: globstar segment detection", () => {
  it("recognizes a whole pattern of exactly two stars", () => {
    expect(analyze("**").segments).toEqual<Segment[]>([{ kind: "globstar" }]);
  });

  it("recognizes a trailing globstar segment", () => {
    expect(analyze("foo/**").segments).toEqual<Segment[]>([
      {
        kind: "tokens",
        tokens: [
          { kind: "lit", char: "f" },
          { kind: "lit", char: "o" },
          { kind: "lit", char: "o" },
        ],
      },
      { kind: "globstar" },
    ]);
  });

  it("recognizes a leading globstar segment", () => {
    expect(analyze("**/foo").segments).toEqual<Segment[]>([
      { kind: "globstar" },
      {
        kind: "tokens",
        tokens: [
          { kind: "lit", char: "f" },
          { kind: "lit", char: "o" },
          { kind: "lit", char: "o" },
        ],
      },
    ]);
  });

  it("recognizes a middle globstar segment", () => {
    expect(analyze("a/**/b").segments).toEqual<Segment[]>([
      { kind: "tokens", tokens: [{ kind: "lit", char: "a" }] },
      { kind: "globstar" },
      { kind: "tokens", tokens: [{ kind: "lit", char: "b" }] },
    ]);
  });
});

describe("analyze: dirOnly and anchored", () => {
  it("strips the trailing slash from segments when dirOnly", () => {
    const result = analyze("foo/");
    expect(result.dirOnly).toBe(true);
    expect(result.segments).toEqual<Segment[]>([
      {
        kind: "tokens",
        tokens: [
          { kind: "lit", char: "f" },
          { kind: "lit", char: "o" },
          { kind: "lit", char: "o" },
        ],
      },
    ]);
  });

  it("splits multiple directory segments before the trailing slash", () => {
    const result = analyze("a/b/");
    expect(result.dirOnly).toBe(true);
    expect(result.segments).toEqual<Segment[]>([
      { kind: "tokens", tokens: [{ kind: "lit", char: "a" }] },
      { kind: "tokens", tokens: [{ kind: "lit", char: "b" }] },
    ]);
  });

  it("is anchored for a leading slash", () => {
    expect(analyze("/foo").anchored).toBe(true);
  });

  it("is anchored for a mid-pattern slash", () => {
    expect(analyze("foo/bar").anchored).toBe(true);
  });

  it("is not anchored for a trailing slash alone", () => {
    expect(analyze("foo/").anchored).toBe(false);
  });

  it("is not anchored for a pattern with no slash", () => {
    expect(analyze("foo").anchored).toBe(false);
  });
});

describe("analyze: normalized", () => {
  it("drops a redundant leading slash when another slash follows", () => {
    expect(analyze("/foo/bar").normalized).toBe("foo/bar");
  });

  it("keeps a leading slash when it is the only slash", () => {
    expect(analyze("/foo").normalized).toBe("/foo");
  });

  it("drops a '**/' prefix when the remainder has no internal slash", () => {
    expect(analyze("**/foo").normalized).toBe("foo");
  });

  it("keeps a '**/' prefix when the remainder has an internal slash", () => {
    expect(analyze("**/foo/bar").normalized).toBe("**/foo/bar");
  });

  it("drops a '**/' prefix when the remainder's only slash is trailing", () => {
    expect(analyze("**/foo/").normalized).toBe("foo/");
  });

  it("rewrites a misplaced globstar run to a single star", () => {
    expect(analyze("a**b").normalized).toBe("a*b");
  });

  it("does not rewrite a legitimate whole-segment globstar", () => {
    expect(analyze("foo/**/bar").normalized).toBe("foo/**/bar");
  });

  it("applies rule 1 then rule 2 across a combined case", () => {
    expect(analyze("/**/foo").normalized).toBe("foo");
  });

  it("preserves escapes verbatim through normalization", () => {
    expect(analyze("foo\\ bar").normalized).toBe("foo\\ bar");
  });
});

describe("analyze: effective preserves escapes and strips only unescaped trailing whitespace", () => {
  it("strips unescaped trailing whitespace", () => {
    expect(analyze("foo  ").effective).toBe("foo");
  });

  it("keeps an escaped trailing space", () => {
    expect(analyze("foo\\ ").effective).toBe("foo\\ ");
  });

  it("keeps escapes and trailing whitespace on the raw pattern field callers pass in", () => {
    const result = analyze("foo\\*  ");
    expect(result.effective).toBe("foo\\*");
  });
});
