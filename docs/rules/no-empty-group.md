# dotignore/no-empty-group

📝 Disallow group headings with no patterns under it.

💼⚠️ This rule is enabled in the 🔒 `strict` config. This rule _warns_ in the ✅ `recommended` config.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

A grouping heading with no patterns beneath it is leftover structure. This rule removes the noise.

## Examples

Incorrect:

```gitignore
# empty group
```

```gitignore
# empty group

# real group
foo
```

Correct:

```gitignore
# real group
foo
```

Fixable: the empty heading block (and any immediately following blank lines) is removed.

Before:

```gitignore
# empty group

# real group
foo
```

After:

```gitignore
# real group
foo
```
