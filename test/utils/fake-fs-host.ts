import type { FsHost } from "../../src/rules/fs-host.js";

/**
 * A nested plain-object description of an in-memory filesystem tree.
 * Directories are nested objects; leaves are `"file"` or `"symlink"`.
 *
 * @example
 * ```ts
 * fakeFsHost({
 *   repo: {
 *     "node_modules": { pkg: { "index.js": "file" } },
 *     "README.md": "file",
 *     "link": "symlink",
 *   },
 * })
 * ```
 */
export type FakeFsTree = { [name: string]: FakeFsTree | "file" | "symlink" };

function splitPath(path: string): string[] {
  return path.split(/[\\/]+/).filter((part) => part !== "" && part !== ".");
}

function resolve(tree: FakeFsTree, path: string): FakeFsTree | "file" | "symlink" | undefined {
  let node: FakeFsTree | "file" | "symlink" = tree;
  for (const part of splitPath(path)) {
    if (typeof node !== "object") {
      return undefined;
    }
    const child: FakeFsTree | "file" | "symlink" | undefined = node[part];
    if (child === undefined) {
      return undefined;
    }
    node = child;
  }
  return node;
}

/**
 * Builds an in-memory `FsHost` from a {@link FakeFsTree} description, for
 * testing filesystem-aware rules without touching the real filesystem.
 */
export function fakeFsHost(tree: FakeFsTree): FsHost {
  return {
    kind(path) {
      const node = resolve(tree, path);
      if (node === undefined) {
        return "missing";
      }
      if (node === "file" || node === "symlink") {
        return node;
      }
      return "dir";
    },

    readdir(path) {
      const node = resolve(tree, path);
      if (node === undefined || typeof node !== "object") {
        return null;
      }
      return Object.keys(node);
    },
  };
}
