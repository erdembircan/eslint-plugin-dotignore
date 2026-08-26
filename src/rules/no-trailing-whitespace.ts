import { analyze } from "../algebra/index.js";
import type { BlankLine, Comment, Pattern } from "../parser/index.js";
import type { GitignoreRuleDefinition } from "./types.js";
import { locFromRange } from "./utils.js";

type MessageIds = "trailingPattern" | "trailingComment" | "whitespaceOnlyLine";

function isSpaceOrTab(char: string): boolean {
  return char === " " || char === "\t";
}

/** Plain (escape-unaware) trailing whitespace: comments have no escape
 * syntax, so every trailing space/tab is significant-free filler. */
function trailingWhitespaceLength(text: string): number {
  let end = text.length;
  while (end > 0 && isSpaceOrTab(text.charAt(end - 1))) {
    end -= 1;
  }
  return text.length - end;
}

const rule: GitignoreRuleDefinition<[], MessageIds> = {
  meta: {
    type: "layout",
    fixable: "whitespace",
    schema: [],
    docs: {
      description: "disallow unescaped trailing whitespace",
      url: "https://github.com/erdembircan/eslint-plugin-dotignore/blob/main/docs/rules/no-trailing-whitespace.md",
      recommended: true,
    },
    messages: {
      trailingPattern:
        "Unescaped trailing whitespace is ignored by Git — remove it.",
      trailingComment: "Trailing whitespace after a comment — remove it.",
      whitespaceOnlyLine: "Whitespace-only line — remove the whitespace.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      Pattern(node: Pattern) {
        // analyze()'s `effective` already strips only *unescaped* trailing
        // whitespace (an escaped trailing space like "foo\ " is meaningful
        // and left alone), so the length difference is exactly the
        // unescaped tail we want to flag and remove.
        const { effective } = analyze(node.pattern, { negated: node.negated });
        const wsLength = node.pattern.length - effective.length;
        if (wsLength === 0) {
          return;
        }

        const range: [number, number] = [
          node.range[1] - wsLength,
          node.range[1],
        ];
        context.report({
          loc: locFromRange(sourceCode, range),
          messageId: "trailingPattern",
          fix(fixer) {
            return fixer.removeRange(range);
          },
        });
      },

      Comment(node: Comment) {
        const wsLength = trailingWhitespaceLength(node.raw);
        if (wsLength === 0) {
          return;
        }

        const range: [number, number] = [
          node.range[1] - wsLength,
          node.range[1],
        ];
        context.report({
          loc: locFromRange(sourceCode, range),
          messageId: "trailingComment",
          fix(fixer) {
            return fixer.removeRange(range);
          },
        });
      },

      BlankLine(node: BlankLine) {
        if (node.raw === "") {
          return;
        }

        context.report({
          node,
          messageId: "whitespaceOnlyLine",
          fix(fixer) {
            return fixer.replaceText(node, "");
          },
        });
      },
    };
  },
};

export default rule;
