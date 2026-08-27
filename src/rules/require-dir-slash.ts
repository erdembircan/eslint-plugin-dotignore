import { dirname, join } from "node:path";
import { analyze, subsumes } from "#algebra/index.js";
import type {
  Analysis,
  Segment,
  SegmentTokens,
  Token,
  TokenLit,
} from "#algebra/index.js";
import type { Pattern } from "#parser/index.js";
import type { FsHost } from "./fs-host.js";
import type { GitignoreRuleDefinition } from "./types.js";

type MessageIds = "missingSlash";

/** Total directory-entry visits allowed across a single pattern's glob walk,
 * to keep this rule bounded on pathological patterns/trees. */
const MAX_WALK_ENTRIES = 512;

function isLitToken(token: Token): token is TokenLit {
  return token.kind === "lit";
}

function isTokenSegment(segment: Segment): segment is SegmentTokens {
  return segment.kind === "tokens";
}

function isLiteralSegment(segment: SegmentTokens): boolean {
  return segment.tokens.every(isLitToken);
}

function segmentLiteralText(segment: SegmentTokens): string {
  return segment.tokens.map((token) => (token as TokenLit).char).join("");
}

/** A minimal single-segment `Analysis` wrapping one pattern segment, used to
 * reuse `subsumes`'s token-matching semantics for a single path component
 * instead of re-implementing glob matching from scratch. `anchored: true`
 * on both sides of the comparison prevents `subsumes`'s own
 * unanchored-pattern preprocessing (prepending a virtual "**\/") from
 * kicking in, which would be wrong here — we want an exact, single-segment
 * comparison, not a multi-depth one. */
function singleSegmentAnalysis(segment: Segment): Analysis {
  return {
    effective: "",
    anchored: true,
    dirOnly: false,
    segments: [segment],
    issues: [],
    normalized: "",
  };
}

/** An `Analysis` representing a directory entry's literal name as an exact,
 * single-segment pattern (one lit token per character). */
function literalNameAnalysis(name: string): Analysis {
  const tokens: Token[] = [...name].map((char) => ({ kind: "lit", char }));
  return singleSegmentAnalysis({ kind: "tokens", tokens });
}

/** Does `segment`'s glob (star/question/class/lit tokens) match the literal
 * directory entry name `name`, case-sensitively? */
function segmentMatchesEntryName(segment: Segment, name: string): boolean {
  return subsumes(singleSegmentAnalysis(segment), literalNameAnalysis(name));
}

/**
 * Walks the tree starting at `baseDir`, matching one pattern segment per
 * directory level via `host.readdir` + token matching. Conservative like
 * the literal-pattern path above: always starts at `baseDir` regardless of
 * whether the original pattern is anchored — there's no deep, whole-tree
 * search for unanchored glob patterns either.
 * @returns true iff at least one path matched all segments and every match
 * is a directory (zero files, zero symlinks among the matches).
 */
function walkMatchesOnlyDirectories(
  host: FsHost,
  baseDir: string,
  segments: readonly SegmentTokens[],
): boolean {
  let candidates: string[] = [baseDir];
  let visited = 0;

  for (const segment of segments) {
    const next: string[] = [];

    for (const dir of candidates) {
      const entries = host.readdir(dir);
      if (!entries) {
        continue;
      }

      for (const entry of entries) {
        visited += 1;
        if (visited > MAX_WALK_ENTRIES) {
          return false;
        }
        if (segmentMatchesEntryName(segment, entry)) {
          next.push(join(dir, entry));
        }
      }
    }

    candidates = next;
    if (candidates.length === 0) {
      return false;
    }
  }

  return candidates.every((candidate) => host.kind(candidate) === "dir");
}

/**
 * Creates the require-dir-slash rule against the given filesystem host.
 * Split out from the registry rule so tests can pass an in-memory fake
 * instead of touching the real filesystem.
 */
export function createRequireDirSlashRule(
  host: FsHost,
): GitignoreRuleDefinition<[], MessageIds> {
  return {
    meta: {
      type: "suggestion",
      fixable: "code",
      schema: [],
      docs: {
        description:
          "require a trailing slash on patterns that match existing directories",
        url: "https://github.com/erdembircan/eslint-plugin-dotignore/blob/main/docs/rules/require-dir-slash.md",
        recommended: false,
      },
      messages: {
        missingSlash:
          "'{{pattern}}' matches an existing directory — add a trailing '/' to make that explicit.",
      },
    },
    create(context) {
      const filename = context.filename;
      if (!filename || filename === "<input>") {
        return {};
      }
      const baseDir = dirname(filename);

      return {
        Pattern(node: Pattern) {
          if (node.negated || node.dirOnly) {
            return;
          }

          const analysis = analyze(node.pattern, { negated: node.negated });
          const segments = analysis.segments;

          // Globstars are unbounded (could match an arbitrary subtree) --
          // out of scope for this conservative, bounded check.
          if (segments.some((segment) => segment.kind === "globstar")) {
            return;
          }
          const tokenSegments = segments.filter(isTokenSegment);

          let isDirectory: boolean;
          if (tokenSegments.every(isLiteralSegment)) {
            // Conservative: even for an unanchored pattern (which
            // notionally matches at any depth), only the single candidate
            // directly under the file's own directory is checked -- no
            // deep search across the whole tree.
            const candidate = join(
              baseDir,
              ...tokenSegments.map(segmentLiteralText),
            );
            isDirectory = host.kind(candidate) === "dir";
          } else {
            isDirectory = walkMatchesOnlyDirectories(
              host,
              baseDir,
              tokenSegments,
            );
          }

          if (!isDirectory) {
            return;
          }

          context.report({
            node,
            messageId: "missingSlash",
            data: { pattern: node.pattern },
            fix(fixer) {
              return fixer.insertTextAfter(node, "/");
            },
          });
        },
      };
    },
  };
}
