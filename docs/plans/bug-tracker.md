# Bug Tracker

Suspected bugs and issues discovered during development. Items here need investigation and may affect multiple locations in the codebase.

## Format

Each entry should include:
- **Short title** describing the suspected bug
- **Where found** — file path and line number
- **What's wrong** — observed behavior or suspicion
- **Scope** — could this affect other locations? List suspected files if known
- **Severity** — Critical / High / Medium / Low / Unknown
- **Date added**

## Active Bugs

### Registration test fails with 500 — missing cache directory
- **Where found**: `tests/Feature/AuthTest.php:17`, error in `Filesystem.php:738`
- **What's wrong**: `it can register a new user` test returns 500. Root cause: `FilesystemIterator::__construct` fails on missing cache directory (`storage/framework/cache/data/68`). Registration triggers cache operations (likely GroupService default group setup) that fail when cache dir doesn't exist.
- **Scope**: Could affect any test that triggers cache writes in a fresh environment. Registration flow only.
- **Severity**: Medium (test-only, production unaffected since cache dirs exist)
- **Date added**: 2026-03-05

## Under Investigation

_(Bugs currently being looked into)_

## Resolved

_(Moved here once fixed, with resolution notes)_
