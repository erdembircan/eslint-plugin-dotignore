import type { RuleDefinition } from "@eslint/core";
import commentSpacing from "./comment-spacing.js";
import { realFsHost } from "./fs-host.js";
import groupPatterns from "./group-patterns.js";
import leadingSlashStyle from "./leading-slash-style.js";
import maxConsecutiveBlankLines from "./max-consecutive-blank-lines.js";
import noBackslashPath from "./no-backslash-path.js";
import noDuplicatePattern from "./no-duplicate-pattern.js";
import noEmptyGroup from "./no-empty-group.js";
import noEmptyPathSegment from "./no-empty-path-segment.js";
import noInvalidSyntax from "./no-invalid-syntax.js";
import noMisplacedGlobstar from "./no-misplaced-globstar.js";
import noRedundantPattern from "./no-redundant-pattern.js";
import noTrailingWhitespace from "./no-trailing-whitespace.js";
import noUnreachableNegation from "./no-unreachable-negation.js";
import { createRequireDirSlashRule } from "./require-dir-slash.js";
import sortPatterns from "./sort-patterns.js";

/**
 * The rule registry for eslint-plugin-dotignore, keyed by rule name (without
 * the "dotignore/" prefix).
 */
export const rules: Record<string, RuleDefinition> = {
  "comment-spacing": commentSpacing,
  "group-patterns": groupPatterns,
  "leading-slash-style": leadingSlashStyle,
  "max-consecutive-blank-lines": maxConsecutiveBlankLines,
  "no-backslash-path": noBackslashPath,
  "no-duplicate-pattern": noDuplicatePattern,
  "no-empty-group": noEmptyGroup,
  "no-empty-path-segment": noEmptyPathSegment,
  "no-invalid-syntax": noInvalidSyntax,
  "no-misplaced-globstar": noMisplacedGlobstar,
  "no-redundant-pattern": noRedundantPattern,
  "no-trailing-whitespace": noTrailingWhitespace,
  "no-unreachable-negation": noUnreachableNegation,
  "require-dir-slash": createRequireDirSlashRule(realFsHost),
  "sort-patterns": sortPatterns,
};
