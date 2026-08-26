import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
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
  prettier,
  dotignore.configs.strict,
);
