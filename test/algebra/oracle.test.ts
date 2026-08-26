import ignoreFactory from "ignore";
import { describe, expect, it } from "vitest";
import { analyze } from "../../src/algebra/analyze.js";
import { subsumes } from "../../src/algebra/subsumes.js";

/**
 * Each case validates `subsumes` against the `ignore` package (a real
 * gitignore-semantics implementation) on concrete sample paths.
 *
 * - `expected: true` (a positive case): every sample path that `b` ignores must
 *   also be ignored by `a` — the soundness property `subsumes` claims.
 * - `expected: false` (a negative case): at least one `samples` entry must be a
 *   witness — a path `b` ignores that `a` does not — proving the two patterns
 *   are not in a subsumption relationship.
 *
 * Note on case sensitivity: the `ignore` package is looser than real git about
 * ASCII case (e.g. it treats `[^0-9a-z]` as excluding `A` too, and a lowercase
 * literal pattern matches an uppercase path). That makes it an unreliable
 * oracle for that one slice of behavior, so every case below is deliberately
 * case-uniform — no case-crossing samples — to avoid asserting anything
 * against a part of the oracle we don't trust. Our own engine is
 * case-sensitive and byte-exact; that is covered directly in subsumes.test.ts
 * without involving this oracle.
 */
interface OracleCase {
  a: string;
  b: string;
  expected: boolean;
  samples: string[];
}

const cases: OracleCase[] = [
  // --- positive musts (per the amended phase-2 spec) ---
  { a: "dist/", b: "dist/foo.js", expected: true, samples: ["dist/foo.js"] },
  { a: "dist", b: "dist/foo.js", expected: true, samples: ["dist/foo.js"] },
  { a: "*.log", b: "debug.log", expected: true, samples: ["debug.log"] },
  { a: "*.log", b: "*.log", expected: true, samples: ["debug.log", "x.log"] },
  { a: "**/foo", b: "foo", expected: true, samples: ["foo", "a/foo"] },
  { a: "foo", b: "**/foo", expected: true, samples: ["foo", "a/foo"] },
  { a: "a/**", b: "a/b/c", expected: true, samples: ["a/b/c"] },
  { a: "a/**/b", b: "a/x/y/b", expected: true, samples: ["a/x/y/b"] },
  { a: "foo/", b: "foo/", expected: true, samples: ["foo/x"] },
  { a: "*.l?g", b: "*.log", expected: true, samples: ["a.log"] },
  { a: "[a-z].txt", b: "q.txt", expected: true, samples: ["q.txt"] },
  { a: "foo", b: "foo/bar", expected: true, samples: ["foo/bar"] },
  { a: "/*", b: "/x", expected: true, samples: ["x"] },
  // Directory cascade (rule 2, deliberately dirOnly-agnostic): "a/*" matches
  // "a/b", and "a/b" is necessarily a directory whenever "a/b/c" exists, so
  // ignoring it recursively ignores "a/b/c" too. Moved here from
  // negative-musts per orchestrator decision.
  { a: "a/*", b: "a/b/c", expected: true, samples: ["a/b/c"] },

  // --- negative musts (per the amended phase-2 spec) ---
  { a: "foo/", b: "foo", expected: false, samples: ["foo"] },
  {
    a: "dist/foo.js",
    b: "dist/",
    expected: false,
    samples: ["dist/other.txt"],
  },
  { a: "*.log", b: "*.txt", expected: false, samples: ["x.txt"] },
  { a: "a/**", b: "a", expected: false, samples: ["a"] },
  { a: "?.txt", b: "ab.txt", expected: false, samples: ["ab.txt"] },
  { a: "[a-c]", b: "[a-d]", expected: false, samples: ["d"] },
  { a: "foo/bar", b: "bar", expected: false, samples: ["bar"] },
  // Replacement for the retracted (a/*, a/b/c): star-vs-depth WITHOUT
  // directory cascade. "a/*.js" doesn't match the intermediate directory
  // "a/b" (no ".js" suffix), so there's no directory to cascade through.
  { a: "a/*.js", b: "a/b/c.js", expected: false, samples: ["a/b/c.js"] },

  // --- 18 more mixed cases ---
  {
    a: "node_modules/",
    b: "node_modules/pkg/index.js",
    expected: true,
    samples: ["node_modules/pkg/index.js"],
  },
  { a: "*.min.js", b: "app.min.js", expected: true, samples: ["app.min.js"] },
  {
    a: "**/build/**",
    b: "src/build/output/file.js",
    expected: true,
    samples: ["src/build/output/file.js"],
  },
  { a: "[0-9]", b: "[0-4]", expected: true, samples: ["0", "4"] },
  { a: "[0-4]", b: "[0-9]", expected: false, samples: ["9"] },
  { a: "*.[jJ][sS]", b: "*.js", expected: true, samples: ["app.js"] },
  { a: "[^0-9]", b: "[^0-9a-z]", expected: true, samples: ["_", "-"] },
  { a: "src/", b: "lib/index.js", expected: false, samples: ["lib/index.js"] },
  {
    a: "docs/**",
    b: "docs/api/v1/readme.md",
    expected: true,
    samples: ["docs/api/v1/readme.md"],
  },
  {
    a: "**/*.test.js",
    b: "src/components/Button.test.js",
    expected: true,
    samples: ["src/components/Button.test.js"],
  },
  { a: "*.js", b: "*.jsx", expected: false, samples: ["app.jsx"] },
  { a: "?", b: "[0-9]", expected: true, samples: ["0", "5"] },
  { a: "[0-9]", b: "?", expected: false, samples: ["x"] },
  {
    a: "**",
    b: "anything/at/all.txt",
    expected: true,
    samples: ["anything/at/all.txt"],
  },
  { a: "a/b/", b: "a/b/c/d.txt", expected: true, samples: ["a/b/c/d.txt"] },
  {
    a: "*.log",
    b: "sub/debug.log",
    expected: true,
    samples: ["sub/debug.log"],
  },
  {
    a: "/config.js",
    b: "config.js",
    expected: false,
    samples: ["sub/config.js"],
  },
  { a: "config.js", b: "/config.js", expected: true, samples: ["config.js"] },
  {
    a: "**/*.min.css",
    b: "dist/app.min.css",
    expected: true,
    samples: ["dist/app.min.css"],
  },
];

describe("oracle: subsumes agrees with the `ignore` package on sample paths", () => {
  it.each(cases)(
    "subsumes(%j, %j) === $expected",
    ({ a, b, expected, samples }) => {
      const ours = subsumes(analyze(a), analyze(b));
      expect(ours).toBe(expected);

      const ignoreA = ignoreFactory().add(a);
      const ignoreB = ignoreFactory().add(b);

      if (expected) {
        for (const path of samples) {
          if (ignoreB.ignores(path)) {
            expect(ignoreA.ignores(path)).toBe(true);
          }
        }
      } else {
        const hasWitness = samples.some(
          (path) => ignoreB.ignores(path) && !ignoreA.ignores(path),
        );
        expect(hasWitness).toBe(true);
      }
    },
  );
});
