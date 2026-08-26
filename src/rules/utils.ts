import type { Issue } from "../algebra/index.js";
import type {
  GitignoreNode,
  GitignoreSourceCode,
} from "../language/source-code.js";
import type { Pattern, SourceLocation } from "../parser/index.js";

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
