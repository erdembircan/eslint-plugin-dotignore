import type { RuleDefinition } from "@eslint/core";
import commentSpacing from "./comment-spacing.js";
import leadingSlashStyle from "./leading-slash-style.js";
import maxConsecutiveBlankLines from "./max-consecutive-blank-lines.js";
import noBackslashPath from "./no-backslash-path.js";
import noDuplicatePattern from "./no-duplicate-pattern.js";
import noEmptyGroup from "./no-empty-group.js";
import noEmptyPathSegment from "./no-empty-path-segment.js";
import noInvalidSyntax from "./no-invalid-syntax.js";
import noMisplacedGlobstar from "./no-misplaced-globstar.js";
import noTrailingWhitespace from "./no-trailing-whitespace.js";

/**
 * The rule registry for eslint-plugin-dotignore, keyed by rule name (without
 * the "dotignore/" prefix). Phase 5 adds the remaining two recommended rules
 * (no-redundant-pattern, no-unreachable-negation) plus the opinionated
 * formatting rules (sort-patterns, group-patterns, require-dir-slash).
 */
export const rules: Record<string, RuleDefinition> = {
  "comment-spacing": commentSpacing,
  "leading-slash-style": leadingSlashStyle,
  "max-consecutive-blank-lines": maxConsecutiveBlankLines,
  "no-backslash-path": noBackslashPath,
  "no-duplicate-pattern": noDuplicatePattern,
  "no-empty-group": noEmptyGroup,
  "no-empty-path-segment": noEmptyPathSegment,
  "no-invalid-syntax": noInvalidSyntax,
  "no-misplaced-globstar": noMisplacedGlobstar,
  "no-trailing-whitespace": noTrailingWhitespace,
};
