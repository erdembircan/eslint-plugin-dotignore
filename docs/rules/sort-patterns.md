# dotignore/sort-patterns

📝 Enforce alphabetical ordering of patterns.

💼 This rule is enabled in the 🔒 `strict` config.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Keeps patterns in alphabetical order so entries are easy to scan and diffs stay small. Sorting never crosses a negation: because later lines win in gitignore, the rule treats every `!` line as a fixed barrier and only reorders the runs of ordinary patterns between them — a sorted file always ignores exactly what the unsorted one did.

## Options

- `direction` (`"asc"` or `"desc"`, default `"asc"`) — sort ascending or descending.
- `caseSensitive` (boolean, default `false`) — compare case-sensitively.
- `natural` (boolean, default `true`) — use natural ordering for embedded numbers (`file2` before `file10`) instead of pure code-point comparison.

## Examples

With the default options:

Incorrect:

```gitignore
banana
apple
```

```gitignore
file10
file2
```

Correct:

```gitignore
apple
banana
cherry
```

```gitignore
apple
banana
!x
cherry
date
```

With `{ "direction": "desc" }`:

Incorrect:

```gitignore
apple
banana
```

Correct:

```gitignore
cherry
banana
apple
```

Fixable: the whole unsorted run is rewritten in sorted order (each line keeps its exact text; only the order changes).

Before:

```gitignore
banana
apple
```

After:

```gitignore
apple
banana
```
