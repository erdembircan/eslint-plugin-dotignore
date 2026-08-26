import type { GitignoreFile } from "../parser/index.js";
import type { GitignoreRuleDefinition } from "./types.js";
import { endOfLineIncludingTerminator } from "./utils.js";

type MessageIds = "emptyGroup";

const rule: GitignoreRuleDefinition<[], MessageIds> = {
  meta: {
    type: "suggestion",
    fixable: "code",
    schema: [],
    docs: {
      description: "disallow group headings with no patterns under it",
      url: "https://github.com/erdembircan/eslint-plugin-dotignore/blob/main/docs/rules/no-empty-group.md",
      recommended: true,
    },
    messages: {
      emptyGroup: "This group heading has no patterns under it.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      GitignoreFile(fileNode: GitignoreFile) {
        const body = fileNode.body;
        const textLength = sourceCode.text.length;

        let i = 0;
        while (i < body.length) {
          const node = body[i];
          if (!node || node.type !== "Comment") {
            i += 1;
            continue;
          }

          const blockStart = i;
          let blockEnd = i;
          while (
            blockEnd + 1 < body.length &&
            body[blockEnd + 1]?.type === "Comment"
          ) {
            blockEnd += 1;
          }

          // Scan everything between this block and the next comment block
          // (or EOF), looking for a Pattern. Blank lines don't count as
          // content, so they're skipped over without stopping the scan.
          let hasPatternAfter = false;
          let scan = blockEnd + 1;
          while (scan < body.length && body[scan]?.type !== "Comment") {
            if (body[scan]?.type === "Pattern") {
              hasPatternAfter = true;
              break;
            }
            scan += 1;
          }

          if (!hasPatternAfter) {
            // blockStart === i, already checked in-bounds above.
            const firstComment = body[blockStart]!;
            const lastRemovedIndex = scan - 1;
            let deleteStart = firstComment.range[0];

            // When nothing at all follows the removed block (the scan ran
            // off the end of the body rather than stopping at the next
            // comment), any blank line(s) immediately preceding it were
            // only ever separating it from what came after -- now that
            // there's nothing left after, they'd become a dangling blank
            // trailing the file. Absorb them into the same removal instead
            // of leaving them behind.
            if (scan === body.length) {
              let precedingIndex = blockStart - 1;
              while (body[precedingIndex]?.type === "BlankLine") {
                deleteStart = body[precedingIndex]!.range[0];
                precedingIndex -= 1;
              }
            }

            const deleteEnd = endOfLineIncludingTerminator(
              body,
              lastRemovedIndex,
              textLength,
            );

            context.report({
              node: firstComment,
              messageId: "emptyGroup",
              fix(fixer) {
                return fixer.removeRange([deleteStart, deleteEnd]);
              },
            });
          }

          i = blockEnd + 1;
        }
      },
    };
  },
};

export default rule;
