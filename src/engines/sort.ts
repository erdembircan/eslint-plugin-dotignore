import { analyze } from "#algebra/index.js";
import type { Pattern } from "#parser/index.js";

export interface SortOptions {
  direction: "asc" | "desc";
  caseSensitive: boolean;
  natural: boolean;
}

function isDigitChar(char: string): boolean {
  return char >= "0" && char <= "9";
}

/** Splits `text` into a sequence of maximal digit-only / non-digit-only
 * chunks, in order (e.g. "v2-final10" -> ["v", "2", "-final", "10"]). */
function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const start = i;
    const chunkIsDigit = isDigitChar(text.charAt(i));
    while (i < text.length && isDigitChar(text.charAt(i)) === chunkIsDigit) {
      i += 1;
    }
    chunks.push(text.slice(start, i));
  }
  return chunks;
}

/** Compares two strings strictly by Unicode code point (never by UTF-16
 * code unit, and never via `localeCompare`), ascending. */
function compareCodePoints(a: string, b: string): number {
  const aChars = Array.from(a);
  const bChars = Array.from(b);
  const len = Math.min(aChars.length, bChars.length);
  for (let i = 0; i < len; i += 1) {
    const aCode = aChars[i]!.codePointAt(0)!;
    const bCode = bChars[i]!.codePointAt(0)!;
    if (aCode !== bCode) {
      return aCode - bCode;
    }
  }
  return aChars.length - bChars.length;
}

/** Compares two digit-only chunks as integers. Equal numeric value with
 * different numbers of leading zeros ties-break shorter-first. */
function compareNumericChunks(a: string, b: string): number {
  const aTrimmed = a.replace(/^0+(?=\d)/, "");
  const bTrimmed = b.replace(/^0+(?=\d)/, "");
  if (aTrimmed.length !== bTrimmed.length) {
    return aTrimmed.length - bTrimmed.length;
  }
  if (aTrimmed !== bTrimmed) {
    return aTrimmed < bTrimmed ? -1 : 1;
  }
  return a.length - b.length;
}

/** Compares two same-position chunks. If both are digit runs, compares them
 * numerically; otherwise (including a digit-vs-non-digit mismatch, which
 * can occur when comparing chunks from two differently-shaped strings)
 * falls back to a plain code-point compare of the chunk text. */
function compareChunk(a: string, b: string): number {
  if (isDigitChar(a.charAt(0)) && isDigitChar(b.charAt(0))) {
    return compareNumericChunks(a, b);
  }
  return compareCodePoints(a, b);
}

function compareNatural(a: string, b: string): number {
  const aChunks = splitIntoChunks(a);
  const bChunks = splitIntoChunks(b);
  const len = Math.min(aChunks.length, bChunks.length);
  for (let i = 0; i < len; i += 1) {
    const cmp = compareChunk(aChunks[i]!, bChunks[i]!);
    if (cmp !== 0) {
      return cmp;
    }
  }
  return aChunks.length - bChunks.length;
}

/**
 * Compares two patterns' effective text per {@link SortOptions}. Never uses
 * `localeCompare` — everything is code-point based, for full determinism
 * across platforms and locales.
 */
export function compareEffectiveText(
  a: string,
  b: string,
  options: SortOptions,
): number {
  const aKey = options.caseSensitive ? a : a.toLowerCase();
  const bKey = options.caseSensitive ? b : b.toLowerCase();
  const primary = options.natural
    ? compareNatural(aKey, bKey)
    : compareCodePoints(aKey, bKey);
  const directed = options.direction === "desc" ? -primary : primary;
  if (directed !== 0) {
    return directed;
  }
  // Deterministic tie-break: always ascending, always case-sensitive,
  // regardless of `direction` or `caseSensitive`.
  return compareCodePoints(a, b);
}

/**
 * Sorts one block (a contiguous run of Pattern nodes with no Comment or
 * BlankLine between them, as computed by the caller from the AST body).
 *
 * Negated patterns are immovable barriers: only the maximal runs of
 * non-negated patterns between barriers (and before the first / after the
 * last barrier) are reordered among themselves. Barriers never move.
 *
 * @returns `null` if the block is already in sorted order (nothing to
 * change), otherwise the full block's node array in its new order (same
 * length and same set of nodes as `patterns`, only reordered).
 */
export function sortBlock(
  patterns: readonly Pattern[],
  options: SortOptions,
): Pattern[] | null {
  const result: Pattern[] = [...patterns];
  let changed = false;
  let runStart = 0;

  for (let i = 0; i <= patterns.length; i += 1) {
    const atBarrier = i === patterns.length || patterns[i]!.negated;
    if (!atBarrier) {
      continue;
    }

    const runEnd = i;
    if (runEnd - runStart > 1) {
      const run = result.slice(runStart, runEnd);
      const sorted = sortRun(run, options);
      for (let k = 0; k < sorted.length; k += 1) {
        if (result[runStart + k] !== sorted[k]) {
          changed = true;
        }
        result[runStart + k] = sorted[k]!;
      }
    }

    runStart = i + 1;
  }

  return changed ? result : null;
}

/** Splits a block into its maximal runs of non-negated patterns, dropping
 * the negated barriers between them entirely (each returned run is itself
 * already in barrier-free, contiguous block order). */
export function splitIntoRuns(patterns: readonly Pattern[]): Pattern[][] {
  const runs: Pattern[][] = [];
  let current: Pattern[] = [];

  for (const pattern of patterns) {
    if (pattern.negated) {
      if (current.length > 0) {
        runs.push(current);
      }
      current = [];
    } else {
      current.push(pattern);
    }
  }
  if (current.length > 0) {
    runs.push(current);
  }

  return runs;
}

/** Sorts one run (already free of negated barriers) per `options`. */
export function sortRun(
  run: readonly Pattern[],
  options: SortOptions,
): Pattern[] {
  return [...run].sort((a, b) =>
    compareEffectiveText(
      analyze(a.pattern).effective,
      analyze(b.pattern).effective,
      options,
    ),
  );
}
