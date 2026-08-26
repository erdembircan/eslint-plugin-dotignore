# dotignore/leading-slash-style

📝 Enforce a consistent leading-slash style for anchored patterns.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

A pattern with a middle slash is anchored whether or not it starts with `/` — the leading slash is purely cosmetic there. This rule enforces one consistent choice: `minimal` (omit it) or `explicit` (require it).

## Options

- `"minimal"` (default) — omit the leading `/` when the pattern is already anchored by a middle slash.
- `"explicit"` — require a leading `/` whenever the pattern is anchored by a middle slash.

## Examples

With the default `"minimal"` option:

Incorrect:

```gitignore
/foo/bar
```

Correct:

```gitignore
foo/bar
/foo
```

With the `"explicit"` option:

Incorrect:

```gitignore
foo/bar
```

Correct:

```gitignore
/foo/bar
/foo
```

Fixable: the leading `/` is added or removed (a leading `!` is preserved).

Before:

```gitignore
/foo/bar
```

After (with the default `"minimal"` option):

```gitignore
foo/bar
```
