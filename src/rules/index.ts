import type { RuleDefinition } from "@eslint/core";

/**
 * The rule registry for eslint-plugin-dotignore, keyed by rule name (without
 * the "dotignore/" prefix). Empty for now — Phases 4 and 5 populate this with
 * the actual rule implementations.
 */
export const rules: Record<string, RuleDefinition> = {};
