# Changed-Code Coverage Rule

> Mechanically enforced. Project-specific — extends `~/.claude/rules/testing-standards.md`.

## The rule

Every line of code **added or modified** on a branch must reach **≥ 85% coverage** —
true diff coverage, measured per changed line, not per whole file.

This is a *diff* gate, not a global gate. Editing one line of a 1,200-line legacy file gates
that one line, not the rest. Existing untouched code is never blocked — repo-wide coverage
ratchets upward as lines are touched; the baseline (~56% as of 2026-05-15) is not gated directly.

A changed line counts toward the gate only if it carries executable code (a statement or a
branch). Comments, type annotations, blank lines, and import lines contribute nothing. A file
whose changed lines are all non-executable passes automatically.

## Enforcement

```bash
npm run test:coverage:changed
```

`scripts/check-changed-coverage.js`:
1. Diffs the working tree against the base ref (`origin/main` → `main` → `origin/master` →
   `master`; override with `BASE_REF=...`) to collect the exact changed line numbers per file.
   Covers committed, staged, unstaged, and untracked files.
2. Applies the same exclusions as `jest.config.js` `collectCoverageFrom` (skips `.d.ts`, tests,
   mocks, stories, `src/types/`, `middleware.ts`, `setupTests.ts`, `layout/loading/error/not-found`).
3. Runs `jest --coverage` scoped to those files, then checks coverage of the statements and
   branches that sit on changed lines against the 85% threshold.
4. Exits non-zero listing every file below threshold (a changed file with executable lines but
   no exercising test counts as a failure).

A file is **gated** when it matches `src/**/*.{js,jsx,ts,tsx}` and survives the exclusions above.

## Where it runs

- **Commit-time** — part of the verification suite alongside lint / types / build (see `01-verification.md`).
- **CI** — runs on every PR; a failure blocks merge.

## Do NOT

- Lower `THRESHOLD` in `scripts/check-changed-coverage.js`.
- Lower the global `coverageThreshold` in `jest.config.js`.
- Add files to the exclusion list to dodge the gate.
- Weaken or skip tests to pass the gate — see `~/.claude/rules/testing-standards.md` (Test Integrity Rule).

## Critical paths still require 100%

Stripe webhook handlers, PII handling, and auth paths require **100% branch coverage** —
85% is the floor for ordinary code, not a ceiling for critical code. See `01-verification.md`.
