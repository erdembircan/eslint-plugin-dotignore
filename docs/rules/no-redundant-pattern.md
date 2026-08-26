# dotignore/no-redundant-pattern

📝 Disallow patterns already covered by an earlier pattern.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🔒 `strict`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Flags patterns whose matches are entirely covered by an earlier pattern, like `dist/foo.js` after `dist/`. Coverage is decided by real pattern containment, not string prefixes, so globs are handled correctly — and the rule stays silent whenever a later negation could make the 'redundant' line matter.

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

Fixable: the redundant later line is removed.

Before:

```gitignore
a/*
a/b/c
```

After:

```gitignore
a/*
```
