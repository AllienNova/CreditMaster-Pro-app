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

## Revision History

| Date | Change |
|---|---|
| 2026-08-09 | Initial version — MFA/backup-code, JWT HS256, anon-client classification, orphan-module exploit review, secrets sweep, OWASP/LLM checklist pass. |
| 2026-08-09 (rev 2) | Applied team-lead's two corrections: reachability re-graded LIVE/LATENT against the canonical `scripts/audit-reachability.js` (commit `2b23237`) instead of direct-importer count; phantom-table language tightened to "wiring prerequisite, not live outage" per the corrected 1-reachable/64-unreachable/3-test-only split. Confirmed SF-01 as the only LIVE finding (`BackupCodesManagement.tsx` is rendered by `src/app/settings/security/page.tsx`); SF-02 through SF-06 confirmed LATENT against the same script. |
