# Project-Level Claude Config

Generic baseline shared across projects. This directory pairs with the user's global config at `~/.claude/`.

## Layout

```
.claude/
├── agents/         5 generic agents (bug-fixer, test-writer, documentation, security-auditor, performance-tuner)
├── skills/         3 workflow skills (pre-investigation, implement-task, verify-and-ship)
├── hooks/          post-edit-lint.sh (stack-aware: TS/JS/Py/Rust/Go/Dart)
├── rules/          Project-specific overrides (fill in or delete)
├── commands/       Project-specific slash commands (from original template)
└── settings.json   Wires the lint hook
```

## Global vs project responsibilities

- **Global (`~/.claude/`)** owns: verification protocol, coding standards, anti-overengineering rules, anti-hallucination, git workflow, testing standards, security baseline.
- **Project (`.claude/`)** owns: stack-specific commands, project-specific conventions, domain glossary, project-specific agents and skills.

Do NOT duplicate global rules at the project level. If a rule applies to all projects, it belongs in `~/.claude/rules/`.

## When forking this template

1. Fill in the `<fill in>` placeholders in `rules/01-verification.md`.
2. Delete `rules/02-project-conventions.md` and `rules/03-domain-glossary.md` if not needed.
3. Add project-specific agents to `agents/` only when a generic agent doesn't fit.
4. Add project-specific skills to `skills/` only when the 3 generic ones don't cover the workflow.

## Settings

`settings.json` wires the post-edit lint hook. It does NOT grant any tool permissions — those come from `~/.claude/settings.json` plus `settings.local.json` (per-project, gitignored).
