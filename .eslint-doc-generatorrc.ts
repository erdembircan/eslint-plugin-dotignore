import prettier from "prettier";
import type { GenerateOptions } from "eslint-doc-generator";

/**
 * Our docs (README.md, docs/rules/*.md) are Prettier-formatted like every
 * other file in the repo, and the `prettier/prettier` ESLint rule (run via
 * `pnpm lint`) checks them along with everything else. eslint-doc-generator
 * doesn't read Prettier config on its own, so its raw output can disagree
 * with that check even when the content itself is correct. Running Prettier
 * as a postprocess step (the pattern documented in eslint-doc-generator's
 * own README) keeps generated output and `pnpm lint` in agreement without
 * hand-formatting anything.
 */
const config: GenerateOptions = {
  postprocess: async (content, path) => {
    const fileInfo = await prettier.getFileInfo(path, {
      ignorePath: ".prettierignore",
    });
    if (fileInfo.ignored) {
      return content;
    }

    const options = await prettier.resolveConfig(path, {
      editorconfig: true,
    });
    return prettier.format(content, { ...options, filepath: path });
  },
};

export default config;
