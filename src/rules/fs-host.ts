import { lstatSync, readdirSync } from "node:fs";

/**
 * What a filesystem path currently is, from the perspective of rules that
 * need to know without caring exactly why (permission errors, races, and
 * genuinely missing paths are all just "missing").
 */
export type FsEntryKind = "dir" | "file" | "symlink" | "missing";

/**
 * The filesystem seam used by rules that need to look at the actual
 * project tree (currently just require-dir-slash). Kept minimal and
 * synchronous so rule visitors — which must be synchronous — can call it
 * directly, and so tests can substitute an in-memory fake instead of
 * touching the real filesystem.
 */
export interface FsHost {
  kind(path: string): FsEntryKind;
  readdir(path: string): string[] | null;
}

/** The real filesystem, accessed via node:fs. Any error (missing path,
 * permission denied, race condition, etc.) is treated as "missing"/null
 * rather than thrown, since callers use this purely to look, not to act. */
export const realFsHost: FsHost = {
  kind(path: string): FsEntryKind {
    try {
      const stats = lstatSync(path);
      if (stats.isSymbolicLink()) {
        return "symlink";
      }
      if (stats.isDirectory()) {
        return "dir";
      }
      if (stats.isFile()) {
        return "file";
      }
      return "missing";
    } catch {
      return "missing";
    }
  },

  readdir(path: string): string[] | null {
    try {
      return readdirSync(path);
    } catch {
      return null;
    }
  },
};
