import type { Plugin } from "@eslint/core";
import { readFileSync } from "node:fs";
import { buildConfigs } from "./configs.js";
import { gitignoreLanguage } from "./language/language.js";
import { rules } from "./rules/index.js";

interface PackageMeta {
  name: string;
  version: string;
}

// Resolved relative to this module file, so it points at the right
// package.json both from dist/index.js at runtime and from src/index.ts
// under vitest.
const packageJsonUrl = new URL("../package.json", import.meta.url);
const pkg: PackageMeta = JSON.parse(
  readFileSync(packageJsonUrl, "utf8"),
) as PackageMeta;

// Defined without `configs` first, then assigned below, so the config
// objects can reference this very plugin object (the standard ESLint
// self-referencing plugin pattern).
const plugin: Plugin = {
  meta: {
    name: pkg.name,
    version: pkg.version,
  },
  languages: {
    gitignore: gitignoreLanguage,
  },
  rules,
};

plugin.configs = buildConfigs(plugin);

export default plugin;
export { gitignoreLanguage, rules };
