import type {
  BlankLine,
  Comment,
  GitignoreFile,
  Pattern,
  Position,
  SourceLocation,
} from "./types.js";

function isWhitespaceChar(char: string): boolean {
  return char === " " || char === "\t";
}

function countPrecedingBackslashes(text: string, index: number): number {
  let count = 0;
  let i = index - 1;
  while (i >= 0 && text.charAt(i) === "\\") {
    count += 1;
    i -= 1;
  }
  return count;
}

function isEscapedAt(text: string, index: number): boolean {
  return countPrecedingBackslashes(text, index) % 2 === 1;
}

/**
 * Strips trailing whitespace that is not escaped by a preceding backslash. A
 * trailing whitespace character preceded by an odd number of backslashes is
 * considered escaped (literal) and stops the stripping.
 */
function stripTrailingUnescapedWhitespace(text: string): string {
  let end = text.length;
  while (end > 0 && isWhitespaceChar(text.charAt(end - 1))) {
    if (isEscapedAt(text, end - 1)) {
      break;
    }
    end -= 1;
  }
  return text.slice(0, end);
}

function computeDirOnly(effective: string): boolean {
  const lastIndex = effective.length - 1;
  if (lastIndex < 0 || effective.charAt(lastIndex) !== "/") {
    return false;
  }
  return !isEscapedAt(effective, lastIndex);
}

function computeAnchored(effective: string): boolean {
  for (let i = 0; i < effective.length - 1; i += 1) {
    if (effective.charAt(i) === "/" && !isEscapedAt(effective, i)) {
      return true;
    }
  }
  return false;
}

function buildPatternNode(
  raw: string,
  range: [number, number],
  loc: SourceLocation,
): Pattern {
  const negated = raw.startsWith("!");
  const pattern = negated ? raw.slice(1) : raw;
  const effective = stripTrailingUnescapedWhitespace(pattern);
  return {
    type: "Pattern",
    range,
    loc,
    raw,
    negated,
    dirOnly: computeDirOnly(effective),
    anchored: computeAnchored(effective),
    pattern,
  };
}

/**
 * Converts a 0-based character offset into a 1-based {@link Position}, given the
 * sorted list of 0-based offsets of every "\n" in the source text.
 */
function offsetToLoc(
  newlineOffsets: readonly number[],
  offset: number,
): Position {
  let line = 1;
  let lastNewlineOffset = -1;
  for (const newlineOffset of newlineOffsets) {
    if (newlineOffset >= offset) {
      break;
    }
    line += 1;
    lastNewlineOffset = newlineOffset;
  }
  return { line, column: offset - lastNewlineOffset };
}

function pushLine(
  body: Array<Pattern | Comment | BlankLine>,
  text: string,
  start: number,
  rawEnd: number,
  newlineOffsets: readonly number[],
): void {
  let contentEnd = rawEnd;
  if (contentEnd > start && text.charCodeAt(contentEnd - 1) === 13) {
    contentEnd -= 1;
  }

  const raw = text.slice(start, contentEnd);
  const range: [number, number] = [start, contentEnd];
  const loc: SourceLocation = {
    start: offsetToLoc(newlineOffsets, start),
    end: offsetToLoc(newlineOffsets, contentEnd),
  };

  const nonWhitespaceIndex = raw.search(/\S/);
  if (nonWhitespaceIndex === -1) {
    body.push({ type: "BlankLine", range, loc, raw });
    return;
  }

  if (raw.charAt(nonWhitespaceIndex) === "#") {
    body.push({
      type: "Comment",
      range,
      loc,
      raw,
      value: raw.slice(nonWhitespaceIndex + 1),
    });
    return;
  }

  body.push(buildPatternNode(raw, range, loc));
}

/**
 * Parses gitignore source text into a {@link GitignoreFile} AST.
 *
 * Never throws: every string input, including malformed or empty text, produces a
 * valid tree. A trailing newline at the very end of `text` does not produce an
 * extra trailing `BlankLine` node — `parse("foo")` and `parse("foo\n")` produce
 * equivalent `body` content.
 */
export function parse(text: string): GitignoreFile {
  const length = text.length;
  const zeroPosition: Position = { line: 1, column: 1 };

  if (length === 0) {
    return {
      type: "GitignoreFile",
      range: [0, 0],
      loc: { start: zeroPosition, end: zeroPosition },
      body: [],
    };
  }

  const newlineOffsets: number[] = [];
  for (let i = 0; i < length; i += 1) {
    if (text.charCodeAt(i) === 10) {
      newlineOffsets.push(i);
    }
  }

  const body: Array<Pattern | Comment | BlankLine> = [];
  let pos = 0;

  for (const newlineOffset of newlineOffsets) {
    pushLine(body, text, pos, newlineOffset, newlineOffsets);
    pos = newlineOffset + 1;
  }

  if (pos < length) {
    pushLine(body, text, pos, length, newlineOffsets);
  }

  return {
    type: "GitignoreFile",
    range: [0, length],
    loc: { start: zeroPosition, end: offsetToLoc(newlineOffsets, length) },
    body,
  };
}

export type {
  BlankLine,
  Comment,
  GitignoreFile,
  Pattern,
  Position,
  SourceLocation,
};
