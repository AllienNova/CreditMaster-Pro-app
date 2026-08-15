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
| Web page sweep | **197 static routes**, signed in, real Chromium — **174 ok, 7 FAIL, 16 WARN** |
| Web routes skipped | **7 dynamic** (`[id]`, `[symbol]` …) — a literal `[id]` URL only proves the 404 path |
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

## Not verified — stated plainly

- ~~76 of 197 web routes unmeasured~~ — **resolved.** That run died under
  Next + Metro + simulator together. Re-run on a quiet machine: all 197 measured.
- **7 dynamic web routes** were never exercised; they need real record ids.
- **Mobile drill-down screens.** All six bottom tabs were signed into and
  walked, but the app has 37 route groups; screens reached by tapping *into* a
  tab are still unexercised.
- **Mobile points at HOSTED Supabase** (`EXPO_PUBLIC_SUPABASE_URL`) while web
  runs local, so the two halves were never exercised against the same data. It
  was pointed at local temporarily for this run and restored.
- **Hosted environment.** Everything here is local.
- The 15 WARN routes (pages whose own API calls returned 4xx/5xx) are recorded in
  the sweep report and **not yet triaged**.

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
