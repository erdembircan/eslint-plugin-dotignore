import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FIXABLE_ONLY_LF } from "./fixtures.js";
import { consumerDir, gitCheckIgnore, runEslint } from "./helpers.js";

/**
 * Deliberately includes both "foo" and "foo/nested": with pattern "foo/"
 * (directory-only) and no real "foo" directory on disk, git can't tell
 * whether the bare path "foo" refers to a file or a directory, so it does
 * NOT match a directory-only pattern -- but "foo/nested" unambiguously
 * implies "foo" is a directory, so it's ignored via "foo/"'s recursive
 * exclusion. This is real, load-bearing git behavior, not an artifact of
 * the fixture -- both are kept to prove the fixer's reordering doesn't
 * paper over that nuance in either direction.
 */
const PATHS = ["docs", "foo", "foo/nested", "bar", "dist/main", "keep.txt"];

describe("semantic identity across the fix", () => {
  it("gives git check-ignore the exact same verdict for every path before and after --fix", async () => {
    const file = path.join(consumerDir(), ".gitignore");
    await writeFile(file, FIXABLE_ONLY_LF);

    const before: Record<string, boolean> = {};
    for (const p of PATHS) {
      before[p] = (await gitCheckIgnore(p)).ignored;
    }

    const fixResult = await runEslint([".gitignore", "--fix"]);
    expect(fixResult.exitCode).toBe(0);

    const after: Record<string, boolean> = {};
    for (const p of PATHS) {
      after[p] = (await gitCheckIgnore(p)).ignored;
    }

    expect(after).toEqual(before);
    // Guard against a vacuous pass (e.g. every path ignored, or none) --
    // the fixture must actually exercise both outcomes for this
    // before/after comparison to mean anything.
    expect(Object.values(before)).toContain(true);
    expect(Object.values(before)).toContain(false);
  });
});
