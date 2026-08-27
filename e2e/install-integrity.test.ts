import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { consumerDir } from "./helpers.js";

/**
 * A plain `import("eslint-plugin-dotignore")` from this file would resolve
 * against the repo's OWN node_modules (Node resolves relative to the
 * importing module's location, not cwd), never reaching the consumer
 * project's separately-installed copy. Resolving the exact on-disk file
 * directly -- mirroring our own package.json `exports` map -- is what
 * actually proves the *installed tarball* loads and shapes up correctly,
 * which is the whole point of this test.
 */
function consumerModuleUrl(...segments: string[]): string {
  return pathToFileURL(
    path.join(
      consumerDir(),
      "node_modules",
      "eslint-plugin-dotignore",
      ...segments,
    ),
  ).href;
}

describe("install integrity", () => {
  it("loads the installed package's default export with the expected plugin shape", async () => {
    const plugin = (
      (await import(consumerModuleUrl("dist", "index.js"))) as {
        default: {
          meta: { name: string; version: string; namespace: string };
          rules: Record<string, unknown>;
          configs: { recommended: unknown; strict: unknown };
        };
      }
    ).default;

    expect(plugin.meta.name).toBe("eslint-plugin-dotignore");
    expect(plugin.meta.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(plugin.meta.namespace).toBe("dotignore");
    expect(Object.keys(plugin.rules)).toHaveLength(15);
    expect(plugin.configs.recommended).toBeDefined();
    expect(plugin.configs.strict).toBeDefined();
  });

  it("loads the installed package's parser subpath export and parses a sample file", async () => {
    const { parse } = (await import(
      consumerModuleUrl("dist", "parser.js")
    )) as {
      parse: (text: string) => { body: Array<{ type: string }> };
    };

    const ast = parse("node_modules/\n# comment\n\n!keep.txt\n");
    expect(ast.body.map((node) => node.type)).toEqual([
      "Pattern",
      "Comment",
      "BlankLine",
      "Pattern",
    ]);
  });
});
