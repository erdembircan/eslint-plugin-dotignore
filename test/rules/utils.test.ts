import { describe, expect, it } from "vitest";
import { parse } from "../../src/parser/index.js";
import { GitignoreSourceCode } from "../../src/language/source-code.js";
import { detectLineTerminator } from "../../src/rules/utils.js";

function sourceCodeFor(text: string): GitignoreSourceCode {
  return new GitignoreSourceCode({ text, ast: parse(text) });
}

describe("detectLineTerminator", () => {
  it("uses the reference node's own CRLF terminator", () => {
    const text = "foo\r\nbar\r\n";
    const sourceCode = sourceCodeFor(text);
    const fooNode = sourceCode.ast.body[0]!;
    expect(detectLineTerminator(sourceCode, fooNode)).toBe("\r\n");
  });

  it("uses the reference node's own LF terminator", () => {
    const text = "foo\nbar\n";
    const sourceCode = sourceCodeFor(text);
    const fooNode = sourceCode.ast.body[0]!;
    expect(detectLineTerminator(sourceCode, fooNode)).toBe("\n");
  });

  it("falls back to the file's first terminator when the reference node has none of its own (it's the last line, with no trailing newline)", () => {
    // First line is CRLF; "bar" (the reference) is the last line and has no
    // trailing terminator at all -- must fall back to the file's own first
    // terminator (CRLF) rather than defaulting to LF.
    const text = "foo\r\nbar";
    const sourceCode = sourceCodeFor(text);
    const barNode = sourceCode.ast.body[1]!;
    expect(detectLineTerminator(sourceCode, barNode)).toBe("\r\n");
  });

  it("prefers the reference node's own local terminator over the file's first (different) terminator", () => {
    // File's first terminator is LF, but the reference node's own line is
    // CRLF -- local convention at the edit site wins over the global one.
    const text = "keep\nfoo\r\n";
    const sourceCode = sourceCodeFor(text);
    const fooNode = sourceCode.ast.body[1]!;
    expect(detectLineTerminator(sourceCode, fooNode)).toBe("\r\n");
  });

  it("falls back to the file's first terminator when no reference node is given", () => {
    const text = "foo\r\nbar\r\n";
    const sourceCode = sourceCodeFor(text);
    expect(detectLineTerminator(sourceCode)).toBe("\r\n");
  });

  it("falls back to LF when the file has no terminators anywhere", () => {
    const text = "foo";
    const sourceCode = sourceCodeFor(text);
    const fooNode = sourceCode.ast.body[0]!;
    expect(detectLineTerminator(sourceCode, fooNode)).toBe("\n");
    expect(detectLineTerminator(sourceCode)).toBe("\n");
  });
});
