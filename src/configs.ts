import type { ConfigObject, Plugin, SeverityName } from "@eslint/core";
import { rules } from "./rules/index.js";

/**
 * Severities for the curated "recommended" config. Only rules whose id
 * actually exists in the {@link rules} registry are ever included in a built
 * config (see {@link buildConfigs}), so this list can safely name rules from
 * later phases ahead of time — the config stays correct as each rule lands.
 *
 * `sort-patterns`, `group-patterns`, and `require-dir-slash` are intentionally
 * absent: they're opinionated formatting rules, not part of "recommended".
 */
const recommendedSeverities: Record<string, SeverityName> = {
  "no-invalid-syntax": "error",
  "no-duplicate-pattern": "error",
  "no-redundant-pattern": "error",
  "no-unreachable-negation": "error",
  "no-backslash-path": "error",
  "no-empty-path-segment": "error",
  "no-misplaced-globstar": "error",
  "no-trailing-whitespace": "warn",
  "comment-spacing": "warn",
  "max-consecutive-blank-lines": "warn",
  "no-empty-group": "warn",
  "leading-slash-style": "warn",
};

/**
 * Filters `severities` down to rules that exist in the registry, and
 * prefixes each surviving key with "dotignore/". Severities only — configs
 * never carry rule options.
 */
function toRegisteredRuleEntries(
  severities: Record<string, SeverityName>,
): Record<string, SeverityName> {
  const entries: Record<string, SeverityName> = {};

  for (const [ruleName, severity] of Object.entries(severities)) {
    if (ruleName in rules) {
      entries[`dotignore/${ruleName}`] = severity;
    }
  }

  return entries;
}

/**
 * Builds the `recommended` and `strict` shareable configs for the plugin.
 * @param plugin The plugin object to self-reference in each config's
 * `plugins` field. Built after the plugin's other members are defined, per
 * the standard self-referencing plugin pattern.
 */
export function buildConfigs(plugin: Plugin): {
  recommended: ConfigObject;
  strict: ConfigObject;
} {
  const strictSeverities: Record<string, SeverityName> = {};
  for (const ruleName of Object.keys(rules)) {
    strictSeverities[ruleName] = "error";
  }

  return {
    recommended: {
      files: ["**/.gitignore"],
      plugins: { dotignore: plugin },
      language: "dotignore/gitignore",
      rules: toRegisteredRuleEntries(recommendedSeverities),
    },
    strict: {
      files: ["**/.gitignore"],
      plugins: { dotignore: plugin },
      language: "dotignore/gitignore",
      rules: toRegisteredRuleEntries(strictSeverities),
    },
  };
}
