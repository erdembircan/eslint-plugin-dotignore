# dotignore/no-redundant-pattern

📝 Disallow patterns already covered by another pattern.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🔒 `strict`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Flags patterns whose matches are entirely covered by another pattern, like `dist/foo.js` alongside `dist/`. Coverage is decided by real pattern containment, not string prefixes, so globs are handled correctly — and the rule stays silent whenever a negation could make the 'redundant' line matter.

## Examples

Incorrect:

```gitignore
a/*
a/b/c
```

```gitignore
foo
foo/bar
foo/bar/baz
```

Correct:

```gitignore
a/*.js
a/b/c.js
```

```gitignore
foo
!foo/bar
```

```gitignore
a/*
!a/b
a/b/c
```

Fixable: whichever line is redundant is removed, regardless of whether it comes before or after the pattern that covers it.

Before:

```gitignore
a/*
a/b/c
```

After:

```gitignore
a/*
```

A pattern can just as well be covered by one that comes _after_ it — coverage isn't order-dependent, so the earlier line is the one removed here:

Before:

```gitignore
a/b/c
a/*
```

After:

```gitignore
a/*
```
