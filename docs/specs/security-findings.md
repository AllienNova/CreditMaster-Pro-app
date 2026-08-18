# Security Findings — Targeted Review (MFA, JWT, Anon-Client, Orphans, Secrets)

Scope: five specific questions assigned by team lead against `fix/restore-from-pre-deletion-state`
(HEAD `835cf72`), plus a checklist pass against `~/.claude/references/security-checklist.md`
(OWASP Top 10, lines 149-162; OWASP Top 10 for LLMs, lines 164-179). Not a full-repo audit —
the orphan/phantom-table sweep and the AI/LLM orchestration pipeline are separate, ongoing
work tracks (see "What I could NOT verify").

Every row below was read from source this session. No finding is carried over from a prior
report without independent verification.

## Ground-truth corrections

**Anon-client count.** The assignment listed 12 modules using the anon `getSupabase()` client.
Verified: only **8** actually import it from `src/lib/supabase/client.ts`. The other 4 — the
cron routes (`send-reminders`, `financial-snapshots`, `cleanup-expired-sessions`,
`check-dispute-status`) — each define their own, differently-implemented, identically-named
local `getSupabase()` that reads `SUPABASE_SERVICE_ROLE_KEY` (
`src/app/api/cron/send-reminders/route.ts:5-13` and siblings). They share a function name with
the broken singleton, not its behavior. See SF-08.

**Reachability methodology.** The original brief for this review used "0 live importers" (a
direct, non-test import grep) as the reachability signal. Team lead subsequently landed
`scripts/audit-reachability.js` (commit `2b23237`), which computes true transitive reachability
from Next.js entry points and corrects the earlier "~55 orphans" estimate to **319 of 1,507
product modules unreachable** (the 55 are a subset). Re-run against the four modules central to
SF-03/04/05 and against `mfa-service.ts`: all five are confirmed **unreachable** by the
canonical script, consistent with this review's own direct-importer check. `backup-codes.ts`
and `BackupCodesManagement.tsx` (SF-01) do **not** appear in the script's unreachable list —
confirmed live. Severity labels below use LIVE / LATENT per this script, not the earlier
import-count language.

**Phantom-table framing.** Of the 68 phantom tables, exactly 1 (`pctt_positions`) sits behind
reachable code; 64 are behind unreachable code and 3 are test-only. A phantom table behind
unreachable code is a **wiring prerequisite**, not a live outage — findings below that mention a
phantom table are worded to reflect that (SF-03, SF-04, "What I could NOT verify"). The one
exception in this report's scope is `backup_codes` (SF-01), which is **not** phantom — it was
created by `20260516000001_atomic_backup_code_redemption.sql` and sits behind reachable code; its
problem is a grant/policy mismatch, not a missing table. `user_backup_codes`, the table the
*orphaned* `mfa-service.ts` writes to (SF-02), **is** phantom — no migration creates it. These are
two parallel MFA-backup-code implementations against two different tables, one real, one not;
see SF-01 vs. SF-02.

## Findings

| ID | Severity | Title | file:line | Exploit path | Fix |
|---|---|---|---|---|---|
| SF-01 | **P1 — LIVE** (confirmed reachable: `src/app/settings/security/page.tsx` renders `BackupCodesManagement.tsx`) | Backup-code MFA recovery is completely non-functional | `supabase/migrations/20260516000001_atomic_backup_code_redemption.sql:67-68`; `src/lib/auth/backup-codes.ts:110`; `src/lib/auth/auth-service.ts:549-638` | Live component `BackupCodesManagement.tsx` calls `backupCodesService.generateBackupCodes`/`verifyBackupCode` through the browser client (`createClient()`, role `authenticated`). `redeem_backup_code`'s EXECUTE grant is `service_role`-only (`REVOKE...FROM PUBLIC` + `GRANT...TO service_role`), so every RPC call returns 42501. Separately, `backup_codes` has `ENABLE ROW LEVEL SECURITY` (line 30) with **zero `CREATE POLICY`** anywhere in the migration set, so the live `generateBackupCodes` INSERT also fails closed. And no code path — `auth-service.ts`'s real login/MFA-challenge flow uses only Supabase's native `mfa.enroll`/`mfa.challengeAndVerify`/`mfa.unenroll`/`mfa.listFactors` — ever calls `verifyBackupCode`. Net effect: a user who loses their TOTP device has no working recovery path today. This is a broken control, not a bypass — confirmed fail-closed, not fail-open. | Grant `redeem_backup_code` EXECUTE to `authenticated` and add ownership-scoped RLS policies for `backup_codes` INSERT/SELECT/DELETE matching the browser-client call pattern, **or** move both methods server-side behind an API route using the service role. Either way, build the missing login-time "use a backup code" UI + route. |
| SF-02 | P2 — LATENT (confirmed unreachable, `scripts/audit-reachability.js`) | Backup-code verification in orphaned `mfa-service.ts` has an unfixed TOCTOU replay bug (same class as FND-010) | `src/lib/auth/mfa-service.ts:282-336` | `verifyBackupCode` reads the full `codes` JSON array, finds an unused match in application code, flips `used=true` in memory, then writes the whole array back in a separate `.update()` — no row lock, no atomicity. Two concurrent requests with the same code can both pass the `findIndex` check before either write lands, so one code authenticates twice; a concurrent legitimate use can also be lost to a last-write-wins overwrite. This is the exact bug `20260516000001_atomic_backup_code_redemption.sql`'s own comment describes fixing (FND-010) — never backported to this parallel implementation. Zero live importers today, so not currently exploitable. | Delete this module's backup-code methods in favor of the RPC path once SF-01 is fixed, or apply the same `FOR UPDATE` row-lock pattern here if the module is kept. |
| SF-03 | P1 — LATENT (confirmed unreachable; backing tables are Class-B phantom, i.e. a wiring prerequisite, not a live outage) | `proactive-alert-engine.ts`: alert-mutation methods have no ownership check at all | `src/lib/ai/proactive-alert-engine.ts:1064-1083` (`markAsRead`/`dismissAlert`/`markAsActedUpon`); `:1035-1062` (`getAlerts`); `:1085-1093` (`updatePreferences`) | Constructed with `SUPABASE_SERVICE_ROLE_KEY` (line 1105), bypassing RLS entirely — the method body is the only access control. `markAsRead(alertId)`, `dismissAlert(alertId)`, `markAsActedUpon(alertId)` take **no `userId` parameter**, only `.eq("id", alertId)`. `getAlerts(userId, ...)` and `updatePreferences(userId, ...)` trust a raw `userId` with no session cross-check. Mirroring the achievements precedent: a route that takes input straight from the request would let an attacker read another user's account balances, transaction amounts, and credit-score deltas (`getAlerts`), silence a victim's `fraud_suspected` alert by ID (`dismissAlert`), or disable their fraud-alert category entirely (`updatePreferences`) ahead of defrauding the account. Currently unreachable twice over: 0 live importers, and `proactive_alerts`/`alert_preferences` are phantom tables (no migration creates them) — any invocation 500s today before the authorization gap matters. | Before wiring any route to this service: add ownership parameters to the three mutation methods and enforce `.eq("user_id", userId)`; source `userId` only from the route guard's resolved `AuthedUser`, never from the request body/query. |
| SF-04 | P1 — LATENT (confirmed unreachable; backing table is Class-B phantom, i.e. a wiring prerequisite, not a live outage) | `accountability-partners-service.ts`: `updateShareLevel` is missing the ownership check its sibling methods have | `src/lib/gamification/accountability-partners-service.ts:289-314` vs. the guard pattern at `:326-331` (`endPartnership`) and `:349-355` (`sendNudge`) | `endPartnership` and `sendNudge` both reject callers who are neither `partnership.requesterId` nor `partnership.partnerId`. `updateShareLevel` does not: it computes `isRequester = partnership.requesterId === userId` and, when false, unconditionally writes `partner_share_level` — so a caller who is a stranger to the partnership can still set it (e.g. to `"full"`), which per the `SharedProgress`/`PartnerProfile` types governs exposure of `savingsProgress`, `debtProgress`, `budgetAdherence`, and `goalDetails` to the other side. Service role bypasses RLS (line 505-506), so this app-level check is the only enforcement, and it's absent. This is a code defect independent of how the module gets wired — not conditional on a careless caller. Currently unreachable: 0 live importers, `partnerships` is a phantom table. | Add the same `if (partnership.requesterId !== userId && partnership.partnerId !== userId) throw ...` guard used in `endPartnership`/`sendNudge` to `updateShareLevel`, before the `isRequester` branch. |
| SF-05 | P2 — LATENT (both confirmed unreachable) | Two modules fabricate successful financial actions instead of performing or refusing them | `src/lib/gamification/commitment-device-service.ts:399-423` (`executeConsequence`); `src/lib/investments/services/AutoRebalanceScheduler.ts:426-447` (`executeRebalance`) | `executeConsequence` writes `consequence_executed: true` and a `commitment_donations` row with a real dollar `amount`, with the comment "In production, this would integrate with payment processing / For now, just record..." — no payment processor is ever called. `executeRebalance` fabricates `orderId`, `executedPrice`, and `commission` and unconditionally returns `success: true` ("In production, this would call OrderExecutionEngine / For now, simulate successful execution") — no order is ever placed. Same fabrication-of-financial-state pattern this codebase already treats as CRITICAL elsewhere (FND-016/017: fake Stripe card/activation). If either ships to UI before the real integration exists, a user sees confirmation of a donation or a trade that never happened. | Gate both paths the same way `POST /api/gamification/achievements` was gated (501 / feature flag) until the real payment/order-execution integration exists. Never let `success: true` / `consequence_executed: true` ship without a real downstream call. |
| SF-06 | P2 — LATENT (all 8 confirmed unreachable) | All 8 genuine anon-client modules are simultaneously fully unreachable — inverts today's blast radius | `src/lib/financial/bill-calendar-service.ts`; `src/lib/goals/services/{ContributionSchedulerService,GoalNotificationService}.ts`; `src/lib/auth/mfa-service.ts`; `src/lib/credit-bureau/{inquiry-removal-service,credit-error-detector}.ts`; `src/lib/documents/ocr-bridge-service.ts`; `src/lib/email/email-preferences-service.ts` | Verified via identifier-level grep (`billCalendarService`, `contributionScheduler`, `goalNotificationService`, `inquiryRemovalService`, `creditErrorDetector`, `ocrBridgeService`, `emailPreferencesService`, plus `mfa-service.ts` importers) that none of the 8 has a live non-test importer anywhere in `src/` or `mobile-app/`; also checked each directory for a barrel `index.ts` that might re-export them — none re-export these. Today the anon-client bug (`auth.uid()` NULL → RLS returns zero rows / write errors) has zero live blast radius. Ranked by sensitivity if wired without first fixing the client: `mfa-service.ts` (auth, see SF-01/02) and `ocr-bridge-service.ts` (parses W2/1099/1098 tax-form OCR results) highest; the two credit-bureau modules next (credit-report PII); `email-preferences-service.ts` throws loudly on failure rather than falsely confirming an unsubscribe (the safest of the eight); `bill-calendar-service.ts`/`ContributionSchedulerService.ts`/`GoalNotificationService.ts` lowest (money-adjacent planning data, fail closed). | Fix the shared root cause once — route these through the SSR cookie-aware `createClient()` or an explicit service-role server client, per module's actual trust boundary — rather than patching per-module as each gets wired up. Add a lint rule forbidding new `getSupabase()` (anon) imports in server-only modules outside `src/lib/supabase/client.ts` itself. |
| SF-07 | P3 (informational — verified not vulnerable) | JWT HS256 legacy branch is reachable but not exploitable via alg-confusion | `src/lib/auth/jwt-validation.ts:151-157` (`verifyHs256`) vs. `:178-198` (`verifyAsymmetric`); consumed by `src/lib/auth/api-guard.ts:104,134,173,215` | An attacker fully controls the unverified header (`decodeHeader`, line 137-145) and can force `alg: "HS256"` into `verifyHs256`. Classic alg-confusion (using the RS256/ES256 public key as the HMAC secret) does not apply: `verifyHs256`'s secret is `process.env.JWT_SECRET \|\| process.env.SUPABASE_JWT_SECRET`, used nowhere else in the codebase (repo-wide grep, one hit) and structurally independent of the ES256/RS256 public keys `verifyAsymmetric` fetches from Supabase's JWKS endpoint. Both branches pin `algorithms`, so neither `"none"` nor a cross-branch swap verifies. Even a successful forgery (requires knowing the HMAC secret) is capped by `api-guard.ts:85-96` (`buildAuthedUser`), which always re-resolves role from the `profiles` table and discards the JWT's `role` claim — confirms the comment at `jwt-validation.ts:123-127`. This branch is live: imported by `api-guard.ts`, which backs `withAuth`/`withPermission`/`withRole`/`withOptionalAuth`. | None required. Residual and unverified: whether `JWT_SECRET`/`SUPABASE_JWT_SECRET` is actually set to a strong value in the deployed environment. `.env.production.example:28` instructs operators to self-generate one; `.env.example` does not list the variable at all. Confirm via deployment config, not source. |
| SF-08 | P3 (informational — ground-truth correction) | 4 of the originally-flagged 12 "anon-client" modules use the service-role key, not the anon client | `src/app/api/cron/send-reminders/route.ts:5-13`; `.../financial-snapshots/route.ts:49-54`; `.../cleanup-expired-sessions/route.ts:5-13`; `.../check-dispute-status/route.ts:6-14` | Each cron route defines its own local `getSupabase()` (not imported from `src/lib/supabase/client.ts`) reading `SUPABASE_SERVICE_ROLE_KEY`, correctly bypassing RLS for a route with no user session. Same function name as the broken shared singleton, unrelated implementation. Narrows the genuine anon-client-bug module count from 12 to 8 (SF-06). | None required for these 4 files on this axis. |
| SF-09 | P3 (informational — verified clean) | No hardcoded secrets found in source | repo-wide (`src/`) | Grepped for Stripe/AWS/Google key shapes, PEM private-key headers, JWT-shaped literals, and generic `apiKey/secret/password/token = "literal"` assignments. Zero matches outside test files, where values are obvious placeholders (`"test-service-key"`, `"svc-key"`). `.env.local` exists on disk but is untracked and covered by `.gitignore:42-46`; only `.env.example`/`.env.local.example`/`.env.production.example` are tracked, and none of the three embed a real value. | None required. |
| SF-10 | P3 (informational — hardening) | JWT verification does not pin an expected `issuer` | `src/lib/auth/jwt-validation.ts:154-156`, `:190-195` | Neither `jwt.verify(token, secret, { algorithms: ["HS256"] })` nor `jwtVerify(token, jwks, { algorithms: ["ES256", "RS256"] })` passes an `issuer` option (checklist:52 — "JWT tokens validated (signature, expiration, issuer)"). Not currently exploitable: the JWKS is fetched from this app's own configured `NEXT_PUBLIC_SUPABASE_URL`, so a token from an unrelated issuer would not verify against these keys regardless. Defense-in-depth gap, not a live bypass. | Pass `issuer: `${base}/auth/v1`` (or equivalent) to both `jwt.verify` and `jwtVerify` calls. |

## OWASP Top 10 / LLM Top 10 checklist pass

Walked `~/.claude/references/security-checklist.md` lines 149-179 against everything read this
session.

- **A01 Broken Access Control** (checklist:153, :49 "every resource access checks ownership") — SF-03, SF-04 are direct hits. SF-06's eight anon-client modules are the RLS-side mirror of the same category (ownership enforced by a database layer the anon client can't authenticate into, rather than missing app-level checks).
- **A02 Cryptographic Failures** (checklist:154) — backup codes hashed with unsalted SHA-256 (`backup-codes.ts:203-205`, `mfa-service.ts:360-362`); acceptable for a server-generated random token (not a user password, so checklist:38's bcrypt bar doesn't apply), but the codes themselves are only 4 bytes / 32 bits of entropy (`crypto.randomBytes(4)`, `backup-codes.ts:59`) with no confirmed rate limit on redemption (SF-01 means there currently is no reachable redemption endpoint to rate-limit at all). Flag alongside the SF-01 fix: whatever replaces the broken redemption path needs a rate limit per checklist:41 before going live.
- **A03 Injection** — targeted greps for raw `.raw(`/string-built queries found nothing; Supabase JS client parameterizes by default. Not exhaustively swept (see below).
- **A04 Insecure Design** — the recurring raw-`userId`-parameter pattern across `commitment-device-service.ts`, `accountability-partners-service.ts`, `proactive-alert-engine.ts`, and `AutoRebalanceScheduler.ts` is a design-level issue: safety depends entirely on every future caller remembering to pass the session-verified id, never client input. This codebase has already made that exact mistake once (the achievements route).
- **A05 Security Misconfiguration** — SF-01 (RPC grant vs. caller role mismatch), SF-06 (wrong client for the trust boundary).
- **A06 Vulnerable Components** — not re-run; `npm audit` (32 vulns, 1 critical) is already a tracked, open launch condition per `CLAUDE.md` STATUS BANNER — not re-derived here.
- **A07 Auth Failures** — SF-01, SF-02, SF-07, SF-10.
- **A08 Data Integrity Failures** — SF-05 (fabricated financial-action confirmations).
- **A09 Logging Failures** — targeted grep for PII/secret fields inside `console.*` calls found nothing. Not exhaustively swept.
- **A10 SSRF** (checklist:65) — targeted grep for `fetch()` calls built directly from request/body/param values found nothing. Not exhaustively swept.

**OWASP Top 10 for LLMs** — Fynvita has a real LLM surface (3-layer AI architecture, dispute
generator, credit analyzer, trading AI agents per `CLAUDE.md` §5) but it was not the assigned
scope and a full pass was not performed. The one AI-directory module actually reviewed here,
`src/lib/ai/proactive-alert-engine.ts`, is rule-based threshold logic with no model call and no
prompt-injection surface — it does not itself raise an LLM01-10 issue; it's included in this
report purely for its access-control bug (SF-03). LLM01 (prompt injection into
`AIOrchestrator`/dispute-letter generation), LLM05 (whether generated dispute text is validated
before being treated as a real dispute claim), and LLM06 (agency scope of the 7 trading AI
agents) all warrant a dedicated pass — see "What I could NOT verify."

## What I could NOT verify

- Whether `JWT_SECRET`/`SUPABASE_JWT_SECRET` is actually set, and how strong, in the deployed
  environment (SF-07). Source only shows the variable is documented for self-generation in
  `.env.production.example`, not what any live deployment actually has.
- Whether `@supabase/ssr`'s cookie defaults (checklist:39 — `httpOnly`/`secure`/`sameSite`) are
  what actually reach the browser. `src/lib/supabase/server.ts` and `src/middleware.ts` pass
  `options` straight through to `cookieStore.set()` without overriding them, so behavior is
  whatever `@supabase/ssr` sets internally — not independently confirmed against that library's
  source this session.
- RLS policy text for `bills`, `email_preferences` (phantom — no migration), `goal_contributions`,
  `commitment_contracts`, `partnerships`, `proactive_alerts`, etc. was not individually read
  table-by-table. For the 8 anon-client modules (SF-06) the general mechanism (`auth.uid()` NULL
  under RLS) was treated as established per the assignment; for the 4 service-role modules
  (SF-03, SF-04, SF-05) RLS is moot since service role bypasses it outright.
  `commitment_contracts`, `commitment_check_ins`, `commitment_donations`, `partnerships`,
  `partner_invitations`, `partner_nudges`, `proactive_alerts`, and `alert_preferences` are all
  confirmed phantom (no migration creates them) via `scripts/audit-phantom-tables.js` — wiring
  any of SF-03/04/05 up today would 500 immediately, before the authorization gaps matter, unless
  a migration is added at the same time (which is this codebase's established pattern per the
  `backup_codes` migration's own commit comment).
- The other ~47 orphan modules outside my assigned 4 (`commitment-device-service.ts`,
  `AutoRebalanceScheduler.ts`, `accountability-partners-service.ts`,
  `proactive-alert-engine.ts`) were not reviewed — that sweep is a separate, parallel task on
  this board.
- Full OWASP A03/A09/A10 coverage across all 284 API routes — only targeted greps run, not an
  exhaustive route-by-route sweep.
- Full LLM Top 10 pass of `AIMLService`/`ModelRouter`/`AIOrchestrator`/`DisputeGenerator`/
  `CreditAnalyzer` — out of scope for this pass, flagged above as follow-up work.
- Whether an out-of-band (support-ticket-mediated) MFA recovery path exists to compensate for
  SF-01 — not checked, out of scope.
- Production `.env` contents were never read, per this project's secrets-handling policy — all
  claims about env-var presence are based on `.env.example`/`.env.production.example`/
  `.env.local.example` and source references only.

---

## SF-07 — Paper trading executes at randomly generated prices, and its performance metrics are a random walk

**Status:** LIVE. **Severity:** HIGH (data integrity / user-facing fabrication).
**Found:** 2026-08-17, while building `POST /api/trading/paper/positions/close`.
**Decision required from the owner** — this is a product fork, not a bug with one obvious fix.

### What the code does

`src/lib/trading/paper/PaperTradingEngine.ts:1201`, inside `getCurrentPrice`:

```ts
    } catch {
      // Fallback to mock price for testing
    }

    // Fallback mock price
    const mockPrice = 100 + Math.random() * 100;
```

The Polygon call above it uses `process.env.POLYGON_API_KEY`, which is not
configured (it appears only in `docs/archive/` and deployment examples, not in
any live env file). So the `catch` is the normal path, and **every paper trade
executes at a uniformly random price between $100 and $200**, regardless of
symbol. `Math.random()` means it is not even reproducible between runs.

`src/lib/trading/paper/PaperTradingEngine.ts:1283`, inside `getDailyReturns`:

```ts
    // Generate mock daily returns for now
    const dailyReturn = (Math.random() - 0.48) * 0.04; // -2% to +2%
```

This generates a random walk forward from `initial_balance` and **never reads a
single trade**. It is the sole input to `calculateMaxDrawdown` and
`calculateSharpeRatio`, and it is returned directly as `dailyReturns`.

### Blast radius

The fabricated price is not confined to display. It sets, per trade:

| Written to | Column |
|---|---|
| `paper_fills` | `price` |
| `paper_trades` | `price`, `total_value`, `realized_pl` |
| `paper_positions` | `avg_entry_price`, `market_value`, `cost_basis`, `unrealized_pl` |
| `paper_accounts` | `cash_balance`, `buying_power`, `total_value` |

And `realized_pl` is passed to `trackTradeForGraduation` and
`recordStrategyPerformance` — so **a user's progression from WATCH to GUIDED
mode is decided by random numbers**, as is the apparent performance of every
strategy in the library.

`GET /api/trading/paper/performance` serves `maxDrawdown`, `sharpeRatio` and
`dailyReturns` computed entirely from the random walk. Two refreshes give two
different Sharpe ratios for the same account.

### Observed

A live close of a seeded AAPL position (10 shares, avg entry $150) on
2026-08-17 filled at **$144.05**, inside the `100–200` band, producing a
recorded `realized_pl` of `-59.55`. No market produced that price.

### Options

1. **Fail closed.** `getCurrentPrice` throws when no real quote is available;
   paper trading refuses to execute rather than executing at fiction. Honest,
   and consistent with how the rest of this remediation has treated missing
   data. Cost: paper trading stops working anywhere without a market-data key,
   including demos, until one is provisioned.
2. **Provision the market-data key** (`POLYGON_API_KEY`) and keep the fallback
   only for tests, behind an explicit flag that is never set in production.
   Cost: a vendor dependency and its billing.
3. **Keep a simulated mode, but label and quarantine it.** Trades executed at a
   simulated price are marked as such in `paper_trades`, excluded from
   graduation and from strategy performance, and the UI says the prices are
   simulated. Cost: schema change plus UI work; the honest version of what the
   code pretends to do today.

`getDailyReturns` has no equivalent fork: it should compute from real
`paper_trades`/account history or return empty, and the metrics derived from it
should be absent rather than invented. That part is a straight bug fix once the
price question is settled.

### Not done

No change has been made to either function. `POST /api/trading/paper/positions/
close` (commit `2f66f87`) was built on top of this engine and reports faithfully
what the engine records — which means it currently reports fabricated P&L. Its
commit carries a `Directive:` trailer saying so.

---

## SF-08 — The MFA service cannot work server-side, and the obvious fix does not work either

**Status:** LATENT (the TOTP methods have zero callers). **Severity:** MEDIUM as it stands,
HIGH if someone wires it up without reading this.
**Found:** 2026-08-17, while scoping `/user/settings/2fa/{enable,verify,disable}`.
**This is a note to whoever builds 2FA next. It is not a bug report.**

### What is there today

`src/lib/auth/mfa-service.ts` exposes `enrollTOTP`, `verifyTOTPEnrollment`,
`unenrollTOTP`, `createChallenge` and `verifyChallenge`. Every one of them calls
`supabase.auth.mfa.*` on a module-level singleton:

```ts
import { getSupabase } from "@/lib/supabase/client";
const supabase = getSupabase();
```

`getSupabase()` is a lazily-built **anon** client with no user session. Supabase
MFA operates on the currently signed-in user, so on the server there is no user
for it to operate on. Nothing calls these five methods — they are dead code that
also could not run. The three mobile endpoints
(`/user/settings/2fa/enable|verify|disable`) are 404s that would have been built
on top of them.

### The trap

The natural fix is a per-request client carrying the caller's bearer token:

```ts
createClient(url, anonKey, {
  global: { headers: { Authorization: `Bearer ${accessToken}` } },
})
```

**That does not work for MFA.** Verified against auth-js source
(`supabase/auth-js`, `src/GoTrueClient.ts`): the MFA methods do not use the
client's global headers. They read the session and pass the token explicitly:

```
const { data: sessionData, error: sessionError } = result
...
jwt: sessionData?.session?.access_token,
```

with `_enroll` POSTing to `` `${this.url}/factors` `` and `_unenroll` DELETEing
`` `${this.url}/factors/${params.factorId}` ``. With no session in the client,
`sessionData?.session?.access_token` is undefined and the request is
unauthenticated regardless of what headers were configured.

So a working server-side implementation needs either a client with a real
session (`setSession` needs a refresh token, which mobile does not send — and
accepting refresh tokens at an API is its own decision), or direct calls to the
GoTrue REST endpoints with the caller's access token as the bearer.

### The second constraint, on disable

Per the official reference for `mfa.unenroll()`: "A user has to have an `aal2`
authenticator level in order to unenroll a `verified` factor."

The mobile contract is `disable2FA(code)` — a TOTP code in the body. A bearer
token from a password login is **aal1**. Presenting a code in a request body does
not by itself elevate anything. Disable therefore has to challenge and verify
first (which elevates the session), then unenroll, within the same request and
on the same client. Building it as "check the code ourselves, then unenroll"
would either fail against Supabase or, if someone routed around it with the
service role, remove a verified second factor on the strength of a check we
wrote — an MFA bypass.

### Not verified, and needed before building

The auth-js source fetch truncated before `_challenge` and `_verify`. Their exact
endpoint paths and request-body field names are therefore NOT confirmed here, and
they are not guessed. Confirm them from source or the GoTrue OpenAPI spec before
writing the code.

### Not done

No routes built, no code changed. Building any of the three on the current
`MFAService` would produce endpoints that cannot work; building `disable` on a
guessed contract could produce one that works and should not.

---

## SF-09 — Dispute letters advertise a success rate nobody measured

**Status:** LIVE (user-visible). **Severity:** MEDIUM — it is a claim about outcomes in a
credit-repair product, not a data leak.
**Found:** 2026-08-17, while building `/api/disputes/templates/[id]`.

Each entry in the dispute letter catalogue carries a hardcoded `successRate`:

```ts
{
  id: "late-payment-goodwill",
  name: "Late Payment Goodwill Letter",
  successRate: 65,
  ...
}
```

Nothing computes it. `public.dispute_template_usage` exists with exactly the
columns that would — `template_id`, `dispute_id`, `outcome` — and is written by
nothing and read by nothing; the only reference to it anywhere in `src/` is a
comment. The figure reaches users through the templates list and through
`/api/disputes/generate` (which copies `successRate` onto strategies and
generated letters in six places), presented as a property of the letter.

So a user choosing which dispute to send about their own credit report is
shown a number that looks measured and is not.

### Why this is not simply deleted

Removing the field changes what an existing screen shows, and whether the
product should display an expected success rate at all is a product question.
There is also a real version available: once `dispute_template_usage.outcome`
is populated, the rate could be computed per template from actual outcomes.

### Options

1. **Compute it.** Write outcomes to `dispute_template_usage` when a dispute
   resolves, and derive `successRate` from them — showing nothing until there
   is enough data to be worth showing.
2. **Label it.** Keep the constants but mark them plainly as estimates rather
   than measurements, in the payload and in the UI.
3. **Remove it.** Drop the field; let users pick a letter on what it says.

### Not done

No behaviour changed. The catalogue was extracted from
`/api/disputes/templates/route.ts` into `src/lib/disputes/letter-templates.ts`
so the new detail route could share it rather than hold a second copy, and
`successRate` was carried across unchanged with a note at the top of that file
pointing here. The new route returns it so the detail screen agrees with the
list screen — not because it is a fact.

---

## SF-10 — Tax document uploads discard the file

**Status:** LIVE. **Severity:** MEDIUM-HIGH (data loss, silent).
**Found:** 2026-08-17, while scoping `/tax/documents/[id]/download`.

`POST /api/tax/documents/upload` accepts a file, runs extraction over it, and
inserts a `tax_documents` row containing `document_name`, `file_size`,
`mime_type`, `extracted_data`, `extraction_confidence` and `is_verified`.

It never stores the file. There is no S3 call, no Supabase Storage call, no
write of any kind for the bytes — and the insert does not set `storage_path`.

```
grep -n "storage|\.upload\(|PutObject|s3Client|writeFile" \
  src/app/api/tax/documents/upload/route.ts
  -> no matches
```

`storage_path` is READ in three places — `/api/tax/documents/route.ts:126,148,151`
and `/api/tax/documents/[id]/route.ts:95` — where deletion calls
`.remove([document.storage_path])` to clean up a file that was never written. It
is written nowhere in `src/`, and the column is null on every row:

```sql
select count(*) filter (where storage_path is not null) || ' of ' || count(*)
  from public.tax_documents;
-> 0 of 0
```

### Why it matters

A user uploads their W-2, the app reads it and shows the numbers, and the
document itself is gone. They cannot re-download what they gave us, and nothing
can re-extract from the original if the parser improves or a value is disputed.

The table itself expects the original to exist: `requires_review`,
`review_reasons`, `verified_by` and `verified_at` describe a human review
workflow, and `manual_corrections`/`correction_history` describe correcting
extraction against a source. None of that is possible without the file.

### Consequence for the tracked route

`/tax/documents/[id]/download` cannot be built. It is not a missing endpoint —
there is nothing to serve. Anything that appears to download a tax document
today would have to fabricate one.

### Options

1. **Store it.** Write the file (S3 or Supabase Storage, matching whichever
   the delete paths already assume) and set `storage_path` on insert. The
   delete paths then start working as written, and the download route becomes
   the same shape as `/api/documents/[id]/download`.
2. **Say so.** If discarding the file is deliberate — a data-minimisation
   choice for tax documents — then the upload UI should say the original is not
   kept, the delete paths' `storage_path` handling should go, and the download
   control should not exist.

Either is defensible. Silently dropping the file while the schema and three
code paths assume it is there is not.

### Not done

No code changed. This was found while scoping a download route that was then
not built, because building it would have meant inventing a file.

---

## SF-11 — A failed bureau call returns an invented credit report, and nothing says so

**Status:** LIVE. **Severity:** HIGH — the highest in this file. Credit report data drives
dispute letters, which are legal correspondence sent to a bureau.
**Found:** 2026-08-17, while scoping `/credit/scores/refresh`.

`CreditBureauService.getCreditReport(userId, bureau, reportType, enableFallback = true)`:

```ts
      // Graceful fallback: if the live call failed and fallback is enabled,
      // use MockCreditBureauAdapter to return realistic data
      if (!response.success && enableFallback) {
        const mockAdapter = new MockCreditBureauAdapter({ simulatedBureau: bureau });
        response = await mockAdapter.getCreditReport(request, userPII);
        // Tag the response so callers know it came from mock
        response.reference_id = `fallback_${response.reference_id ?? "unknown"}`;
```

Three facts together make this live:

1. **The fallback is on by default** — `enableFallback = true` in the signature.
2. **The live call always fails without credentials.** The clients are built from
   `process.env.EXPERIAN_CLIENT_ID || ""` and siblings; with no key there is no
   successful bureau call to fall back from.
3. **Nothing reads the tag.** `reference_id` is prefixed `fallback_`, but a
   repo-wide search for that prefix finds it only inside the service and in its
   own unit test (`credit-bureau-service.test.ts:1552`). No route, no client, no
   screen inspects it. A marker nobody checks is not a marker.

### What the user is shown

`MockCreditBureauAdapter` generates data designed to look real:

```
account_number: `****${randomInt(1000, 9999)}`
creditor_name:  randomChoice([...])
payment_status: randomChoice(statuses)
credit_score:   score
```

So a user opens their credit report and sees accounts, creditors, payment
statuses, inquiries and a score — none of which are theirs, none of which are
labelled, and all of which look exactly like a real report.

### Why this outranks SF-07

SF-07's fabricated prices corrupt a paper-trading account. These fabricated
accounts are the input to the dispute flow: `/api/disputes/generate` takes a
credit report and produces a letter that a user sends to a credit bureau. A
person could dispute an account that does not exist, on the strength of a report
this code invented.

### Options

1. **Remove the fallback.** A failed bureau call returns a failure. The screen
   says the report could not be retrieved — which is true, and is what every
   other read path in this remediation now does.
2. **Keep it for development only**, behind a flag that cannot be set in
   production, and default `enableFallback` to false.
3. **Keep it and surface it**, loudly — the payload carries an explicit
   `isSimulated: true` that routes propagate and screens render as a banner, and
   the dispute flow refuses to generate a letter from simulated data.

Option 1 is the recommendation. The reason the fallback exists — "so the UX
remains functional during development or outages" — is met by option 2 for
development, and during an outage an honest error beats an invented report.

### Not done

No code changed. `/credit/scores/refresh` (7 callers in the mobile app, all
currently 404ing) was NOT built, because a refresh endpoint on top of this
service would hand the user a freshly-generated fake report and call it new
data.

---

## SF-12 — The mobile billing screen shows everyone a Visa ending 4242

**Status:** LIVE (user-visible). **Severity:** HIGH.
**Found:** 2026-08-17, while scoping `/user/billing/payment-method`.
**This is FND-016/017 again, in the mobile app.**

`mobile-app/app/settings/billing.tsx` renders payment methods and invoices from
two module constants:

```ts
const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "1", type: "card", last4: "4242", brand: "Visa",       expiry: "12/25", isDefault: true  },
  { id: "2", type: "card", last4: "5555", brand: "Mastercard", expiry: "08/26", isDefault: false },
];

const INVOICES: Invoice[] = [
  { id: "1", date: "Dec 1, 2024", amount: 29.0, status: "paid" },
  { id: "2", date: "Nov 1, 2024", amount: 29.0, status: "paid" },
  { id: "3", date: "Oct 1, 2024", amount: 29.0, status: "paid" },
];
```

`useState(PAYMENT_METHODS)` at line 99, `INVOICES.map` at 241. The file makes no
network call of any kind — no `api.`, no `fetch(`, not even a `useEffect`.

So every user opening billing sees a Visa ending 4242 saved as their default
payment method, a second Mastercard, and three $29.00 invoices marked paid.
`4242` is Stripe's test card number.

### Why this is not a new class of problem

The register already records FND-016/017: "`billing-profile-store` returns fake
Visa 4242 to every new user". That was found and remediated on the WEB side. The
same fabrication is sitting in the mobile app, untouched, and no gate covers it —
`audit:mocks` scans web `src/`, not `mobile-app/`.

### What a user can conclude

That a card is on file when none is. That they have been charged $29.00 three
times when they have not. Both are statements about someone's money, and the
second is a statement about money already taken.

### The real data exists

`GET /api/payment/billing` returns `{ plans, subscription, paymentMethods,
invoices }` in one response — the same route the client's own comment (see
`services/api/user.ts:512-517`) describes as "the ONE billing read", and which
three other billing paths were already reconciled onto. This screen was simply
never wired to it.

### Options

1. **Wire it to `/payment/billing`** and delete both constants. The route exists
   and already serves exactly these four things.
2. If it must ship before that, **render nothing** rather than invented cards —
   an empty state saying billing could not be loaded.

There is no third option in which the constants stay.

### Resolved 2026-08-17

Option 1 taken. `app/settings/billing.tsx` now reads
`subscriptionApi.getBillingSettings()`, which calls `GET /api/payment/billing`
and maps it with `mapWebPaymentMethods` + `mapWebInvoices` — both added to the
existing billing module in `services/api/user.ts` rather than a second adapter
over the same payload. Both constants are deleted.

The screen distinguishes three states it previously collapsed into one wrong
one: loading, could-not-load (with a retry), and genuinely no card on file.
`currentPlan` comes from `subscription.planId` instead of a hardcoded
`useState("basic")`, which told free users they were on a paid plan.

`handleSetDefault` and `handleRemoveMethod` mutated local state and looked
successful — a card the user "removed" returned on the next load. There is no
route for either (`stripeService.setDefaultPaymentMethod` exists but nothing
exposes it; there is no detach capability at all), so both now say the action
is not available in the app yet. `userApi.updatePaymentMethod`, which POSTed the
never-existent `/user/billing/payment-method` and had no callers, is deleted.

Mutation-verified: reintroducing a fallback 4242 card fails 4 tests, one of
which asserts the string "4242" never appears in the output of an empty list.

STILL OPEN from this finding: there is no way to add, change or remove a card
from the mobile app. That is now visible to the user instead of faked, but it
needs the two Stripe routes to actually work.

---

## SF-13 — 57 mobile screens render a constant data set and never ask the server

**Status:** LIVE. **Severity:** HIGH in aggregate; individually it ranges from harmless
to SF-12-grade.
**Found:** 2026-08-17, by building the gate that should have found SF-12.

SF-12 (a hardcoded Visa 4242 on the billing screen) was found by reading the
file. So were the tax optimizer's invented $285,400 income and the coaching
hook's canned "AI coach" replies. `audit:mocks` caught none of them: it scans
web `src/app/api` for routes returning mock data from a catch block, and mobile
fabricates a different way — a module-level constant, rendered directly, with no
request made at all.

`scripts/audit-screen-data.mjs` now finds that shape mechanically. First run:

```
audit:screen-data — 87 screen(s) render a constant data set,
                    57 of them with NO request in the file
  38 catalogue
  19 fabrication
  30 UNCLASSIFIED
```

### The classification matters and a regex cannot do it

`const BUREAUS = [{ id: "experian", ... }]` and
`const MOCK_BILLS = [{ amount: 120, ... }]` are the same shape. The first is a
catalogue — product content, legitimately in code. The second is a claim about
someone's money. So the gate enumerates and freezes; a human classifies each as
`catalogue` or `fabrication` in `scripts/screen-data-baseline.json`, and the
list may only shrink.

19 are already classified `fabrication` on the strength of their names and
screens, 18 of them in files that make no request at all:

```
app/analytics/credit-score.tsx      SCORE_HISTORY, SCORE_FACTORS
app/analytics/disputes.tsx          DISPUTES_BY_TYPE, MONTHLY_DATA
app/analytics/trends.tsx            TREND_METRICS
app/budgeting/bills.tsx             MOCK_BILLS
app/budgeting/subscriptions.tsx     MOCK_SUBSCRIPTIONS
app/budgeting/auto-save.tsx         MOCK_RULES
app/credit-builder/payments.tsx     MOCK_PAYMENTS
app/credit-builder/pay-for-delete.tsx  MOCK_COLLECTIONS
app/credit-builder/goals.tsx        SAMPLE_GOALS, SCORE_HISTORY
app/recommendations/insights.tsx    INSIGHTS
app/recommendations/index.tsx       AI_RECOMMENDATIONS
app/reports/comparison.tsx          COMPARISON_ROWS
app/settings/connected-accounts.tsx CONNECTED_ACCOUNTS
app/admin/{audit,logs,metrics,subscriptions,index}.tsx
                                    AUDIT_EVENTS, LOGS, REVENUE_DATA,
                                    DISPUTE_DATA, SUBSCRIPTIONS, METRICS
```

Several of those are the same severity as SF-12 on their own terms.
`CONNECTED_ACCOUNTS` tells a user which bank accounts are linked.
`SCORE_HISTORY` is their credit score over time. The `admin/*` screens show
business metrics — revenue, subscriptions, audit events — that an operator could
act on.

### What this means for the route-count metric

Tracked API paths measure whether a screen's request has a backing route. These
57 screens make no request, so they have never appeared in that count and never
will. A mobile app can reach 232 of 232 routes with every gate green while a
third of its screens show data nobody fetched.

### Not done at the time

No screen fixed in that pass. The gate was frozen at 87 entries and wired into
CI as blocking, so the number could not grow and each entry had to be looked at
once. 30 remained UNCLASSIFIED, described then as "needing someone who knows the
product to say which they are."

### Update — that claim was wrong, and worth correcting

Every remaining UNCLASSIFIED entry was classified by READING IT. None needed
product knowledge; they needed someone to open the file. The baseline now stands
at 75 entries, 62 catalogue and 13 fabrication, with **zero unclassified**.

The pile was not neutral debt. Five fabrications were sitting in it:

| Screen | What it invents |
|---|---|
| `dashboard/progress.tsx` | ACHIEVEMENTS and MILESTONES with `unlocked: true` hardcoded — every user shown the same earned badges |
| `financial/income.tsx` | six months of the user's gross and net income, and their income sources |
| `financial/transactions.tsx` | the user's transactions and category breakdown (Shopping $168.31, 28%) |
| `investments/analyze/fundamental.tsx` | peer comparison (AAPL 85, MSFT 78) and revenue breakdown, for whatever ticker was opened |
| `investments/analyze/technical.tsx` | "Bullish Flag, confidence 78, target 188.5", moving averages, oscillators, support and resistance — actionable trading signals nobody computed |

The last two belong to SF-17's family and are blocked on the same audit.

**The lesson is about the shape of the claim, not the count.** "This needs product
knowledge" reads like a decision waiting on someone, and it postponed five live
fabrications for the length of a sweep. Two of the catalogue entries also carry
smaller problems that only reading found: `help/contact.tsx` still lists
`support@creditpro.com`, a pre-rebrand address, and `credit-repair/cards.tsx`
embeds `approval: excellent|good` — a per-user likelihood presented as a
property of the card — inside an otherwise legitimate product catalogue.

## SF-14 — every bank balance is excluded from the web dashboard's assets

**Severity: HIGH (correctness, live). FIXED — see the commit that adds
`normalizeAccountType`.** Found while building the connections surface; fixed in
its own commit rather than bundled into that one.

`financial-aggregation-service.ts:mapAccountFromDb` normalises an account's type
against a closed list:

```ts
const validAccountTypes = ["savings","checking","credit","investment","loan","other"];
const mappedType = validAccountTypes.includes(accountType) ? accountType : "other";
```

`depository` is not in that list. It is, however, exactly what Plaid writes and
what `financial_accounts.account_type` stores — 20260731000006 says so in a
comment on the column: *"Plaid's raw account.type
('depository'/'credit'/'loan'/'investment'/'other') — intentionally
unconstrained TEXT."*

So every checking and savings account maps to `"other"`, and `getAccountSummary`
buckets by the normalised value:

```ts
const checking = accounts.filter((a) => a.accountType === "checking");   // always []
const savings  = accounts.filter((a) => a.accountType === "savings");    // always []
const totalAssets = [...checking, ...savings, ...investment].reduce(...); // no bank money
```

`checking` and `savings` are therefore always empty, `totalSavings` is always 0,
and `totalAssets` counts investment accounts only. Credit and loan map cleanly,
so `totalLiabilities` is right — which makes the resulting `netWorth` wrong in
one direction: every user's net worth is understated by their entire bank
balance.

**Why it survived.** The subtype is what distinguishes checking from savings,
and this function never reads `account_subtype`. A mapping written against the
five names the UI uses, rather than against the five Plaid actually sends, looks
correct in isolation and has no failing test.

**Fix sketch.** Map `depository` + subtype the way
`mobile-app/src/services/api/financial.ts:toMobileAccountType` now does
(`savings` subtype → savings, otherwise checking), and keep `"other"` for
genuinely unknown types so nothing is rounded into an asset bucket. Needs a test
per branch and a check of every `accountType ===` comparison downstream.

## SF-15 — auto-save-rules-service.ts is written against two tables that do not exist

**Severity: MEDIUM (dead code, live trap).** Found while wiring the auto-save
screen. NOT a runtime outage today, because nothing imports the module — which
is exactly what makes it dangerous: it is the obvious-looking backend for a
feature someone will wire next.

`src/lib/financial/auto-save-rules-service.ts` queries two tables:

```
auto_save_rules
save_transfers
```

Neither appears in any migration. Both are named only in a COMMENT in
`20260731000012_savings_goals_cluster.sql` (lines 21-22), listing tables that
migration does *not* create. The real table is `savings_rules`, and it has a
different shape:

| | auto-save-rules-service expects | savings_rules actually has |
|---|---|---|
| type values | 7 (`round_up`…`windfall_capture`) | 5, CHECKed (`round_up`, `percentage`, `fixed`, `surplus`, `goal_based`) |
| status values | 3 (`active`/`paused`/`disabled`) | 4, CHECKed (`active`/`paused`/`completed`/`cancelled`) |
| transfers | a `save_transfers` table | no such table |

So the module is not merely unreachable — every call would fail with
`42P01 undefined_table`. It also carries `executeTransfer`, which moves money.

**The live one is `savings-automation-service.ts`**, which reads `savings_rules`
and is already exposed at `GET /api/financial/savings?type=rules` and
`PATCH|DELETE /api/financial/savings/rules/[id]`. The mobile auto-save screen is
now wired to that.

**Recommendation:** DELETE `auto-save-rules-service.ts`. It is a duplicate of a
working service, written against a schema that was never created, and its
presence invites someone to build on it. Deletion needs owner approval per the
standing rule, so it is recorded here rather than done.

## SF-16 — /api/credit/factors tells every user they have 98% on-time payments

**Severity: HIGH (fabrication, live, user-facing credit data).** Found while
looking for a real source to wire the analytics/credit-score screen to.

`src/app/api/credit/factors/route.ts` is 127 lines with **zero data access** —
no Supabase client, no `.from(`, no service call. `_user` is declared and never
read, so the route does not know or care who is asking. It returns five
hardcoded factors:

```ts
{ name: "Payment History", status: "good", value: "98% on-time payments",
  description: "You have a strong payment history with very few late payments." }
{ name: "Credit Utilization", status: "fair", value: "32% utilization" }
```

Its own comment says *"fetches from database when user is authenticated"*. It
does not.

**Reachable from four surfaces**: `src/app/credit/factors/page.tsx:252`, the web
primary nav ("Score factors"), the mobile primary nav ("Factors"), and two
buttons on `mobile-app/app/credit/score-detail.tsx`.

### Why every existing gate missed it

`audit:mocks` had three detectors, and all three model the same shape — *the
route reaches for real data and falls back to invention*: `Math.random()` in a
handler, a catch block returning a payload, a called service that admits to
stubbing. A route that never reaches at all has no catch block worth analysing,
no randomness, and calls nothing. It was invisible.

A fourth detector now flags a route with **no data access that returns a
constant array of objects**. Across 351 routes it finds exactly two:
this one, and `/api/disputes/reasons` — which is a legitimate CATALOGUE (the
dispute reasons on offer, each with its FCRA section) and is allowlisted with
that reason.

### What an honest version could actually answer: one factor of five

| Factor | Computable today? |
|---|---|
| Payment history | **No.** The credit report is the source and it falls back to a mock generator (SF-11). Bill payment history has no HTTP route. |
| Credit utilization | **No.** Needs balance ÷ limit, and `financial_accounts.credit_limit` is never written — `plaid-service.storeAccount` does not set it, and 20260731000006 records it as "not yet written by any caller". |
| Credit age | **Yes.** `creditBuilderService.analyzeCreditAge` reads `financial_accounts.opened_date`. |
| Credit mix | Unverified — `analyzeCreditMix` exists but was not audited. |
| New credit | **No.** No source. |

**Recommendation.** Return the factors that can be computed and state plainly
that the rest require a linked credit report — the same rule applied to the
screens in this sweep. Do NOT wire the analytics/credit-score screen to this
route until then: pointing a screen at a fabricating endpoint launders a
fixture through an HTTP call, which is worse than the fixture because it looks
sourced.

## SF-17 — two investment screens invent price targets and analyst ratings

**Severity: HIGH (fabrication, live, actionable financial advice).** Found by
extending audit:screen-data to see constant OBJECTS, not just constant arrays.

### The gate blind spot that hid them

audit:screen-data flagged `const NAME = [{ ... }]` — a constant ARRAY of
objects. A fabrication does not have to be plural. `WEEKLY_SUMMARY` sat in
`app/recommendations/insights.tsx` through this entire sweep, unflagged:

```ts
const WEEKLY_SUMMARY = {
  totalSpent: 1245, vsLastWeek: -12,
  topCategory: "Groceries", topCategoryAmount: 320,
  savingsOpportunities: 3, potentialSavings: 127,
};
```

The detector now brace-counts constant objects too. Raw, that flags every
label and colour map in the app — 30 entries of noise, which gets a gate
switched off within a day. The separator that works, found by looking at both
populations: **configuration uses small whole numbers; data about a subject
carries decimals or large values.** `PERIOD_MONTHS { "1M": 1, "3M": 3 }` is
config; `PRICE_TARGETS { current: 180.25 }` is a measurement. That cut it to
four, of which three are real.

### What it found

`app/investments/analyze/recommendation.tsx` — PRICE_PROJECTION, PRICE_TARGETS,
RISK_ASSESSMENT, RISK_FACTORS, SCORE_BREAKDOWN. No request in the file.

```ts
const PRICE_TARGETS = { current: 180.25, entry: 175.0, target: 210.0,
                        stopLoss: 160.0, bull: 240.0, base: 210.0, bear: 165.0 };
const RISK_ASSESSMENT = { level: "Moderate", score: 45, volatility: 28.5,
                          beta: 1.24, maxDrawdown: -18.5 };
```

`app/investments/analyze/sentiment.tsx` — ANALYST_CONSENSUS, ANALYST_RATINGS,
INSIDER_TRADES, INSTITUTIONAL_ACTIVITY, NEWS_ITEMS, SENTIMENT_TREND,
SOCIAL_SENTIMENT. Also no request.

```ts
const ANALYST_CONSENSUS = { buy: 32, hold: 8, sell: 2, avgTarget: 198.5,
                            highTarget: 250, lowTarget: 155 };
```

`app/financial/overview.tsx` — ACCOUNTS, BUDGET_STATUS: invented balances and
budget status.

**Why this is worse than the screens fixed so far.** A fabricated bill or a
fabricated dispute count misinforms. An invented stop-loss, beta and analyst
consensus attached to a real ticker is advice a user can act on with their own
money, and it carries the precision that invites acting on it — 180.25, 1.24,
-18.5. These are rendered per-symbol, so the same numbers appear whichever
ticker is opened.

**Not fixed here.** All three are baselined `fabrication` and the gate is
shrink-only, so they cannot grow.

**Update — the market-data path was audited and IS real.** `marketDataService
.getStockQuote` tries Polygon, falls back to Alpha Vantage, and **throws**
`ALL_PROVIDERS_FAILED` if both fail; there is no fabricated fallback.
`aiStockAnalyst.getAIRecommendation` rethrows. `getSentimentAnalysis` degrades
to an all-zero default with `confidence: 0`, which is an honest empty state
rather than invented values. SF-07's randomness is confined to
PaperTradingEngine and does not reach these routes.

So the screens COULD be wired — except that the recommendation route has a
separate, disqualifying defect. See SF-18.

## SF-18 — the AI recommendation engine can never say "buy"

**Severity: HIGH (correctness, live, provable by arithmetic).** Found while
checking whether SF-17's investment screens could be wired to a real route.

`AIRecommendationEngine.generateRecommendation` scores three components and
combines them:

```ts
private readonly weights = {
  technical: 0.35, fundamental: 0.3, sentiment: 0.2, pattern: 0.15,
};

const fundamentalScore = fundamentalData ? this.calculateFundamentalScore(...) : 50;
const sentimentScore   = sentimentData   ? this.calculateSentimentScore(...)   : 50;

const compositeScore =
  technicalScore * this.weights.technical +
  fundamentalScore * this.weights.fundamental +
  sentimentScore * this.weights.sentiment;
```

Two things combine into a hard ceiling.

**1. `pattern` (0.15) is declared and never used.** The composite sums only
technical + fundamental + sentiment = 0.85 of the weight budget. 15% is
silently dropped.

**2. The route supplies neither fundamental nor sentiment data.**
`src/app/api/investments/recommendations/route.ts:77` passes `undefined` for
both, with the comments `// Fundamental data` and `// Sentiment data`. So both
fall to the placeholder 50.

The reachable range is therefore:

| technicalScore | composite | action |
|---|---|---|
| 0 | 25.0 | strong_sell |
| 50 | 42.5 | sell |
| **100** | **60.0** | **hold** |

against `scoreToAction`'s thresholds of strong_buy ≥ 80, buy ≥ 65, hold ≥ 45,
sell ≥ 30.

**A perfect technical score produces "hold".** The route structurally cannot
emit `buy` or `strong_buy` for any symbol, under any market condition. Half the
action enum is unreachable.

### Why this blocks the SF-17 fix

The obvious repair for the investment screens is to wire them to this route.
That would replace an obvious fixture with a real-looking recommendation that
is HOLD or worse for every stock a user ever looks up — sourced-looking, and
wrong in a way far harder to notice than "iPhone 16 supercycle" appearing under
a bank stock. Same reasoning that kept `/credit/factors` from being wired
before it was rebuilt (SF-16), and that was right.

### The fix is an owner decision, not a mechanical one

Two defensible repairs, with different meanings:

1. **Renormalise over the weights actually supplied.** With only technical
   available, the composite becomes the technical score itself. Honest, and the
   full action range becomes reachable — but every recommendation the system
   has ever made changes.
2. **Supply the missing inputs.** `performFundamentalAnalysis` and
   `performSentimentAnalysis` both exist on `aiStockAnalyst`; the route simply
   does not call them. More work, and it makes the recommendation genuinely
   three-factor as designed.

Either changes investment advice for every user, so neither is a change to make
unilaterally. The `pattern` weight also needs a decision: use it, or remove it
from the declaration so the budget sums to what is actually applied.

## SF-28 — the investment analysis surface is 85 calls to Math.random()

**Severity: CRITICAL (fabricated investment information served to authenticated
users).** Found while checking whether SF-18's "supply the missing inputs"
repair was viable. It is not, and the reason is larger than SF-18.

`src/lib/investments/ai-stock-analyst.ts` contains **85 `Math.random()` call
sites across 19 methods**, and backs five live routes:

- `GET /api/investments/analyze/[symbol]`
- `GET /api/investments/analyze/[symbol]/recommendation`
- `GET /api/investments/analyze/[symbol]/fundamental`
- `GET /api/investments/analyze/[symbol]/sentiment`
- `GET /api/investments/analyze/[symbol]/technical`

All five are `withAuth`, so this reaches any signed-in user.

### Two different defects, and the second is the serious one

**1. Quotes and history are a silent mock FALLBACK.** `getStockQuote` (:271)
calls the real `marketDataService`, and on any throw returns a fully invented
quote — price, volume, avgVolume, marketCap, peRatio, eps, dividend,
dividendYield (:299-323). `getHistoricalData` (:331) does the same with a
random-walk OHLCV series (:366-397). Both fall back to `getSimulatedBasePrice`
(:403): ten hardcoded prices (AAPL 175, TSLA 250, NVDA 480, ...) and, for every
other ticker, `100 + Math.random() * 200`.

This is the SF-11 shape — try live, catch, fabricate, tell nobody — and the
catch is not hypothetical. Neither `POLYGON_API_KEY` nor
`ALPHA_VANTAGE_API_KEY` appears in `.env.local`, `.env` or `.env.example`. Both
clients keep an empty key behind a guard that no longer does anything:

```ts
this.apiKey = apiKey || process.env.POLYGON_API_KEY || "";
if (!this.apiKey) {
  // Polygon: API key not configured        <- the warning was removed,
}                                           //  the empty `if` was left
```
(`src/lib/integrations/polygon.ts:109-113`; `alpha-vantage.ts` is identical.)

Both providers therefore call out with an empty key and fail,
`marketDataService.getQuote` throws `ALL_PROVIDERS_FAILED`
(`market-data-service.ts:178-183`), and the analyst catches it. **On this
configuration the fallback is not an edge case; it is the only path.**

Both fallbacks also claim a provenance tag they do not set: `// Fallback with
estimated data tagged as source: 'estimated'` (:299) and `// Fallback:
synthetic data tagged source: 'synthetic'` (:366). Neither returned object has
a `source` field at all. The convention exists in a different module
(`services/SentimentAnalysisService.ts:909`), which is presumably where the
comment came from.

**2. Fundamentals, sentiment, peers, fair value and risk have NO real branch.**
These are not fallbacks. There is no live path to fall back FROM:

| Method | What it invents |
|---|---|
| `getValuationMetrics` (:1027) | priceToBook, priceToSales, evToEbitda, evToRevenue |
| `getProfitabilityMetrics` (:1039) | grossMargin, operatingMargin, netMargin, ROE, ROA — **takes no arguments at all**, so it is not even symbol-dependent |
| `getGrowthMetrics` (:1050), `getFinancialHealthMetrics` (:1062), `getDividendMetrics` (:1074) | the rest of the fundamentals |
| `getPeerComparison` (:1088) | the peer table |
| `calculateFairValue` (:1139) | a **fair value and upside** for the stock |
| `assessRisk` (:1416) | the risk assessment |
| `performSentimentAnalysis` (:1209) and its five helpers (:1227-1375) | overall sentiment, news, social, analyst consensus, insider activity, institutional activity |

`getNewsSentiment` (:1238) is the worst of them. It generates an article count,
positive/negative counts, and then **headlines attributed to named news
organisations, with constructed URLs**:

```ts
title: `${symbol} Reports Strong Quarterly Results`,
source: "Reuters",
url: `https://reuters.com/${symbol.toLowerCase()}`,
```

A second entry is attributed to Bloomberg. These are not real articles, the
URLs do not resolve to them, and the story is always positive.

### The route documentation describes a system that does not exist

`sentiment/route.ts:1-18` advertises "News sentiment from major financial news
sources", "Social media sentiment (Twitter, Reddit, StockTwits)", "Analyst
ratings and consensus", "Insider trading activity", "Institutional ownership
changes". There is no news client, no social client, and no analyst or
ownership data source anywhere in the module.

### The test suite is green over it, and pins it

`src/lib/investments/__tests__/ai-stock-analyst.test.ts:253-257`:

```ts
const fairValue = result.data?.fundamental?.fairValue;
expect(fairValue?.value).toBeGreaterThan(0);
expect(fairValue?.method).toBe("dcf");
```

Any positive random number satisfies the first assertion, and the second
asserts the value is labelled **"dcf"** — discounted cash flow, a specific
valuation methodology — over a number no cash flow was used to produce. The
test does not miss the fabrication; it encodes it as correct.

### Correction to rev 13

Rev 13 recorded that "the market-data path for SF-17 is REAL —
marketDataService throws ALL_PROVIDERS_FAILED rather than fabricating". That is
true of `marketDataService` and false of the path. Every screen reaches market
data through `aiStockAnalyst`, which catches exactly that throw and fabricates.
Auditing the module that behaves correctly said nothing about the caller that
does not.

### What this does to SF-18

SF-18 offered two repairs for the unreachable-`buy` ceiling. **Option 2
("supply the missing inputs") is now disqualified**: `performFundamentalAnalysis`
and `performSentimentAnalysis` return random numbers, so wiring them in would
feed randomness into a recommendation instead of a placeholder 50. The owner
decision narrows to renormalising over what is genuinely supplied — which, on
this configuration, is a technical score computed from a random walk.

### What this does to the four blocked mobile screens

`investments/analyze/{fundamental,recommendation,sentiment,technical}` carry
baselined fabrications and were held back pending SF-18. They must stay held
back for a stronger reason: **the routes they would be wired to fabricate too.**
Wiring them would relocate the fabrication behind HTTP, where it acquires the
appearance of having been sourced — the same reason `dispute/strategies` was
left unwired and `/credit/factors` was rebuilt before use.

### Not fixed, and why

The repair is a product decision, not a mechanical one. Either market data is
purchased and these surfaces are built on it, or the surfaces are withdrawn
until it is. Deleting 85 random calls without deciding which of those is
happening would leave five routes returning nothing, and choosing between them
is not mine to make. Recorded with evidence; recommended action is to withdraw
the five routes and the four screens behind a flag until a market-data provider
is configured, because a signed-in user can reach a fabricated fair value today.

## SF-29 — admin "cancel subscription" never tells Stripe

**Severity: HIGH (money, live).** Found while checking whether
`/admin/subscriptions`' churn figures had a source. They do not — but the route
underneath has a worse problem.

`DELETE /api/admin/subscriptions` (`src/app/api/admin/subscriptions/route.ts:82-120`)
takes a `stripe_subscription_id`, and:

```ts
// In production, this would call Stripe API to cancel subscription
// stripe.subscriptions.cancel(subscriptionId);
...
const { error } = await supabase
  .from("subscriptions")
  .update({ status: "canceled", cancel_at_period_end: true })
  .eq("stripe_subscription_id", subscriptionId);
...
return NextResponse.json({ success: true });
```

The Stripe call is a comment. The route marks the row canceled locally and
reports success.

**The consequence is that the customer keeps paying and loses the product.**
Fynvita reads entitlement from its own database, so access stops immediately;
Stripe has been told nothing, so billing continues at the next renewal. The
admin sees "success", the customer sees a cancelled account and another
charge.

### The contrast is inside this repo

The user-facing path does it correctly.
`subscriptionService.cancelSubscription` (`src/lib/subscriptions/subscription-service.ts:246-274`)
calls Stripe FIRST and then writes back **Stripe's own** answer:

```ts
const stripeSubscription = await stripeService.cancelSubscription(
  subscription.stripeSubscriptionId, immediately,
);
const updateData = {
  status: stripeSubscription.status,
  cancel_at_period_end: stripeSubscription.cancel_at_period_end,
};
```

`/api/addons/cancel:36` likewise calls `stripeService.cancelSubscription`. The
admin route is the only one that skips it.

### The hardcoded pair is also self-contradictory

`status: "canceled"` means the subscription has ENDED; `cancel_at_period_end:
true` means it is still running and will stop at the end of the period. Both
at once describes no real Stripe state, which is what you get from writing an
outcome instead of reading one. The correct path cannot produce this pair,
because it copies whichever one Stripe actually returned.

### Not fixed — the repair is one line, the semantics are the owner's

Routing this through `subscriptionService.cancelSubscription` is small. Which
argument to pass is not:

- `immediately: false` — the customer keeps the period they have already paid
  for, and billing stops at renewal. This is what an admin "cancel" usually
  means, and it matches what the contradictory pair half-says.
- `immediately: true` — access and billing stop now, which may owe a refund.

Choosing wrong moves real money in one direction or the other, so it is not
mine to choose. **Until it is chosen, the admin surface should not report
success for an action it did not perform** — the same principle applied to the
mobile admin settings screen in rev 28, where destructive buttons that did
nothing were changed to say so.

## Revision History

| Date | Change |
|---|---|
| 2026-08-09 | Initial version — MFA/backup-code, JWT HS256, anon-client classification, orphan-module exploit review, secrets sweep, OWASP/LLM checklist pass. |
| 2026-08-09 (rev 2) | Applied team-lead's two corrections: reachability re-graded LIVE/LATENT against the canonical `scripts/audit-reachability.js` (commit `2b23237`) instead of direct-importer count; phantom-table language tightened to "wiring prerequisite, not live outage" per the corrected 1-reachable/64-unreachable/3-test-only split. Confirmed SF-01 as the only LIVE finding (`BackupCodesManagement.tsx` is rendered by `src/app/settings/security/page.tsx`); SF-02 through SF-06 confirmed LATENT against the same script. |
| 2026-08-17 | Added SF-07: PaperTradingEngine.getCurrentPrice falls back to `100 + Math.random() * 100` for every trade (POLYGON_API_KEY unconfigured), and getDailyReturns generates a random walk that is the sole input to maxDrawdown/sharpeRatio. Fabricated prices reach paper_fills, paper_trades, paper_positions and paper_accounts, and drive WATCH->GUIDED graduation. Three options presented; owner decision required. |
| 2026-08-17 (rev 2) | Added SF-08: MFAService's TOTP methods run on a session-less anon singleton (dead + non-functional); verified from auth-js source that a global Authorization header does NOT authenticate supabase-js MFA calls (they read session.access_token and pass it as `jwt`); unenroll of a verified factor requires aal2, so disable must challenge+verify first. Challenge/verify endpoint paths deliberately left unverified rather than guessed. |
| 2026-08-17 (rev 3) | Added SF-09: dispute letter templates carry a hardcoded `successRate` (65, etc.) that nothing measures, surfaced to users via the templates list and /api/disputes/generate; public.dispute_template_usage has template_id/dispute_id/outcome and is written and read by nothing. Three options; no behaviour changed. |
| 2026-08-17 (rev 4) | Added SF-10: /api/tax/documents/upload never stores the uploaded file and never sets storage_path, while three delete paths read storage_path to remove a file that was never written (0 of 0 rows have one). Blocks /tax/documents/[id]/download — nothing to serve. |
| 2026-08-17 (rev 5) | Added SF-11 (HIGHEST severity here): CreditBureauService.getCreditReport falls back to MockCreditBureauAdapter on any failed live call, enableFallback defaults to true, bureau clients build from empty env vars so the call always fails, and the `fallback_` tag on reference_id is read by nothing outside the service's own test. Users are shown invented accounts, creditors, statuses and scores as their own credit report — the input to the dispute-letter flow. /credit/scores/refresh deliberately not built on top of it. |
| 2026-08-17 (rev 6) | Added SF-12: mobile-app/app/settings/billing.tsx renders a hardcoded Visa 4242, a Mastercard 5555 and three $29.00 paid invoices, and makes no network call at all — FND-016/017 reproduced in mobile, uncovered by audit:mocks which scans web src/ only. /api/payment/billing already returns the real plans, subscription, paymentMethods and invoices. |
| 2026-08-17 (rev 7) | Added SF-13: new gate audit:screen-data finds 87 mobile screens rendering a module-level constant data set, 57 with no request in the file. 19 classified fabrication (MOCK_BILLS, MOCK_PAYMENTS, SCORE_HISTORY, CONNECTED_ACCOUNTS, admin REVENUE_DATA…), 38 catalogue, 30 unclassified. MOCK_BILLS and CONNECTED_ACCOUNTS have since been fixed (85 entries, 17 fabrication). Frozen shrink-only and wired into CI. These screens make no request, so they never appeared in the tracked-API-path count. |
| 2026-08-17 (rev 8) | Added SF-14: `financial-aggregation-service.mapAccountFromDb` omits `depository` from its valid-type list, so every checking and savings account normalises to "other" and is excluded from `totalAssets`/`totalSavings` — net worth understated by the user's whole bank balance. Found while building the connections surface; recorded rather than bundled into that commit. |
| 2026-08-17 (rev 9) | SF-14 fixed: `normalizeAccountType` reads Plaid's type AND subtype, so depository accounts land in checking/savings instead of "other". The integration test's seed was corrected from the already-normalised `"checking"` — a value no sync path writes, and the reason the suite stayed green through the bug — to Plaid's real `depository` + subtype. Reverting the fix turns that live-DB test red. |
| 2026-08-17 (rev 10) | Added SF-15: `auto-save-rules-service.ts` queries `auto_save_rules` and `save_transfers`; neither table exists in any migration, and the real `savings_rules` has a narrower CHECK on both type and status. Dead code against a schema that was never created, carrying an `executeTransfer` that moves money. The live service is `savings-automation-service.ts`, already exposed at /api/financial/savings. DELETE recommended; owner approval required. |
| 2026-08-17 (rev 11) | Added SF-16: `/api/credit/factors` has zero data access and returns five hardcoded factors telling every caller they have "98% on-time payments"; `_user` is unused and the route's own comment claims it reads the database. Reachable from both primary navs and two mobile buttons. Added a fourth audit:mocks detector for routes that fabricate as their PRIMARY path (no data access + constant data set) — the previous three all assumed a fallback shape and could not see this. Two routes match across 351; the other is /api/disputes/reasons, an allowlisted catalogue. |
| 2026-08-17 (rev 12) | Added SF-17: extended audit:screen-data to detect constant OBJECTS (brace-counted), gated on a measurement heuristic — decimals or values >= 100 — so label and colour maps do not drown the signal. Found `WEEKLY_SUMMARY` (fixed in the same commit) plus invented PRICE_TARGETS/RISK_ASSESSMENT/ANALYST_CONSENSUS/INSIDER_TRADES on two investment-analysis screens, and ACCOUNTS/BUDGET_STATUS on financial/overview. The investment ones are actionable advice attached to a real ticker; baselined, not fixed, pending an audit of whether any market-data source is real (cf. SF-07). |
| 2026-08-17 (rev 13) | Audited the market-data path for SF-17 and found it REAL — marketDataService throws ALL_PROVIDERS_FAILED rather than fabricating, and SF-07's randomness is confined to PaperTradingEngine. But added SF-18: AIRecommendationEngine's composite drops the unused `pattern` weight (0.15) and the route supplies neither fundamental nor sentiment data, so both fall to a placeholder 50. Maximum achievable composite is 60 against a `buy` threshold of 65 — the engine can never recommend buying, for any symbol, under any conditions. This blocks the SF-17 screen fix and needs an owner decision on renormalising vs supplying the missing inputs. |
| 2026-08-17 (rev 14) | Classified all 26 remaining UNCLASSIFIED screen-data entries by reading them; none needed product knowledge, correcting SF-13's original claim. Baseline now 75 entries — 62 catalogue, 13 fabrication, zero unclassified. Five fabrications were hiding in that pile: dashboard/progress (achievements marked unlocked for everyone), financial/income (invented earnings), financial/transactions (invented spending), and investments/analyze/{fundamental,technical} (peer comparisons and trading signals for any ticker — SF-17's family). Also surfaced: a pre-rebrand support@creditpro.com address, and a per-user `approval` prediction embedded in the secured-card catalogue. |
| 2026-08-18 (rev 15) | Added SF-19: `/api/credit/factors` returned `unavailable` as a SIBLING of `data`, and the mobile client unwraps `{success, data}` and discards every sibling key (mobile-app/src/services/api/client.ts:361-387). So the mobile screen received the bare factors array, then read `.data` and `.unavailable` off it — both undefined. `app/analytics/credit-score.tsx`, wired in the SF-16 follow-up, rendered an EMPTY factor list and an empty unavailable list to every user. Fixed by nesting both under `data`. Three separate tests hid it, each mocking a shape the wire never carries: the mobile screen test, `creditStore.test.ts` (`{factor, impact: 35, status}` — three field names the route has never sent), and the shared MSW handler (a flat five-factor array asserting "98% on-time payments" and 32% utilization, the two factors the route reports as UNCOMPUTABLE). Also fixed: `creditStore.fetchFactors` called `.map` on an object, threw on every call, and swallowed it in a catch — the store held an empty list in production while `__DEV__` showed a seeded one. Its transform also hardcoded every category to `payment_history` and compared a STRING impact band with `> 0`. |
| 2026-08-18 (rev 16) | Added SF-20 (NOT FIXED, recorded): `src/app/credit/factors/page.tsx:250-251` hardcodes `useState(742)` for the credit score and `useState(15)` for the score change, with comments admitting both are mock. The web Credit Factors page shows every user a 742 score and a +15 change beside factors that are genuinely computed from their own accounts — the fabrication is more convincing for sitting next to real data. Same family as the mobile fixtures already removed; needs the real score read (`/api/credit-monitoring/history` or the scores route) wired in. |
| 2026-08-18 (rev 17) | Added SF-21: audit:screen-data's `isRendered` matched `useState(NAME)` but not `useState<Type[]>(NAME)`. A GENERIC TYPE ARGUMENT — one optional `<...>` — hid every fabrication seeded into state through a typed useState, because the screen then maps over the STATE variable rather than the constant. Widening the pattern surfaced 12 previously-invisible data sets across 11 files. Six are fabrications: `MOCK_ALERTS` (insights/alerts) invents a CRITICAL FRAUD ALERT — "Suspicious Activity Detected, unusual transaction pattern on your credit card ending in 4532", with a Review Activity action — the highest-consequence fabrication found in this codebase; `MOCK_REPORTS` (dashboard/reports) offers documents the user never generated for download, against no table and no generation route; `INITIAL_RULES` (settings/transaction-rules) invents the user's own rules with `matchCount: 47`; `MOCK_CATEGORIES` + `MONTHLY_INCOME = 5000` (budgeting/zero-based) invents income and the allocations computed from it; `INITIAL_FLAGS`/`INITIAL_CONFIG` (admin/settings) show an operator feature flags that are neither read nor written; `LOCAL_STRATEGIES` (dispute/strategies) attaches invented success rates (72%) to dispute tactics. Baseline 75 -> 84 entries: 66 catalogue, 18 fabrication, zero unclassified. |
| 2026-08-18 (rev 18) | Investigated the mobile Reports surface for SF-21 and found NO backing exists: no generated-reports table in any migration (only `credit_reports` and `credit_report_monitoring`, which are bureau pulls), `/api/analytics/reports` is `withRole("admin")` for both verbs, and `/api/credit-repair/reports` returns bureau reports rather than generated documents. The one real user-facing capability is `GET /api/financial/export` (withAuth), which streams a CSV/JSON of budgets, bills or spending and stores nothing. So a "previously generated reports" list cannot be made honest by wiring — it has nothing to list. |
| 2026-08-18 (rev 19) | Fixed SF-21's `INITIAL_RULES`: the mobile Transaction Rules screen seeded a "Coffee Shops" rule the user never wrote, carrying `matchCount: 47` — a count of matches that never happened, presented as evidence the rule was working. Everything behind it already existed: `transaction_rules` is a real table with RLS (migration 20260110000003) and `transactionRulesService` has full user-scoped CRUD. Only the HTTP surface was missing, so BUILT it — GET/POST on the collection and PATCH/DELETE on `{id}`, both `withAuth`, both registered in the auth-route-inventory CSV. The screen's toggle, delete and save were all local-only and now require a server acknowledgement before touching state. Caught while writing the route: an earlier draft invented three ActionType values (`mark_reviewed`, `exclude_from_budget`, `split_transaction`) that the engine cannot execute — a rule using them would have saved and then matched nothing. Reading transaction-rules-service.ts:27-35 corrected it, and a test pins the real union. |
| 2026-08-18 (rev 20) | Fixed SF-21's `LOCAL_STRATEGIES`: dispute/strategies DID fetch, but its catch read `// Use local strategies` and a payload without `strategies` fell through the same path — so a failed read was indistinguishable from a success and the user chose a dispute tactic from five hardcoded entries the server never sent. Removed the fallback; a failed read now says so and offers retry. **Deliberately NOT "fixed" by wiring alone:** the real route serves the SAME hardcoded rates — `successRate: 72, 58, 62, 52, 48` live in `src/lib/disputes/advanced-strategies.ts` and reach the client via `toDisputeStrategyDTO`. Pointing the screen at the server would have relocated the fabrication behind an HTTP call, which is worse because it then looks sourced. The screen rendered a bare colour-coded "72%" beside a strategy name, which reads as the user's measured outcome; it is now labelled "typical" with a comment naming the constant. `disputes.outcome` (removed/updated/verified) and a `strategy` column both exist, so a real per-strategy rate is computable once there are resolved disputes to count — pre-launch there are none. |
| 2026-08-18 (rev 21) | Added SF-22 (NOT FIXED, recorded): the mobile app has TWO API clients. `mobile-app/src/services/api/` is used by 98 screens; `mobile-app/services/api.ts` is a separate 316-line client with its own `apiRequest`, its own `{ data, error }` envelope (no `success`, so every consumer's error handling differs), its own auth header assembly, and a different default host — `https://api.Fynvita.pro` against the main client's `https://api.fynvita.com/api`. Both read `EXPO_PUBLIC_API_URL` first, so the hosts only diverge when that is unset, but the envelope difference is unconditional. Three screens are on the second client: `app/dispute/{strategies,templates,use-strategy}.tsx`. Found because a screen test mocked the wrong module and the success path silently rendered nothing. Migrating the three to the main client is the fix; it needs the `{ data, error }` -> `{ success, data, error }` contract change at each call site. |
| 2026-08-18 (rev 22) | FIXED SF-22 and, in doing so, found four live contract breaks it had been hiding. Migrated `app/dispute/{strategies,templates,use-strategy}.tsx` off `mobile-app/services/api.ts` onto the main client; nothing imports the parallel client now. **(1)** The parallel client never unwraps `{ success, data }` — it returns the whole body — so `data.strategies` and `data.strategy` were ALWAYS undefined. dispute/strategies never once rendered a server strategy (it fell back silently every load), and use-strategy never loaded a strategy at all. **(2)** `/api/disputes/generate` returns `data.disputeLetter`, but BOTH clients declared `{ letter, strategy, nextSteps }` — none of which the route sends — so the generated letter never displayed. **(3)** `/api/disputes/strategies/{id}` wraps as `data: { strategy }` while the main client declared a bare `DisputeStrategy`. **(4)** The server's `DisputeTemplate` (`{id,name,category,description,successRate,template,variables}`) and the mobile one (`{id,name,category,scenario,successRate,tone,letterText,requiredDocuments,placeholders,bestPractices}`) share only FOUR field names; a successful fetch replaced rich fixture entries with sparser real ones and the screen rendered undefined. Added `mapWebDisputeTemplate`, made `tone` optional (the server sends nothing about a letter's voice; defaulting it to "formal" would be a claim nobody made), and guarded its two renders. Deleted `LOCAL_TEMPLATES` (176 lines — a second, already-drifted copy of a catalogue the server owns) and the `legalBasis` sections on two screens, which promised statute citations over a field `DisputeStrategyDTO` has never carried. |
| 2026-08-18 (rev 23) | Fixed SF-21's `MOCK_CATEGORIES` / `MONTHLY_INCOME = 5000` on budgeting/zero-based. Zero-based budgeting IS arithmetic against income — allocated, remaining, the progress bar and every per-category percentage derive from it — so one invented salary made every figure on the screen invented, under the tagline "Every dollar has a job". Both inputs have real sources and neither had an adapter: added `incomeApi` for GET /api/financial/income (withAuth; the route returns `{ sources, stats, countdown }` with NO envelope, and `stats.totalMonthlyIncome` is computed by incomeTrackingService from the caller's own income sources), and reused `budgetApi.getAll` for the allocations. A failed income read now says so rather than rendering a $0 budget, because "you earn nothing" and "we could not read your income" are different statements. Zero recorded income gets its own state rather than dividing by it. **Mutation testing found dead defence in my own fix:** an `income > 0` guard on the percentage was unreachable behind that state gate — removing it changed no test. Deleted both copies; the gate is the guard, and removing THAT does turn a test red. |
| 2026-08-18 (rev 24) | Added SF-24 (NOT FIXED — owner decision; audit of the trading autonomy path, task #85). The WATCH -> GUIDED -> AUTONOMOUS graduation gate does not measure what it declares. **D1:** `recordActiveDay` does `currentValue + 1` with NO date comparison (operating-mode-manager.ts:543) and is called once per trade (PaperTradingEngine.ts:1379), so "30 days active" is a second copy of the trade counter — 30 trades in one afternoon record 30 days. **D2:** `recordPaperTrade` computes `watchPaperProfitable \|\| profitable` (line 447), so ONE profitable trade latches it true forever; the code admits it ("In a real system you'd track a running P&L; here we use the latest signal"). Together D1+D2 reduce WATCH -> GUIDED from "a month of profitable paper trading" to "30 trades, at least one of which won, in any span of time". **D3 — the serious one: GUIDED -> AUTONOMOUS IS UNREACHABLE.** `guided_live_profitable` is initialised false (line 231) and only written as `guidedLiveProfitable \|\| profitable` (line 496); the sole caller is pctt-trading-service.ts:645, which passes `false` because at execution time the P&L is unknown, and nothing revisits the trade after it closes. So `requireProfitable: true` can never be satisfied and no user can reach autonomous mode through graduation — in a product whose headline is autonomous trading. **D4:** paper fills fall back to `100 + Math.random() * 100` when the price fetch throws (PaperTradingEngine.ts:1208) — this NARROWS SF-07, which was recorded as unconditional: the random price is a silent fallback, not the primary path, but it feeds realizedPL -> `profitable` -> the D1/D2 counters. Pinned by src/lib/trading/modes/__tests__/graduation-gate.reachability.test.ts (7 cases), written to fail when D3 is fixed. VERIFIED REAL in the same pass: three modes with graduation criteria, 30 laws with gate-runner + scorer, fractional order service / auto-invest / DRIP, and TradingChart.tsx on TradingView lightweight-charts ^5.1.0. |
| 2026-08-18 (rev 25) | Added SF-25 (NOT FIXED, recorded; tasks #83/#84): stated intent is user-selectable trading agents across Claude, ChatGPT, Gemini and Grok plus the custom system. `src/lib/trading/ai/model-registry.ts` registers `anthropic`, `openai` and `xai` only — `grep -rn "gemini\|google" src/lib/trading` returns nothing, so the Google agent does not exist. Nor does any selection surface: `grep -rn "preferredProvider\|selectedAgent\|agentProvider"` over src/lib/trading returns zero matches. What exists is model-registry + provider-fallback, which pick a model by TASK and cost/quality and fall back on failure — an internal routing policy, not a user preference. Registered model ids are also stale (`claude-sonnet-4-20250514`, `gpt-4o`, `grok-2`); they must be checked against each vendor's live list rather than guessed (rule 11). Open design question for the owner before building: does a user's pick override fallback entirely, or may the system still fall back when their chosen provider is down? |
| 2026-08-18 (rev 26) | CORRECTS and widens SF-25 after the owner clarified the design intent: this is an AGENTIC system built on the vendors' agent SDKs, not model calls. What exists is not agentic. `TradingAgent` (src/lib/trading/agents/base-agent.ts:54) is an abstract `buildPrompt` -> `callLLM` -> `parseResponse` -> Zod-validate pipeline wrapped in a RETRY loop (line 129) — there is no tool use, no multi-turn agent loop, and no agentic control flow anywhere in the eight agents (consensus-arbiter, earnings, news-impact, regime-confirmation, risk-narrative, sentiment, signal-explainer). Nor does it use any SDK: line 237 is a raw `fetch(\`${apiUrl}/chat/completions\`)` against an OpenAI-shaped endpoint, with a system prompt demanding "valid JSON, no markdown". The code marks itself provisional — "Call LLM (placeholder — Task B4 will replace with model registry)" — so the model-registry/provider-fallback layer recorded in rev 25 is not even wired to the agents yet. All three SDKs ARE installed (`@anthropic-ai/sdk ^0.71.2`, `openai ^4.77.3`, `@google/genai ^1.50.1`) and `@google/genai` is already used at src/lib/ai/providers/google-provider.ts, so the Gemini gap is trading-specific rather than app-wide. The work is therefore not "add a Gemini entry to a registry" but "build the agent layer on the vendor agent SDKs, with tools, and let the user choose which agent runs" — materially larger, and it should be specced before it is built. |
| 2026-08-18 (rev 27) | Added SF-26 (NOT FIXED — needs a table, a migration and enforcement; recorded with evidence). The admin platform-settings surface does not work at ANY layer, and some of what it appears to control is security configuration. **Layer 1 — the route does not persist.** `src/app/api/admin/settings/route.ts:14` holds settings in a module-level `let`, and POST does `settings = { ...settings, ...body }` with no validation. The comments admit both gaps ("In production, these would be stored in database or environment", "In production, save to database"). On a serverless runtime each request may reach a different instance, so a toggle applies to one lambda and is lost on recycle; the unvalidated spread also lets an admin inject arbitrary keys. **Layer 2 — one of the two admin pages saves nothing at all.** `src/app/admin/config/page.tsx` `handleSave` is `await new Promise((resolve) => setTimeout(resolve, 1000))` — a one-second spinner followed by success, with no request. It is the surface for `security: { sessionTimeout: 30, maxLoginAttempts: 5, lockoutDuration: 15 }`, so an operator can believe they have tightened lockout policy and have changed nothing. **Layer 3 — nothing enforces the values.** `grep -rn "maintenanceMode\|signupsEnabled"` finds readers only in the two admin pages themselves; no middleware, no signup route and no gate consults them, so even a persisted `maintenanceMode: true` would not take the site down or stop registrations. The two pages also disagree on shape (`signupsEnabled` in the route vs `signupEnabled` in config). Stale content in the same file: `supportEmail: "support@Fynvita.pro"` (pre-rebrand domain, cf. the `support@creditpro.com` addresses in help/) and `aiModelDefault: "gpt-4"`. This is the server-side sibling of SF-21's mobile `INITIAL_FLAGS`, and the more serious of the two because the mobile screen only shows flags while these purport to change platform behaviour. |
| 2026-08-18 (rev 28) | Fixed the MOBILE half of SF-26 (SF-21's `INITIAL_FLAGS`/`INITIAL_CONFIG`). The screen showed an operator feature flags and system limits that were neither read nor written; Save was `setTimeout(1000)` followed by `Alert.alert("Success", "Settings saved successfully")` with no request. Worse, three destructive buttons — Clear All Caches, Reset Analytics, Purge Deleted Users — confirmed with "This action may affect all users" and then reported `"${action} has been initiated"`, having done nothing; an operator could believe a user purge ran, which matters for erasure records. Now READS the real settings through a new read-only `adminSettingsApi.get()` (GET /api/admin/settings is `withRole("admin")` and works), renders them as values rather than controls, and states in the UI that maintenance mode and signups are reported but not enforced anywhere. Write is deliberately NOT exposed: the route's POST writes to a module-level `let` a serverless recycle discards, so a working-looking toggle would be the same lie with a nicer surface. The destructive buttons now say the action is not implemented and that nothing has been run. The SERVER half of SF-26 (no table, no validation, no enforcement) remains open. |
| 2026-08-18 (rev 29) | Fixed SF-13's `financial/income`. The screen invented the user's earnings (Primary Job 4800/month), a `taxWithheld` per source, and six months of gross/net history (Jul 6800/5200 -> Dec 6950/5300). Gross is now read from GET /api/financial/income. Everything tax-related is REMOVED rather than estimated: `IncomeSource` (income-tracking-service.ts:16-29) has no `taxWithheld` field, so the summary's Taxes/Net columns, the effective tax rate, the per-source withholding line and the whole "Annual Tax Estimate" card were all derived from one invented number — an annual federal tax bill computed by multiplying a fabricated withholding by twelve. The 6-Month Trend chart is gone too: nothing stores a monthly income history. Both absences are STATED on screen ("Take-home pay and withholding are not tracked yet", "no history of what you actually received each month is stored") rather than silently dropped, because an absent row reads as "not applicable" and a stated one reads as "we do not know". Also removed the local `IncomeSource` interface, which declared `type` and `taxWithheld` as REQUIRED — two fields the server has never sent, and the reason the fabrication typechecked. Guards added and mutation-verified: the screen uses the server's normalised `stats.totalMonthlyIncome` rather than re-summing sources of mixed frequency, and a zero total suppresses the per-source share instead of rendering "Infinity% of income". |
| 2026-08-18 (rev 30) | Fixed SF-13's `financial/transactions`. The screen carried a TRANSACTIONS array (Amazon -89.99, ...) AND a separate SPENDING_BY_CATEGORY constant (Shopping 168.31 at 28%) — two independent fabrications of the same thing, which is why they never had to agree. Both now come from GET /api/financial/transactions, and the breakdown is COMPUTED FROM THE SAME ROWS the list renders, so chart and list cannot drift. Root cause of the survival: a local `Transaction` interface disagreeing with the server's on two field names — `name` vs `merchantName`, `account` vs `accountId` — so nothing could typecheck the screen against the route (the same mechanism as income's required-but-nonexistent `taxWithheld`). Fixed alongside: the category breakdown counts only expenses, because including a salary would make "28% of spending" a share of something that is not spending; dates are formatted from the real timestamp in UTC rather than the fixture's "Today"/"Yesterday"; filter chips are derived from the caller's own categories rather than a fixed list that would filter to an empty screen; and the row's account NAME is dropped because the server sends `accountId`, a uuid. Mutation testing again caught DEAD DEFENCE in my own fix — a `total === 0` early return that cannot fire, since every expense has \|amount\| > 0 so a zero total implies an empty list, which already returns empty. Removed, as with the zero-based screen's divide guard. |
| 2026-08-18 (rev 31) | Built `audit:shadow-types` after the SAME mechanism let two fabrications through a green typecheck twice in one day: `financial/income` declared a local `IncomeSource` with `taxWithheld` REQUIRED (the server has no such field, and an entire "Annual Tax Estimate" card was built on it), and `financial/transactions` declared a local `Transaction` using `name`/`account` where the server sends `merchantName`/`accountId`. A local interface that describes the FIXTURE rather than the WIRE is satisfied by the fixture, never compared to the route, and tsc is content either way. The gate compares every non-exported interface in app/ against the same-named exported type in src/services/api/types.ts and reports the field names that diverge in each direction; identical redeclarations are redundant, not defects, so they are not flagged. Self-test 7/7. It found FIVE divergent shadows immediately, three of them substantial: **app/admin/users.tsx `UserProfile`** uses snake_case (`full_name`, `avatar_url`, `created_at`) where the server sends camelCase (`firstName`, `lastName`, `avatarUrl`, `createdAt`) — every one of those fields would render blank against a real payload; **app/dashboard/subscriptions.tsx `Subscription`** is a MERCHANT BILL (`merchantName`, `nextBillingDate`, `annualCost`) while the shared `Subscription` is a BILLING PLAN (`plan`, `currentPeriodStart`, `cancelAtPeriodEnd`) — two different domain concepts sharing one name; and three separate, mutually different `Recommendation` shadows across financial-intelligence/{ai-coach,smart-budget} and recommendations/index. Baselined at 5, shrink-only, wired into package.json and CI as blocking. |
| 2026-08-18 (rev 32) | Added SF-27 and FIXED it: `/api/credit-builder/recommendations` advertised "AI-powered personalized recommendations", and `creditBuilderService.getRecommendedActions` built a prompt, awaited `orchestrator.quickResponse()`, and then DISCARDED the response — `aiResponse` was assigned and never read, and both the try and the catch returned `getDefaultActions(weakAreas)`. The comment said "Parse AI response and combine with default recommendations", describing something the code did not do. Every call spent latency and money on an answer nobody looked at. What it returns IS personalised (getDefaultActions branches on the caller's real weak categories) and the actions already carried the honest signal, `aiGenerated: false`. Removed the dead call and the now-unused orchestrator import, and corrected the route's doc comment. Restoring a genuine AI path is separate work; pretending to have one is not. |
| 2026-08-18 (rev 33) | Fixed SF-13's `recommendations/index`, closing a fabrication AND a shadow-type entry in one change. Three defects beyond the invented AI_RECOMMENDATIONS list: (1) a local `Recommendation` interface shadowed the shared one with entirely different fields, which is why the fixture typechecked — audit:shadow-types (rev 31) exists because of this class; (2) the fixed category chips were credit/debt/savings/protection while the service emits payment/utilization/age/mix/inquiry, so every chip would have filtered a real payload to nothing; (3) the summary summed `impact` as a number, but on the real payload `impact` is a low/medium/high BAND — the points figure is `pointsImpact` — so the header would have rendered "+high pts" and summed to NaN. Also removed: a per-card `onPress` navigating to `rec.route` and an action button labelled `rec.action`, neither field existing on the payload, so every card looked tappable at a target that was never there. Now reads GET /api/credit-builder/recommendations, derives chips from the caller's own categories, and drops the "AI Analysis Complete" heading. |
| 2026-08-18 (rev 34) | Fixed SF-13's `credit-builder/goals`, which carried FOUR fabrications: SAMPLE_GOALS ("Qualify for Prime Rates", target 740, current 678), SCORE_HISTORY (six invented monthly readings), RECOMMENDED_ACTIONS ("Lower utilization to 10%, +15-25 pts") and a bare `const currentScore = 678`. Two now have real sources — score history through the credit store's GET /credit-monitoring/history, and actions through GET /api/credit-builder/recommendations — and the current score is the caller's real one, null when no bureau has reported rather than a constant. **SAMPLE_GOALS has NO storage and that is a finding, not an oversight:** a credit-score goal ("reach 740 by June") has nowhere to live, because `GoalType` (ai-coach.types.ts:92-102) covers emergency_fund / debt_payoff / savings / investment / major_purchase / retirement / education / vacation / home_down_payment / custom, all of which track a target AMOUNT, and `financial_goals` stores targetAmount / currentAmount accordingly. So the screen states that goal-setting is unavailable, and BOTH "Add Goal" controls are gone rather than opening a form that saves nowhere. Also corrected against the real payload: `action.priority` -> `action.impact` (the band), and the per-item `action.icon`, which CreditBuilderAction does not carry. |
| 2026-08-18 (rev 35) | Fixed SF-13's `dashboard/progress`. Every ACHIEVEMENT was hardcoded `unlocked: true` — "First Steps", "Dispute Master" and the rest — so every user was shown the same earned badges regardless of what they had done, and the locked style in the same file was unreachable. MILESTONES carried completion dates ("2024-10-01") and point credits for work nobody had done. The loading spinner was `setTimeout(() => setLoading(false), 800)`: eight hundred milliseconds over no request. NOTHING NEEDED BUILDING — `user_badges`, `badge_definitions`, `badge_progress` and `user_achievements` are real tables, GET /api/gamification/{badges,progress} are real withAuth routes, and the mobile gamificationStore already fetched both and split badges into earned / inProgress / locked. Only the screen was disconnected. Now: achievements are the EARNED badges only, milestones are the in-progress and locked ones (so none is complete by definition — the completed branch, the completion date and the "+points" credit are gone), and the headline total is real XP (`progress.xp.totalEarned`) rather than a sum over invented milestones. Guarded: a user with no badges at all would have divided by zero for the progress bar, and React Native drops a NaN width silently. |
| 2026-08-18 (rev 36) | Fixed SF-13's `reports/comparison`. BUREAUS invented all three scores AND their movements (Experian 695 +12, Equifax 682 -5, TransUnion 688 +8); COMPARISON_DATA invented nine metrics across three bureaus — 27 numbers, none measured. Scores now come from GET /credit-monitoring/scores. The movement arrows are gone: `CreditScore` carries no delta, and a change needs two readings from a per-bureau history route this screen does not call. **The nine-metric table is removed rather than wired, and that is the finding:** those figures live inside `credit_reports.reportData`, typed `Record<string, unknown>` (db-legacy.ts:27) — an untyped JSONB blob whose shape depends on whichever importer wrote it. Building a bureau-by-bureau comparison on it would mean inventing a parse contract and presenting the result as measurement, which is exactly how the fixture arrived. The screen now states that per-bureau report parsing is unavailable. Removed with it: `selectedMetric` and `getValueColor`, which existed only to highlight and colour rows of that table. |

| 2026-08-18 (rev 37) | Fixed SF-13's `credit-builder/pay-for-delete`. MOCK_COLLECTIONS presented invented debts as the user's own — "ABC Collections, originally Medical Center, $1,250, opened 2023-06-15" — and the screen then computed a settlement offer at 40% of the selected balance, so it produced a specific dollar figure to pay on a debt nobody owed. **Nothing was wired in its place, and that is the finding:** a user's collection accounts come from a parsed credit report, and that data sits in `credit_reports.reportData`, typed `Record<string, unknown>` (db-legacy.ts:27) — the same untyped JSONB blob that blocked the bureau comparison in rev 36. The only `tradelines` table in the schema is the MARKETPLACE one (tradelines for sale), not the caller's accounts. The screen now states that the list is unavailable and why. Removed with the list: `selectedCollection`, `offerAmount`, the `TextInput` and the twelve styles that served only the picker and the calculator. **The STEPS guide and the negotiation tips STAY, and are reclassified in the screen-data baseline from `fabrication` to `catalogue`** — a six-step explanation of how pay-for-delete works is product content about the strategy, not a claim about this user, which is the line that classification draws. Mutation-verified: reintroducing an "ABC Collections" row and a "$1,250" balance fails two of the five pinning tests; reverted exact. |
| 2026-08-18 (rev 38) | Added SF-28 (CRITICAL, NOT FIXED — a product decision, recorded with evidence). `src/lib/investments/ai-stock-analyst.ts` holds **85 `Math.random()` call sites across 19 methods** and backs five live `withAuth` routes (`/api/investments/analyze/[symbol]` + its recommendation/fundamental/sentiment/technical children). Two distinct defects. **(1) Quotes and history are a silent mock fallback** — `getStockQuote` (:271) and `getHistoricalData` (:331) call the real `marketDataService`, catch any throw, and return invented price/volume/marketCap/peRatio/eps and a random-walk OHLCV series seeded from `getSimulatedBasePrice` (:403 — ten hardcoded tickers, else `100 + Math.random() * 200`). Neither `POLYGON_API_KEY` nor `ALPHA_VANTAGE_API_KEY` is configured, and both clients keep an empty key behind an `if (!this.apiKey) { }` whose warning was deleted (`polygon.ts:109-113`), so both providers fail, `marketDataService` throws `ALL_PROVIDERS_FAILED`, and the fallback is the ONLY path on this configuration. Both fallback comments claim a `source: 'estimated'`/`'synthetic'` tag that neither returned object carries — the convention lives in a different module. **(2) Fundamentals, sentiment, peers, fair value and risk have no real branch at all** — `getValuationMetrics`, `getProfitabilityMetrics` (which takes NO arguments, so it is not even symbol-dependent), `getGrowthMetrics`, `getFinancialHealthMetrics`, `getDividendMetrics`, `getPeerComparison`, `calculateFairValue` (a fair value and upside for the stock), `assessRisk`, and the whole sentiment family. `getNewsSentiment` (:1238) fabricates headlines **attributed to Reuters and Bloomberg with constructed URLs**. The sentiment route's own doc comment advertises Twitter/Reddit/StockTwits, analyst ratings, insider activity and institutional ownership; none of those clients exist. The unit test at `ai-stock-analyst.test.ts:253-257` asserts `fairValue.value > 0` and `method === "dcf"` — satisfied by any positive random number, so the suite is green over the fabrication and encodes it as correct. **Corrects rev 13**, which recorded the market-data path as REAL: that was true of `marketDataService` and false of the path, because every screen reaches it through the analyst that catches its throw. **Disqualifies SF-18's option 2** (supplying fundamental/sentiment inputs would feed randomness into the composite) and gives a stronger reason to keep the four `investments/analyze/*` screens unwired: the routes fabricate too, so wiring them would relocate the fabrication behind HTTP where it looks sourced. |
| 2026-08-18 (rev 39) | Two gate-integrity findings, both mine, both caught by mutating a gate rather than by trusting it. **(1) The mobile dogfood harness reported a false green.** A run of the 57 screens changed this session printed `0 FAIL, 57 ok`. In fact `/financial-intelligence/spending-insights` raised an `Alert.alert` ("Failed to load spending insights"), and because `Alert.alert` is a separate UIAlertController window and `idb ui describe-all` describes only the FRONTMOST window, every route measured afterwards read back that alert's four elements instead of its own screen. **31 of the 57 routes were never measured at all** — they now read 6 to 52 elements where they had read 4. This is the same failure mode the script already guarded for the ErrorBoundary, arriving through a different window; the guard keyed on crash text and a near-empty floor, and an alert has neither. Fixed by dismissing alerts (and reporting them as a finding for the route that raised them), by confirming any reading IDENTICAL to the previous route's via relaunch, and by re-issuing each deep link once — the last of which was needed because `/analytics` read as Expo Go's own "HTTP 404" bundle-load screen in two consecutive sweeps while a fresh launch renders it in 12 elements. Expo Go client errors are now reported as **NOT MEASURED** rather than counted as passes; `/tax` still fails that way and is honestly recorded as unverified. **(2) Built `audit:inline-metrics` (self-test 12/12), and it found seven screens hardcoding a measurement as inline JSX.** `audit:screen-data` hunts module-level constant arrays and objects, because that is the shape every fabrication found by hand had taken. `/analytics` has no such constant, passed that gate clean, and tells every user their credit score moved **+45** and their dispute success rate is **87%** — on a screen that makes no request at all. Also found: `budgeting/index` (a whole Monthly Overview — Income $5,000, Expenses $3,245, Remaining $1,755 — with no API import), and `trading/chart`'s `IndicatorPanel` (RSI 54.32 Neutral, MACD +0.45 Bullish, SMA20 $175.50, SMA50 $168.25, ATR $2.35 — a complete technical read for whatever symbol is open). **Three of the seven are screens I fixed EARLIER THIS SESSION** — `analytics/credit-score` (which still predicts 30/90/180-day scores of 748/762/780), `credit-builder/goals` (+58 six-month gain) and `tax/optimizer` ("your effective tax rate has increased by 2.7% over 3 years", plus 401(k)/IRA/HSA "Remaining" beneath a genuinely computed gap). Each of those fixes removed the module-level constants the old gate hunts and left the JSX literals, because I took that gate's definition of the defect as the definition of done instead of reading the whole screen. Baselined 4 catalogue / 7 fabrication, shrink-only, wired into package.json and CI as blocking. |
| 2026-08-18 (rev 40) | Device test of the 57 changed screens (task #82) — the first time anything this session was looked at on a simulator — found a defect no gate could see: **37 screens drew their own header row UNDERNEATH a native stack header**, so each rendered two titles. `credit-builder/pay-for-delete` showed "Pay for Delete" in the native bar and "Pay-for-Delete" in its own, one above the other. `audit:back-nav` was silent throughout because it asks whether there is a way BACK, and two ways back is not a trap; it took a screenshot. Fixed by turning the native header off where the screen provides its own — four groups (credit-builder 17, insights 5, recommendations 4, identity 2) took a blanket `headerShown: false` on `screenOptions`, and thirteen more screens took a per-screen entry. **Two of the fixes were wrong and the gate caught them before commit:** `coach/goal-detail` and `trading/strategies/[id]` have a `styles.header` that is a coloured title band and a risk-badge block respectively — content, not a nav bar, with no back control — so turning the native header off TRAPPED them. Both reverted with the reason recorded in the layout. My "has `styles.header` ⇒ has its own nav header" heuristic was too weak, and the real gate was stricter than my ad-hoc one. Also fixed a bug I introduced en route: the script added a SECOND `<Stack.Screen name="settings">` to `monitoring/_layout.tsx` where a multi-line entry already existed, and React Navigation would have used the first — the duplicate is gone and the original carries the flag. **Two gate blind spots fixed alongside:** `effectiveHeaderShown` and `drawsHeaderOnStackRoot` both read only an inline `screenOptions={{ ... }}` and not `screenOptions={headerOptions}`, so the moment credit-builder's whole group had its header turned off through a referenced object, the gate reported the root as still drawing one — a gate that flags a screen you have just fixed is a gate people learn to ignore. Both now resolve the referenced declaration, with two self-test cases pinning it (19/19, up from 17). Verified: tsc 0, lint 0 errors, jest 134 suites / 1624 tests, all seven mobile gates PASSED, and a fresh screenshot of pay-for-delete showing a single header with a working back arrow. |
| 2026-08-18 (rev 41) | Fixed the first two inline-metric fabrications (rev 39). **`analytics/index`** told every user their score had moved **+45** and their dispute success rate was **87%**, on a hub screen that makes no request. Both are REMOVED rather than wired: each figure already has a screen that computes it from the caller's own data (`/analytics/credit-score`, `/analytics/disputes`), and duplicating them on the hub would mean a second calculation to keep in agreement with the first — which is exactly how `financial/transactions` ended up with a spending chart that disagreed with its own list. **`budgeting/index`** rendered Income $5,000 / Expenses $3,245 / Remaining $1,755 with a progress bar hardcoded to `width: "64.9%"`, on a screen that imported no API at all; it now reads GET /api/financial/budgets/summary through the `budgetApi.getBudgetSummary()` adapter that already existed for the smart-budget screen. The labels changed from Income/Expenses to **Budgeted/Spent** deliberately: income is not part of a budget summary, and labelling `totalBudgeted` "Income" would have been a second fabrication wearing the first one's clothes. The bar is clamped to 0-100 — mutation-verified, since 140% renders wider than its own track — and an all-zero summary (a user with no budgets) says so instead of showing a $0.00 budget as though one existed. **A misclassification of my own surfaced while fixing it:** `QUICK_STATS` on the same screen invented the caller's bill, subscription and save-rule COUNTS ("Total Bills 5", "Subscriptions 6", "Save Rules 4"), and the screen-data baseline had the file marked `catalogue` — because one baseline key covers every constant in a file, and the other constant there, `FEATURES`, genuinely is a catalogue. **A per-file entry cannot carry two classifications**, and that is how an invented count sat inside an entry marked safe. QUICK_STATS is gone and the key is now `FEATURES` alone. Verified: tsc 0, lint 0 errors, jest 1,634 tests pass (10 new), all seven gates PASSED, screen-data 6 fabrications (from 7 at rev 37), inline-metrics 5 (from 7). |
| 2026-08-18 (rev 42) | Fixed the third inline-metric fabrication: `credit-builder/goals`' trend statistics. "+58 6 Month Gain" and "+10 Monthly Avg" were the caller's own score movement, typed into the markup. They are now COMPUTED from `historyPoints` — the same series the chart draws — so the chart and the numbers beneath it cannot tell different stories, and the label reads "Change over N readings" rather than a fixed six months, because the history route returns what has actually been recorded rather than a guaranteed six. A single reading now says there is no change to measure yet instead of dividing by `(n - 1) = 0`. **A second defect on the same card, not in the baseline and found only by reading around the fix:** `minValue={580} maxValue={720}` were hardcoded chart bounds, so a caller above 720 or below 580 — both entirely ordinary credit scores — had their own history drawn outside the chart. Bounds now come from the data, padded by 20 and clamped to the 300-850 scale. Both guards mutation-verified: relaxing the two-reading check makes the single-reading test fail, and removing the clamp makes the scale-ends test fail; revert verified byte-exact. Verified: tsc 0, lint 0 errors, jest 1,641 tests pass (7 new), all seven gates PASSED, inline-metrics fabrications 5 -> 4. |
| 2026-08-18 (rev 43) | Fixed the last two ACTIONABLE inline-metric fabrications; the remaining two are SF-28-blocked. **`analytics/credit-score`** carried a "Score Predictions" card — 30 Days **748** (+6 pts), 90 Days **762** (+20 pts), 6 Months **780** (+38 pts) — under the note "Based on current trends and planned actions", a methodology that does not exist. Nothing in this codebase forecasts a credit score; the nearest route, `/api/ml/predict-timeline`, predicts DISPUTE RESOLUTION time and its own comment records that it substitutes `predictDisputeSuccess` "as predictResolutionTimeline doesn't exist yet". A forecast is the number a user is most likely to ACT on — hold off a card application, take a loan — so it is the last one to invent. Removed, with the absence stated. **`tax/optimizer`** claimed "Your effective tax rate has increased by **2.7%** over 3 years" (nothing stores three years of effective rates; the analysis describes the current year only) and broke the retirement gap into 401(k) **$13,000** / IRA **$7,000** / HSA **$3,150** — rendered directly beneath the genuinely computed `retirementContributionGap`, which is what made them read as computed too. `TaxOptimizationAnalysis` (services/api/tax.ts:36-49) carries one gap figure and no per-account split, and "Remaining" is additionally a claim about what the user has ALREADY contributed — $13,000 remaining of a $23,000 limit asserts $10,000 paid in — which no contribution record exists to support. Both replaced with a stated absence. All three screens fixed in revs 42-43 (`goals`, `analytics/credit-score`, `tax/optimizer`) were screens whose earlier fix this session had removed the module-level constants and left the JSX literals. Verified: tsc 0, lint 0 errors, jest 1,643 pass (2 new, mutation-verified), all seven gates PASSED. **inline-metrics fabrications 7 -> 2**, both remaining behind SF-28: `trading/chart`'s IndicatorPanel and `investments/analyze/fundamental`, which would have to be wired to the analyst that is 85 `Math.random()` calls. |
| 2026-08-18 (rev 44) | Extended `audit:inline-metrics` to the WEB tree, and it found the same defect at larger scale: **16 pages hardcode a measurement, 67 literals, 11 of them classified `fabrication`**. The gate needed two changes to see web at all — a `--root`/`--baseline` pair so one implementation serves both trees, and a widened tag set, because React Native renders text only inside `<Text>` while the web app uses `<p>`, `<span>`, `<div>`, `<h1>`-`<h6>` and friends. Neither tree contains the other's tags, so a single pattern cannot cross-match; mobile's count was unchanged by the widening, which is the check that it added no false positives. Self-test 12 -> 15 cases. **The worst of the 11:** `/invest` renders a complete portfolio — $248,567.89 total, +$12,456.78 today, four holdings with prices and daily moves — which is the web twin of the mobile `trading/chart` finding and inherits SF-28, since the analyst behind those numbers is 85 `Math.random()` calls; `/financial-hub` shows a $124,500 net worth, 78%, and three transactions; `/loans` shows $67,840 of debt split $52,340/$12,500/$3,000; `/onboarding/complete` congratulates every user on a starting score of **675** and a projected **+85** before any bureau has reported anything; `/credit` and `/analytics/credit-score` hardcode the caller's score (742, 720), the same constant SF-20 records as `useState(742)` in `credit/factors/page.tsx`. `/admin/subscriptions` shows 156 subscribers and $12,324 revenue with no query behind them. **Five are genuine catalogue** and stay: `src/app/page.tsx` is the public landing page and its block is commented `{/* Score Display Mock */}` in the source; `not-found.tsx`'s "404" is an HTTP status; `credit/factors` holds the 300-850 scale and the published FICO weights; `credit-builder/utilization` an axis legend; `credit-builder/secured-card` an offer's fee and limit. Baselined shrink-only and wired into the root package.json and CI as blocking. Nothing fixed yet — recorded with evidence so the list can only shrink. |
| 2026-08-18 (rev 45) | **CORRECTS rev 39 and the dogfood commit.** The Expo-client-error marker added there keyed on a screen printing "HTTP <code>", and I cleared it by grepping `app/` and `src/` for that literal and finding nothing. The grep could not have found it: `src/services/api/client.ts:335` builds the message as `` `HTTP ${response.status}` ``, so it is CONSTRUCTED and never appears as a literal anywhere. Every screen whose request 404s therefore renders "HTTP 404" of its own accord, and the marker read that as Expo Go failing to load a bundle. `/reports` was reported NOT MEASURED while rendering 34 elements. Fixed by adding the discriminator the text alone could not provide: Expo Go's error screen IS the whole window and carries three or four nodes, while an app error state sits inside the app's own chrome and carries many more, so the marker now requires ≤ 6 elements as well as the text. Verified against the three known cases: `/reports` 27 el ok, `/tax` 67 el ok, `/student-loans` 67 el ok. **This also corrects two claims I made from the earlier run:** `/tax` is NOT hung in Metro — it renders 67 elements and the earlier persistent failure was the same Expo Go artefact clearing on a later run; and `/student-loans`, which the interrupted sweep reported as a confirmed crash ("Something went wrong"), renders 67 elements on re-test, so that crash is at most intermittent and is not established. The full 232-route sweep was stopped 18 routes in and restarted against the corrected gate rather than allowed to finish on wrong verdicts. |
| 2026-08-18 (rev 46) | **CORRECTS rev 44's classifications, which I got wrong on five of eleven.** Fixed `/onboarding/complete` first — it congratulated every new user on a **675** credit score captioned "Based on Experian data", **12** "Items to Dispute" captioned "Errors & negative items found", and **+85** "Potential Points", at the moment a new user has the most reason to believe us. The captions were worse than the numbers: one attributes an invented score to a named bureau, the other asserts twelve specific problems on a report nobody had pulled. Replaced with what actually happens next, because at that point in onboarding a bureau connection may not exist and the first pull certainly has not happened. **"12" was below the gate's threshold** — bare integers under 100 are counters — so the gate flagged 675 and +85 and never saw the claim about twelve errors; it was found by reading the block the gate pointed at. **Then the correction.** Re-checking each of the eleven for `metadata` / hooks / fetch showed that FIVE are public MARKETING pages — `/credit`, `/invest`, `/financial-hub`, `/loans`, `/credit-builder` — server components with SEO metadata, a Footer and signup CTAs, no state and no fetch. There is no signed-in caller for those numbers to be a claim *about*; they are product illustrations, the same category as the landing page I had already classified correctly. I marked them `fabrication` by reading the numbers and not the page, in a single batch pass — the same shortcut that put `QUICK_STATS` inside an entry marked `catalogue` in rev 41. The honest count is **10 catalogue / 5 fabrication**, not 5/11. The five real ones are all client components addressed to a caller: `/analytics/credit-score` ("Your Current Score 720", "+45 points in 6 months"), `/profile` (720, 78%), `/credit-builder/payments` (three months of payments with point gains — the mobile twin was fixed this session), `/admin/subscriptions` ("156 Cancellations this month, $12,324 Lost MRR"), `/marketplace/analysis` (+45). **One new finding, different in kind:** `/invest`'s illustration shows "+$12,456.78 today", "+2.3%" and "+4.2%" for an INVESTING product on a public page. That is a performance-advertising question rather than a fabrication one, and it belongs with SF-28 and the registration question in the owner's pile, not in this gate's. |
| 2026-08-18 (rev 47) | **The web tree had no equivalent of `audit:screen-data`, and 39 pages were in its blind spot.** `audit:mocks` watches API RESPONSES and `audit:inline-metrics` (rev 44) watches numbers typed into JSX; nothing watched a page's own module-level constants. `src/app/analytics/credit-score/page.tsx` shows what that cost: alongside the hardcoded 720 the inline gate caught, it holds a `scoreFactors` list asserting "On-time payments for 24 months", "Using 32% of available credit" and "Average account age: 5.2 years" — the SF-16 shape, on the web side, unwatched by anything. Parameterised the mobile gate with `--roots`/`--baseline` (same treatment as rev 44, one implementation for both trees; mobile's count unchanged at 67 catalogue / 6 fabrication, which is the check that nothing regressed) and pointed it at `src/app` and `src/components`. **39 screens render a constant data set, 26 of them with NO request in the file.** Frozen shrink-only and wired into CI as blocking. **All 39 are recorded UNCLASSIFIED on purpose.** Classifying them is a per-file judgement about whether a constant is product content or a claim about the caller, and I got that judgement wrong on five of eleven entries in rev 44 by batch-reading the numbers instead of the pages. UNCLASSIFIED states the truth — this is debt nobody has looked at yet — rather than a verdict I have not earned. |
| 2026-08-18 (rev 48) | Added SF-29 (HIGH, money, live, NOT FIXED — the semantics are an owner decision). Found while checking whether `/admin/subscriptions`' churn figures ("156 Cancellations this month, $12,324 Lost MRR") had a source. They do not — `GET /api/admin/subscriptions` returns a subscription LIST, not statistics — but the DELETE handler on the same route is the bigger problem: it marks a subscription canceled in the database and **never calls Stripe**, the call being a comment (`// stripe.subscriptions.cancel(subscriptionId);`). Because entitlement is read from Fynvita's own database, the customer loses access immediately while Stripe keeps billing at renewal. The contrast is inside the repo: `subscriptionService.cancelSubscription` calls Stripe first and writes back Stripe's own `status` and `cancel_at_period_end`, and `/api/addons/cancel` does the same; the admin route is the only one that skips it. The hardcoded pair it writes instead — `status: "canceled"` AND `cancel_at_period_end: true` — describes no real Stripe state, since one means ended and the other means still running; the correct path cannot produce it because it copies what Stripe returned. Recorded rather than fixed: routing through the service is one line, but choosing `immediately` true or false moves real money in one direction or the other. |
| 2026-08-18 (rev 49) | **CORRECTS rev 47, which overclaimed.** That entry and its CI comment said the new web `audit:screen-data` watches `scoreFactors` in `src/app/analytics/credit-score/page.tsx`. It did not, and checking the baseline showed the file was not in it at all. The gate's constant pattern required SCREAMING_CASE (`[A-Z][A-Z0-9_]*`), and both `scoreFactors` and `mockResults` are camelCase — invisible to it. Two blind spots fixed, both found by reading `src/app/marketplace/analysis/page.tsx` after the inline gate pointed at it. **(1) A constant seeded through a SETTER.** The gate already understood `useState(NAME)` including the typed generic — a gap closed earlier — but not `setResults(mockResults)`. That page holds `useState<AnalysisResult[]>([])` and seeds on upload, so its `mockResults` — an invented credit report naming real creditors ("Late payment on Chase card (30 days) - Jan 2023", "Collection account - Medical debt $450", "High utilization on Discover (78%)") — was doubly hidden. The upload itself is theatre: `handleUpload` calls `setResults(mockResults)` and sends the file nowhere, under the caption "Your data is encrypted and never stored". **(2) Case was standing in for scope.** The `(?:^|\n)const` anchor already excludes an in-function declaration, because a local is indented and never matches; requiring SCREAMING_CASE on top of that was a second filter, and a wrong one. Two self-test cases asserted "lower-case local" over fixtures at column zero, so they never tested scope at all — both replaced with cases that indent the local and add the real camelCase module-constant shape (25/25). **The effect is large: web 39 → 90 screens (59 with NO request in the file), mobile 73 → 78.** The newly visible web entries are the mirror of the admin cluster fixed on mobile in rev 78's task — `admin/audit` hardcodes `auditLogs`, `admin/logs` hardcodes `logs`, `admin/disputes` `disputes, stats`, `admin/users/[id]` `mockUser`, `analytics/credit-score` `recommendations, scoreFactors, scoreHistory`, `analytics/disputes` four constants, `analytics/page` four more. Both baselines re-frozen; all 90 web and the 6 new mobile entries are UNCLASSIFIED, which is the honest state — nobody has looked at them. Mobile's previously classified 66 catalogue / 6 fabrication are preserved. Verified: self-test 25/25, jest 1,643 pass, all seven mobile gates PASSED. |
| 2026-08-18 (rev 50) | **The 232-route sweep completed 226 ok / 6 FAIL, and that result is NOT trustworthy — I am not reporting it as coverage.** Checking the report for duplicate signatures found **26 routes that read back the HOME screen**, including `/financial/income`, `/analytics` and `/tax`, all three of which render 7, 12 and 67 elements when navigated to individually. Three smaller clusters shared readings too (8 × the Finances screen, 4 × a credit-score screen, 2 × a dispute wizard step), so **about 40 of the 226 "ok" routes were never measured**. The masking guard added in rev 39 compares each reading only against the IMMEDIATELY PREVIOUS route; these were interleaved with routes that did navigate, so no two consecutive readings ever matched and it stayed silent through all 26. Fixed by comparing against every signature seen so far — the first route to produce a reading owns it, and any later route producing the same one is confirmed by relaunch and re-navigation, exactly as a crash is. A probe over `/`, `/financial/income`, `/analytics` and `/tax` now reads 5, 12, 67 and 3 elements with one masked reading caught and re-measured. **It is still not fully reliable**: across probes `/analytics` has read 12 and 67 elements and `/tax` 67 and 3, so deep-link navigation timing remains noisy and a single sweep should not be treated as proof. **Separately, three NUL bytes were found in the harness itself** — `screen.texts.join(" ")` had become `join("\x00")` in three places, which made every `grep` on the file report nothing (macOS grep treats a NUL-bearing file as binary and prints no matches without `-a`). That is what made several checks this session appear to find nothing when the text was plainly there. The separator still worked, so no verdict was wrong because of it, but the file was corrupt in three commits. Repaired; a scan of every file changed today found no others. |
| 2026-08-18 (rev 51) | Finished triaging the 90 web constant data sets: **56 catalogue / 34 fabrication**, every one with a written reason. Twenty-one were decided by the source itself — the author had named the constant `mock*`, `MOCK_*`, `SAMPLE_*` or `initial*`, which is a statement in the code that the data is stand-in rather than a judgement about the page. Forty-eight are configuration or product content by role (navigation, tab and timeframe options, published bands like `SCORE_RANGES`/`AGE_BANDS`, and written copy such as `faqs` and `LETTER_TEMPLATES`). The last twenty-one needed the pages read. **The most actionable fabrication found today is `src/app/identity/dark-web/page.tsx`**: `BREACH_ENTRIES` tells the user "Your email and hashed password were included in the dump found on a dark web marketplace", with a named source ("MegaCorp Data Breach"), a date, and `affectedEmail: "user@example.com"` — a placeholder that renders as the caller's own breach. It would drive a real person to change passwords, freeze credit or buy monitoring on the strength of nothing. **`src/app/admin/audit/page.tsx` is the second:** invented AUDIT LOG entries with plausible IPs, timestamps and an admin email. An audit log is a compliance artefact, and a fabricated one is worse than an empty one. The rest of the operator and analytics surface follows the same pattern — `admin/logs`, `admin/disputes`, `admin/subscriptions` (whose metrics have no source at all, since GET on that route returns a subscription list and no statistics — cf. SF-29), `analytics/page` (Experian 725 +12, Equifax 718 +8, TransUnion 715 +5 as the caller's own, the web twin of the mobile comparison fixed in rev 36), `analytics/credit-score` (the SF-16 `scoreFactors` shape, twin of rev 43), `analytics/disputes`, `analytics/reports` (documents the user never produced) and `analytics/trends` (whose `projections` are a forecast nothing computes — the same reason the mobile score predictions were removed in rev 43). Two catalogue entries carry a caveat rather than a clean bill: `CREDIT_CARD_OFFERS` and `LOAN_OFFERS` are product content, but they should come from the Wave 6 affiliate feed rather than a constant, and are recorded so that wiring shrinks the list. |
