# dotignore/no-trailing-whitespace

📝 Disallow unescaped trailing whitespace.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Git silently discards unescaped trailing whitespace, so it can only mislead readers about what the pattern is. Escaped trailing spaces (`\ `) are meaningful and left alone.

## Examples

Incorrect:

```gitignore
foo
# comment

```

Correct:

```gitignore
foo
# comment
```

Fixable: the trailing whitespace is stripped in place.

Before:

```gitignore
foo
```

After:

```gitignore
foo
```
