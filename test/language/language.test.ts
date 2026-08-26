import type { File, LanguageContext } from "@eslint/core";
import { describe, expect, it } from "vitest";
import { gitignoreLanguage } from "../../src/language/language.js";

function makeFile(body: string | Uint8Array): File {
  return {
    path: ".gitignore",
    physicalPath: ".gitignore",
    bom: false,
    body,
  };
}

const context: LanguageContext<Record<string, unknown>> = {
  languageOptions: {},
};

describe("gitignoreLanguage", () => {
  describe("validateLanguageOptions", () => {
    it("accepts undefined", () => {
      expect(() =>
        gitignoreLanguage.validateLanguageOptions(undefined as never),
      ).not.toThrow();
    });

    it("accepts an empty object", () => {
      expect(() => gitignoreLanguage.validateLanguageOptions({})).not.toThrow();
    });

    it("accepts an object with unrecognized keys, per the Language API contract", () => {
      expect(() =>
        gitignoreLanguage.validateLanguageOptions({
          somethingUnexpected: true,
        }),
      ).not.toThrow();
    });

    it("throws a TypeError with the exact expected message for a non-object value", () => {
      expect(() =>
        gitignoreLanguage.validateLanguageOptions("nope" as never),
      ).toThrow(new TypeError("Expected languageOptions to be an object."));
    });

    it("throws for null", () => {
      expect(() =>
        gitignoreLanguage.validateLanguageOptions(null as never),
      ).toThrow(new TypeError("Expected languageOptions to be an object."));
    });
  });

  describe("parse", () => {
    it("parses a string body", () => {
      const result = gitignoreLanguage.parse(makeFile("foo\n"), context);
      expect(result.ok).toBe(true);
      expect(result.ok && result.ast.body).toHaveLength(1);
    });

    it("decodes a Uint8Array body as UTF-8 before parsing", () => {
      const encoded = new TextEncoder().encode("foo\n# comment\n");
      const result = gitignoreLanguage.parse(makeFile(encoded), context);
      expect(result.ok).toBe(true);
      expect(result.ok && result.ast.body.map((node) => node.type)).toEqual([
        "Pattern",
        "Comment",
      ]);
    });
  });

  describe("createSourceCode", () => {
    it("creates a GitignoreSourceCode from a string body", () => {
      const file = makeFile("foo\n");
      const parseResult = gitignoreLanguage.parse(file, context);
      if (!parseResult.ok) {
        throw new Error("expected successful parse");
      }
      const sourceCode = gitignoreLanguage.createSourceCode(
        file,
        parseResult,
        context,
      );
      expect(sourceCode.text).toBe("foo\n");
      expect(sourceCode.ast).toBe(parseResult.ast);
    });

    it("decodes a Uint8Array body as UTF-8 before constructing the source code", () => {
      const encoded = new TextEncoder().encode("foo\n");
      const file = makeFile(encoded);
      const parseResult = gitignoreLanguage.parse(file, context);
      if (!parseResult.ok) {
        throw new Error("expected successful parse");
      }
      const sourceCode = gitignoreLanguage.createSourceCode(
        file,
        parseResult,
        context,
      );
      expect(sourceCode.text).toBe("foo\n");
    });
  });
});
