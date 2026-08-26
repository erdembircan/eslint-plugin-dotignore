# dotignore/group-patterns

📝 Group directory-only patterns and file patterns under configurable headings.

💼 This rule is enabled in the 🔒 `strict` config.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Separates directory-only patterns (trailing `/`) from everything else and places each group under its own heading comment. Negations move together with the pattern they carve out of, as one unit, so grouping never changes what Git ignores.

## Options

- `folderHeading` (string, default `"# folders"`) — the heading comment for directory-only patterns.
- `fileHeading` (string, default `"# files"`) — the heading comment for all other patterns.
- `order` (array of `"folders"` and `"files"`, both required and unique, default `["folders", "files"]`) — when both headings need to be newly inserted, the order in which they're created.

## Examples

With the default options:

Incorrect:

```gitignore
# folders
foo
# files
bar/
```

Correct:

```gitignore
# folders
bar/
# files
foo
!foo/x
```

A file with only one kind of pattern and no headings is also correct — there's nothing to organize into two groups:

```gitignore
foo
bar
```

Fixable: a misplaced pattern (with its glued negations, if any) is moved to the end of its correct section, and a missing heading is inserted above that group's first pattern.

Before:

```gitignore
# folders
foo
# files
bar/
```

After:

```gitignore
# folders
# files
bar/
foo
```
