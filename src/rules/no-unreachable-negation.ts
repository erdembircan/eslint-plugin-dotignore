import { analyze, subsumes } from "../algebra/index.js";
import type { Analysis } from "../algebra/index.js";
import type { GitignoreFile, Pattern } from "../parser/index.js";
import type { GitignoreRuleDefinition } from "./types.js";

type MessageIds = "unreachable" | "excludeContents";

interface PatternEntry {
  node: Pattern;
  bodyIndex: number;
  analysis: Analysis;
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

/** Index of the last unescaped '/' in `text`, or -1 if there is none. */
function lastUnescapedSlashIndex(text: string): number {
  for (let i = text.length - 1; i >= 0; i -= 1) {
    if (
      text.charAt(i) === "/" &&
      countPrecedingBackslashes(text, i) % 2 === 0
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * Builds the pattern text for `n`'s parent directory: `n`'s effective text
 * with its final path segment removed, always dirOnly (trailing '/').
 * Anchoring (a leading '/') is preserved automatically, since it's just
 * whatever precedes the removed final segment.
 *
 * When `n` has no literal '/' in its own text (e.g. a bare "foo"), its
 * "effective" segment list is still >= 2 long once the unanchored virtual
 * globstar is accounted for (see `qualifiesForParentCheck`) -- foo's parent
 * is then "any directory, anywhere", which is exactly what the literal
 * pattern "**\/" denotes.
 */
function parentPatternText(effectiveText: string): string {
  const slashIndex = lastUnescapedSlashIndex(effectiveText);
  if (slashIndex === -1) {
    return "**/";
  }
  return effectiveText.slice(0, slashIndex + 1);
}

/**
 * Does `n`'s segment list, after the same "prepend a virtual globstar when
 * unanchored" preprocessing `subsumes` applies, have at least 2 segments
 * with a non-globstar final segment? Only then does "n's parent directory"
 * denote something meaningful to check.
 */
function qualifiesForParentCheck(analysis: Analysis): boolean {
  const segments = analysis.segments;
  const lastSegment = segments[segments.length - 1];
  if (!lastSegment || lastSegment.kind === "globstar") {
    return false;
  }
  const effectiveLength = analysis.anchored
    ? segments.length
    : segments.length + 1;
  return effectiveLength >= 2;
}

function buildReplacement(effectiveText: string): string {
  return effectiveText.endsWith("/")
    ? `${effectiveText}*`
    : `${effectiveText}/*`;
}

const rule: GitignoreRuleDefinition<[], MessageIds> = {
  meta: {
    type: "problem",
    hasSuggestions: true,
    schema: [],
    docs: {
      description: "disallow negations that Git can never apply",
      url: "https://github.com/erdembircan/eslint-plugin-dotignore/blob/main/docs/rules/no-unreachable-negation.md",
      recommended: true,
    },
    messages: {
      unreachable:
        "Unreachable negation — '{{parent}}' excludes the whole directory, so Git never re-checks files inside it.",
      excludeContents:
        "Exclude the directory's contents with '{{replacement}}' so negations can apply.",
    },
  },
  create(context) {
    return {
      GitignoreFile(fileNode: GitignoreFile) {
        const body = fileNode.body;

        const entries: PatternEntry[] = [];
        body.forEach((node, bodyIndex) => {
          if (node.type === "Pattern") {
            entries.push({
              node,
              bodyIndex,
              analysis: analyze(node.pattern, { negated: node.negated }),
            });
          }
        });

        for (let laterIdx = 0; laterIdx < entries.length; laterIdx += 1) {
          const later = entries[laterIdx]!;
          if (!later.node.negated || !qualifiesForParentCheck(later.analysis)) {
            continue;
          }

          // analyze() never throws (unlike subsumes(), guarded below), so
          // no try/catch is needed around this call.
          const parentAnalysis = analyze(
            parentPatternText(later.analysis.effective),
          );

          for (let earlierIdx = 0; earlierIdx < laterIdx; earlierIdx += 1) {
            const earlier = entries[earlierIdx]!;
            if (earlier.node.negated) {
              continue;
            }

            let isCovered: boolean;
            try {
              isCovered = subsumes(earlier.analysis, parentAnalysis);
            } catch {
              continue;
            }
            if (!isCovered) {
              continue;
            }

            let blocked = false;
            for (let k = earlierIdx + 1; k < laterIdx; k += 1) {
              if (entries[k]!.node.negated) {
                blocked = true;
                break;
              }
            }
            if (blocked) {
              continue;
            }

            const replacement = buildReplacement(earlier.analysis.effective);

            context.report({
              node: later.node,
              messageId: "unreachable",
              data: { parent: earlier.analysis.effective },
              suggest: [
                {
                  messageId: "excludeContents",
                  data: { replacement },
                  fix(fixer) {
                    return fixer.replaceText(earlier.node, replacement);
                  },
                },
              ],
            });
            break;
          }
        }
      },
    };
  },
};

export default rule;
