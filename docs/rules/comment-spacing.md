# dotignore/comment-spacing

📝 Enforce consistent spacing after '#' in comments.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Enforces one consistent style for comments — by default a space after `#`, matching how gitignore files are commonly written.

## Options

- `"always"` (default) — require a space after `#`.
- `"never"` — disallow a space after `#`.

A bare `#` with no text after it is always valid, regardless of the option.

## Examples

With the default `"always"` option:

Incorrect:

```gitignore
#comment
```

Correct:

```gitignore
# comment
#
```

With the `"never"` option:

Incorrect:

```gitignore
# comment
```

Correct:

```gitignore
#comment
```

Fixable: the space is inserted or removed after `#` as needed.

Before:

```gitignore
#comment
```

After:

```gitignore
# comment
```
