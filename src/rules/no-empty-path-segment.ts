import { analyze } from "../algebra/index.js";
import type { Pattern } from "../parser/index.js";
import type { GitignoreRuleDefinition } from "./types.js";
import { locFromRange, patternIssueRange } from "./utils.js";

type MessageIds = "emptySegment" | "collapseSegment";

const rule: GitignoreRuleDefinition<[], MessageIds> = {
  meta: {
    type: "problem",
    hasSuggestions: true,
    schema: [],
    docs: {
      description: "disallow empty path segments",
      url: "https://github.com/erdembircan/eslint-plugin-dotignore/blob/main/docs/rules/no-empty-path-segment.md",
      recommended: true,
    },
    messages: {
      emptySegment: "Empty path segment '//' never matches any path.",
      collapseSegment: "Collapse '//' to '/'.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      Pattern(node: Pattern) {
        const { issues } = analyze(node.pattern, { negated: node.negated });

        for (const issue of issues) {
          if (issue.kind !== "empty-segment") {
            continue;
          }

          const range = patternIssueRange(node, issue);
          context.report({
            loc: locFromRange(sourceCode, range),
            messageId: "emptySegment",
            suggest: [
              {
                messageId: "collapseSegment",
                fix(fixer) {
                  return fixer.replaceTextRange(range, "/");
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
