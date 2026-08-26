# dotignore/max-consecutive-blank-lines

📝 Limit consecutive blank lines.

💼⚠️ This rule is enabled in the 🔒 `strict` config. This rule _warns_ in the ✅ `recommended` config.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Blank lines are separators with no matching effect. This rule caps how many may appear in a row, keeping files compact without banning visual structure.

## Options

- `max` (integer, `>= 0`, default `1`) — the maximum number of consecutive blank lines allowed.

## Examples

With the default `{ "max": 1 }`:

Incorrect:

```gitignore
a


b
```

Correct:

```gitignore
a

b
```

With `{ "max": 0 }`:

Incorrect:

```gitignore
a

b
```

Correct:

```gitignore
a
b
```

Fixable: the surplus blank lines are removed.

Before:

```gitignore
a



b
```

After (with the default `{ "max": 1 }`):

```gitignore
a

b
```
