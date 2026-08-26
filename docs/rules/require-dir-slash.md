# dotignore/require-dir-slash

📝 Require a trailing slash on patterns that match existing directories.

💼 This rule is enabled in the 🔒 `strict` config.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

When a pattern matches something that exists as a directory, a trailing `/` states that intent and stops the pattern from ever swallowing a same-named file. This rule checks the filesystem, so it only fires on patterns that resolve to real directories — and it never touches symlinks, which a trailing slash would stop matching.

## Examples

Assuming `node_modules/` exists as a directory next to the linted `.gitignore`:

Incorrect:

```gitignore
node_modules
```

Correct:

```gitignore
node_modules/
```

Assuming `README.md` is a regular file and `link` is a symlink, both are left alone:

```gitignore
README.md
link
```

Fixable: a trailing `/` is appended.

Before:

```gitignore
node_modules
```

After:

```gitignore
node_modules/
```
