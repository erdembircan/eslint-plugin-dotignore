# eslint-plugin-dotignore

Lint, sort, group, and fix `.gitignore` files with ESLint.

Git never complains about a `.gitignore` — it silently ignores what it can't parse, silently skips negations that can never apply, and happily tolerates duplicates, dead patterns, and trailing whitespace that changes nothing. This plugin makes all of that visible, and fixes most of it automatically.

## Highlights

- **Real parsing, not regex guessing** — a dedicated gitignore language for ESLint's language API, with a proper AST, exact ranges, and spec-faithful semantics.
- **Finds dead lines** — negations Git can never apply, patterns already covered by earlier ones, `**` that silently degrades to `*`.
- **Keeps files tidy** — alphabetical sorting and folder/file grouping with configurable headings, done without ever changing what Git actually ignores.
- **Safe autofixes** — every fix is semantics-preserving; when a reorder could change behavior, the rule declines instead of guessing.
- **A reusable parser** — import `eslint-plugin-dotignore/parser` and get the AST with zero ESLint baggage.

## Installation

```sh
pnpm add -D eslint eslint-plugin-dotignore
```

Requires ESLint ≥ 9.7.0 (flat config) and Node ≥ 22.18.

## Usage

```js
// eslint.config.js
import dotignore from "eslint-plugin-dotignore";

export default [dotignore.configs.recommended];
```

That's it — `.gitignore` files are now linted. Prefer full control? Wire it manually:

```js
import dotignore from "eslint-plugin-dotignore";

export default [
  {
    files: ["**/.gitignore"],
    plugins: { dotignore },
    language: "dotignore/gitignore",
    rules: {
      "dotignore/sort-patterns": "warn",
      "dotignore/group-patterns": "warn",
    },
  },
];
```

## Rules

<!-- begin auto-generated rules list -->

🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).\
💡 Manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

| Name                                                                     | Description                                                                 | 🔧  | 💡  |
| :----------------------------------------------------------------------- | :-------------------------------------------------------------------------- | :-- | :-- |
| [comment-spacing](docs/rules/comment-spacing.md)                         | enforce consistent spacing after '#' in comments                            | 🔧  |     |
| [group-patterns](docs/rules/group-patterns.md)                           | group directory-only patterns and file patterns under configurable headings | 🔧  |     |
| [leading-slash-style](docs/rules/leading-slash-style.md)                 | enforce a consistent leading-slash style for anchored patterns              | 🔧  |     |
| [max-consecutive-blank-lines](docs/rules/max-consecutive-blank-lines.md) | limit consecutive blank lines                                               | 🔧  |     |
| [no-backslash-path](docs/rules/no-backslash-path.md)                     | disallow backslash as a path separator                                      |     | 💡  |
| [no-duplicate-pattern](docs/rules/no-duplicate-pattern.md)               | disallow duplicate and equivalent patterns                                  | 🔧  |     |
| [no-empty-group](docs/rules/no-empty-group.md)                           | disallow group headings with no patterns under it                           | 🔧  |     |
| [no-empty-path-segment](docs/rules/no-empty-path-segment.md)             | disallow empty path segments                                                |     | 💡  |
| [no-invalid-syntax](docs/rules/no-invalid-syntax.md)                     | disallow patterns that violate the gitignore specification                  |     |     |
| [no-misplaced-globstar](docs/rules/no-misplaced-globstar.md)             | disallow '**' in positions where it loses its special meaning               | 🔧  |     |
| [no-redundant-pattern](docs/rules/no-redundant-pattern.md)               | disallow patterns already covered by an earlier pattern                     | 🔧  |     |
| [no-trailing-whitespace](docs/rules/no-trailing-whitespace.md)           | disallow unescaped trailing whitespace                                      | 🔧  |     |
| [no-unreachable-negation](docs/rules/no-unreachable-negation.md)         | disallow negations that Git can never apply                                 |     | 💡  |
| [require-dir-slash](docs/rules/require-dir-slash.md)                     | require a trailing slash on patterns that match existing directories        | 🔧  |     |
| [sort-patterns](docs/rules/sort-patterns.md)                             | enforce alphabetical ordering of patterns                                   | 🔧  |     |

<!-- end auto-generated rules list -->

## Presets

- `configs.recommended` — spec violations and dead patterns as errors, whitespace and style hygiene as warnings. Reordering rules (`sort-patterns`, `group-patterns`) and the filesystem-aware `require-dir-slash` stay off — enable them deliberately.
- `configs.strict` — every rule as an error.

## The parser, standalone

The gitignore parser is exported on its own, free of any ESLint dependency:

```js
import { parse } from "eslint-plugin-dotignore/parser";

const ast = parse("node_modules/\n!keep.txt\n");
```

Text in, AST out — every line classified as `Pattern`, `Comment`, or `BlankLine`, with exact ranges and locations. Useful for codemods, editor tooling, or anything else that needs to understand a `.gitignore` without string surgery.

## License

[MIT](LICENSE) © Erdem Bircan
