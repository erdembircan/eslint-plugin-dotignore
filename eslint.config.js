import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import eslintPlugin from "eslint-plugin-eslint-plugin";
import nodePlugin from "eslint-plugin-n";
// Statically imported from the built output rather than `src/` -- this
// dogfoods the actual shipped bundle against the repo's own `.gitignore`,
// not the TypeScript source. That means `pnpm build` must run before this
// config can be loaded at all; the `lint` script guarantees that ordering
// (see package.json), and it's a deliberate build-before-lint tradeoff
// rather than an oversight -- no jiti/ts-node loader here to paper over it.
import dotignore from "./dist/index.js";

export default tseslint.config(
  {
    ignores: ["dist", "coverage", "node_modules"],
  },
  {
    files: ["src/**/*.ts", "test/**/*.ts", "*.config.ts", "*.config.js"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.config.ts", "*.config.js"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Interface methods (e.g. the Language API's parse/createSourceCode)
      // sometimes require a parameter we don't use; underscore-prefixing it
      // documents that intentionally.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Plugin-author linting, per ESLint's own plugin-development docs
    // (https://eslint.org/docs/latest/extend/plugins). Scoped to the rule
    // implementations themselves, not the whole rules/ directory (types.ts,
    // utils.ts, fs-host.ts, index.ts aren't rule files, and this preset's
    // rule-shape checks are harmless no-ops on them regardless).
    files: ["src/rules/**/*.ts"],
    extends: [eslintPlugin.configs.recommended],
  },
  {
    // Node-compat linting for the whole source tree. Reads the supported
    // Node range from `package.json`'s `engines` field by default; set
    // explicitly here too so it's unambiguous and doesn't silently drift
    // if that field's exact value or lookup ever changes.
    files: ["src/**/*.ts"],
    extends: [nodePlugin.configs["flat/recommended-module"]],
    settings: {
      node: { version: ">=22.18.0" },
    },
  },
  {
    // `eslint-plugin-prettier/recommended` ships with no `files` scoping of
    // its own (it's meant to apply universally), which collides with our
    // `.gitignore` dogfooding: Prettier has no parser for gitignore syntax,
    // so letting `prettier/prettier` reach it produces a hard parsing
    // error, not just a missed check. Scoped here to the same JS/TS files
    // as the rest of this config instead.
    ...prettierRecommended,
    files: ["src/**/*.ts", "test/**/*.ts", "*.config.ts", "*.config.js"],
  },
  dotignore.configs.strict,
);
