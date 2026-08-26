import type { Plugin } from "@eslint/core";
import { buildConfigs } from "./configs.js";
import { gitignoreLanguage } from "./language/language.js";
import { rules } from "./rules/index.js";

// Defined without `configs` first, then assigned below, so the config
// objects can reference this very plugin object (the standard ESLint
// self-referencing plugin pattern).
const plugin: Plugin = {
  meta: {
    name: "eslint-plugin-dotignore",
    // Must be kept in sync with the "version" field in package.json.
    version: "1.0.0",
  },
  languages: {
    gitignore: gitignoreLanguage,
  },
  rules,
};

plugin.configs = buildConfigs(plugin);

export default plugin;
export { gitignoreLanguage, rules };
