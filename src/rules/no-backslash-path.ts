import { analyze } from "#algebra/index.js";
import type { Pattern } from "#parser/index.js";
import type { GitignoreRuleDefinition } from "./types.js";
import { locFromRange, patternIssueRange } from "./utils.js";

type MessageIds = "backslashPath" | "replaceSeparator";

const rule: GitignoreRuleDefinition<[], MessageIds> = {
  meta: {
    type: "problem",
    hasSuggestions: true,
    schema: [],
    docs: {
      description: "disallow backslash as a path separator",
      url: "https://github.com/erdembircan/eslint-plugin-dotignore/blob/main/docs/rules/no-backslash-path.md",
      recommended: true,
    },
    messages: {
      backslashPath:
        "Backslash is an escape character in gitignore, not a path separator — use '/'.",
      replaceSeparator: "Replace '\\' with '/'.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      Pattern(node: Pattern) {
        const { issues } = analyze(node.pattern, { negated: node.negated });

        for (const issue of issues) {
          if (issue.kind !== "backslash-path") {
            continue;
          }

          // The issue spans the backslash plus the char it escapes (length
          // 2); only the backslash itself should become '/' — the escaped
          // character stays exactly as written.
          const reportRange = patternIssueRange(node, issue);
          const fixRange: [number, number] = [
            reportRange[0],
            reportRange[0] + 1,
          ];

          context.report({
            loc: locFromRange(sourceCode, reportRange),
            messageId: "backslashPath",
            suggest: [
              {
                messageId: "replaceSeparator",
                fix(fixer) {
                  return fixer.replaceTextRange(fixRange, "/");
                },
              },
            ],
          });
        }
      },
    };
  },
};

export default rule;
