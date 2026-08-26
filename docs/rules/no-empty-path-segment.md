# dotignore/no-empty-path-segment

📝 Disallow empty path segments.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

A doubled slash creates an empty path segment, and no real path has one — the pattern can never match.

## Examples

Incorrect:

```gitignore
foo//bar
foo///bar
```

Correct:

```gitignore
foo/bar
/foo
foo/
**/foo
```

Not fixable directly (the rule has a suggestion instead, since collapsing `//` to `/` changes what the pattern matches).

Suggestion: collapses `//` to `/`.

Before:

```gitignore
foo//bar
```

After applying the suggestion:

```gitignore
foo/bar
```
