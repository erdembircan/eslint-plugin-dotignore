# dotignore/no-backslash-path

📝 Disallow backslash as a path separator.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🔒 `strict`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

In gitignore, `\` escapes the next character — it is never a path separator. A Windows-style `foo\bar` matches a file literally named `foobar`, not a path. Use `/` on every platform.

## Examples

Incorrect:

```gitignore
a\bc
\5
```

Correct:

```gitignore
a/bc
/5
```

Not fixable directly (the rule has a suggestion instead, since a suggestion requires the user to confirm the change).

Suggestion: replaces the backslash with `/`.

Before:

```gitignore
a\bc
```

After applying the suggestion:

```gitignore
a/bc
```
