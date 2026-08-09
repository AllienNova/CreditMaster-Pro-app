# Verification Commands

Global protocol: `~/.claude/rules/verification-protocol.md`. Project-specific commands below.

## Commands

| Step | Command |
|---|---|
| Lint | `npm run lint` (next lint) |
| Types | `npm run type-check` |
| Unit tests | `npm run test` (jest) |
| Unit coverage | `npm run test:coverage` |
| Changed-code coverage gate | `npm run test:coverage:changed` (≥85% lines+branches on changed files — see `04-coverage.md`) |
| E2E (Playwright) | `npm run e2e` |
| E2E (Cypress) | `npm run cypress:run` |
| Build | `npm run build` (next build, NODE_ENV=production) |
| Dev | `npm run dev` |
| Env sanity | `npm run check-env` |
| Security | `npm audit --audit-level=high` |

## Asset pipeline

| Step | Command |
|---|---|
| Generate | `npm run assets:gen` |
| Optimize | `npm run assets:optimize` |
| Vectorize | `npm run assets:vectorize` |
| Deploy | `npm run assets:deploy` |
| App icons | `npm run assets:derive-icons` |
| Splash | `npm run assets:derive-splash` |
| Wave | `npm run assets:wave` |

## Critical paths (100% branch coverage)
- Stripe webhook handlers (covered by existing hookify guard)
- PII handling paths
- Credit card paths (none should exist in code — covered by hookify guard)
