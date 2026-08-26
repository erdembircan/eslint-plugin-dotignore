import type { RuleDefinition, RuleVisitor } from "@eslint/core";
import type { GitignoreLanguageOptions } from "../language/language.js";
import type {
  GitignoreNode,
  GitignoreSourceCode,
} from "../language/source-code.js";

/**
 * Shorthand for defining an eslint-plugin-dotignore rule: fixes `LangOptions`,
 * `Code`, `Visitor`, and `Node` to our language's types, leaving only the
 * per-rule `RuleOptions` and `MessageIds` to specify.
 */
export type GitignoreRuleDefinition<
  RuleOptions extends unknown[] = [],
  MessageIds extends string = string,
> = RuleDefinition<{
  LangOptions: GitignoreLanguageOptions;
  Code: GitignoreSourceCode;
  RuleOptions: RuleOptions;
  Visitor: RuleVisitor;
  Node: GitignoreNode;
  MessageIds: MessageIds;
  ExtRuleDocs: unknown;
}>;
