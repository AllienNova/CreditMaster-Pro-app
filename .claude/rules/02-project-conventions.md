# Project Conventions

> Detailed project guidance is in the root `CLAUDE.md` (406 lines). This file is a brief pointer for Claude — do NOT duplicate.

## Stack
Next.js + TypeScript • Jest (unit) • Playwright + Cypress (E2E) • Stripe payments • LangChain/LangGraph (per `package.json`)

## Hookify guards already active
Local hookify rules in `.claude/`:
- `block-credit-card-in-code` — refuse to write card numbers in source
- `block-pii-in-code` — refuse to write PII in source
- `require-stripe-webhook-verify` — Stripe webhook handlers must verify signatures
- `warn-pii-logging` — flag any logging of PII

These are non-negotiable. Do not disable.

## Critical: existing skill / agent / memory dirs
This project has `.claude/commands/`, `.claude/memory/`, `.claude/agent-memory/`, and `.claude/KNOWN_ISSUES.md`. Read those before assuming context — they hold project state across sessions.
