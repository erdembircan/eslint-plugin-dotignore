import { computeGroupViolations } from "../engines/group.js";
import type { ArrangeEdit, GroupOptions, MoveEdit } from "../engines/group.js";
import type { GitignoreFile, GitignoreNode } from "../parser/index.js";
import type { GitignoreRuleDefinition } from "./types.js";
import { detectLineTerminator, endOfLineIncludingTerminator } from "./utils.js";

type Options = [GroupOptions];
type MessageIds = "wrongGroup" | "missingHeading";

/** Merges a list of nodes' own-line ranges (including their line
 * terminator) into the smallest set of non-touching `[start, end)` ranges,
 * in body order. Shared by both fix kinds below, which each remove a list
 * of lines (a pattern cluster, every cluster in a group, and/or blank
 * lines that would otherwise dangle) from wherever they currently sit.
 * `nodes` must already be in body order. */
function mergedRemovalRanges(
  nodes: readonly GitignoreNode[],
  body: readonly GitignoreNode[],
  textLength: number,
): Array<[number, number]> {
  const ranges = nodes.map((member): [number, number] => {
    const bodyIndex = body.indexOf(member);
    return [
      member.range[0],
      endOfLineIncludingTerminator(body, bodyIndex, textLength),
    ];
  });

  const merged: Array<[number, number]> = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push([range[0], range[1]]);
    }
  }
  return merged;
}

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
              "The order in which groups are arranged when their headings are inserted.",
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [
      {
        folderHeading: "# folders",
        fileHeading: "# files",
        order: ["files", "folders"],
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
                      const merged = mergedRemovalRanges(
                        moveEdit.cluster,
                        body,
                        textLength,
                      );
                      const edits = merged.map((range) =>
                        fixer.removeRange(range),
                      );

                      const insertBeforeNode =
                        moveEdit.insertBeforeIndex < body.length
                          ? body[moveEdit.insertBeforeIndex]!
                          : body[body.length - 1]!;
                      const insertionPoint =
                        moveEdit.insertBeforeIndex < body.length
                          ? insertBeforeNode.range[0]
                          : textLength;
                      const eol = detectLineTerminator(
                        sourceCode,
                        insertBeforeNode,
                      );
                      const needsLeadingNewline =
                        insertionPoint > 0 &&
                        sourceCode.text.charAt(insertionPoint - 1) !== "\n";
                      const clusterText = moveEdit.cluster
                        .map((p) => p.raw)
                        .join(eol);
                      const insertText = `${needsLeadingNewline ? eol : ""}${clusterText}${eol}`;
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
            const arrangeEdit = violation.fix as ArrangeEdit;
            context.report({
              node: violation.node,
              messageId: "missingHeading",
              data: { heading: arrangeEdit.heading },
              fix(fixer) {
                const nodesToRemove: GitignoreNode[] = [
                  ...arrangeEdit.clusters.flat(),
                  ...arrangeEdit.staleBlankLines,
                ].sort((a, b) => a.range[0] - b.range[0]);
                const merged = mergedRemovalRanges(
                  nodesToRemove,
                  body,
                  textLength,
                );
                const edits = merged.map((range) => fixer.removeRange(range));

                const insertBeforeNode =
                  arrangeEdit.insertBeforeIndex < body.length
                    ? body[arrangeEdit.insertBeforeIndex]!
                    : body[body.length - 1]!;
                const insertionPoint =
                  arrangeEdit.insertBeforeIndex < body.length
                    ? insertBeforeNode.range[0]
                    : textLength;
                const eol = detectLineTerminator(sourceCode, insertBeforeNode);

                const sectionText = arrangeEdit.clusters
                  .map((cluster) => cluster.map((p) => p.raw).join(eol))
                  .join(eol);
                const insertText =
                  `${arrangeEdit.blankLineBefore ? eol : ""}` +
                  `${arrangeEdit.heading}${eol}${sectionText}${eol}` +
                  `${arrangeEdit.blankLineAfter ? eol : ""}`;

                edits.push(
                  fixer.insertTextBeforeRange(
                    [insertionPoint, insertionPoint],
                    insertText,
                  ),
                );

                return edits;
              },
            });
          }
        }
      },
    };
  },
};

export default rule;
