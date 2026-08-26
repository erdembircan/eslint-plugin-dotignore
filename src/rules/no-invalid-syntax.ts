import { analyze } from "../algebra/index.js";
import type { IssueKind } from "../algebra/index.js";
import type { Pattern } from "../parser/index.js";
import type { GitignoreRuleDefinition } from "./types.js";
import { locFromRange, patternIssueRange } from "./utils.js";

type MessageIds =
  | "trailingBackslash"
  | "unclosedClass"
  | "emptyClass"
  | "reversedRange"
  | "bareNegation"
  | "bareSlash";

const ISSUE_MESSAGE_IDS: Partial<Record<IssueKind, MessageIds>> = {
  "trailing-backslash": "trailingBackslash",
  "unclosed-class": "unclosedClass",
  "empty-class": "emptyClass",
  "reversed-range": "reversedRange",
  "bare-negation": "bareNegation",
  "bare-slash": "bareSlash",
};

const rule: GitignoreRuleDefinition<[], MessageIds> = {
  meta: {
    type: "problem",
    schema: [],
    docs: {
      description: "disallow patterns that violate the gitignore specification",
      url: "https://github.com/erdembircan/eslint-plugin-dotignore/blob/main/docs/rules/no-invalid-syntax.md",
      recommended: true,
    },
    messages: {
      trailingBackslash:
        "Pattern ends with an unescaped backslash and never matches.",
      unclosedClass: "Character class is never closed.",
      emptyClass: "Empty character class '[]' never matches.",
      reversedRange: "Reversed character range '{{range}}' never matches.",
      bareNegation: "Lone '!' negates nothing.",
      bareSlash: "Lone '/' matches nothing.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      Pattern(node: Pattern) {
        const { issues } = analyze(node.pattern, { negated: node.negated });

        for (const issue of issues) {
          const messageId = ISSUE_MESSAGE_IDS[issue.kind];
          if (!messageId) {
            continue;
          }

          // "bare-negation"/"bare-slash" describe the whole pattern being
          // degenerate (including the '!' when negated), so report on the
          // full node rather than the analyze()-relative sub-range.
          if (issue.kind === "bare-negation" || issue.kind === "bare-slash") {
            context.report({ node, messageId });
            continue;
          }

          const range = patternIssueRange(node, issue);
          context.report({
            loc: locFromRange(sourceCode, range),
            messageId,
            data:
              issue.kind === "reversed-range"
                ? { range: sourceCode.text.slice(range[0], range[1]) }
                : undefined,
          });
        }
      },
    };
  },
};

export default rule;
