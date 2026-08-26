# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-08-26

### Added

- Gitignore language for ESLint (`dotignore/gitignore`) built on the ESLint Language API, with a dedicated AST, exact ranges and locations, and spec-faithful semantics.
- Standalone, dependency-free gitignore parser exported at `eslint-plugin-dotignore/parser`.
- Correctness rules: `no-invalid-syntax`, `no-duplicate-pattern`, `no-redundant-pattern`, `no-unreachable-negation`, `no-backslash-path`, `no-empty-path-segment`, `no-misplaced-globstar`.
- Style rules: `no-trailing-whitespace`, `comment-spacing`, `max-consecutive-blank-lines`, `no-empty-group`, `leading-slash-style`.
- Reordering rules: `sort-patterns` and `group-patterns`, both negation-safe — reordering never changes what Git ignores.
- Filesystem-aware `require-dir-slash` rule with an injectable filesystem boundary.
- Shareable configs: `recommended` and `strict`.
- Per-rule documentation pages and an auto-generated README rules table.

[Unreleased]: https://github.com/erdembircan/eslint-plugin-dotignore/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/erdembircan/eslint-plugin-dotignore/releases/tag/v1.0.0
