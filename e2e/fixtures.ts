/**
 * Every finding here is auto-fixable, and the fix converges to a clean
 * (zero-message) file in a single real `--fix` invocation -- verified
 * empirically (ESLint's CLI already loops internally to fix-point on its
 * own, so no manual "run --fix twice" is needed here). Deliberately
 * distinct from `MESSY_LF` below: that fixture's whole point is to also
 * cover the three *unfixable* (suggestion-only) rules, which would leave
 * real findings behind after `--fix` and never reach exit code 0.
 */
const FIXABLE_ONLY_LINES = ["docs  ", "foo/", "bar", "docs", "/dist/main"];

export const FIXABLE_ONLY_LF = `${FIXABLE_ONLY_LINES.join("\n")}\n`;
export const FIXABLE_ONLY_CRLF = `${FIXABLE_ONLY_LINES.join("\r\n")}\r\n`;

/** Verified (see cli-fix-lf.test.ts) to converge in one `--fix` pass to
 * exactly this, byte for byte. */
export const FIXABLE_ONLY_LF_FIXED =
  "# files\nbar\ndist/main\ndocs\n\n# folders\nfoo/\n";
export const FIXABLE_ONLY_CRLF_FIXED =
  "# files\r\nbar\r\ndist/main\r\ndocs\r\n\r\n# folders\r\nfoo/\r\n";

/**
 * Triggers 8 distinct rules across every rule category the plugin ships
 * (spec violations, dead patterns, style/whitespace, and both reordering
 * rules), confirmed empirically via a raw `--format json` run. 3 of the 9
 * total findings (no-unreachable-negation, no-backslash-path,
 * no-empty-path-segment) are suggestion-only, not auto-fixable -- exactly
 * why this fixture is for the "many distinct findings" test, not the
 * "--fix converges" ones above.
 */
export const MESSY_LF =
  [
    "foo  ",
    "node_modules/",
    "!node_modules/keep",
    "a\\bc",
    "foo//bar",
    "docs",
    "docs",
    "/dist/main",
  ].join("\n") + "\n";

export const MESSY_LF_EXPECTED_RULE_IDS = [
  "dotignore/group-patterns",
  "dotignore/leading-slash-style",
  "dotignore/no-backslash-path",
  "dotignore/no-duplicate-pattern",
  "dotignore/no-empty-path-segment",
  "dotignore/no-trailing-whitespace",
  "dotignore/no-unreachable-negation",
  "dotignore/sort-patterns",
].sort();
