import prettier from "prettier";

/**
 * Our docs (README.md, docs/rules/*.md) are Prettier-formatted like every
 * other file in the repo, and `pnpm format` checks them along with
 * everything else. eslint-doc-generator doesn't read Prettier config on its
 * own, so its raw output can disagree with `prettier --check` even when the
 * content itself is correct. Running Prettier as a postprocess step (the
 * pattern documented in eslint-doc-generator's own README) keeps generated
 * output and `pnpm format` in agreement without hand-formatting anything.
 *
 * @type {import("eslint-doc-generator").GenerateOptions}
 */
const config = {
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
