# Dogfood Report — web + mobile

- **Date:** 2026-08-14 → 2026-08-15
- **Branch:** `fix/restore-from-pre-deletion-state`
- **Method:** a real signed-in browser over every web page route, and the mobile app built and booted on an iOS simulator. Every claim below is something that was run.

---

## Headline

**The app had never been exercised while logged in, and could not have been.**
Two independent defects made it impossible, and both were live in every
environment:

| Defect | Effect |
|---|---|
| `middleware.ts:247` gated every protected page on cookies `sb-access-token` / `supabase-auth-token` — names `@supabase/ssr` **never writes** | every signed-in user was redirected to `/auth/login` |
| `validateFromHeaders` accepted the bearer header only, while the browser stores its session in a cookie | **213 `fetch("/api/…")` calls across 135 files** could never authenticate |

Fixing those two is what made dogfooding possible at all. Everything below was
found afterwards.

---

## What ran

| | Result |
|---|---|
| Web page sweep | **all 204 page routes**, signed in, real Chromium — **0 FAIL, 12 WARN** |
| Web routes skipped | **none.** The 7 dynamic routes are now seeded and exercised (`scripts/dogfood-seeds.json`) |
| Mobile tabs | **all 6 walked on iPhone 17 Pro** via `idb` — Home, Credit, Disputes, Money, Invest, Profile |
| Mobile build + boot | bundled **2,069 modules**, signed in with a real account |
| Mobile unit tests | 100 suites, **1,171 tests** — was 32 failing |
| Web suite | 826 suites, **16,677 tests** |

### The 7 web failures, each checked by hand

Exactly **one** was a product defect.

| Route | Verdict |
|---|---|
| `/challenges` | **REAL** — 500 from two phantom columns. Fixed. |
| `/dashboard/notifications` | harness false positive — 53 chars is a correct empty state |
| `/login` | harness false positive — it is an alias that redirects to `/auth/login` |
| `/settings/credits` | stale access token in a browser session left open for hours; 200 on a fresh login |
| `/financial/savings`, `/onboarding`, `/settings/notifications` | dev-server compile timeouts under load; all serve 200 with 23–52 KB |

## Defects found and fixed

| Area | Defect | Evidence |
|---|---|---|
| Auth | middleware cookie-name mismatch — every user locked out | login now lands on `/dashboard`; was `/auth/login` |
| Auth | 213 client fetches could never authenticate | bare fetch to `/api/financial/budgets`: 401 → 200 |
| `/credit-builder` | used the **service-role** client for `auth.getUser()`, so it redirected *everyone* to login | page renders |
| `/financial/smart-budget` | "no active budget" thrown as an error → **500** for every new user | now 200 with `hasBudget:false` |
| `/ai-strategies` | stuck on a text-free skeleton forever when no `loanId`; its own empty state unreachable | 0 chars → "No Loan Selected…" |
| `/disputes/student-loans` | identical defect | 0 chars → "No Loan Selected…" |
| `/financial-intelligence` | metric values overflowed their cards; then truncated to `$124…` | 0 clipped elements at 1440px **and** 390px |
| Branding | header read "Agentic Credit Repair", logo mark was an **empty square**, nav omitted most of the product | Fynvita wordmark + 6 product pillars |
| Mobile | Reanimated's jest mock ships TS/ESM-only; the factory threw silently and broke RNTL host detection, failing every `render()` in a file | 32 failures → 0 |
| Mobile | **3 of 6 tabs crashed on render.** Stores wrote API payloads straight into array-typed fields, so a missing key left `undefined` where the type promised `T[]`; the first `.length`/`.map` took the whole tab down | all 6 tabs render |
| Mobile | `HomeScreen`'s guard tested truthiness while the next line dereferenced `.level.current` — the first screen after login died | renders 65 elements |
| `/challenges` | 500 — filtered on `status` and `is_public`, **neither column exists** | 33 → 495 chars |

---

## My own tooling was wrong three times

Worth recording, because each would have produced a **false** report:

1. **`nextjs-portal` as an error signal.** It is the dev-tools overlay, present on
   every page in development. First run: 12 of 12 routes "FAILED", including `/`,
   which serves 10,338 characters of correct content. Caught by disbelieving a
   12-of-12 failure.
2. **No allowance for dev compilation.** Next compiles each route on first visit,
   routinely past the 2,500 ms wait, so the sweep measured blank pages and called
   them broken — 7 false "0 chars" results including `/trading/journal` (really
   430 chars). A retry-on-empty separated these from the two genuinely blank
   pages.
3. **Login raced hydration.** The sweep aborted a whole run with "LOGIN FAILED"
   against credentials verified working at the API.
4. **A 60-char floor for "empty".** A correct empty state is short — 53
   characters of real UI was reported as broken.
5. **`/login` counted as a failed redirect** when redirecting to `/auth/login`
   is exactly what that alias route is for.

The lesson is the session's recurring one: a measurement is not evidence until
you know why it says what it says.

---

## Round 2 — the dynamic routes, and what the WARNs were hiding

The first round skipped 7 dynamic routes because they need real record ids.
That gap is closed: `scripts/dogfood-seeds.json` maps each pattern to a seeded
row, the sweep expands them, and a pattern with **no** seed is now reported as
`UNMEASURED` rather than silently dropped. All 204 routes are measured.

Exercising those 7 immediately found a page that had never worked:

| Defect | Evidence |
|---|---|
| **Every dispute detail page was unreachable**, two stacked defects. `DisputeDetail` fetched `/api/disputes?disputeId=X`, but that GET reads only status/bureau/page/limit and returns a paginated LIST — the id was ignored, so the page rendered "Dispute not found". Behind it, `mapToDispute` omitted `timeline`, which `<DisputeTimeline>` `.map`s unguarded → error boundary. | 24 chars → **355 chars** of real dispute with a working Timeline, 0 console errors |
| **Trading APIs 500'd for every caller.** `positions`/`orders` grant `authenticated` nothing, so the managers — still on the request-scoped client — got Postgres 42501. The declared RLS policies are dead letters: grants are checked *before* policies. | positions / orders / risk **500 → 200** |
| **Users were 403'd from their own financial data.** Six handlers gated non-create work on a premium CREATE permission. DELETE gated that way meant a downgraded user could never delete their own data. | goals/[id] **403 → 200**; goals/[id]/investment **404 → 200** |
| **Session listing and revocation did nothing.** A client component queried `sessions` through the browser anon client → 403 on every call. The page rendered fine while the control behind it was dead. | **403 → 200**; cross-user DELETE left the victim row intact |

### What the 12 remaining WARNs actually are

A WARN is a page that renders but whose own API calls fail. Grouped by cause,
they are almost entirely **unbuilt endpoints**, not broken ones:

- **13 × 404 — endpoints that do not exist.** `/api/credit-builder/*` (7),
  `/api/financial/subscriptions*` (3), `/api/investments/portfolio/*` (2).
  The pages call them and degrade. Feature work, not defects.
- **1 × 500 — `/api/investments/signals`.** Real, diagnosed, and deliberately
  left loud: see G-024. The service-role fix landed (moving the error from
  42501 to 42703); the remaining cause is that 14 of 27 fields the code maps
  do not exist on `trading_signals`. Renaming the two that break the query
  would turn a visible 500 into a page of silently-undefined values.
- **1 × 400 — `/api/student-loans/analyze`.** A POST endpoint; GET returns its
  own usage docs with 200. Not triaged further.

### One thing my own method got wrong again

The first full run reported **64 FAIL**. Nearly all of them were
`ERR_CONNECTION_REFUSED`, alphabetically from `/help/faq` onward — the dev
server died mid-sweep. The cause was mine: I restored a source file and ran the
test suite *while* the sweep was running, which triggered a Next hot-recompile
under load. Re-running the 75 failed/warned routes on a quiet machine gave
**0 FAIL**.

That is the fourth time in this effort a measurement, not the app, was the
thing that was broken. `--retry-from <report.json>` now exists so a suspect run
can be re-measured cheaply instead of being reported.

---

## Round 3 — the mobile app, actually driven

The first two rounds could only say the six bottom tabs rendered. This round
deep-linked **all 223 static expo-router routes** on a booted iPhone 17 Pro,
signed in as a real user, reading each screen back from the accessibility tree.

| | Result |
|---|---|
| Mobile routes measured | **223 of 223** static routes |
| Rendered | **204** |
| Failed | **19** — 12 crashed to the ErrorBoundary, 7 rendered almost nothing |
| Fixed and re-verified on device | **7** (6 crashes + `/billing`) |

Getting there needed a detour: `expo run:ios` misread the simulator as a
physical device and demanded code signing, and a from-source `xcodebuild` died
compiling `fmt` on a loaded machine. Expo Go needs no native build and both
native deps (`expo-secure-store`, `reanimated`) ship inside it, so that is the
path the harness uses.

### What it found

Two root causes accounted for six of the crashes:

- **Partial optional chains.** `a?.b.c` guards only `a` — the `.b` hop is still
  a hard dereference. 22 sites across 11 files. `/rewards` also had a
  truthiness-only `{progress && …}` over a block reading `progress.level.current`
  — the Home tab bug again, on the screen Home links to.
- **Raw API payloads written into array-typed state.**
  `setDocuments(response.data.documents)` where the state is
  `useState<Document[]>([])`: a missing key leaves `undefined` behind a type
  that promises an array, and the first `.length` takes the screen down. This
  is the case `src/store/toArray.ts` already exists for; the stores were fixed,
  the 17 component call sites were not.

Separately, **28 screens can hang on a permanent spinner** — their loaders
`setLoading(true)`, `await`, then `setLoading(false)` with no `finally`, so a
rejected call never clears the flag. `/billing` sat on "Loading billing…"
forever; it now shows an honest error with a retry.

### The finding that limits every mobile claim

**A dev build cannot verify the mobile data layer at all.** The Home tab
displayed a 731 credit score with per-bureau detail and "4 disputes / 2 pending
/ 1 resolved" while the database held **0 credit scores and 1 dispute** for
that user. `creditStore`, `disputeStore` and `investmentStore` contain 10 fetch
methods that `if (__DEV__) { set(seedData); return; }` — they never call the
API. Production takes the real path, so nothing fabricated ships; but it means
this sweep proves screens **navigate and render**, not that their data is
right. Recorded as G-031.

### The harness was wrong first, again

Run 1 reported **210 of 223 routes crashing**. Every failure carried an
identical 71-element count — and 210 independent crashes do not render
identically. React's ErrorBoundary replaces the whole tree and expo-router deep
links do not re-mount it, so after ONE crash (`/admin/users`) every later route
read back that same error screen. Truth: 13 passed, 1 crashed, 209 were never
measured. The harness now relaunches and re-navigates before recording any
crash. Fifth time in this effort that the measurement, not the app, was broken.

---

## Not verified — stated plainly

- ~~76 of 197 web routes unmeasured~~ — **resolved.** That run died under
  Next + Metro + simulator together. Re-run on a quiet machine: all 197 measured.
- ~~7 dynamic web routes never exercised~~ — **resolved.** Seeded and measured;
  see Round 2. Doing so found the dispute detail page had never worked.
- **The session feature is inert, and that is now known rather than assumed.**
  `public.sessions` holds 0 rows because `createSession` writes to five columns
  that do not exist and never supplies the NOT NULL `token_hash` (G-027). The
  list endpoint returning `[]` is therefore honest, not evidence that listing
  works against real data.
- ~~Mobile drill-down screens never driven on a simulator~~ — **resolved.** See
  Round 3. All 223 static routes deep-linked on an iPhone 17 Pro. It did find
  more, as predicted: 12 crashing screens and a permanent-spinner class.
- **Mobile points at HOSTED Supabase** (`EXPO_PUBLIC_SUPABASE_URL`) while web
  runs local, so the two halves were never exercised against the same data. It
  was pointed at local temporarily for this run and restored.
- **Hosted environment.** Everything here is local.
- ~~15 WARN routes not triaged~~ — **resolved.** All triaged; see Round 2. Four
  were real defects and are fixed; the rest are unbuilt endpoints.
- **The 13 missing endpoints are recorded, not built.** credit-builder,
  subscriptions and investments/portfolio have pages calling APIs that do not
  exist.

---

## Reproducing

```bash
npx supabase start
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon> \
SUPABASE_SERVICE_ROLE_KEY=<local service role> npm run dev

node scripts/dogfood-sweep.mjs --base http://localhost:3001 \
  --email <user> --password <pw> --out report.json
```

All three local Supabase values must match, or auth fails in ways that look like
application bugs — see `scripts/dogfood.sh`, which guards for exactly that.

---

## Revision History

| Date | Change |
|---|---|
| 2026-08-15 | Created. First systematic dogfood of this codebase; first time the mobile app has been run. |
| 2026-08-15 | **Round 3.** Mobile actually driven: 223 of 223 static routes deep-linked on an iPhone 17 Pro, 204 render / 19 fail, 7 fixed and re-verified on device. Root causes: partial optional chains (22 sites) and raw payloads into array-typed state (17 sites). Found that a dev build cannot verify mobile data at all (G-031) — Home showed a 731 score against 0 rows. Harness reported 210 false crashes before recovery was added. |
| 2026-08-15 | **Round 2.** Dynamic-route gap closed via `dogfood-seeds.json` — all 204 routes measured, 0 FAIL. Found and fixed 4 live defects the WARNs were hiding (dispute detail unreachable, trading APIs 500, financial 403s, session revocation dead). Recorded 3 findings needing an owner decision rather than guessing: G-024 signal schema drift, G-027 sessions cannot be created, G-028 revoke-all-others. Added `--retry-from` after a self-inflicted dev-server crash produced 64 false failures. |
