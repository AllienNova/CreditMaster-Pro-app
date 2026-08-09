---
name: verify-and-ship
description: "Full commit-time gate before any commit, PR, or claim of completion. Stops on first failure. Use when told 'verify', 'ship', or before any commit."
allowed-tools: Bash Read Write
---

# Verify and Ship

Stop on first failure. Show exact output — never summarize.

| # | Step | Pass |
|---|---|---|
| 1 | Lint | 0 errors, 0 new warnings |
| 2 | Types | 0 errors; no new `any`/`@ts-ignore`/`# type: ignore` |
| 3 | Tests | Full suite passes; new code ≥ 90%; critical paths = 100% |
| 4 | Regressions | Passing count did NOT decrease |
| 5 | Build | 0 errors, 0 warnings, production target |
| 6 | Security | `npm audit` / `pip-audit` / `cargo audit` / `govulncheck` — 0 high/critical |
| 7 | Runtime | App starts; basic request returns real response |
| 8 | Secrets | `git diff` shows no hardcoded keys/tokens/passwords |

## Output (exact format)
```
VERIFICATION
  Lint:        PASS / FAIL — [counts]
  Types:       PASS / FAIL — [counts]
  Tests:       X passed, Y failed (Z% new-code coverage)
  Regressions: NONE / [list]
  Build:       PASS / FAIL
  Security:    PASS (0 high/critical) / FAIL — [list]
  Runtime:     RESPONDS / CRASHED
  Secrets:     CLEAN / [matches]
```

## Failure
Do not commit. Do not claim done. Paste actual failing output. Fix root cause. Re-run from step 1.

## Success
Conventional commit: `type(scope): description in imperative under 72 chars`. Types: `feat | fix | refactor | test | docs | chore | perf | ci`. Body explains WHY when non-obvious; wrap 72.

## Forbidden
"Should work" · "Tests should pass" · "I believe this is fixed" · coverage drops · `--no-verify` · `--force` push · skipping hooks (unless user explicitly asks).
