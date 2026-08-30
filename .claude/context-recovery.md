# Context Recovery — Fynvita

> Updated: 2026-08-29. Branch `fix/restore-from-pre-deletion-state`.
>
> The previous contents of this file claimed "All 7 waves COMPLETE (125/125,
> 100%)". That is the exact false claim CLAUDE.md records as having triggered
> the Wave 7 remediation. It sat here unchallenged for five months. Nothing
> below is a status badge — every number names the command that produced it.

## Current state — exposure sweeps

| | routes swept | ARRIVED | measured by |
|---|---|---|---|
| Web | 204 / 204 | **204** | `node scripts/dogfood-sweep.mjs` |
| Mobile | 231 / 232 | **180** | `mobile-app/scripts/dogfood-mobile.mjs` |

"ARRIVED" means the screen rendered content of its OWN, not merely that nothing
looked broken. Web derives chrome (any line on >=60% of routes) and subtracts
it; landing elsewhere is not arriving. Mobile asserts a declared title, or
failing that a string unique to that screen across the corpus.

Web: 0 FAIL. Mobile: 33 FAIL + 18 arrival-UNCHECKED (7 redirect stubs, 6 expose
nothing unique, 5 marker-absent). Mobile's only unswept route is
`/monitoring/alerts/[id]` — deliberately UNSEEDED, `credit_alerts` has no row
for the signed-in user.

**Mobile data readings are NOT trustworthy right now** — see BLOCKED #115. The
app under test has been pointed at a 500-ing server. Arrival (which screen) is
unaffected; anything about DATA from those runs is void.

## Landed this session (all pushed)

| commit | what |
|---|---|
| `62f2f4a` | price alerts never left the browser — panel bypassed its own live route; +PATCH verb, +RLS UPDATE policy |
| `1b9e62b` | verdicts for 28 unreachable services — 20 have NO live table |
| `d99f66c` | FND-072 documented |
| `30aa409` | web arrival check |
| `6bdbe7b` | mobile marker-based arrival (+14 screens) |
| `e63a2d9` | mobile route list came from a stale /tmp file omitting every detail screen |
| `94184f9` | mobile seed-ownership preflight |
| `2265f4e` | **FND-072 fixed** — middleware had a 2nd role path; no admin could reach any admin screen |
| `b879c41` | FND-072 resolution recorded |

## BLOCKED — needs an owner decision

- **#115 mobile API base.** Three conflicting `EXPO_PUBLIC_API_URL` values;
  the one in the Metro bundle (`:3001`, missing the `/api` suffix the others
  carry) 500s every path. `:3002` and `:3100` are healthy; `:3000` is Docker.
  Pick a port -> single value + `/api` suffix -> `expo start --clear` -> re-sweep.
- **`profiles` GRANT.** Should `authenticated` `SELECT` its own row? No request
  path depends on this any more (`2265f4e`), but the three RLS policies on
  `profiles` stay unreachable dead letters until decided.
- **#110** `UtilizationOptimizer` (8 date refs) + `PaymentTimingOptimizer` (22)
  need `statementDate`/`dueDate`; `credit_accounts` has neither. Add a column or
  withdraw `PaymentTimingOptimizer` + `/credit-repair/payments`. These are the
  last 2 web `audit:screen-data` fabrications.
- **#87 / SF-28** 4 mobile `investments/analyze/*` screens over 85 `Math.random()`.
- **Mobile `dashboard/subscriptions`** — which meaning of the overloaded
  `subscriptions` table.
- **4 SUPERSEDED services** await a DELETE approval batch: `GoodwillLetterService`,
  `CreditBuilderLoanService`, `student-loan-service`, `documents/document-service`.
  Each feature is live via a different module; these are duplicates with no caller.

## Open, not blocked

- **#114 mobile detail screens** — WITHDRAWN as defects; both endpoints return
  200 with real data as the row owner. Re-test after #115.
- **33 mobile FAILs** — mostly SF-30 path collisions (#96) and deep links firing
  before expo-router is ready. Not worth triaging until #115.
- **6 mobile screens** expose nothing unique to assert against:
  `/credit/monitoring`, `/dashboard/documents`, `/dashboard/notifications`,
  `/investments/trading`, `/onboarding`, `/profile/security`.
- **20 NO-STORAGE services** (`scripts/reachable-services-baseline.json`) —
  exposing any of them is a schema decision, not a routing one.

## How to re-run the sweeps

Local Supabase must be up (`npx supabase status`). **Repo-root `.env.local`
points at the HOSTED project** — never sweep with it. Inject local values
inline instead; `/tmp/build-local.sh` and `/tmp/start-local.sh` did this by
reading `npx supabase status -o json`. Confirm before trusting a row:

    grep -rlo "127.0.0.1:54321" .next/static   # must hit
    grep -rlo "<hosted-ref>"     .next/static   # must NOT hit

Use `next build` + `next start`, NOT `next dev` — dev compiles on demand and
restarts on its memory threshold mid-sweep, which reports as ~100 false FAILs.

The sweep authenticates as `dogios@fynvita.test`. Its password is a local
throwaway set via the Supabase admin API; it is deliberately NOT recorded here.
Re-set it with `PUT /auth/v1/admin/users/<id>` using the local service-role key
from `npx supabase status`.

Mobile: seeds live in `mobile-app/scripts/dogfood-seeds.json` and must match
whoever the SIMULATOR is signed in as — the sweep reads that email off
`/profile` and refuses on mismatch.

## Canonical docs

- `docs/ssot/SSOT.md`, `docs/ssot/gap_analysis.md` (FND register + addenda)
- `docs/qa/qa-report.md` (verification record)
