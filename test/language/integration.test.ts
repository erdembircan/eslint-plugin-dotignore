import type { ConfigObject, RuleDefinition, RuleVisitor } from "@eslint/core";
import { Linter } from "eslint";
import { describe, expect, it } from "vitest";
import type { GitignoreLanguageOptions } from "../../src/language/language.js";
import type {
  GitignoreNode,
  GitignoreSourceCode,
} from "../../src/language/source-code.js";
import plugin from "../../src/index.js";

const SAMPLE_TEXT = "node_modules/\n# comment\n\nfoo\n";

type TestRuleDefinition = RuleDefinition<{
  LangOptions: GitignoreLanguageOptions;
  Code: GitignoreSourceCode;
  RuleOptions: [];
  Visitor: RuleVisitor;
  Node: GitignoreNode;
  MessageIds: string;
  ExtRuleDocs: unknown;
}>;

function baseConfig(): ConfigObject {
  return {
    // ESLint's flat config resolution requires some config to have a `files`
    // pattern matching the given filename once one is provided (a config
    // without `files` is not treated as universal in that case) — this
    // mirrors the plugin's own `recommended`/`all` configs.
    files: ["**/.gitignore"],
    plugins: { dotignore: plugin },
    language: "dotignore/gitignore",
  };
}

describe("language integration", () => {
  it("lints valid gitignore text with the plugin's language and no rules, producing no messages", () => {
    const linter = new Linter({ configType: "flat" });
    const messages = linter.verify(SAMPLE_TEXT, baseConfig(), {
      filename: ".gitignore",
    });

    expect(messages).toEqual([]);
  });

  it("traverses every body node in source order, with 1-based line numbers, via a collector rule", () => {
    interface Visit {
      type: string;
      line: number;
      text: string | undefined;
    }

    const visits: Visit[] = [];
    const parents: unknown[] = [];

    const collectorRule: TestRuleDefinition = {
      create(context) {
        function visit(node: GitignoreNode): void {
          visits.push({
            type: node.type,
            line: node.loc.start.line,
            text: context.sourceCode.getText?.(node),
          });
          parents.push(context.sourceCode.getParent(node));
        }

        return {
          Pattern: visit,
          Comment: visit,
          BlankLine: visit,
        };
      },
    };

    const linter = new Linter({ configType: "flat" });
    const messages = linter.verify(
      SAMPLE_TEXT,
      {
        ...baseConfig(),
        plugins: {
          dotignore: plugin,
          test: { rules: { collector: collectorRule } },
        },
        rules: { "test/collector": "error" },
      },
      { filename: ".gitignore" },
    );

    expect(messages).toEqual([]);
    expect(visits).toEqual([
      { type: "Pattern", line: 1, text: "node_modules/" },
      { type: "Comment", line: 2, text: "# comment" },
      { type: "BlankLine", line: 3, text: "" },
      { type: "Pattern", line: 4, text: "foo" },
    ]);

    // getParent: every body node's parent must be the root GitignoreFile.
    expect(parents).toHaveLength(4);
    for (const parent of parents) {
      expect(parent).toMatchObject({ type: "GitignoreFile" });
    }
    // All four point at the exact same root node instance.
    expect(new Set(parents).size).toBe(1);
  });

  it("runs the fix pipeline: a rule replacing 'foo' with 'bar' fixes cleanly via verifyAndFix", () => {
    const fixFooRule: TestRuleDefinition = {
      meta: { fixable: "code" },
      create(context) {
        return {
          Pattern(node: GitignoreNode) {
            if (node.type === "Pattern" && node.pattern === "foo") {
              context.report({
                node,
                message: "replace 'foo' with 'bar'",
                fix(fixer) {
                  return fixer.replaceText(node, "bar");
                },
              });
            }
          },
        };
      },
    };

    const linter = new Linter({ configType: "flat" });
    const config: ConfigObject = {
      ...baseConfig(),
      plugins: {
        dotignore: plugin,
        test: { rules: { "fix-foo": fixFooRule } },
      },
      rules: { "test/fix-foo": "error" },
    };

    const result = linter.verifyAndFix(SAMPLE_TEXT, config, {
      filename: ".gitignore",
    });

    expect(result.output).toBe("node_modules/\n# comment\n\nbar\n");
    expect(result.fixed).toBe(true);
    expect(result.messages).toEqual([]);
  });
});
