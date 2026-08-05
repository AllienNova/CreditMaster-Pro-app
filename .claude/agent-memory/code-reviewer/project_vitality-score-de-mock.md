---
name: vitality-score-de-mock
description: 533f6e4 vitalityScoreService de-mock review — renormalization/FICO/null-propagation correct, but saveScoreToHistory write-failure path can still launder overall into a fabricated 0
metadata:
  type: project
---

Commit `533f6e4` (`fix(financial): de-mock vitalityScoreService to real per-user data`) replaced the fully-mocked 5-component financial vitality engine (`src/lib/financial/vitality-score-service.ts`) with real per-user data from `creditMonitoringService`, `financialService`, and `portfolioService`. Reviewed as the Codex-substitute gate (Codex CLI was environmentally blocked — out of date).

**Verdict: not clean — approved-with-follow-ups.** Core honesty mechanics verified correct: renormalization divisor (sums only `available` component weights, e.g. debt-excluded → divide by 0.8), FICO 300-850→0-100 normalization (bounds + monotonic + clamped), and `overall`/`grade` null-propagation through to `ai-insights/route.ts`'s `healthScore` field (verified by both hand-derivation and the new route test). All field names/types read from the 3 real source services were verified to exist against actual source (rule 11) — no hallucinated symbols.

**Real gaps found (not fabrication reintroduced in the 5 calculators themselves, but honesty-contract leaks):**
1. HIGH — `saveScoreToHistory` (vitality-score-service.ts:380-389) is awaited without `.catch()`, unlike the 5 upstream reads. A transient DB write failure discards an already-computed REAL `overall` and rejects the whole call; `ai-insights/route.ts`'s pre-existing catch-all (untouched by this commit) then returns `healthScore: 0` — the exact "laundered number" the commit's docstring promises never happens. Already locked in by an existing untouched test (`route.test.ts:194-202`).
2. MEDIUM — investments' `returnPct` defaults to `0` (not `null`) when `totalCostBasis <= 0`, and is NOT dropped from the weighted factors (breaks the null-and-drop pattern used everywhere else in the file). Root cause: `portfolio-service.ts:74` (`mapHolding`) silently defaults missing `average_cost` to 0 via `Number(...) || 0`.
3. MEDIUM — `savingsRate` is consumed unconditionally in both spending (weight 30) and savings (weight 35) factors, but upstream `financial-service.ts:161-163` silently defaults `savingsRate` to `0` (not null) whenever `monthlyIncome <= 0` — reachable because the spending/savings availability gates only require expenses OR accounts to be present, not income.
4. MEDIUM — persisted `vitality_score_history` rows store literal `0` for ANY unavailable component (not just debt, which is permanently excluded by design and where this is explicitly disclosed) — no current in-repo reader of those columns, but a latent data-integrity trap for any future per-component history consumer.
5. LOW — 3 quick-win guards (lower-utilization/pay-high-interest/increase-contributions) confirmed genuinely, permanently inert via full-file grep (their keyed fields are unconditionally null everywhere) — not a fabrication risk, just dead code that should be deleted rather than dead-guarded.

**Why this matters for future de-mock reviews in this codebase:** the failure mode worth hunting for isn't just "did they leave a hardcoded number in the calculator" — it's (a) does every optional/derived value follow the same null-and-drop discipline consistently (investments' performance factor didn't), and (b) does the *write/error path* preserve the honesty guarantee under partial failure (it didn't — a real score can still become a fabricated 0 via an unrelated persistence-layer exception). Both gaps were invisible from reading the calculator logic in isolation; they only surfaced by tracing the full call chain into `route.ts` and into the upstream services' own default-value behavior.

See also [[mny6-money-cents-type]] for a similar pattern (a correctly-scoped fix leaving an adjacent pre-existing gap unaddressed) and [[adm2-de-mock-analytics]] for the broader Wave 7 mock-data-sweep context this commit is part of.
