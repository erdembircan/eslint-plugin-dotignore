import { RuleTester } from "eslint";
import plugin from "../../src/index.js";

/**
 * A `RuleTester` preconfigured with our plugin and its `gitignore` language,
 * so individual rule test files only need to supply a rule and its
 * valid/invalid cases — no per-file config boilerplate.
 */
export const ruleTester = new RuleTester({
  plugins: { dotignore: plugin },
  language: "dotignore/gitignore",
});
