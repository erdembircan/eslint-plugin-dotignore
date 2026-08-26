import { describe, expect, it } from "vitest";
import { parse } from "../../src/parser/index.js";

describe("parse", () => {
  it("returns an empty body for an empty string", () => {
    const result = parse("");
    expect(result).toEqual({
      type: "GitignoreFile",
      range: [0, 0],
      loc: {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 1 },
      },
      body: [],
    });
  });

  it("parses a single pattern line", () => {
    const result = parse("foo");
    expect(result.range).toEqual([0, 3]);
    expect(result.loc).toEqual({
      start: { line: 1, column: 1 },
      end: { line: 1, column: 4 },
    });
    expect(result.body).toEqual([
      {
        type: "Pattern",
        range: [0, 3],
        loc: { start: { line: 1, column: 1 }, end: { line: 1, column: 4 } },
        raw: "foo",
        negated: false,
        dirOnly: false,
        anchored: false,
        pattern: "foo",
      },
    ]);
  });

  it("produces equivalent body content with and without a trailing newline", () => {
    const withoutTrailingNewline = parse("foo");
    const withTrailingNewline = parse("foo\n");
    expect(withTrailingNewline.body).toEqual(withoutTrailingNewline.body);
  });

  it("classifies a comment line", () => {
    const result = parse("# header");
    expect(result.body).toEqual([
      {
        type: "Comment",
        range: [0, 8],
        loc: { start: { line: 1, column: 1 }, end: { line: 1, column: 9 } },
        raw: "# header",
        value: " header",
      },
    ]);
  });

  it("classifies an indented comment, keeping leading whitespace in raw", () => {
    const result = parse("  # indented");
    expect(result.body[0]).toEqual({
      type: "Comment",
      range: [0, 12],
      loc: { start: { line: 1, column: 1 }, end: { line: 1, column: 13 } },
      raw: "  # indented",
      value: " indented",
    });
  });

  it("classifies an all-space line as blank", () => {
    const result = parse("   ");
    expect(result.body[0]).toEqual({
      type: "BlankLine",
      range: [0, 3],
      loc: { start: { line: 1, column: 1 }, end: { line: 1, column: 4 } },
      raw: "   ",
    });
  });

  it("classifies an all-tab line as blank", () => {
    const result = parse("\t\t");
    expect(result.body[0]).toEqual({
      type: "BlankLine",
      range: [0, 2],
      loc: { start: { line: 1, column: 1 }, end: { line: 1, column: 3 } },
      raw: "\t\t",
    });
  });

  it("classifies a genuinely empty line as blank with empty raw", () => {
    const result = parse("foo\n\nbar");
    expect(result.body[1]).toEqual({
      type: "BlankLine",
      range: [4, 4],
      loc: { start: { line: 2, column: 1 }, end: { line: 2, column: 1 } },
      raw: "",
    });
  });

  it("treats an escaped leading '#' as a pattern, not a comment", () => {
    const result = parse("\\#foo");
    expect(result.body[0]).toEqual({
      type: "Pattern",
      range: [0, 5],
      loc: { start: { line: 1, column: 1 }, end: { line: 1, column: 6 } },
      raw: "\\#foo",
      negated: false,
      dirOnly: false,
      anchored: false,
      pattern: "\\#foo",
    });
  });

  it("treats an escaped leading '!' as a non-negated pattern", () => {
    const result = parse("\\!foo");
    expect(result.body[0]).toEqual({
      type: "Pattern",
      range: [0, 5],
      loc: { start: { line: 1, column: 1 }, end: { line: 1, column: 6 } },
      raw: "\\!foo",
      negated: false,
      dirOnly: false,
      anchored: false,
      pattern: "\\!foo",
    });
  });

  it("treats a bare escaped '\\!' line as a non-negated pattern", () => {
    const result = parse("\\!");
    expect(result.body[0]).toMatchObject({
      type: "Pattern",
      raw: "\\!",
      negated: false,
      pattern: "\\!",
      dirOnly: false,
      anchored: false,
    });
  });

  it("negates a pattern starting with an unescaped '!'", () => {
    const result = parse("!foo");
    expect(result.body[0]).toEqual({
      type: "Pattern",
      range: [0, 4],
      loc: { start: { line: 1, column: 1 }, end: { line: 1, column: 5 } },
      raw: "!foo",
      negated: true,
      dirOnly: false,
      anchored: false,
      pattern: "foo",
    });
  });

  it("treats a bare '!' as negated with an empty effective pattern", () => {
    const result = parse("!");
    expect(result.body[0]).toMatchObject({
      type: "Pattern",
      raw: "!",
      negated: true,
      pattern: "",
      dirOnly: false,
      anchored: false,
    });
  });

  describe("dirOnly", () => {
    it("is true for a trailing unescaped slash", () => {
      const result = parse("foo/");
      expect(result.body[0]).toMatchObject({ dirOnly: true, anchored: false });
    });

    it("is true when unescaped trailing whitespace follows the slash", () => {
      const result = parse("foo/ ");
      expect(result.body[0]).toMatchObject({
        raw: "foo/ ",
        pattern: "foo/ ",
        dirOnly: true,
      });
    });

    it("is true when a trailing tab follows the slash", () => {
      const result = parse("foo/\t");
      expect(result.body[0]).toMatchObject({ dirOnly: true });
    });

    it("is false when the trailing slash is escaped", () => {
      const result = parse("foo\\/");
      expect(result.body[0]).toMatchObject({
        raw: "foo\\/",
        pattern: "foo\\/",
        dirOnly: false,
      });
    });

    it("is true when the trailing slash is preceded by an even number of backslashes", () => {
      const result = parse("foo\\\\/");
      expect(result.body[0]).toMatchObject({
        raw: "foo\\\\/",
        dirOnly: true,
      });
    });

    it("does not strip an escaped trailing space", () => {
      const result = parse("foo\\ ");
      expect(result.body[0]).toMatchObject({
        raw: "foo\\ ",
        pattern: "foo\\ ",
        dirOnly: false,
      });
    });
  });

  describe("anchored", () => {
    it("is true for a leading slash", () => {
      const result = parse("/foo");
      expect(result.body[0]).toMatchObject({ anchored: true, dirOnly: false });
    });

    it("is true for a mid-pattern slash", () => {
      const result = parse("foo/bar");
      expect(result.body[0]).toMatchObject({ anchored: true, dirOnly: false });
    });

    it("is false for a trailing slash alone", () => {
      const result = parse("foo/");
      expect(result.body[0]).toMatchObject({ anchored: false });
    });

    it("is false when there is no slash", () => {
      const result = parse("foo");
      expect(result.body[0]).toMatchObject({ anchored: false, dirOnly: false });
    });

    it("is true for a non-trailing slash after a globstar", () => {
      const result = parse("**/foo");
      expect(result.body[0]).toMatchObject({ anchored: true });
    });

    it("is true for an escaped negation followed by a non-trailing slash", () => {
      const result = parse("\\!/x");
      expect(result.body[0]).toMatchObject({
        raw: "\\!/x",
        negated: false,
        pattern: "\\!/x",
        anchored: true,
      });
    });

    it("ignores an escaped slash when scanning for anchors", () => {
      const result = parse("a\\/b");
      expect(result.body[0]).toMatchObject({
        raw: "a\\/b",
        anchored: false,
      });
    });
  });

  it("preserves trailing whitespace and mid-line escapes verbatim in raw and pattern", () => {
    const result = parse("foo\\ bar  ");
    expect(result.body[0]).toMatchObject({
      raw: "foo\\ bar  ",
      pattern: "foo\\ bar  ",
    });
  });

  describe("CRLF handling", () => {
    it("produces AST content equivalent to the LF file and exact ranges against the CRLF source", () => {
      const lfText = "foo\nbar\n";
      const crlfText = "foo\r\nbar\r\n";

      const lfResult = parse(lfText);
      const crlfResult = parse(crlfText);

      expect(
        crlfResult.body.map((node) => ({
          ...node,
          range: undefined,
          loc: undefined,
        })),
      ).toEqual(
        lfResult.body.map((node) => ({
          ...node,
          range: undefined,
          loc: undefined,
        })),
      );

      expect(crlfResult.body).toEqual([
        {
          type: "Pattern",
          range: [0, 3],
          loc: { start: { line: 1, column: 1 }, end: { line: 1, column: 4 } },
          raw: "foo",
          negated: false,
          dirOnly: false,
          anchored: false,
          pattern: "foo",
        },
        {
          type: "Pattern",
          range: [5, 8],
          loc: { start: { line: 2, column: 1 }, end: { line: 2, column: 4 } },
          raw: "bar",
          negated: false,
          dirOnly: false,
          anchored: false,
          pattern: "bar",
        },
      ]);

      for (const node of crlfResult.body) {
        expect(crlfText.slice(node.range[0], node.range[1])).toBe(node.raw);
      }
    });
  });

  describe("range and loc exactness", () => {
    const fixture = [
      "# header",
      "",
      "foo/",
      "!bar",
      "  # trailing comment",
    ].join("\n");
    const result = parse(fixture);

    it("produces every expected node with exact ranges and locs", () => {
      expect(result.body).toEqual([
        {
          type: "Comment",
          range: [0, 8],
          loc: { start: { line: 1, column: 1 }, end: { line: 1, column: 9 } },
          raw: "# header",
          value: " header",
        },
        {
          type: "BlankLine",
          range: [9, 9],
          loc: { start: { line: 2, column: 1 }, end: { line: 2, column: 1 } },
          raw: "",
        },
        {
          type: "Pattern",
          range: [10, 14],
          loc: { start: { line: 3, column: 1 }, end: { line: 3, column: 5 } },
          raw: "foo/",
          negated: false,
          dirOnly: true,
          anchored: false,
          pattern: "foo/",
        },
        {
          type: "Pattern",
          range: [15, 19],
          loc: { start: { line: 4, column: 1 }, end: { line: 4, column: 5 } },
          raw: "!bar",
          negated: true,
          dirOnly: false,
          anchored: false,
          pattern: "bar",
        },
        {
          type: "Comment",
          range: [20, 40],
          loc: { start: { line: 5, column: 1 }, end: { line: 5, column: 21 } },
          raw: "  # trailing comment",
          value: " trailing comment",
        },
      ]);
    });

    it("has a file range and loc covering the whole text", () => {
      expect(result.range).toEqual([0, 40]);
      expect(result.loc).toEqual({
        start: { line: 1, column: 1 },
        end: { line: 5, column: 21 },
      });
    });

    it("satisfies text.slice(range) === raw for every node", () => {
      for (const node of result.body) {
        expect(fixture.slice(node.range[0], node.range[1])).toBe(node.raw);
      }
    });
  });

  it("does not throw on arbitrary malformed input", () => {
    const inputs = ["\0\0\0", "\\", "!!!!", "###", "/////", "\r\r\r\n\n\r"];
    for (const input of inputs) {
      expect(() => parse(input)).not.toThrow();
    }
  });
});
