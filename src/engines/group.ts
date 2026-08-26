import type { BlankLine, GitignoreNode, Pattern } from "../parser/index.js";

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

/**
 * Builds an entire group section from scratch: removes every given cluster
 * from wherever it currently sits in the body, and re-lists all of them
 * (each cluster's members kept together and in their original relative
 * order, clusters themselves also in original relative order) directly
 * beneath a freshly-inserted `heading`, positioned just before
 * `insertBeforeIndex` (which may equal `body.length` for EOF).
 *
 * Used when a group's heading is missing entirely: rather than inserting a
 * bare heading and leaving each misplaced pattern to be moved individually
 * (which can't express "arrange this whole section relative to `order`"),
 * the whole section is built as one atomic edit.
 */
export interface ArrangeEdit {
  kind: "arrange";
  heading: string;
  clusters: Pattern[][];
  insertBeforeIndex: number;
  blankLineBefore: boolean;
  blankLineAfter: boolean;
  /** Blank lines that must be removed alongside the clusters: ones that sit
   * between `insertBeforeIndex` and EOF with nothing real left after them
   * once this group's own clusters are gone, so keeping them would leave a
   * meaningless trailing blank rather than a real section separator. */
  staleBlankLines: BlankLine[];
}

export type GroupEdit = MoveEdit | ArrangeEdit;

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

function computeSections(
  body: readonly GitignoreNode[],
  options: GroupOptions,
): Section[] {
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
    return {
      group,
      headingIndex: index,
      endIndex: next ? next.index : body.length,
    };
  });
}

function sectionContaining(
  sections: readonly Section[],
  bodyIndex: number,
  group: GroupName,
): Section | undefined {
  return sections.find(
    (s) =>
      s.group === group && bodyIndex > s.headingIndex && bodyIndex < s.endIndex,
  );
}

function firstSectionOf(
  sections: readonly Section[],
  group: GroupName,
): Section | undefined {
  return sections.find((s) => s.group === group);
}

/**
 * Walks `endIndex` backward over any run of trailing `BlankLine` nodes,
 * stopping at the first non-blank node or at `lowerBound` (exclusive),
 * whichever comes first.
 *
 * A destination section's `endIndex` may be preceded by a blank line that
 * legitimately separates it from the next section (or, with no next
 * section, from EOF). A moved pattern must land right after the section's
 * last real content, not after that separator -- otherwise the separator
 * ends up sandwiched between two patterns of the same group instead of
 * marking a section boundary.
 */
function skipTrailingBlankLines(
  body: readonly GitignoreNode[],
  endIndex: number,
  lowerBound: number,
): number {
  let index = endIndex;
  while (index - 1 > lowerBound && body[index - 1]?.type === "BlankLine") {
    index -= 1;
  }
  return index;
}

/**
 * Collects every organizable cluster (a non-negated pattern of `group`,
 * together with any negations glued to it) in original body order. A
 * pattern with no glued negations is its own one-member cluster.
 */
function collectGroupClusters(
  patterns: readonly IndexedNode<Pattern>[],
  group: GroupName,
  clusterByAnchorIndex: ReadonlyMap<number, Cluster>,
): IndexedNode<Pattern>[][] {
  const clusters: IndexedNode<Pattern>[][] = [];
  for (const entry of patterns) {
    if (entry.node.negated) {
      continue; // glued negations ride along with their anchor below;
      // unglued ones are never part of any cluster and are simply skipped
      // here -- they're reported (unfixed) by the wrongGroup pass instead.
    }
    if (groupOf(entry.node) !== group) {
      continue;
    }
    const cluster = clusterByAnchorIndex.get(entry.bodyIndex);
    clusters.push(cluster ? cluster.members : [entry]);
  }
  return clusters;
}

/**
 * Given a set of body indices about to be removed (because they're part of
 * the section being arranged), finds the nearest remaining node before
 * `from`, skipping over anything that's being removed. Returns `-1` if
 * nothing remains (start of file).
 */
function prevRemainingIndex(
  body: readonly GitignoreNode[],
  from: number,
  removed: ReadonlySet<number>,
): number {
  let i = from;
  while (i >= 0 && removed.has(i)) {
    i -= 1;
  }
  return i;
}

/**
 * Computes group-organization violations for a gitignore file's body.
 *
 * See the module-level design notes in the rule that consumes this
 * (group-patterns) for the reasoning behind two deliberate scope
 * decisions: both `wrongGroup` and `missingHeading` checks only fire when
 * patterns of BOTH groups exist in the file (a file with only one kind of
 * pattern has nothing to organize into two groups), and `order` only
 * governs the arrangement produced when a heading is actually being
 * inserted -- it never rearranges a group whose heading already exists.
 */
export function computeGroupViolations(
  body: readonly GitignoreNode[],
  options: GroupOptions,
): GroupViolation[] {
  const patterns: IndexedNode<Pattern>[] = [];
  body.forEach((node, bodyIndex) => {
    if (node.type === "Pattern") {
      patterns.push({ node, bodyIndex });
    }
  });

  const hasFolders = patterns.some((p) => groupOf(p.node) === "folders");
  const hasFiles = patterns.some((p) => groupOf(p.node) === "files");

  const violations: GroupViolation[] = [];

  if (!(hasFolders && hasFiles)) {
    return violations;
  }

  const sections = computeSections(body, options);
  const missingHeadingGroups: GroupName[] = [];
  if (!sections.some((s) => s.group === "folders")) {
    missingHeadingGroups.push("folders");
  }
  if (!sections.some((s) => s.group === "files")) {
    missingHeadingGroups.push("files");
  }
  const orderedMissing = options.order.filter((g) =>
    missingHeadingGroups.includes(g),
  );

  const { clusterByAnchorIndex, unglued } = computeClusters(patterns);
  const ungluedIndices = new Set(unglued.map((u) => u.bodyIndex));

  for (const group of orderedMissing) {
    const clusters = collectGroupClusters(
      patterns,
      group,
      clusterByAnchorIndex,
    );
    // orderedMissing is derived from missingHeadingGroups, which is only
    // ever populated for a group that actually has patterns (hasFolders
    // and hasFiles are both true here), so this is never empty.
    const anchorNode = clusters[0]![0]!.node;

    const removedIndices = new Set(
      clusters.flat().map((member) => member.bodyIndex),
    );

    const otherGroup: GroupName = group === "folders" ? "files" : "folders";
    const otherSection = firstSectionOf(sections, otherGroup);

    let insertBeforeIndex: number;
    if (otherSection) {
      // The other group already has a section: `order` places this new
      // one immediately before or after it, without disturbing it. When
      // inserting after, the other section's trailing content may include
      // blank lines *and* patterns that this very fix is about to remove
      // (this group's own cluster(s), sitting misplaced inside or right
      // after the other section) -- both are skipped when finding where
      // "after the other section" really lands post-fix.
      insertBeforeIndex =
        options.order.indexOf(group) < options.order.indexOf(otherGroup)
          ? otherSection.headingIndex
          : (() => {
              let index = otherSection.endIndex;
              while (
                index - 1 > otherSection.headingIndex &&
                (body[index - 1]?.type === "BlankLine" ||
                  removedIndices.has(index - 1))
              ) {
                index -= 1;
              }
              return index;
            })();
    } else {
      // Neither section exists yet (both groups are missing their
      // heading): anchor the first one built at the first organizable
      // pattern in the file. Once this fix applies, a second pass finds
      // the other group's section already in place and takes the branch
      // above.
      insertBeforeIndex = patterns[0]!.bodyIndex;
    }

    const prevIdx = prevRemainingIndex(
      body,
      insertBeforeIndex - 1,
      removedIndices,
    );
    const blankLineBefore = prevIdx >= 0 && body[prevIdx]!.type !== "BlankLine";

    // blankLineAfter: look past both this group's own removed nodes *and*
    // any blank lines to see whether real content remains between the
    // insertion point and EOF. A separator is only manufactured when real
    // content follows with no blank already there; if a blank already
    // separates the insertion point from what follows, or nothing real
    // follows at all, no new separator is needed.
    let lookahead = insertBeforeIndex;
    while (
      lookahead < body.length &&
      (removedIndices.has(lookahead) || body[lookahead]!.type === "BlankLine")
    ) {
      lookahead += 1;
    }
    const blankLineAfter = lookahead < body.length;

    // staleBlankLines: independent of where the new section is being
    // inserted, a cluster can be removed from *anywhere* it currently sits
    // in the body -- including from a trailing run at the very end of the
    // file. Walking backward from EOF over a contiguous run of only removed
    // nodes and/or blank lines finds every blank line that is about to lose
    // the real content it used to separate from EOF, leaving it an orphaned,
    // meaningless line rather than a genuine section boundary; those must be
    // removed alongside the clusters rather than left dangling.
    const staleBlankLines: BlankLine[] = [];
    let tail = body.length - 1;
    while (tail >= 0) {
      const node = body[tail]!;
      if (removedIndices.has(tail)) {
        tail -= 1;
        continue;
      }
      if (node.type === "BlankLine") {
        staleBlankLines.push(node);
        tail -= 1;
        continue;
      }
      break;
    }
    staleBlankLines.reverse(); // walked backward -- restore body order

    violations.push({
      kind: "missingHeading",
      node: anchorNode,
      targetGroup: group,
      fix: {
        kind: "arrange",
        heading:
          group === "folders" ? options.folderHeading : options.fileHeading,
        clusters: clusters.map((cluster) => cluster.map((m) => m.node)),
        insertBeforeIndex,
        blankLineBefore,
        blankLineAfter,
        staleBlankLines,
      },
    });
  }

  // wrongGroup: only independently-checked patterns are considered --
  // non-negated patterns, plus negations that found no gluing anchor.
  // Glued negations move silently with their anchor and are never
  // independently reported. Patterns belonging to a group whose heading is
  // missing are handled entirely by that group's `arrange` fix above (an
  // unglued negation still gets its own unfixed report, same as always --
  // it's never part of any cluster, arranged or otherwise).
  for (const entry of patterns) {
    if (entry.node.negated && !ungluedIndices.has(entry.bodyIndex)) {
      continue; // glued: silent, moves with its anchor
    }

    const targetGroup = groupOf(entry.node);

    if (
      missingHeadingGroups.includes(targetGroup) &&
      !ungluedIndices.has(entry.bodyIndex)
    ) {
      continue; // handled by that group's arrange fix
    }

    const inCorrectSection = Boolean(
      sectionContaining(sections, entry.bodyIndex, targetGroup),
    );
    if (inCorrectSection) {
      continue;
    }

    if (entry.node.negated) {
      // Unglued negation: report, but never fix -- there's no anchor to
      // safely move it with.
      violations.push({ kind: "wrongGroup", node: entry.node, targetGroup });
      continue;
    }

    // Reaching here means targetGroup is NOT in missingHeadingGroups (that
    // case continues above), so its section is guaranteed to exist -- a
    // fallback for a missing section is no longer reachable now that a
    // missing heading is always handled by that group's own arrange fix.
    const targetSection = firstSectionOf(sections, targetGroup)!;
    const insertBeforeIndex = skipTrailingBlankLines(
      body,
      targetSection.endIndex,
      targetSection.headingIndex,
    );
    const cluster = clusterByAnchorIndex.get(entry.bodyIndex);
    const clusterNodes = cluster
      ? cluster.members.map((m) => m.node)
      : [entry.node];

    violations.push({
      kind: "wrongGroup",
      node: entry.node,
      targetGroup,
      fix: { kind: "move", cluster: clusterNodes, insertBeforeIndex },
    });
  }

  return violations;
}
