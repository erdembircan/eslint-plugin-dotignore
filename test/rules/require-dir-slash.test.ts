import { describe } from "vitest";
import { createRequireDirSlashRule } from "../../src/rules/require-dir-slash.js";
import { fakeFsHost } from "../utils/fake-fs-host.js";
import { ruleTester } from "../utils/rule-tester.js";

const FILENAME = "/repo/.gitignore";

describe("require-dir-slash", () => {
  ruleTester.run(
    "require-dir-slash (literal patterns)",
    createRequireDirSlashRule(
      fakeFsHost({
        repo: {
          node_modules: { pkg: {} },
          "README.md": "file",
          link: "symlink",
        },
      }),
    ),
    {
      valid: [
        { code: "README.md", filename: FILENAME },
        { code: "link", filename: FILENAME },
        { code: "does-not-exist", filename: FILENAME },
        // No filename (defaults to "<input>"): rule is silent entirely,
        // even though "node_modules" would otherwise match a directory.
        "node_modules",
        // Negated and already-dirOnly patterns are out of scope.
        { code: "!node_modules", filename: FILENAME },
        { code: "node_modules/", filename: FILENAME },
      ],
      invalid: [
        {
          code: "node_modules",
          filename: FILENAME,
          errors: [
            { messageId: "missingSlash", data: { pattern: "node_modules" } },
          ],
          output: "node_modules/",
        },
        {
          // Multi-segment literal path, still root-relative only.
          code: "node_modules/pkg",
          filename: FILENAME,
          errors: [
            {
              messageId: "missingSlash",
              data: { pattern: "node_modules/pkg" },
            },
          ],
          output: "node_modules/pkg/",
        },
      ],
    },
  );

  ruleTester.run(
    "require-dir-slash (globstar skip)",
    createRequireDirSlashRule(fakeFsHost({ repo: { foo: { bar: {} } } })),
    {
      valid: [
        { code: "**", filename: FILENAME },
        { code: "foo/**", filename: FILENAME },
        { code: "**/foo", filename: FILENAME },
      ],
      invalid: [],
    },
  );

  ruleTester.run(
    "require-dir-slash (glob walk, single segment)",
    createRequireDirSlashRule(
      fakeFsHost({ repo: { src: {}, lib: {}, "notes.txt": "file" } }),
    ),
    {
      valid: [
        // Mixed matches (a file among the directories): silent.
        { code: "*", filename: FILENAME },
      ],
      invalid: [],
    },
  );

  ruleTester.run(
    "require-dir-slash (glob walk, all matches are directories)",
    createRequireDirSlashRule(fakeFsHost({ repo: { src: {}, lib: {} } })),
    {
      valid: [],
      invalid: [
        {
          code: "*",
          filename: FILENAME,
          errors: [{ messageId: "missingSlash", data: { pattern: "*" } }],
          output: "*/",
        },
      ],
    },
  );

  ruleTester.run(
    "require-dir-slash (glob walk, multi-segment)",
    createRequireDirSlashRule(
      fakeFsHost({ repo: { src: { components: {}, utils: {} } } }),
    ),
    {
      valid: [],
      invalid: [
        {
          code: "src/*",
          filename: FILENAME,
          errors: [{ messageId: "missingSlash", data: { pattern: "src/*" } }],
          output: "src/*/",
        },
      ],
    },
  );

  ruleTester.run(
    "require-dir-slash (glob walk, no matches at an intermediate level)",
    createRequireDirSlashRule(fakeFsHost({ repo: { src: {} } })),
    {
      valid: [
        // "missing/*" -- readdir(repo/missing) returns null (doesn't
        // exist), so the candidate set is empty after the first segment.
        { code: "missing/*", filename: FILENAME },
      ],
      invalid: [],
    },
  );

  ruleTester.run(
    "require-dir-slash (glob walk, a matched candidate is not a directory)",
    createRequireDirSlashRule(
      fakeFsHost({ repo: { src: { "a.txt": "file", b: {} } } }),
    ),
    {
      valid: [
        // The '*' at the middle level matches both "a.txt" and "b"; since
        // "a.txt" is a file, readdir() on it returns null mid-walk, which
        // must be skipped rather than crash the walk.
        { code: "src/*/x", filename: FILENAME },
      ],
      invalid: [],
    },
  );

  const manyEntries: Record<string, Record<string, never>> = {};
  for (let i = 0; i < 600; i += 1) {
    manyEntries[`dir${i}`] = {};
  }

  ruleTester.run(
    "require-dir-slash (walk cap)",
    createRequireDirSlashRule(fakeFsHost({ repo: manyEntries })),
    {
      // Exceeds the 512-entry visit cap partway through, so the walk
      // aborts silently rather than reporting (even though every entry
      // here actually is a directory).
      valid: [{ code: "*", filename: FILENAME }],
      invalid: [],
    },
  );
});
