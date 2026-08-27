import type { Issue } from "#algebra/index.js";
import type {
  GitignoreNode,
  GitignoreSourceCode,
} from "#language/source-code.js";
import type { Pattern, SourceLocation } from "#parser/index.js";

/**
 * Converts an `analyze()` issue's `index`/`length` (relative to `Pattern.pattern`,
 * i.e. with any leading '!' already stripped) into an absolute `[start, end)`
 * range within the source text, accounting for that stripped '!' when present.
 */
export function patternIssueRange(
  node: Pattern,
  issue: Pick<Issue, "index" | "length">,
): [number, number] {
  const offset = node.negated ? 1 : 0;
  const start = node.range[0] + offset + issue.index;
  return [start, start + issue.length];
}

/** Builds a `SourceLocation` for an absolute `[start, end)` range using the
 * source code's own index-to-location conversion. */
export function locFromRange(
  sourceCode: GitignoreSourceCode,
  range: readonly [number, number],
): SourceLocation {
  return {
    start: sourceCode.getLocFromIndex(range[0]),
    end: sourceCode.getLocFromIndex(range[1]),
  };
}

/**
 * Given the full `GitignoreFile.body` and the index of a node within it,
 * returns the absolute offset marking the end of that node's line, including
 * its line terminator: the start of the next body node, or the end of the
 * source text if there is none. Used to build fixes that remove one or more
 * whole lines cleanly.
 */
export function endOfLineIncludingTerminator(
  body: readonly GitignoreNode[],
  index: number,
  textLength: number,
): number {
  const next = body[index + 1];
  return next ? next.range[0] : textLength;
}

/**
 * Determines which line terminator a fixer should emit when it generates new
 * line-joining text (a reordered run, a moved cluster, an inserted heading),
 * so a fix on a CRLF (or mixed-EOL) file doesn't quietly rewrite the touched
 * region to LF.
 *
 * Resolution order:
 * 1. The terminator ending `referenceNode`'s own line, if it has one (i.e.
 *    the line immediately adjacent to the edit) -- this is what makes a fix
 *    follow local convention in a mixed-EOL file rather than a global one.
 * 2. Otherwise, the file's first line terminator, if any exist at all.
 * 3. Otherwise (no terminators anywhere in the file), `"\n"`.
 */
export function detectLineTerminator(
  sourceCode: GitignoreSourceCode,
  referenceNode?: { range: readonly [number, number] },
): "\r\n" | "\n" {
  const text = sourceCode.text;

  // Node ranges exclude their trailing terminator entirely (a "\r" right
  // before a "\n" is stripped from `raw` by the parser), so the terminator
  // itself always starts exactly at a node's `range[1]` when one follows.
  function terminatorStartingAt(index: number): "\r\n" | "\n" | undefined {
    if (text.charAt(index) === "\r" && text.charAt(index + 1) === "\n") {
      return "\r\n";
    }
    if (text.charAt(index) === "\n") {
      return "\n";
    }
    return undefined;
  }

  if (referenceNode) {
    const found = terminatorStartingAt(referenceNode.range[1]);
    if (found) {
      return found;
    }
  }

  const firstNewline = text.indexOf("\n");
  if (firstNewline !== -1) {
    return text.charAt(firstNewline - 1) === "\r" ? "\r\n" : "\n";
  }

  return "\n";
}
