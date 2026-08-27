import { analyze, subsumes } from "#algebra/index.js";
import type { Analysis } from "#algebra/index.js";
import type { GitignoreFile, Pattern } from "#parser/index.js";
import type { GitignoreRuleDefinition } from "./types.js";
import { endOfLineIncludingTerminator } from "./utils.js";

type MessageIds = "redundant";

interface PatternEntry {
  node: Pattern;
  bodyIndex: number;
  analysis: Analysis;
}

const rule: GitignoreRuleDefinition<[], MessageIds> = {
  meta: {
    type: "problem",
    fixable: "code",
    schema: [],
    docs: {
      description: "disallow patterns already covered by another pattern",
      url: "https://github.com/erdembircan/eslint-plugin-dotignore/blob/main/docs/rules/no-redundant-pattern.md",
      recommended: true,
    },
    messages: {
      redundant: "Already covered by '{{covering}}' on line {{line}}.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      GitignoreFile(fileNode: GitignoreFile) {
        const body = fileNode.body;
        const textLength = sourceCode.text.length;

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

        // A pattern already reported redundant (in either direction) is
        // removed by its own fix, so it's skipped as a candidate on either
        // side of any later comparison -- both to avoid a double report on
        // the same line and because comparing against a pattern that's
        // about to disappear is moot.
        const reported = new Set<number>();

        function reportRedundant(
          redundant: PatternEntry,
          covering: PatternEntry,
        ): void {
          const deleteStart = redundant.node.range[0];
          const deleteEnd = endOfLineIncludingTerminator(
            body,
            redundant.bodyIndex,
            textLength,
          );

          context.report({
            node: redundant.node,
            messageId: "redundant",
            data: {
              covering: covering.analysis.effective,
              line: covering.node.loc.start.line,
            },
            fix(fixer) {
              return fixer.removeRange([deleteStart, deleteEnd]);
            },
          });
          reported.add(redundant.bodyIndex);
        }

        // Positive (non-negated) patterns are pure set-union: a pattern
        // whose matches are entirely covered by another positive pattern
        // contributes nothing regardless of which one comes first in the
        // file -- ignoring redundantly is idempotent. The only thing that
        // can make a covered pattern load-bearing is a negation sitting
        // between the pair, and only in one specific direction:
        //
        // - later covered by earlier ("i, [!n], j" with i covering j): a
        //   negation n strictly between them CAN matter. Removing j flips
        //   paths in j ∩ n back to included, since n's re-inclusion only
        //   applied while j's exclusion was still pending in last-match-
        //   wins order. (A negation placed after j is harmless to j's
        //   removal either way.) This direction keeps its existing bail.
        //
        // - earlier covered by later ("i, [n], j" with j covering i): safe
        //   to remove i even with a negation n between them. With i
        //   present, the order is i, n, j; j is last and j ⊇ i, so every
        //   path i matches is ultimately (re-)ignored by j regardless of
        //   n. Without i, the order is just n, j; j still comes last and
        //   still ignores those same paths. Both orders produce identical
        //   outcomes, so removing i never changes what's ignored -- no
        //   bail needed for this direction.
        for (let laterIdx = 1; laterIdx < entries.length; laterIdx += 1) {
          const later = entries[laterIdx]!;
          if (later.node.negated) {
            continue;
          }

          for (let earlierIdx = 0; earlierIdx < laterIdx; earlierIdx += 1) {
            const earlier = entries[earlierIdx]!;
            if (earlier.node.negated || reported.has(earlier.bodyIndex)) {
              continue;
            }

            // no-duplicate-pattern already reports exact duplicates and
            // equivalents (same normalized form) -- don't double-report.
            if (earlier.analysis.normalized === later.analysis.normalized) {
              continue;
            }

            let earlierCoversLater: boolean;
            try {
              earlierCoversLater = subsumes(earlier.analysis, later.analysis);
            } catch {
              // Pathological pattern (e.g. a character class expansion past
              // the cap) -- skip this direction silently rather than crash
              // the lint run.
              earlierCoversLater = false;
            }

            if (earlierCoversLater) {
              let blocked = false;
              for (let k = earlierIdx + 1; k < laterIdx; k += 1) {
                if (entries[k]!.node.negated) {
                  blocked = true;
                  break;
                }
              }
              if (!blocked) {
                reportRedundant(later, earlier);
                break; // later is fully explained; stop scanning for it
              }
            }

            let laterCoversEarlier: boolean;
            try {
              laterCoversEarlier = subsumes(later.analysis, earlier.analysis);
            } catch {
              laterCoversEarlier = false;
            }

            if (laterCoversEarlier) {
              reportRedundant(earlier, later);
              // earlier is resolved, but later may still be independently
              // covered by some other, closer earlier pattern -- keep
              // scanning for later's own redundancy.
            }
          }
        }
      },
    };
  },
};

export default rule;
