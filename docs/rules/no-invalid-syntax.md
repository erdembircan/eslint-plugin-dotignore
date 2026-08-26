# dotignore/no-invalid-syntax

📝 Disallow patterns that violate the gitignore specification.

<!-- end auto-generated rule header -->

Catches patterns the gitignore specification declares invalid or that can never match: a trailing unescaped backslash, an unclosed or empty character class, a reversed range, a lone `!` or `/`.

## Examples

Incorrect:

```gitignore
foo\
[abc
[]
[z-a]
!
/
```

Correct:

```gitignore
foo
[abc]
[a-z]
!foo
/foo
foo/
```

Not fixable and has no suggestions — these patterns are simply invalid, and there's no single safe rewrite to suggest.
