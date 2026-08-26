import { analyze } from "../algebra/index.js";
import type { Pattern } from "../parser/index.js";
import type { GitignoreRuleDefinition } from "./types.js";
import { locFromRange, patternIssueRange } from "./utils.js";

type MessageIds = "misplaced";

const rule: GitignoreRuleDefinition<[], MessageIds> = {
  meta: {
    type: "suggestion",
    fixable: "code",
    schema: [],
    docs: {
      description:
        "disallow '**' in positions where it loses its special meaning",
      url: "https://github.com/erdembircan/eslint-plugin-dotignore/blob/main/docs/rules/no-misplaced-globstar.md",
      recommended: true,
    },
    messages: {
      misplaced:
        "'**' outside a '**/', '/**' or '/**/' position acts as a plain '*'.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      Pattern(node: Pattern) {
        const { issues } = analyze(node.pattern, { negated: node.negated });

        for (const issue of issues) {
          if (issue.kind !== "misplaced-globstar") {
            continue;
          }

          const range = patternIssueRange(node, issue);
          context.report({
            loc: locFromRange(sourceCode, range),
            messageId: "misplaced",
            fix(fixer) {
              return fixer.replaceTextRange(range, "*");
            },
          });
        }
      },
    };
  },
};

export default rule;
