import type {
  File,
  Language,
  LanguageContext,
  OkParseResult,
} from "@eslint/core";
import { parse as parseGitignore } from "../parser/index.js";
import type { GitignoreFile } from "../parser/index.js";
import { GitignoreSourceCode } from "./source-code.js";
import type { GitignoreNode } from "./source-code.js";

/**
 * This language currently defines no options of its own, but the type stays
 * a plain object (rather than e.g. `Record<string, never>`) because, per the
 * Language API contract, unrecognized keys must be accepted and ignored, not
 * rejected.
 */
export type GitignoreLanguageOptions = Record<string, unknown>;

function decodeBody(body: string | Uint8Array): string {
  if (typeof body === "string") {
    return body;
  }
  return new TextDecoder("utf-8").decode(body);
}

/**
 * The ESLint Language plugin for gitignore files.
 *
 * Typed against `@eslint/core`'s `Language` generic. That generic's `Code`
 * slot is constrained to the (fairly abstract) `SourceCode` shape rather than
 * our concrete `GitignoreSourceCode`, and `RootNode`/`Node` are typed as
 * `unknown` at the `Language` interface level — so `parse`/`createSourceCode`
 * below are annotated with our concrete gitignore types for our own type
 * safety, and this object is assigned to the `Language<...>` shape structurally
 * (every member is independently checked against its interface signature; no
 * cast is needed for the object as a whole).
 */
export const gitignoreLanguage: Language<{
  LangOptions: GitignoreLanguageOptions;
  Code: GitignoreSourceCode;
  RootNode: GitignoreFile;
  Node: GitignoreNode;
}> = {
  fileType: "text",
  lineStart: 1,
  columnStart: 1,
  nodeTypeKey: "type",
  visitorKeys: {
    GitignoreFile: ["body"],
    Pattern: [],
    Comment: [],
    BlankLine: [],
  },

  validateLanguageOptions(languageOptions: GitignoreLanguageOptions): void {
    if (languageOptions === undefined) {
      return;
    }

    if (typeof languageOptions !== "object" || languageOptions === null) {
      throw new TypeError("Expected languageOptions to be an object.");
    }

    // Per the Language API contract, languages must not throw on unexpected
    // keys. This language does not define any options of its own yet, so
    // there is nothing further to validate.
  },

  parse(
    file: File,
    _context: LanguageContext<GitignoreLanguageOptions>,
  ): OkParseResult<GitignoreFile> {
    const text = decodeBody(file.body);
    const ast = parseGitignore(text);

    // Our parser never throws and accepts every string, so parsing a
    // gitignore file can never fail: we always return `ok: true`.
    return { ok: true, ast };
  },

  createSourceCode(
    file: File,
    parseResult: OkParseResult<GitignoreFile>,
    _context: LanguageContext<GitignoreLanguageOptions>,
  ): GitignoreSourceCode {
    return new GitignoreSourceCode({
      text: decodeBody(file.body),
      ast: parseResult.ast,
    });
  },
};
