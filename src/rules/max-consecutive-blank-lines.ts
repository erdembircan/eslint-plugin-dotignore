import type { GitignoreFile } from "../parser/index.js";
import type { GitignoreRuleDefinition } from "./types.js";
import { endOfLineIncludingTerminator, locFromRange } from "./utils.js";

interface Options0 {
  max: number;
}
type Options = [Options0];
type MessageIds = "tooMany";

const rule: GitignoreRuleDefinition<Options, MessageIds> = {
  meta: {
    type: "layout",
    fixable: "whitespace",
    schema: [
      {
        type: "object",
        properties: {
          max: { type: "integer", minimum: 0 },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ max: 1 }],
    docs: {
      description: "limit consecutive blank lines",
      url: "https://github.com/erdembircan/eslint-plugin-dotignore/blob/main/docs/rules/max-consecutive-blank-lines.md",
      recommended: true,
    },
    messages: {
      tooMany:
        "{{count}} consecutive blank lines — maximum allowed is {{max}}.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const { max } = context.options[0];

    return {
      GitignoreFile(fileNode: GitignoreFile) {
        const body = fileNode.body;
        const textLength = sourceCode.text.length;

        let runStart = -1;

        for (let i = 0; i <= body.length; i += 1) {
          const isBlank = i < body.length && body[i]?.type === "BlankLine";

          if (isBlank) {
            if (runStart === -1) {
              runStart = i;
            }
            continue;
          }

          if (runStart !== -1) {
            const runLength = i - runStart;
            if (runLength > max) {
              const firstSurplusIndex = runStart + max;
              const lastSurplusIndex = i - 1;
              // firstSurplusIndex < i <= body.length and runLength > max
              // together guarantee this index is in bounds.
              const reportNode = body[firstSurplusIndex]!;
              const start = reportNode.range[0];
              const end = endOfLineIncludingTerminator(
                body,
                lastSurplusIndex,
                textLength,
              );

              context.report({
                loc: locFromRange(sourceCode, [start, end]),
                messageId: "tooMany",
                data: { count: runLength, max },
                fix(fixer) {
                  return fixer.removeRange([start, end]);
                },
              });
            }
            runStart = -1;
          }
        }
      },
    };
  },
};

export default rule;
