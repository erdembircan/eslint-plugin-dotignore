import { analyze } from "../algebra/index.js";
import type { Pattern } from "../parser/index.js";
import type { GitignoreRuleDefinition } from "./types.js";
import { locFromRange } from "./utils.js";

type Options = ["minimal" | "explicit"];
type MessageIds = "redundantSlash" | "missingSlash";

const rule: GitignoreRuleDefinition<Options, MessageIds> = {
  meta: {
    type: "layout",
    fixable: "code",
    schema: [{ type: "string", enum: ["minimal", "explicit"] }],
    defaultOptions: ["minimal"],
    docs: {
      description:
        "enforce a consistent leading-slash style for anchored patterns",
      url: "https://github.com/erdembircan/eslint-plugin-dotignore/blob/main/docs/rules/leading-slash-style.md",
      recommended: true,
    },
    messages: {
      redundantSlash:
        "Leading '/' is redundant here — the middle slash already anchors this pattern.",
      missingSlash: "Add a leading '/' to make the anchoring explicit.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const mode = context.options[0];

    return {
      Pattern(node: Pattern) {
        const startsWithSlash = node.pattern.startsWith("/");
        const base = startsWithSlash ? node.pattern.slice(1) : node.pattern;

        // Qualifies only when a leading slash is/would be purely cosmetic:
        // the pattern minus any leading slash still has an unescaped '/'
        // at a non-final position, which already anchors it regardless.
        // Patterns like "/foo", where the slash is the ONLY anchor, must
        // never be touched by either mode.
        const { anchored: qualifies } = analyze(base, {
          negated: node.negated,
        });
        if (!qualifies) {
          return;
        }

        const negatedOffset = node.negated ? 1 : 0;
        const patternStart = node.range[0] + negatedOffset;

        if (mode === "minimal" && startsWithSlash) {
          const range: [number, number] = [patternStart, patternStart + 1];
          context.report({
            loc: locFromRange(sourceCode, range),
            messageId: "redundantSlash",
            fix(fixer) {
              return fixer.removeRange(range);
            },
          });
          return;
        }

        if (mode === "explicit" && !startsWithSlash) {
          context.report({
            loc: locFromRange(sourceCode, [patternStart, patternStart]),
            messageId: "missingSlash",
            fix(fixer) {
              return fixer.replaceTextRange([patternStart, patternStart], "/");
            },
          });
        }
      },
    };
  },
};

export default rule;
