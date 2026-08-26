# dotignore/no-misplaced-globstar

📝 Disallow '**' in positions where it loses its special meaning.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🔒 `strict`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

`**` is only special as `**/`, `/**`, or `/**/`. Anywhere else the spec demotes it to a plain `*` — almost never what the author intended. The fix rewrites it to the single `*` it actually behaves as.

## Examples

Incorrect:

```gitignore
a**b
***
**a
```

Correct:

```gitignore
**
**/foo
foo/**
a/**/b
a*b
```

Fixable: the misplaced run of `*` is rewritten to a single `*`.

Before:

```gitignore
a**b
```

After:

```gitignore
a*b
```
