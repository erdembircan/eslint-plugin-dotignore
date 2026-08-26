import { TextSourceCodeBase, VisitNodeStep } from "@eslint/plugin-kit";
import type { TraversalStep } from "@eslint/plugin-kit";
import type { GitignoreFile, GitignoreNode } from "../parser/index.js";

// Re-exported for compatibility: `GitignoreNode` is defined in the parser
// domain (it's just the union of the parser's own node types), but this
// module has historically been where consumers import it from.
export type { GitignoreNode };

/**
 * The `SourceCode` object ESLint uses to work with a parsed gitignore file.
 *
 * `getLoc`/`getRange` (and therefore `getText`) are inherited unmodified from
 * `TextSourceCodeBase`: our nodes already carry ESTree-style `loc`/`range`
 * properties, which the base class detects and uses automatically. Only
 * parent tracking and traversal are language-specific, so those are the only
 * two methods overridden here.
 */
export class GitignoreSourceCode extends TextSourceCodeBase<{
  LangOptions: Record<string, unknown>;
  RootNode: GitignoreFile;
  SyntaxElementWithLoc: GitignoreNode;
  ConfigNode: never;
}> {
  #parents = new Map<GitignoreNode, GitignoreNode>();

  #steps: VisitNodeStep[] | undefined;

  constructor({ text, ast }: { text: string; ast: GitignoreFile }) {
    super({ text, ast });
  }

  /**
   * Returns the parent of the given node, or `undefined` for the root
   * `GitignoreFile` node (which has no parent).
   */
  getParent(node: GitignoreNode): GitignoreNode | undefined {
    return this.#parents.get(node);
  }

  /**
   * Traverses the flat gitignore AST: the root `GitignoreFile` is entered
   * first, then every entry in its `body` is entered and exited in source
   * order, and finally the root is exited. Parents are recorded in
   * `#parents` as the steps are built, mirroring the pattern used by
   * `@eslint/json`'s `JSONSourceCode`.
   */
  traverse(): Iterable<TraversalStep> {
    if (this.#steps) {
      return this.#steps.values();
    }

    const steps: VisitNodeStep[] = [];
    const ast = this.ast;

    steps.push(
      new VisitNodeStep({ target: ast, phase: 1, args: [ast, undefined] }),
    );

    for (const child of ast.body) {
      this.#parents.set(child, ast);
      steps.push(
        new VisitNodeStep({ target: child, phase: 1, args: [child, ast] }),
      );
      steps.push(
        new VisitNodeStep({ target: child, phase: 2, args: [child, ast] }),
      );
    }

    steps.push(
      new VisitNodeStep({ target: ast, phase: 2, args: [ast, undefined] }),
    );

    this.#steps = steps;
    return steps.values();
  }
}
