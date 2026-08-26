/**
 * The kind of a diagnostic finding surfaced by {@link analyze}. See the doc comment
 * on {@link Issue} for what each kind means.
 */
export type IssueKind =
  | "trailing-backslash"
  | "bare-negation"
  | "bare-slash"
  | "empty-segment"
  | "unclosed-class"
  | "empty-class"
  | "reversed-range"
  | "misplaced-globstar"
  | "backslash-path";

/**
 * A single diagnostic finding about a pattern. `index`/`length` describe the exact
 * span of the finding relative to the `patternText` passed to `analyze`.
 */
export interface Issue {
  kind: IssueKind;
  index: number;
  length: number;
}

export interface ClassMemberChar {
  kind: "char";
  char: string;
}

export interface ClassMemberRange {
  kind: "range";
  from: string;
  to: string;
}

export type ClassMember = ClassMemberChar | ClassMemberRange;

export interface TokenLit {
  kind: "lit";
  char: string;
}

export interface TokenStar {
  kind: "star";
}

export interface TokenQuestion {
  kind: "question";
}

export interface TokenClass {
  kind: "class";
  negated: boolean;
  members: ClassMember[];
}

export type Token = TokenLit | TokenStar | TokenQuestion | TokenClass;

export interface SegmentGlobstar {
  kind: "globstar";
}

export interface SegmentTokens {
  kind: "tokens";
  tokens: Token[];
}

export type Segment = SegmentGlobstar | SegmentTokens;

/**
 * Options accepted by {@link analyze}.
 */
export interface AnalyzeOptions {
  /** Whether the original line was negated (started with an unescaped '!'). */
  negated?: boolean;
}

/**
 * The result of analyzing a single gitignore pattern's text (the parser's
 * `Pattern.pattern`, i.e. with any leading '!' already stripped).
 */
export interface Analysis {
  /** `patternText` with unescaped trailing whitespace stripped. */
  effective: string;
  /** Whether `effective` contains an unescaped '/' at any non-final position. */
  anchored: boolean;
  /** Whether `effective` ends with an unescaped '/'. */
  dirOnly: boolean;
  /** `effective` (minus a trailing '/' when `dirOnly`) split into segments. */
  segments: Segment[];
  /** Diagnostic findings, ordered by their starting index. */
  issues: Issue[];
  /** The canonical form of `effective`, for duplicate/equivalence detection. */
  normalized: string;
}
