import { computeGroupViolations } from "../engines/group.js";
import type {
  GroupOptions,
  InsertHeadingEdit,
  MoveEdit,
} from "../engines/group.js";
import type { GitignoreFile } from "../parser/index.js";
import type { GitignoreRuleDefinition } from "./types.js";
import { endOfLineIncludingTerminator } from "./utils.js";

type Options = [GroupOptions];
type MessageIds = "wrongGroup" | "missingHeading";

const rule: GitignoreRuleDefinition<Options, MessageIds> = {
  meta: {
    type: "layout",
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          folderHeading: {
            type: "string",
            description: "The heading comment for directory-only patterns.",
          },
          fileHeading: {
            type: "string",
            description: "The heading comment for all other patterns.",
          },
          order: {
            type: "array",
            items: { type: "string", enum: ["folders", "files"] },
            minItems: 2,
            maxItems: 2,
            uniqueItems: true,
            description:
              "The order in which newly-needed headings are inserted, when both are missing.",
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [
      {
        folderHeading: "# folders",
        fileHeading: "# files",
        order: ["folders", "files"],
      },
    ],
    docs: {
      description:
        "group directory-only patterns and file patterns under configurable headings",
      url: "https://github.com/erdembircan/eslint-plugin-dotignore/blob/main/docs/rules/group-patterns.md",
      recommended: false,
    },
    messages: {
      wrongGroup: "'{{pattern}}' belongs in the {{group}} group.",
      missingHeading: "Missing '{{heading}}' heading for this group.",
    },
  },
  create(context) {
    const options = context.options[0];
    const sourceCode = context.sourceCode;

    return {
      GitignoreFile(fileNode: GitignoreFile) {
        const body = fileNode.body;
        const textLength = sourceCode.text.length;
        const violations = computeGroupViolations(body, options);

        for (const violation of violations) {
          if (violation.kind === "wrongGroup") {
            const moveEdit = violation.fix as MoveEdit | undefined;
            context.report({
              node: violation.node,
              messageId: "wrongGroup",
              data: {
                pattern: violation.node.pattern,
                group: violation.targetGroup,
              },
              ...(moveEdit
                ? {
                    fix(fixer) {
                      const ranges = moveEdit.cluster.map(
                        (member): [number, number] => {
                          const bodyIndex = body.indexOf(member);
                          return [
                            member.range[0],
                            endOfLineIncludingTerminator(
                              body,
                              bodyIndex,
                              textLength,
                            ),
                          ];
                        },
                      );

                      const merged: Array<[number, number]> = [];
                      for (const range of ranges) {
                        const last = merged[merged.length - 1];
                        if (last && range[0] <= last[1]) {
                          last[1] = Math.max(last[1], range[1]);
                        } else {
                          merged.push([range[0], range[1]]);
                        }
                      }

                      const edits = merged.map((range) =>
                        fixer.removeRange(range),
                      );

                      const insertionPoint =
                        moveEdit.insertBeforeIndex < body.length
                          ? body[moveEdit.insertBeforeIndex]!.range[0]
                          : textLength;
                      const needsLeadingNewline =
                        insertionPoint > 0 &&
                        sourceCode.text.charAt(insertionPoint - 1) !== "\n";
                      const clusterText = moveEdit.cluster
                        .map((p) => p.raw)
                        .join("\n");
                      const insertText = `${needsLeadingNewline ? "\n" : ""}${clusterText}\n`;
                      edits.push(
                        fixer.insertTextBeforeRange(
                          [insertionPoint, insertionPoint],
                          insertText,
                        ),
                      );

                      return edits;
                    },
                  }
                : {}),
            });
          } else {
            const insertEdit = violation.fix as InsertHeadingEdit;
            context.report({
              node: violation.node,
              messageId: "missingHeading",
              data: { heading: insertEdit.heading },
              fix(fixer) {
                const insertionPoint = body[insertEdit.beforeIndex]!.range[0];
                const prefix = insertEdit.blankLineBefore ? "\n" : "";
                return fixer.insertTextBeforeRange(
                  [insertionPoint, insertionPoint],
                  `${prefix}${insertEdit.heading}\n`,
                );
              },
            });
          }
        }
      },
    };
  },
};

export default rule;
