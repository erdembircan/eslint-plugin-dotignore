# dotignore/no-unreachable-negation

📝 Disallow negations that Git can never apply.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🔒 `strict`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

Git never descends into an excluded directory, so a negation for a file inside one can never apply — `foo/` followed by `!foo/bar` leaves `bar` ignored no matter what. This rule finds such dead negations and suggests excluding the directory's contents (`foo/*`) instead, which lets negations work.

## Examples

Incorrect:

```gitignore
node_modules/
!node_modules/keep
```

```gitignore
build
!build/keep.txt
```

Correct:

```gitignore
foo
!bar
```

```gitignore
a/*
!a/b
```

```gitignore
node_modules/
!temp
!node_modules/keep
```

Not fixable directly (the rule has a suggestion instead, since it edits the covering pattern's line, not the negation being reported).

Suggestion: rewrites the covering pattern to exclude only the directory's contents (appending `/*`, or `*` if it already ends in `/`), so the negation can apply.

Before:

```gitignore
node_modules/
!node_modules/keep
```

After applying the suggestion:

```gitignore
node_modules/*
!node_modules/keep
```
