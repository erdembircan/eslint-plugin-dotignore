import { analyze } from "../algebra/index.js";
import {
  compareEffectiveText,
  sortRun,
  splitIntoRuns,
} from "../engines/sort.js";
import type { SortOptions } from "../engines/sort.js";
import type { GitignoreFile, Pattern } from "../parser/index.js";
import type { GitignoreRuleDefinition } from "./types.js";

type MessageIds = "unsorted";

const rule: GitignoreRuleDefinition<[SortOptions], MessageIds> = {
  meta: {
    type: "layout",
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          direction: { type: "string", enum: ["asc", "desc"] },
          caseSensitive: { type: "boolean" },
          natural: { type: "boolean" },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ direction: "asc", caseSensitive: false, natural: true }],
    docs: {
      description: "enforce alphabetical ordering of patterns",
      url: "https://github.com/erdembircan/eslint-plugin-dotignore/blob/main/docs/rules/sort-patterns.md",
      recommended: false,
    },
    messages: {
      unsorted: "'{{current}}' should come before '{{previous}}'.",
    },
  },
  create(context) {
    const options = context.options[0];

    function checkRun(run: readonly Pattern[]): void {
      if (run.length < 2) {
        return;
      }

      const effectiveTexts = run.map((p) => analyze(p.pattern).effective);

      let violatingIndex = -1;
      for (let i = 1; i < run.length; i += 1) {
        if (
          compareEffectiveText(
            effectiveTexts[i - 1]!,
            effectiveTexts[i]!,
            options,
          ) > 0
        ) {
          violatingIndex = i;
          break;
        }
      }
      if (violatingIndex === -1) {
        return;
      }

      const sorted = sortRun(run, options);
      const rangeStart = run[0]!.range[0];
      const rangeEnd = run[run.length - 1]!.range[1];
      const newText = sorted.map((p) => p.raw).join("\n");

      context.report({
        node: run[violatingIndex]!,
        messageId: "unsorted",
        data: {
          current: effectiveTexts[violatingIndex]!,
          previous: effectiveTexts[violatingIndex - 1]!,
        },
        fix(fixer) {
          return fixer.replaceTextRange([rangeStart, rangeEnd], newText);
        },
      });
    }

    return {
      GitignoreFile(fileNode: GitignoreFile) {
        const body = fileNode.body;
        let i = 0;

        while (i < body.length) {
          if (body[i]?.type !== "Pattern") {
            i += 1;
            continue;
          }

          const blockStart = i;
          while (i < body.length && body[i]?.type === "Pattern") {
            i += 1;
          }
          const block = body.slice(blockStart, i) as Pattern[];

          for (const run of splitIntoRuns(block)) {
            checkRun(run);
          }
        }
      },
    };
  },
};

export default rule;
