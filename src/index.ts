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
// Named alongside `rules`/`gitignoreLanguage` above for the same reason:
// consumers who want a specific piece without pulling in the whole default
// export. Also happens to be load-bearing for eslint-doc-generator, whose
// plugin loader only unwraps a required ESM module's `default` export when
// the module has *nothing but* `default` (exactly `{ __esModule, default }`,
// the shape a Babel/tsc CJS transpilation produces) -- our module also
// named-exports `gitignoreLanguage` and `rules`, which disqualifies that
// unwrap under Node's *native* ESM-via-`require()` interop, so the
// generator ends up reading the raw module-namespace object instead of
// `plugin`. `rules` happening to be named-exported already made rule
// descriptions resolve by coincidence; `configs` needs the same treatment
// so config-membership notices resolve too.
export const configs = plugin.configs;
