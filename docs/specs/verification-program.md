# Verification Program — every route, workflow, screen and endpoint

- **Date:** 2026-08-30
- **Branch:** `fix/restore-from-pre-deletion-state`
- **Mode:** hybrid (audit of what verification exists + plan for what must be built)
- **Status:** revised once after a critic pass returned REVISE REQUIRED. §9 records
  what the critic corrected, including three claims this document had wrong.
- **Method:** every number is executed output or a cited `file:line`. Where a figure
  is *observed but not currently reproducible*, it says so rather than standing.

---

## 1. The finding that shapes everything else

**18,133 tests pass, and almost nothing proves that a real user workflow works
against a real backend.**

The codebase already says it, in `scripts/dogfood.sh`'s own header:

> Every test here mocks the Supabase client, so no missing GRANT, absent table,
> RLS policy or dead session can fail one.

Four defects found in the previous session were invisible to all 18,133:

| Defect | Why every test missed it |
|---|---|
| FND-072 — **no admin could reach any admin screen** | a missing table GRANT; every route test mocks Supabase, so privileges never execute |
| Price alerts persisted to `localStorage`, never the server | panel and route were each tested in isolation; nothing checked they were connected |
| Mobile app pointed at a server that 500s every path | no test boots the app against a backend |
| `/investments/crypto/[coinId]` reachable by nobody | it renders correctly, so every render test passes |

Every one lived in a **seam between components**. More unit tests cannot find
them.

---

## 2. What verification exists today — measured

### 2.1 Screens — the one covered surface, with an honest caveat

| | routes | arrived | harness |
|---|---|---|---|
| Web | 204 / 204 | 204 (see provenance) | `scripts/dogfood-sweep.mjs` |
| Mobile | 231 / 232 | 180 | `mobile-app/scripts/dogfood-mobile.mjs` |

**Provenance, stated plainly.** Both figures were observed on 2026-08-29 — the
web run printed `204 tested — 0 FAIL` / `204 of 204 ARRIVED`. **The report files
were written to `/tmp` and have since been deleted, and Docker is currently down,
so neither number is reproducible right now.** The only sweep artifact in the
repo, `dogfood-report.json`, reads `tested: 1` and is unrelated. Treat both
figures as *last-observed*, not as current fact, until M0 re-runs them and
commits the artifact.

That is itself a finding: **evidence written to `/tmp` does not survive**, so no
verification result in this project is currently durable. M0 fixes it.

**Second caveat — arrival is measured but not enforced.** `dogfood-sweep.mjs:143`
says so: *"Arrival is REPORTED, not enforced: it does not feed `ok`."* Both
sweeps compute `ok` from `problems.length` only, and mobile permits
`arrived === null` as an acceptable outcome — which is how 231 routes yield 180.
So the harness this plan proposes to copy does not yet enforce its own metric.

### 2.2 API endpoints — 92.5% "tested", 0% exercised

- **359** `route.ts`, **578** exported verb handlers (GET 291, POST 182, DELETE 49,
  PATCH 38, PUT 18). **287 are mutating.**
- **~332 / 359** have a Jest test importing them; **~27** have none — including
  `/api/health`, on which `scripts/dogfood.sh` depends as its own precondition,
  and **4 of the 5** `cron/*` routes.
- **0 tests use `supertest`. 0 route tests call a real `localhost:PORT`.**
  Verified by grep. Real HTTP integration is **0%** of the suite.
- **~277** route test files carry the `negative-auth` tag — the single most common
  form of API "coverage" is asserting 401 when unauthenticated.
- **Only 44 of 359 routes carry a `z.object(` at the boundary.** This number
  drives M1's shape; see P0-2 in §9.

**Three tests pass while exercising zero production code.**
`src/app/api/auth/__tests__/route.test.ts` is titled "Auth API Routes", imports
nothing from any route, declares `isValidEmail` inline and tests its own
declaration. Same pattern in `credit-report/__tests__/route.test.ts` and
`credit-builder/__tests__/route.test.ts`. This is a category, not a one-off.

`scripts/dogfood.sh` **is** real black-box testing — real Supabase, two real
users, authed success + unauth rejection + cross-user IDOR + Postgres error log.
It is a manual, one-route-per-invocation developer tool: absent from
`package.json`, absent from CI, never looped.

### 2.3 Workflows — the largest gap

41 spec files. Almost none completes a journey.

- **Cypress (21 specs) never logs in.** `api-endpoints.cy.ts:14-16` sets
  `authToken = "mock-jwt-token"` under the comment *"In a real scenario, you'd
  authenticate here"*, and `:38` asserts `oneOf([201, 401])` — **401 passes.**
  Worse: at least three specs accept **500** as a pass, and
  `payment-subscription.cy.ts:102` accepts `[400,401,403,404,405,500]` — every
  outcome the endpoint can produce.
- **Playwright (16 specs) uses a fake session.** `e2e/utils/auth.ts:26-51`
  fabricates `access_token: "test-access-token"`; it only "works" because
  `playwright.config.ts:47` sets `NEXT_PUBLIC_E2E_AUTH_BYPASS` and
  `src/hooks/useAuth.ts:48` short-circuits to a hardcoded `E2E_USER`. **This is
  client React state — it never mints a JWT**, so middleware, RLS and API guards
  never participate (`src/middleware.ts` has zero references to it).
  Consequently `investment-suite.spec.ts:22-26` and
  `financial-suite.spec.ts:28-31,78-81` **accept an error state as a pass**.
- **Mobile Detox (4 specs) are the only genuine journeys in the repo** —
  onboarding, auth, credit score, full dispute flow. **They never run in CI.**

| Journey | Status |
|---|---|
| AI chat / financial coach | COVERED (third-party AI mocked at `page.route` — appropriate) |
| Onboarding · Auth · Credit repair · Disputes | PARTIAL — real journey only in Detox, never CI-run |
| Budgeting · Investments · Marketplace | PARTIAL — fake session; some tests pass on error |
| **Subscription / billing (Stripe)** | **NOT COVERED** — `grep -rni stripe cypress/e2e e2e` → zero |
| **Documents** · **Notifications** | **NOT COVERED** |

### 2.4 CI — the gates that cannot fail, and the deploy that ignores them

`.github/workflows/ci.yml`. Four `continue-on-error`, each guarding something
different — this matters, because "remove it from `e2e` and `security`" edits the
wrong thing:

| Line | Scope | What it neuters |
|---|---|---|
| 38 | step | "Mock-data scan (report only)" inside `lint` |
| 73 | step | coverage PR comment (benign) |
| **130** | **step** | `npm audit --audit-level=high` — so the `security` **job always passes** |
| **347** | **job** | the whole `e2e` job |

**The deploy path does not include the jobs in question.** Verified:

```
build:              needs: [test, security, auth-gates]
e2e:                needs: build
mobile-test:        needs: lint
deploy-production:  needs: build          # ci.yml:431
```

`e2e` and `mobile-test` are **siblings** of deploy, not upstream of it. Removing
`continue-on-error` from `e2e` turns a check red and **changes nothing about
whether a deploy proceeds**. Playwright and Detox appear nowhere in `ci.yml`.

### 2.5 Two silent-failure modes already in the repo

1. **Tests that pass with zero assertions.** `CLAUDE.md` claims 19 skips; only 11
   static skips exist. The difference is a runtime `if (!reachable) return;`
   guard — including four in
   `src/lib/commerce/affiliate/__tests__/referral-concurrency.money.test.ts`,
   **on the money path**. A skip is visible; this is not.
2. **Gates that skip rather than fail.** `audit:cascade` printed `SKIPPED` and
   **exited 0** during this audit because Docker was down. Green by absence.

### 2.6 Environment — not reproducible

- **~132** env vars referenced; **~81** appear in none of the four template files
  — including `JWT_SECRET`, `CSRF_SECRET`, `ENCRYPTION_KEY`,
  `BANK_TOKEN_ENCRYPTION_KEY`, which have no safe default.
- **AIML naming (corrected):** `AIML_BASE_URL` is what the code reads
  (`aiml-service.ts:59`, `env-validation.ts:94,300`). **The template is right**;
  the outlier is one call site, `base-agent.ts:224`, reading `AIML_API_URL` —
  and root `CLAUDE.md` §7 documents the wrong name. Fix the call site, not the
  template.
- **`supabase/migrations/` holds 108 migrations. `CLAUDE.md` §3 says 30.** And
  `CLAUDE.md`'s own STATUS BANNER lists live-schema drift as an unmet launch
  condition. Anything built from these migrations may not be the schema
  production runs.
- `docker-compose.yml` starts app + redis + nginx and **does not stand up
  Postgres/Supabase**. No devcontainer.
- **Seeding is broken at the FK level**: `scripts/dogfood-seed.sql` references a
  fixed user nothing in the repo creates. Neither seed script is wired to npm.
  Unseeded entirely: budgets, bills, debt, income, savings, spending,
  transactions, trading orders/positions, notifications, admin, commerce,
  compliance.
- **Ports in play: 3000, 3001, 3002, 3100, 54321, 54322.** `:3000` is a Docker
  container answering `/` 200 and `/auth/login` 404; `:3001` 500s every path;
  repo-root `.env.local` points `NEXT_PUBLIC_SUPABASE_URL` at the **hosted**
  project, so the default `npm run dev` target is production.

### 2.7 Surfaces with no coverage at all

Accessibility (`@axe-core/playwright` is a dependency with **zero** usages),
visual regression (no tooling present), Android (the mobile harness is
iOS-simulator only), load/performance (no k6/artillery/autocannon), offline,
i18n, and rate-limit behaviour (50 routes call a limiter; nothing tests it).

---

## 3. Target architecture

```
   ┌──────────────────── one command: `npm run verify:all` ────────────────────┐
   │                                                                           │
 env-up ─► seed ─► ① screens ─► ② endpoints ─► ③ journeys ─► ④ gates ─► report
 (compose  (all     (exists,    (NEW: read-only   (NEW: real    (21 exist)  (committed
  + local   domains  arrival     first, then       session,                  artifact,
  Postgres) + JWT)   ENFORCED)   mutating)         real Stripe)              not /tmp)
   │                                                                           │
   └── every stage FAILS — never skips, never passes-by-absence — when it ─────┘
       cannot measure, including stage ① (see P0-1)
```

### The mutation-safety contract — stage ② may not cause the incident

287 mutating verbs include Stripe-touching routes, an email sender, and 5 `cron/*`
routes whose job is to send reminders. Firing those unattended is a production
incident wearing a test costume. Therefore:

1. **Every verb is classified** `read | mutate-local | mutate-external`, derived
   from route imports, committed as a checked-in manifest.
2. **`mutate-external` is refused by default** — it runs only with an explicit
   allowlist entry naming the sandbox. Refused, not parked.
3. **State is reset between verbs** (transaction or snapshot restore) so ordering
   cannot make results non-deterministic.
4. **Hard interlock:** the sweep aborts unless the target's Supabase host is
   `127.0.0.1`. Not a convention — an assertion, because the default dev target
   is the production project.
5. **Arrival is not the only render assertion.** Per route, additionally: no
   console error, no unhandled rejection, no visible error-boundary text, and no
   persistent loading affordance after settle. A screen that renders a heading
   over a broken body, or a permanent skeleton, currently *arrives*.
6. **Rate limiting is a tested property, not an obstacle.** For each of the 50
   rate-limited routes, assert the N+1th call in a window returns 429. Disabling
   the limiter for a run is forbidden.

---

## 4. Milestones

Dependency-ordered. Every exit criterion is a runnable command.

**M0 — Reproducible environment, durable evidence, enforced arrival.**
Exit: `npm run env:up && npm run seed && node scripts/verify-seed.mjs` exits 0
and prints a row count for each domain in a checked-in domain list; both sweeps
re-run and their JSON artifacts are **committed under `docs/specs/evidence/`**.
Contents: add Postgres to compose; reconcile env templates (and fix
`base-agent.ts:224`); create the dogfood auth user before seeding; extend seeds
to the unseeded domains; wire `seed`/`dogfood`/`verify:all` into `package.json`;
**make `arrived === true` a condition of `ok` in both sweeps and `arrived === null`
a failure**; **mint a real Supabase JWT for the seeded user** (moved here from M2 —
M1 cannot authenticate without it); fix `audit:cascade` to fail rather than exit 0
when it cannot reach Postgres; un-guard and re-run the two
`if (!reachable) return;` files against real Postgres.

**M0.5 — Schema parity.** Exit: `supabase db reset` from zero succeeds under
`ON_ERROR_STOP=1`, **and** a committed `information_schema` diff between the
migration-built local DB and the hosted project is empty or waived line-by-line.
Plus a SQL gate: every table with a `user_id` column has RLS enabled, at least one
policy, and the `GRANT` that policy requires — this catches FND-072's class
*statically*. **M1 does not start until this diff is signed**, or every M1 finding
is suspect in a direction nobody can see.

**M1a — Endpoint sweep, genuinely read-only.** Exit: a committed report covering
all 291 GET verbs plus an **unauthenticated** probe on all 578, with zero
UNMEASURED rows. Both are safe and body-free: a 401 is returned before any body
is parsed, and neither writes.

**Cross-user probes do NOT belong here.** A cross-user probe on
`DELETE /api/x/[id]` *is* a mutation attempt — and if the authz guard is broken,
which is the thing being tested, it succeeds and destroys the other user's row.
They also prove nothing on POST/PATCH/PUT without a valid body, because
validation returns 400 before authz is consulted, scoring an instrument artifact
as a result. So cross-user probes on the 287 mutating verbs move to M1b, under
the §3 reset guarantee and the fixture corpus.

**M1b — Endpoint sweep, mutating.** Entry criterion is mechanical: **every
mutating verb has a Zod schema at its boundary**, enforced by a new
`audit:route-schema` gate — today that is 44 of 359, so this converts ~250
fixtures from invisible work into a countable, gateable task, and buys input
validation as a side effect. Exit: all 287 mutating verbs exercised under the §3
contract, including the cross-user probes displaced from M1a, a **webhook-replay
probe** (the same Stripe event delivered twice produces exactly one state
change), and a **concurrent-write invariant probe** on every atomic-RPC path.

**M2 — Journeys on a real session.** Exit: `npx playwright test <12 named specs>`
exits 0, **and** `npx eslint cypress/` passes a new rule banning any `oneOf`
whose set contains both a success and a failure status. That rule is not
cosmetic: M4 promotes the Cypress job to a deploy gate, and today 21 specs pass
on 401, three accept 500, and `payment-subscription.cy.ts:102` accepts every
outcome the endpoint can produce — gating deploys on that suite would make a
worthless check load-bearing. Delete both auth-bypass sites; delete the
accept-error-as-pass branches;
write Stripe checkout→webhook→tier, documents upload→list→download, and
notifications; un-skip the 9 auth-gated specs. The 12 journeys are enumerated as
spec paths in the M2 task list, not left as a count.

**M3 — Close known gaps** (parallelisable). Mobile arrival 180 → 231; the 6
mobile screens exposing nothing unique; SF-30 collisions;
`/investments/crypto/[coinId]` linked or removed; the 27 untested routes; the 3
tautological test files; accessibility via `AxeBuilder` on all 204 web routes
(exit: 0 serious/critical, baseline committed); the 2 web + 5 mobile fabrications
(needs D4/D5).

**M4 — Make CI tell the truth.** Exit is a **`needs:` graph**, not an absence of
`continue-on-error`: `deploy-production.needs: [build, e2e, mobile-test,
endpoint-sweep, screen-sweep]`, plus a CI job that parses `ci.yml` and fails if a
required job is missing from the deploy closure or if `continue-on-error` appears
outside an allowlist. **Entry criteria (three, all mechanical):** (a) the M2 ESLint rule passes, so
the Cypress suite asserts something before it gates a deploy; (b) CI secrets are
provisioned; (c) `e2e` passes locally against a real seeded backend first — CI currently points Cypress at a placeholder Supabase, which is
*why* everything 401s and `oneOf` passes; removing the escape hatch before
provisioning CI secrets fails 100% on day one. Also: serve the built artifact,
not `npm run dev`.

**M5 — Autonomous loop.** Exit: one unattended run completes, produces a report
with **zero UNMEASURED rows**, and a typed parked-queue.

**Critical path:** M0 → M0.5 → M1a → M1b → M2 → M4. M3 parallelises after M0,
**with one exception**: M0 makes `arrived === null` a failure, so the mobile
sweep goes red the day M0 lands (~51 nulls of 231) and stays red until M3 raises
it. M4 must therefore either wait for M3's mobile-arrival item, or land
`screen-sweep` as **web-blocking / mobile-reporting** with a dated conversion.
It may not land mobile-blocking and then have the gate weakened to get a deploy
out — that is the gate-gaming this document bans.

---

## 5. What the operator must provide

### Decisions

Each carries a **default-if-unanswered** so an unattended run is never blocked
indefinitely by silence. Dates are for the operator to set; the defaults below
are what the program will assume if a decision is still open when its milestone
starts.

- **D1 — mobile API base port.** Three conflicting `EXPO_PUBLIC_API_URL`; the one
  in the bundle (`:3001`) 500s everything and omits `/api`. *Blocks all mobile
  data verification.* No port is recommended here — the right value follows from
  D6, and the only `:3100` evidence in the repo is the *web* sweep's base URL,
  not a mobile API base. **Default if unanswered:** whichever port D6 designates,
  with the `/api` suffix restored.
- **D2 — `profiles` GRANT.** Should `authenticated` `SELECT` its own row? Three
  RLS policies are dead letters until decided.
  **Default:** leave as-is; no request path depends on it since `2265f4e`.
- **D3 — authority to delete** 4 superseded services + 20 whose tables don't exist.
  **Default:** do not delete; record and continue.
- **D4 — statement/due dates (#110).** Column, or withdraw `PaymentTimingOptimizer`.
  **Default:** withdraw the feature rather than ship a fabricated figure.
- **D5 — mobile investments (SF-28)** and the overloaded `subscriptions` table.
  **Default:** remove the fabricated values, leave the screens honest-but-empty.
- **D6 — verification target.** Local-only, or a dedicated staging project?
  Note the real consequence: **local-only means Stripe and Plaid webhooks cannot
  reach the app without a tunnel** — that is the actual trade, not convenience.
  **Default:** local-only, with webhook-dependent journeys marked UNMEASURED
  rather than faked.

### Credentials (test/sandbox tier only)

Unit tests need **none** — all eight vendors are already mocked. Needed only for
live M1b/M2 runs: Stripe (test mode + CLI webhook signing), Plaid (sandbox is
already the code default), Resend, AWS S3 (or LocalStack, which removes the
need), Alpaca (paper). **AI is mocked at the network boundary in all sweeps** —
otherwise every run bills a real provider for 578 verbs of traffic; only a
hand-run journey touches the live provider. DriveWealth and MoneyLion have no
sandbox story in-repo. Plus stable generated values for `JWT_SECRET`,
`CSRF_SECRET`, `ENCRYPTION_KEY`, `BANK_TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`,
`EMAIL_UNSUBSCRIBE_SECRET`, `IP_HASH_SALT`. **And CI secrets** — M4 cannot land
without them.

### Authority — what actually determines autonomy

Please answer each. An unattended run stops at every ungranted one.

| # | May the agent… | Recommend |
|---|---|---|
| 1 | apply migrations to the **local** DB | yes |
| 2 | create/modify **local** test users and seed data | yes |
| 3 | **reset/drop the local database** between sweep phases | yes — local only |
| 4 | delete code confirmed unreachable, in reviewable batches | yes, batched |
| 5 | change `.env*` template **names/placeholders** (never values) | yes |
| 6 | rewrite/delete tautological or accept-error-as-pass tests | yes, each named in the commit |
| 7 | **call mutating endpoints** against the target | only `mutate-local`; `mutate-external` needs the §3 allowlist |
| 8 | **spend in vendor sandboxes** (Stripe objects, Alpaca paper, S3 puts) | yes, with a stated ceiling |
| 9 | **send real email/SMS** from the target | **no** — stub Resend at the network layer |
| 10 | **edit a gate's baseline file** (`scripts/*-baseline.json`) | **no** — 6 gates are baseline-driven; this makes anything green |
| 11 | disable a rate limiter or feature flag for a run | **no** |
| 12 | quarantine a flaky test instead of fixing it | **no** |
| 13 | merge to `main`, deploy, touch the hosted DB | **no** — keep human |

### Park-and-continue — and the five cases where it is wrong

The standing instruction requested is: on an ungranted decision, **park with a
named unblocker and continue**. That is what makes a multi-hour run possible. It
must be qualified — parking is the wrong response when:

1. **A security finding on a live surface.** An unauth'd mutating endpoint found
   at hour two must halt and escalate. Parking is how a live IDOR ages overnight.
2. **The instrument looks wrong.** If >20% of a batch fails identically, the
   harness is the defect; continuing manufactures a false report. (This happened
   four times in the previous session.)
3. **A destructive side effect surprised us** — a probe sent mail, moved money,
   or touched the hosted DB. Halt immediately.
4. **A parked item invalidates later work.** Parking D1 does not park mobile
   verification, it makes every subsequent mobile result meaningless. Parking
   must mark everything downstream **UNMEASURED**.
5. **Three parks share one root cause.** That is the circuit-breaker condition,
   not three queue entries.

**Halt threshold:** more than 25 parked items, or any parked item on the
money/auth path, ends the run and escalates. Without a cap, a run can park 400
items and report success.

---

## 6. Risks

- **M1 will find a lot.** 578 verbs have never been called for real. A large first
  report is the point, not a regression.
- **Fixing the auth bypass will turn green specs red.** They pass today partly
  because a fake session lets pages render without data. That is a correction.
- **Sequencing.** Running M1/M2 before M0/M0.5 reproduces the exact failure mode
  hit four times last session: a broken harness reporting instrument artifacts as
  defects.
- **The sweep itself is the largest new risk** — see §3. It is the only component
  here that can cause an incident rather than find one.
- **Schema drift may invalidate M1 wholesale** if M0.5 is skipped.
- **No estimates appear in this document.** M1b's scope is unknown until
  `audit:route-schema` counts it.

---

## 7. Explicitly out of scope

Named as choices, not oversights: load/performance testing, i18n, offline
behaviour, visual regression beyond the ~30 revenue-path screens in M3, chaos or
failure-injection testing, and penetration testing. Android is **in** scope only
if D6 funds an emulator lane; otherwise the mobile number means iOS and says so.

---

## 8. Security findings surfaced by this audit

- **`NEXT_PUBLIC_E2E_AUTH_BYPASS` is a production risk, not test hygiene.** It is
  a `NEXT_PUBLIC_` var, therefore **inlined into the client bundle at build
  time**; one misconfigured Vercel environment makes every user `E2E_USER`. Two
  sites: `src/hooks/useAuth.ts:48` and `src/components/chat/ChatInterface.tsx:44`,
  where `:50` sets `setUserId("e2e-user")` directly beneath a comment reading
  `// ZERO TRUST: Verify authentication`. Delete both; add a build-time assertion
  that fails `next build` if any `NEXT_PUBLIC_*_BYPASS` is set outside test
  config. **Open operator question: is this flag set in any Vercel environment
  today?**
- **The `security` CI job cannot fail** (`ci.yml:130`), so `npm audit` has
  never blocked anything. Executed 2026-08-30: **34 vulnerabilities — 1 critical,
  19 high, 10 moderate, 4 low.** (`CLAUDE.md`'s "32" is from 2026-07-24.)

---

## 9. What the critic corrected

A critic pass returned **REVISE REQUIRED** with five P0s. All were verified
against the repo before acceptance; three were errors in this document:

| Was | Is |
|---|---|
| "AIML template is stale, reconcile it" | **Backwards.** The template is right; `base-agent.ts:224` is the outlier, and `CLAUDE.md` §7 has the wrong name. |
| "204 arrived" stated as current fact | Observed 2026-08-29; **artifact deleted with `/tmp`, not reproducible today.** Now labelled last-observed. |
| "remove `continue-on-error` from `e2e` and `security`" | Line 130 is **step-level on `npm audit`**, not job-level on `security`. And neither job is upstream of `deploy-production`, so the edit would have been a placebo. |

Structural fixes adopted: arrival made blocking (P0-1); M1 split read-only /
mutating behind a schema gate (P0-2); mutation-safety contract added (P0-3);
M0.5 schema parity added — 108 migrations vs `CLAUDE.md`'s 30 (P0-4); M4
re-expressed as a `needs:` graph (P0-5); JWT minting moved M2 → M0 (P1-13);
accessibility, Android, rate-limiting-as-property, RLS static gate, concurrency
and webhook replay added; Authority expanded from 7 to 13 with a halt threshold
and the five cases where parking is wrong.

**Second critic pass — APPROVE WITH CONDITIONS.** Three conditions, all adopted
above: M1a's cross-user probes were a mutation attempt that would destroy the
other user's row precisely when the guard under test is broken (moved to M1b);
M4 would have blocked every deploy behind M3's mobile arrival, or been weakened
to avoid it (now stated explicitly); and M4 would have promoted the Cypress suite
to a deploy gate without fixing the `oneOf` assertions this document proves are
worthless (now an M2 deliverable and an M4 entry criterion). Also corrected: the
`npm audit` count was inherited stale from `CLAUDE.md` (32 → **34**, executed),
D1's port recommendation had no evidence behind it, and the decisions now carry
defaults so silence cannot block an unattended run indefinitely.
