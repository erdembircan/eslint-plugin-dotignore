import { analyze, subsumes } from "../algebra/index.js";
import type { Analysis } from "../algebra/index.js";
import type { GitignoreFile, Pattern } from "../parser/index.js";
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
      description: "disallow patterns already covered by an earlier pattern",
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

        for (let laterIdx = 1; laterIdx < entries.length; laterIdx += 1) {
          const later = entries[laterIdx]!;
          if (later.node.negated) {
            continue;
          }

          for (let earlierIdx = 0; earlierIdx < laterIdx; earlierIdx += 1) {
            const earlier = entries[earlierIdx]!;
            if (earlier.node.negated) {
              continue;
            }

            // no-duplicate-pattern already reports exact duplicates and
            // equivalents (same normalized form) -- don't double-report.
            if (earlier.analysis.normalized === later.analysis.normalized) {
              continue;
            }

            let isCovered: boolean;
            try {
              isCovered = subsumes(earlier.analysis, later.analysis);
            } catch {
              // Pathological pattern (e.g. a character class expansion past
              // the cap) -- skip this pair silently rather than crash the
              // lint run.
              continue;
            }
            if (!isCovered) {
              continue;
            }

            // A negation strictly between the two occurrences can make the
            // later pattern load-bearing: given "i, !n, j", removing j
            // would flip paths in j ∩ n back to included, since !n's
            // re-inclusion only applied while j's exclusion was still
            // pending in the last-match-wins order. A negation placed
            // AFTER j is harmless to j's removal: last-match-wins means
            // that negation overrides j (and i) regardless of whether j is
            // present, so j contributes nothing there either way.
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

            const deleteStart = later.node.range[0];
            const deleteEnd = endOfLineIncludingTerminator(
              body,
              later.bodyIndex,
              textLength,
            );

            context.report({
              node: later.node,
              messageId: "redundant",
              data: {
                covering: earlier.analysis.effective,
                line: earlier.node.loc.start.line,
              },
              fix(fixer) {
                return fixer.removeRange([deleteStart, deleteEnd]);
              },
            });
            break;
          }
        }
      },
    };
  },
};

export default rule;
