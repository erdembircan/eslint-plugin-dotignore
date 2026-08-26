import type { GitignoreNode } from "../language/source-code.js";
import type { Pattern } from "../parser/index.js";

export type GroupName = "folders" | "files";

export interface GroupOptions {
  folderHeading: string;
  fileHeading: string;
  order: GroupName[];
}

/** Move a cluster (an anchor pattern plus every negation glued to it) to
 * just before `insertBeforeIndex` in the body, preserving the cluster's
 * original relative order. `insertBeforeIndex === body.length` means EOF. */
export interface MoveEdit {
  kind: "move";
  cluster: Pattern[];
  insertBeforeIndex: number;
}

/** Insert a new heading comment line directly above `beforeIndex` (which
 * may equal body.length for EOF), optionally preceded by a blank line. */
export interface InsertHeadingEdit {
  kind: "insertHeading";
  heading: string;
  beforeIndex: number;
  blankLineBefore: boolean;
}

export type GroupEdit = MoveEdit | InsertHeadingEdit;

export interface GroupViolation {
  kind: "wrongGroup" | "missingHeading";
  node: Pattern;
  targetGroup: GroupName;
  fix?: GroupEdit;
}

function groupOf(pattern: Pattern): GroupName {
  return pattern.dirOnly ? "folders" : "files";
}

function isUnescapedSlash(text: string, index: number): boolean {
  let backslashes = 0;
  let i = index - 1;
  while (i >= 0 && text.charAt(i) === "\\") {
    backslashes += 1;
    i -= 1;
  }
  return text.charAt(index) === "/" && backslashes % 2 === 0;
}

/** Strips a leading '/' and then a leading "**\/" (in that order), so
 * "/foo", "**\/foo", and "foo" all normalize to comparable first segments. */
function stripAnchor(patternText: string): string {
  let text = patternText;
  if (text.startsWith("/")) {
    text = text.slice(1);
  }
  if (text.startsWith("**/")) {
    text = text.slice(3);
  }
  return text;
}

function firstSegment(patternText: string): string {
  const normalized = stripAnchor(patternText);
  for (let i = 0; i < normalized.length; i += 1) {
    if (isUnescapedSlash(normalized, i)) {
      return normalized.slice(0, i);
    }
  }
  return normalized;
}

interface IndexedNode<T> {
  node: T;
  bodyIndex: number;
}

interface Cluster {
  anchor: IndexedNode<Pattern>;
  members: IndexedNode<Pattern>[]; // anchor + glued negations, in body order
}

/**
 * Glues each negated pattern to the nearest preceding non-negated pattern
 * whose (anchor-normalized) first path segment matches. Returns the
 * resulting clusters (keyed by anchor) and the set of negated patterns that
 * found no anchor at all.
 */
function computeClusters(patterns: IndexedNode<Pattern>[]): {
  clusterByAnchorIndex: Map<number, Cluster>;
  unglued: IndexedNode<Pattern>[];
} {
  const clusterByAnchorIndex = new Map<number, Cluster>();
  const unglued: IndexedNode<Pattern>[] = [];

  for (const entry of patterns) {
    if (!entry.node.negated) {
      continue;
    }
    const targetSegment = firstSegment(entry.node.pattern);

    let anchor: IndexedNode<Pattern> | undefined;
    for (let i = patterns.indexOf(entry) - 1; i >= 0; i -= 1) {
      const candidate = patterns[i]!;
      if (candidate.node.negated) {
        continue;
      }
      if (firstSegment(candidate.node.pattern) === targetSegment) {
        anchor = candidate;
        break;
      }
    }

    if (!anchor) {
      unglued.push(entry);
      continue;
    }

    let cluster = clusterByAnchorIndex.get(anchor.bodyIndex);
    if (!cluster) {
      cluster = { anchor, members: [anchor] };
      clusterByAnchorIndex.set(anchor.bodyIndex, cluster);
    }
    cluster.members.push(entry);
  }

  // Keep each cluster's members in body order (anchor first, since it
  // always has the smallest index; negations may have been discovered out
  // of order relative to each other).
  for (const cluster of clusterByAnchorIndex.values()) {
    cluster.members.sort((a, b) => a.bodyIndex - b.bodyIndex);
  }

  return { clusterByAnchorIndex, unglued };
}

interface Section {
  group: GroupName;
  headingIndex: number;
  /** Exclusive end: the next heading's body index, or body.length. */
  endIndex: number;
}

function computeSections(body: readonly GitignoreNode[], options: GroupOptions): Section[] {
  const headingIndices: Array<{ index: number; group: GroupName }> = [];
  body.forEach((node, index) => {
    if (node.type !== "Comment") {
      return;
    }
    const trimmed = node.raw.trim();
    if (trimmed === options.folderHeading) {
      headingIndices.push({ index, group: "folders" });
    } else if (trimmed === options.fileHeading) {
      headingIndices.push({ index, group: "files" });
    }
  });

  return headingIndices.map(({ index, group }, i) => {
    const next = headingIndices[i + 1];
    return { group, headingIndex: index, endIndex: next ? next.index : body.length };
  });
}

function sectionContaining(sections: readonly Section[], bodyIndex: number, group: GroupName): Section | undefined {
  return sections.find((s) => s.group === group && bodyIndex > s.headingIndex && bodyIndex < s.endIndex);
}

function firstSectionOf(sections: readonly Section[], group: GroupName): Section | undefined {
  return sections.find((s) => s.group === group);
}

/**
 * Computes group-organization violations for a gitignore file's body.
 *
 * See the module-level design notes in the rule that consumes this
 * (group-patterns) for the reasoning behind two deliberate scope
 * decisions: both `wrongGroup` and `missingHeading` checks only fire when
 * patterns of BOTH groups exist in the file (a file with only one kind of
 * pattern has nothing to organize into two groups), and a target section
 * whose heading doesn't exist yet falls back to "end of file" as the move
 * destination (the companion `missingHeading` violation is what actually
 * introduces the heading).
 */
export function computeGroupViolations(body: readonly GitignoreNode[], options: GroupOptions): GroupViolation[] {
  const patterns: IndexedNode<Pattern>[] = [];
  body.forEach((node, bodyIndex) => {
    if (node.type === "Pattern") {
      patterns.push({ node, bodyIndex });
    }
  });

  const hasFolders = patterns.some((p) => groupOf(p.node) === "folders");
  const hasFiles = patterns.some((p) => groupOf(p.node) === "files");

  const violations: GroupViolation[] = [];

  // missingHeading: independent of whether both groups exist in terms of
  // *what* triggers it (a group with patterns and no heading), but the
  // whole feature is scoped to files actually using both groups.
  if (hasFolders && hasFiles) {
    const sections = computeSections(body, options);
    const missingHeadingGroups: GroupName[] = [];
    if (!sections.some((s) => s.group === "folders")) {
      missingHeadingGroups.push("folders");
    }
    if (!sections.some((s) => s.group === "files")) {
      missingHeadingGroups.push("files");
    }
    // "order" only decides the sequence in which BOTH newly-needed
    // headings are reported/inserted.
    const orderedMissing = options.order.filter((g) => missingHeadingGroups.includes(g));

    for (const group of orderedMissing) {
      // hasFolders && hasFiles (checked above) guarantees a pattern of
      // every group exists, so this is never undefined here.
      const first = patterns.find((p) => groupOf(p.node) === group)!;
      const isFileStart = first.bodyIndex === 0;
      const previous = body[first.bodyIndex - 1];
      const alreadyBlankPreceded = previous?.type === "BlankLine";
      violations.push({
        kind: "missingHeading",
        node: first.node,
        targetGroup: group,
        fix: {
          kind: "insertHeading",
          heading: group === "folders" ? options.folderHeading : options.fileHeading,
          beforeIndex: first.bodyIndex,
          blankLineBefore: !isFileStart && !alreadyBlankPreceded,
        },
      });
    }

    // wrongGroup: only independently-checked patterns are considered --
    // non-negated patterns, plus negations that found no gluing anchor.
    // Glued negations move silently with their anchor and are never
    // independently reported.
    const { clusterByAnchorIndex, unglued } = computeClusters(patterns);
    const ungluedIndices = new Set(unglued.map((u) => u.bodyIndex));

    for (const entry of patterns) {
      if (entry.node.negated && !ungluedIndices.has(entry.bodyIndex)) {
        continue; // glued: silent, moves with its anchor
      }

      const targetGroup = groupOf(entry.node);
      const inCorrectSection = Boolean(sectionContaining(sections, entry.bodyIndex, targetGroup));
      if (inCorrectSection) {
        continue;
      }

      if (entry.node.negated) {
        // Unglued negation: report, but never fix -- there's no anchor to
        // safely move it with.
        violations.push({ kind: "wrongGroup", node: entry.node, targetGroup });
        continue;
      }

      const targetSection = firstSectionOf(sections, targetGroup);
      const insertBeforeIndex = targetSection ? targetSection.endIndex : body.length;
      const cluster = clusterByAnchorIndex.get(entry.bodyIndex);
      const clusterNodes = cluster ? cluster.members.map((m) => m.node) : [entry.node];

      violations.push({
        kind: "wrongGroup",
        node: entry.node,
        targetGroup,
        fix: { kind: "move", cluster: clusterNodes, insertBeforeIndex },
      });
    }
  }

  return violations;
}
