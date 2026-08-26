# dotignore/group-patterns

📝 Group directory-only patterns and file patterns under configurable headings.

💼 This rule is enabled in the 🔒 `strict` config.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Separates directory-only patterns (trailing `/`) from everything else and places each group under its own heading comment. Negations move together with the pattern they carve out of, as one unit, so grouping never changes what Git ignores.

## Options

- `folderHeading` (string, default `"# folders"`) — the heading comment for directory-only patterns.
- `fileHeading` (string, default `"# files"`) — the heading comment for all other patterns.
- `order` (array of `"folders"` and `"files"`, both required and unique, default `["files", "folders"]`) — the order in which groups are arranged when their headings are inserted.

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

Fixable: a misplaced pattern (with its glued negations, if any) is moved to the end of its correct section. A missing heading is fixed by building that group's whole section from scratch — the heading followed by every one of its patterns gathered from wherever they already sit — and placing it relative to `order`: before an already-existing other-group section if the missing group sorts first, after it otherwise; when neither heading exists yet, both sections are built the same way, converging to `order`'s arrangement across a couple of fix passes.

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

`order` only governs arrangement when a heading is actually being inserted — it never moves an already-existing section. With the default `order` (`["files", "folders"]`) and only the folders heading missing:

Before:

```gitignore
# files
foo
bar/
```

After:

```gitignore
# files
foo

# folders
bar/
```

With `order: ["folders", "files"]` instead, the same input's missing folders section is inserted _before_ the existing files section:

```gitignore
# folders
bar/

# files
foo
```
