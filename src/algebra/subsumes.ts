import type {
  Analysis,
  ClassMember,
  Segment,
  Token,
  TokenClass,
  TokenLit,
  TokenQuestion,
} from "./types.js";

/** The 1024-character cap on positive-class expansion. Real gitignore character
 * classes are tiny; exceeding this almost certainly indicates a pathological or
 * machine-generated pattern, so we refuse to guess and surface a clear error
 * instead of silently truncating (which could make `subsumes` unsound). */
const MAX_CLASS_EXPANSION = 1024;

type NonStarToken = TokenLit | TokenQuestion | TokenClass;

function isMemberUnionEmpty(members: readonly ClassMember[]): boolean {
  for (const member of members) {
    if (member.kind === "char") {
      return false;
    }
    if (member.from.charCodeAt(0) <= member.to.charCodeAt(0)) {
      return false;
    }
  }
  return true;
}

function isCharInMemberUnion(
  members: readonly ClassMember[],
  char: string,
): boolean {
  const code = char.charCodeAt(0);
  for (const member of members) {
    if (member.kind === "char") {
      if (member.char === char) {
        return true;
      }
      continue;
    }
    const fromCode = member.from.charCodeAt(0);
    const toCode = member.to.charCodeAt(0);
    if (fromCode > toCode) {
      continue;
    }
    if (code >= fromCode && code <= toCode) {
      return true;
    }
  }
  return false;
}

function expandMemberUnion(members: readonly ClassMember[]): string[] {
  const result: string[] = [];
  for (const member of members) {
    if (member.kind === "char") {
      result.push(member.char);
    } else {
      const fromCode = member.from.charCodeAt(0);
      const toCode = member.to.charCodeAt(0);
      if (fromCode > toCode) {
        continue;
      }
      for (let code = fromCode; code <= toCode; code += 1) {
        result.push(String.fromCharCode(code));
      }
    }
    if (result.length > MAX_CLASS_EXPANSION) {
      throw new Error(
        "eslint-plugin-dotignore: character class expansion exceeds 1024 characters; refusing to guess",
      );
    }
  }
  return result;
}

/** `a` here is never a question token: `covers` (the only caller) already
 * returns early when `a.kind === "question"`, so by the time it calls this,
 * TypeScript has narrowed `a` to exclude that case. */
function isCharCoveredByToken(
  token: TokenLit | TokenClass,
  char: string,
): boolean {
  if (token.kind === "lit") {
    return token.char === char;
  }
  const inUnion = isCharInMemberUnion(token.members, char);
  return token.negated ? !inUnion : inUnion;
}

/**
 * Does non-star token `a`'s character set (over the universe of all chars except
 * '/') cover (i.e. is a superset of) non-star token `b`'s character set?
 */
function covers(a: NonStarToken, b: NonStarToken): boolean {
  if (a.kind === "question") {
    return true;
  }
  if (b.kind === "question") {
    return a.kind === "class" && a.negated && isMemberUnionEmpty(a.members);
  }
  if (b.kind === "lit") {
    return isCharCoveredByToken(a, b.char);
  }
  // b.kind === "class"
  if (!b.negated) {
    const bChars = expandMemberUnion(b.members);
    return bChars.every((char) => isCharCoveredByToken(a, char));
  }
  // b is a negated class: a must be a negated class whose member union is a
  // subset of b's member union (complement inclusion flips direction).
  if (a.kind !== "class" || !a.negated) {
    return false;
  }
  const aUnion = expandMemberUnion(a.members);
  const bUnion = new Set(expandMemberUnion(b.members));
  return aUnion.every((char) => bUnion.has(char));
}

/** Segment-level token containment: does every string token-sequence `y` can
 * match also get matched by `x`? Implements the T(p, q) DP from the spec,
 * memoized. */
function segCovers(x: readonly Token[], y: readonly Token[]): boolean {
  const memo = new Map<string, boolean>();

  function computeT(p: number, q: number): boolean {
    if (p === x.length) {
      return q === y.length;
    }
    const xToken = x[p]!;
    if (xToken.kind === "star") {
      return T(p + 1, q) || (q < y.length && T(p, q + 1));
    }
    if (q === y.length) {
      return false;
    }
    const yToken = y[q]!;
    if (yToken.kind === "star") {
      return false;
    }
    return covers(xToken, yToken) && T(p + 1, q + 1);
  }

  function T(p: number, q: number): boolean {
    const key = `${p},${q}`;
    const cached = memo.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const result = computeT(p, q);
    memo.set(key, result);
    return result;
  }

  return T(0, 0);
}

const GLOBSTAR_SEGMENT: Segment = { kind: "globstar" };

/**
 * True iff every path Git would ignore due to pattern `b` is also ignored due to
 * pattern `a`. Polarity/negation of the original gitignore lines is the caller's
 * concern — both `a` and `b` are plain (non-negated) pattern analyses.
 */
export function subsumes(a: Analysis, b: Analysis): boolean {
  const segmentsA: Segment[] = a.anchored
    ? a.segments
    : [GLOBSTAR_SEGMENT, ...a.segments];
  const segmentsB: Segment[] = b.anchored
    ? b.segments
    : [GLOBSTAR_SEGMENT, ...b.segments];

  const memo = new Map<string, boolean>();

  function computeSUB(i: number, j: number): boolean {
    if (j === segmentsB.length) {
      if (i === segmentsA.length) {
        return !a.dirOnly || b.dirOnly;
      }
      return false;
    }
    if (i === segmentsA.length) {
      return true;
    }
    const segA = segmentsA[i]!;
    if (segA.kind === "globstar") {
      return SUB(i + 1, j) || SUB(i, j + 1);
    }
    const segB = segmentsB[j]!;
    if (segB.kind === "globstar") {
      return false;
    }
    return segCovers(segA.tokens, segB.tokens) && SUB(i + 1, j + 1);
  }

  function SUB(i: number, j: number): boolean {
    const key = `${i},${j}`;
    const cached = memo.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const result = computeSUB(i, j);
    memo.set(key, result);
    return result;
  }

  return SUB(0, 0);
}
