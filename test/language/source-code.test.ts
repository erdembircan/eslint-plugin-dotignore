import { describe, expect, it } from "vitest";
import { parse } from "../../src/parser/index.js";
import { GitignoreSourceCode } from "../../src/language/source-code.js";

describe("GitignoreSourceCode", () => {
  it("returns undefined for the root GitignoreFile's parent", () => {
    const ast = parse("foo\n");
    const sourceCode = new GitignoreSourceCode({ text: "foo\n", ast });
    expect(sourceCode.getParent(ast)).toBeUndefined();
  });

  it("returns the same cached steps on a second traverse() call", () => {
    const ast = parse("foo\n# bar\n");
    const sourceCode = new GitignoreSourceCode({ text: "foo\n# bar\n", ast });

    const first = [...sourceCode.traverse()];
    const second = [...sourceCode.traverse()];

    expect(second).toHaveLength(first.length);
    expect(second).toEqual(first);
    // Every element is the exact same step instance, confirming the second
    // call served the cached array rather than rebuilding it.
    for (let i = 0; i < first.length; i += 1) {
      expect(second[i]).toBe(first[i]);
    }
  });

  it("inherits getText/getRange/getLoc from TextSourceCodeBase using our ESTree-style nodes", () => {
    const text = "foo\n";
    const ast = parse(text);
    const sourceCode = new GitignoreSourceCode({ text, ast });
    const pattern = ast.body[0]!;

    expect(sourceCode.getText(pattern)).toBe("foo");
    expect(sourceCode.getRange(pattern)).toEqual([0, 3]);
    expect(sourceCode.getLoc(pattern)).toEqual({
      start: { line: 1, column: 1 },
      end: { line: 1, column: 4 },
    });
  });
});
