import { analyze } from "#algebra/index.js";
import type { Analysis } from "#algebra/index.js";
import type { GitignoreFile, Pattern } from "#parser/index.js";
import type { GitignoreRuleDefinition } from "./types.js";
import { endOfLineIncludingTerminator } from "./utils.js";

interface Options0 {
  includeEquivalents: boolean;
}
type Options = [Options0];
type MessageIds = "duplicate" | "equivalent";

interface PatternEntry {
  node: Pattern;
  bodyIndex: number;
  analysis: Analysis;
}

/** Is there a Pattern, strictly between the two given entries (by body
 * position), whose negated flag differs from `sharedNegated`? Such a pattern
 * could have flipped Git's last-match-wins outcome for this path between the
 * two occurrences, so removing the later one would not be safe. */
function hasOppositePolarityBetween(
  entries: readonly PatternEntry[],
  earlierIdx: number,
  laterIdx: number,
  sharedNegated: boolean,
): boolean {
  for (let k = earlierIdx + 1; k < laterIdx; k += 1) {
    // k < laterIdx <= entries.length guarantees this index is in bounds.
    const entry = entries[k]!;
    if (entry.node.negated !== sharedNegated) {
      return true;
    }
  }
  return false;
}

const rule: GitignoreRuleDefinition<Options, MessageIds> = {
  meta: {
    type: "problem",
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          includeEquivalents: {
            type: "boolean",
            description:
              "Whether spec-equivalent spellings of the same pattern (not just exact duplicates) should also be flagged.",
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ includeEquivalents: true }],
    docs: {
      description: "disallow duplicate and equivalent patterns",
      url: "https://github.com/erdembircan/eslint-plugin-dotignore/blob/main/docs/rules/no-duplicate-pattern.md",
      recommended: true,
    },
    messages: {
      duplicate: "Duplicate of '{{original}}' on line {{line}}.",
      equivalent: "Equivalent to '{{original}}' on line {{line}}.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const { includeEquivalents } = context.options[0];

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
          // laterIdx < entries.length guarantees this index is in bounds.
          const later = entries[laterIdx]!;

          for (
            let earlierIdx = laterIdx - 1;
            earlierIdx >= 0;
            earlierIdx -= 1
          ) {
            // earlierIdx >= 0 (and < laterIdx < entries.length) guarantees
            // this index is in bounds.
            const earlier = entries[earlierIdx]!;
            if (earlier.node.negated !== later.node.negated) {
              continue;
            }

            const isDuplicate =
              earlier.analysis.effective === later.analysis.effective;
            const isEquivalent =
              !isDuplicate &&
              includeEquivalents &&
              earlier.analysis.normalized === later.analysis.normalized;

            if (!isDuplicate && !isEquivalent) {
              continue;
            }

            // Once a qualifying candidate is blocked by an intervening
            // opposite-polarity pattern, every farther-back candidate is
            // blocked by that very same pattern too (its range only grows),
            // so there is nothing left to gain by continuing to search.
            if (
              hasOppositePolarityBetween(
                entries,
                earlierIdx,
                laterIdx,
                later.node.negated,
              )
            ) {
              break;
            }

            const deleteStart = later.node.range[0];
            const deleteEnd = endOfLineIncludingTerminator(
              body,
              later.bodyIndex,
              textLength,
            );

            context.report({
              node: later.node,
              messageId: isDuplicate ? "duplicate" : "equivalent",
              data: {
                original: earlier.analysis.effective,
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
