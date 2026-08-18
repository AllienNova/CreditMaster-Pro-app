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
