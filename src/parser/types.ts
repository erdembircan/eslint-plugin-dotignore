/**
 * A 1-based line/column position within gitignore source text.
 */
export interface Position {
  line: number;
  column: number;
}

/**
 * A start/end pair of {@link Position}s describing where a node appears in the
 * source text.
 */
export interface SourceLocation {
  start: Position;
  end: Position;
}

interface BaseNode {
  type: string;
  /** 0-based character offsets into the source text: [start, end), end-exclusive. */
  range: [number, number];
  loc: SourceLocation;
}

/**
 * The root AST node produced by `parse`. Its `body` contains one node per line of
 * the source text, in source order.
 */
export interface GitignoreFile extends BaseNode {
  type: "GitignoreFile";
  body: Array<Pattern | Comment | BlankLine>;
}

/**
 * A single gitignore pattern line (i.e. a line that is neither blank nor a comment).
 */
export interface Pattern extends BaseNode {
  type: "Pattern";
  /** The full line text, excluding the line terminator, verbatim. */
  raw: string;
  /** Whether the line starts with an unescaped '!'. */
  negated: boolean;
  /** Whether the effective pattern ends with an unescaped '/'. */
  dirOnly: boolean;
  /** Whether the effective pattern contains an unescaped '/' before its final character. */
  anchored: boolean;
  /** `raw` minus the leading '!' when `negated` is true; otherwise equal to `raw`. */
  pattern: string;
}

/**
 * A comment line: a line whose first non-whitespace character is an unescaped '#'.
 */
export interface Comment extends BaseNode {
  type: "Comment";
  /** The full line text, excluding the line terminator, verbatim. */
  raw: string;
  /** The text following the leading '#', not trimmed. */
  value: string;
}

/**
 * A line containing only whitespace, or nothing at all.
 */
export interface BlankLine extends BaseNode {
  type: "BlankLine";
  /** The whitespace content of the line; may be the empty string. */
  raw: string;
}

/** Any node that can appear in a gitignore AST, including the root. */
export type GitignoreNode = GitignoreFile | Pattern | Comment | BlankLine;
