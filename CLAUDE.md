# Project Instructions

## Git Workflow

Stage and commit files in logical groups (per Commit Granularity), then push to the branch's upstream remote.

### Commit Granularity

- Do not make one big commit when changes span multiple logical groups
- Group related changes together into smaller, focused commits based on their logical relationship
- Each commit should represent a single coherent unit of work
- When in doubt, prefer smaller commits over larger ones

### Commit Instructions — Conventional Commits

#### Commit Message Format

Use the following format for all commit messages:

```
[{TYPE}]: {description}
```

#### Commit Types

- **FEAT**: A new feature for the user
- **FIX**: A bug fix
- **DOCS**: Documentation only changes
- **STYLE**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **REFACTOR**: A code change that neither fixes a bug nor adds a feature
- **PERF**: A code change that improves performance
- **TEST**: Adding missing tests or correcting existing tests
- **CHORE**: Changes to the build process or auxiliary tools and libraries such as documentation generation

#### Examples

```
[FEAT]: add user authentication system
[FIX]: resolve login redirect issue
[DOCS]: update API documentation
[STYLE]: fix code formatting
[REFACTOR]: restructure user service
[PERF]: improve database query performance
[TEST]: add unit tests for payment module
[CHORE]: update dependencies
```

#### **IMPORTANT**

**DO NOT INCLUDE AI TOOL CREDITS OR CO-AUTHORSHIP ATTRIBUTION IN COMMIT MESSAGES**

Do not append session URLs or any AI tool attribution trailers to commit messages or PR bodies. Commit messages are just the `[TYPE]: description` line plus an optional body; PR bodies contain only the actual description.

#### Guidelines

- Don't list extra changes or explanations in the commit message after the main description
- Use the imperative mood in the description ("add" not "added" or "adds")
- Don't capitalize the first letter of the description
- Capitalize the type (feat, fix, etc.)
- No period at the end of the description
- Keep the description concise (50 characters or less is ideal)
- After making a commit, explain to the user your reasoning behind choosing the commit type and description

## GitHub

- For any GitHub operation (PRs, issues, releases, checks, repos, etc.), always use the `gh` CLI — never `curl` or `WebFetch`. `gh` handles authentication automatically.
