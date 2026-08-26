# dotignore/no-duplicate-pattern

📝 Disallow duplicate and equivalent patterns.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🔒 `strict`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

A repeated pattern adds nothing. Beyond exact repeats, this rule also catches spec-equivalent spellings of the same pattern — `/doc/frotz` versus `doc/frotz`, or `**/foo` versus `foo` — which Git treats identically.

## Options

- `includeEquivalents` (boolean, default `true`) — also flag spec-equivalent (not just byte-identical) patterns, such as `**/foo` and `foo`. Set to `false` to only flag exact duplicates.

## Examples

Incorrect:

```gitignore
foo
foo
```

```gitignore
**/foo
foo
```

Correct:

```gitignore
foo
!foo
```

```gitignore
foo
bar
foo
```

With `{ "includeEquivalents": false }`, the following is correct (left to the default configuration to flag instead):

```gitignore
**/foo
foo
```

Fixable: the later (duplicate or equivalent) line is removed.

Before:

```gitignore
foo
foo
```

After:

```gitignore
foo
```
