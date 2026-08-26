import type {
  Analysis,
  AnalyzeOptions,
  ClassMember,
  Issue,
  Segment,
  Token,
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

function countTrailingBackslashRun(text: string): number {
  let count = 0;
  let i = text.length - 1;
  while (i >= 0 && text.charAt(i) === "\\") {
    count += 1;
    i -= 1;
  }
  return count;
}

function computeAnchored(effective: string): boolean {
  for (let i = 0; i < effective.length - 1; i += 1) {
    if (effective.charAt(i) === "/" && !isEscapedAt(effective, i)) {
      return true;
    }
  }
  return false;
}

function computeDirOnly(effective: string): boolean {
  const lastIndex = effective.length - 1;
  if (lastIndex < 0 || effective.charAt(lastIndex) !== "/") {
    return false;
  }
  return !isEscapedAt(effective, lastIndex);
}

/** A single character unit read from `text` at `i`: either a plain char, or the
 * char following a backslash escape (or a lone literal backslash if the escape is
 * dangling at the very end of `text`). */
function readCharUnit(
  text: string,
  i: number,
  issues: Issue[],
): { char: string; nextIndex: number } {
  const ch = text.charAt(i);
  if (ch !== "\\") {
    return { char: ch, nextIndex: i + 1 };
  }
  if (i + 1 >= text.length) {
    return { char: "\\", nextIndex: i + 1 };
  }
  const escaped = text.charAt(i + 1);
  if (/[A-Za-z0-9]/.test(escaped)) {
    issues.push({ kind: "backslash-path", index: i, length: 2 });
  }
  return { char: escaped, nextIndex: i + 2 };
}

function literalFallback(
  text: string,
  openIndex: number,
): { tokens: Token[]; nextIndex: number } {
  let end = openIndex;
  while (
    end < text.length &&
    !(text.charAt(end) === "/" && !isEscapedAt(text, end))
  ) {
    end += 1;
  }
  const tokens: Token[] = [];
  for (let k = openIndex; k < end; k += 1) {
    tokens.push({ kind: "lit", char: text.charAt(k) });
  }
  return { tokens, nextIndex: end };
}

function tokenizeClass(
  text: string,
  openIndex: number,
  issues: Issue[],
): { tokens: Token[]; nextIndex: number } {
  let i = openIndex + 1;
  let negated = false;
  if (i < text.length && (text.charAt(i) === "!" || text.charAt(i) === "^")) {
    negated = true;
    i += 1;
  }

  if (
    !negated &&
    text.length === openIndex + 2 &&
    text.charAt(openIndex + 1) === "]"
  ) {
    const fallback = literalFallback(text, openIndex);
    issues.push({
      kind: "empty-class",
      index: openIndex,
      length: fallback.nextIndex - openIndex,
    });
    return fallback;
  }

  const members: ClassMember[] = [];

  if (i < text.length && text.charAt(i) === "]") {
    members.push({ kind: "char", char: "]" });
    i += 1;
  }

  for (;;) {
    if (i >= text.length) {
      const fallback = literalFallback(text, openIndex);
      issues.push({
        kind: "unclosed-class",
        index: openIndex,
        length: fallback.nextIndex - openIndex,
      });
      return fallback;
    }
    if (text.charAt(i) === "]") {
      i += 1;
      break;
    }

    const startPos = i;
    const startUnit = readCharUnit(text, i, issues);
    i = startUnit.nextIndex;

    if (
      i < text.length &&
      text.charAt(i) === "-" &&
      i + 1 < text.length &&
      text.charAt(i + 1) !== "]"
    ) {
      const endUnit = readCharUnit(text, i + 1, issues);
      i = endUnit.nextIndex;
      members.push({ kind: "range", from: startUnit.char, to: endUnit.char });
      if (endUnit.char.charCodeAt(0) < startUnit.char.charCodeAt(0)) {
        issues.push({
          kind: "reversed-range",
          index: startPos,
          length: i - startPos,
        });
      }
    } else {
      members.push({ kind: "char", char: startUnit.char });
    }
  }

  return { tokens: [{ kind: "class", negated, members }], nextIndex: i };
}

function buildSegments(text: string, issues: Issue[]): Segment[] {
  const segments: Segment[] = [];
  let segStart = 0;
  let tokens: Token[] = [];

  const finishSegment = (end: number): void => {
    const segText = text.slice(segStart, end);
    segments.push(
      segText === "**" ? { kind: "globstar" } : { kind: "tokens", tokens },
    );
    tokens = [];
    segStart = end + 1;
  };

  let i = 0;
  while (i < text.length) {
    const ch = text.charAt(i);

    if (ch === "/" && !isEscapedAt(text, i)) {
      finishSegment(i);
      i += 1;
      continue;
    }

    if (ch === "\\") {
      const unit = readCharUnit(text, i, issues);
      tokens.push({ kind: "lit", char: unit.char });
      i = unit.nextIndex;
      continue;
    }

    if (ch === "*") {
      let runEnd = i;
      while (runEnd < text.length && text.charAt(runEnd) === "*") {
        runEnd += 1;
      }
      const runLength = runEnd - i;
      const formsWholeSegment =
        runLength === 2 &&
        i === segStart &&
        (runEnd === text.length ||
          (text.charAt(runEnd) === "/" && !isEscapedAt(text, runEnd)));
      if (runLength >= 2 && !formsWholeSegment) {
        issues.push({
          kind: "misplaced-globstar",
          index: i,
          length: runLength,
        });
      }
      tokens.push({ kind: "star" });
      i = runEnd;
      continue;
    }

    if (ch === "?") {
      tokens.push({ kind: "question" });
      i += 1;
      continue;
    }

    if (ch === "[") {
      const result = tokenizeClass(text, i, issues);
      tokens.push(...result.tokens);
      i = result.nextIndex;
      continue;
    }

    tokens.push({ kind: "lit", char: ch });
    i += 1;
  }

  finishSegment(text.length);
  return segments;
}

function findEmptySegmentIssues(effective: string): Issue[] {
  const issues: Issue[] = [];
  for (let i = 0; i < effective.length - 1; i += 1) {
    if (
      effective.charAt(i) === "/" &&
      !isEscapedAt(effective, i) &&
      effective.charAt(i + 1) === "/" &&
      !isEscapedAt(effective, i + 1)
    ) {
      issues.push({ kind: "empty-segment", index: i, length: 2 });
    }
  }
  return issues;
}

function splitUnescapedSlashes(text: string): string[] {
  const result: string[] = [];
  let segStart = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text.charAt(i) === "/" && !isEscapedAt(text, i)) {
      result.push(text.slice(segStart, i));
      segStart = i + 1;
    }
  }
  result.push(text.slice(segStart));
  return result;
}

function collapseMisplacedGlobstarsInSegment(segText: string): string {
  let result = "";
  let i = 0;
  while (i < segText.length) {
    const ch = segText.charAt(i);
    if (ch === "\\" && i + 1 < segText.length) {
      result += segText.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (ch === "*") {
      let runEnd = i;
      while (runEnd < segText.length && segText.charAt(runEnd) === "*") {
        runEnd += 1;
      }
      result += "*";
      i = runEnd;
      continue;
    }
    result += ch;
    i += 1;
  }
  return result;
}

function rewriteMisplacedGlobstars(text: string): string {
  const segments = splitUnescapedSlashes(text);
  const rewritten = segments.map((segment) =>
    segment === "**" ? segment : collapseMisplacedGlobstarsInSegment(segment),
  );
  return rewritten.join("/");
}

function applyNormalizeRule1(text: string): string {
  if (text.charAt(0) !== "/") {
    return text;
  }
  for (let i = 1; i < text.length - 1; i += 1) {
    if (text.charAt(i) === "/" && !isEscapedAt(text, i)) {
      return text.slice(1);
    }
  }
  return text;
}

function applyNormalizeRule2(text: string): string {
  if (!text.startsWith("**/")) {
    return text;
  }
  const remainder = text.slice(3);
  for (let i = 0; i < remainder.length - 1; i += 1) {
    if (remainder.charAt(i) === "/" && !isEscapedAt(remainder, i)) {
      return text;
    }
  }
  return remainder;
}

function computeNormalized(effective: string): string {
  let current = effective;
  for (;;) {
    let next = applyNormalizeRule1(current);
    next = applyNormalizeRule2(next);
    next = rewriteMisplacedGlobstars(next);
    if (next === current) {
      return next;
    }
    current = next;
  }
}

function compareIssuesByIndex(a: Issue, b: Issue): number {
  return a.index - b.index;
}

/**
 * Analyzes a single gitignore pattern's text — the parser's `Pattern.pattern`,
 * i.e. with any leading negation '!' already stripped, escapes intact, and
 * trailing whitespace intact.
 */
export function analyze(
  patternText: string,
  options: AnalyzeOptions = {},
): Analysis {
  const negated = options.negated === true;
  const effective = stripTrailingUnescapedWhitespace(patternText);
  const issues: Issue[] = [];

  if (countTrailingBackslashRun(effective) % 2 === 1) {
    issues.push({
      kind: "trailing-backslash",
      index: effective.length - 1,
      length: 1,
    });
  }

  if (negated && effective === "") {
    issues.push({
      kind: "bare-negation",
      index: 0,
      length: patternText.length,
    });
  }

  if (effective === "/") {
    issues.push({ kind: "bare-slash", index: 0, length: patternText.length });
  }

  issues.push(...findEmptySegmentIssues(effective));

  const anchored = computeAnchored(effective);
  const dirOnly = computeDirOnly(effective);
  const withoutTrailingSlash = dirOnly
    ? effective.slice(0, effective.length - 1)
    : effective;
  // A leading unescaped '/' is a pure anchoring marker, not a path segment of its
  // own: `anchored` already records this. Without stripping it, an anchored
  // pattern like "/foo" would split into a spurious empty leading segment
  // (["", "foo"]) instead of (["foo"]), which desyncs it from an equivalent
  // unanchored pattern's virtual-globstar-prepended segments in `subsumes`.
  const forSegments = withoutTrailingSlash.startsWith("/")
    ? withoutTrailingSlash.slice(1)
    : withoutTrailingSlash;
  const segments = buildSegments(forSegments, issues);
  const normalized = computeNormalized(effective);

  issues.sort(compareIssuesByIndex);

  return { effective, anchored, dirOnly, segments, issues, normalized };
}
