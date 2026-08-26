import type { Comment } from "../parser/index.js";
import type { GitignoreRuleDefinition } from "./types.js";
import { locFromRange } from "./utils.js";

type Options = ["always" | "never"];
type MessageIds = "missingSpace" | "unexpectedSpace";

function isSpaceOrTab(char: string): boolean {
  return char === " " || char === "\t";
}

function leadingSpaceOrTabLength(text: string): number {
  let i = 0;
  while (i < text.length && isSpaceOrTab(text.charAt(i))) {
    i += 1;
  }
  return i;
}

const rule: GitignoreRuleDefinition<Options, MessageIds> = {
  meta: {
    type: "layout",
    fixable: "whitespace",
    schema: [
      {
        type: "string",
        enum: ["always", "never"],
        description:
          'Whether a comment must ("always") or must not ("never") have a space after \'#\'.',
      },
    ],
    defaultOptions: ["always"],
    docs: {
      description: "enforce consistent spacing after '#' in comments",
      url: "https://github.com/erdembircan/eslint-plugin-dotignore/blob/main/docs/rules/comment-spacing.md",
      recommended: true,
    },
    messages: {
      missingSpace: "Add a space after '#'.",
      unexpectedSpace: "Remove the space after '#'.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const mode = context.options[0];

    return {
      Comment(node: Comment) {
        const { value } = node;
        if (value === "") {
          return;
        }

        // The '#' sits immediately before `value` within `raw`.
        const hashIndexInRaw = node.raw.length - value.length - 1;
        const hashAbs = node.range[0] + hashIndexInRaw;

        if (mode === "always") {
          if (isSpaceOrTab(value.charAt(0))) {
            return;
          }
          const insertAt = hashAbs + 1;
          context.report({
            loc: locFromRange(sourceCode, [insertAt, insertAt]),
            messageId: "missingSpace",
            fix(fixer) {
              return fixer.replaceTextRange([insertAt, insertAt], " ");
            },
          });
          return;
        }

        // mode === "never"
        const leadingLength = leadingSpaceOrTabLength(value);
        if (leadingLength === 0) {
          return;
        }
        const range: [number, number] = [
          hashAbs + 1,
          hashAbs + 1 + leadingLength,
        ];
        context.report({
          loc: locFromRange(sourceCode, range),
          messageId: "unexpectedSpace",
          fix(fixer) {
            return fixer.removeRange(range);
          },
        });
      },
    };
  },
};

export default rule;
