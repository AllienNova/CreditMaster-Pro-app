---
name: Fynvita security review context
description: Security posture, known vulnerabilities, and recurring patterns in the Fynvita repo
type: project
---

Security review performed 2026-04-16 against 42-file diff (+520/-265 lines).
Security review performed 2026-05-01 against credit repair / credit balance system (feat/asset-system-regen branch).

## 2026-05-01 Credit Repair Review — Key Findings

1. **No rate limiting on disputes/generate** (HIGH): The AI dispute generation endpoint has no per-user
   rate limiter. Credit-check guard is a partial control but does not bound request volume before AI
   is called in template mode (free, no credit deduction). An attacker can spam template generation
   with no cost.

2. **Prompt injection: user-controlled fields fed to AIML without sanitization** (HIGH):
   `creditReport`, `disputeReason`, `additionalContext`, and strategy `variables` pass user input
   directly into AI prompts at disputes/generate/route.ts lines 143-151, 349-352. No stripping of
   injection patterns (e.g., "Ignore previous instructions…").

3. **Mobile creditBalanceStore: unauthenticated fetch calls** (HIGH):
   `creditBalanceStore.ts` lines 82, 101, 130 call `/api/credits/balance`, `/api/credits/history`,
   and `/api/credits/purchase` with bare `fetch()` — no Authorization header attached.
   Server-side Supabase cookie auth will work in a browser but is unreliable in React Native where
   cookies are not automatically propagated.

4. **Webhook idempotency gap** (HIGH): `stripe_payment_intent_id` in `credit_purchases` table has no
   UNIQUE constraint (migration line 46). Duplicate `payment_intent.succeeded` deliveries can grant
   credits multiple times.

5. **credit_transactions INSERT RLS: missing TO service_role** (MEDIUM):
   `20260427000002_credit_system.sql` line 36 — INSERT policy uses `WITH CHECK (true)` without
   `TO service_role`, allowing any authenticated client to insert arbitrary transaction rows directly.

6. **SSN passed through AI dispute pipeline** (LOW): `userInfo.ssn` is an accepted field at
   disputes/generate/route.ts line 148 and flows to AIML API. No masking or stripping before the
   external AI call.

7. **Math.random() notice IDs in fcra-adverse-action.ts line 103** (LOW): Carried forward from
   2026-04-16 review. Not fixed in this diff.

## Resolved since 2026-04-16

- adverse_action_notices INSERT and consent_records INSERT policies now correctly scoped to
  `TO service_role` (migration lines 33-36, 58-65). Previously flagged issue is fixed.

## Dependency Audit (2026-05-01, npm audit)

- Critical: 0 | High: 1 | Moderate: 11 | Low: 2
- HIGH: @xmldom/xmldom <0.8.13 — four XML injection/DoS CVEs (GHSA-2v35, GHSA-f6ww, GHSA-x6wf, GHSA-j759).
  Transitive dep. Previous critical axios and handlebars findings appear resolved.

## 2026-05-01 Commerce Domain Review — Key Findings

1. **No self-referral guard** (HIGH): `affiliate-service.ts:applyReferralCode` does not check whether
   `userId === validation.code!.userId`. A user can apply their own referral code, earning commission
   on their own subscription.

2. **Webhook commission injection** (HIGH): `affiliate/webhooks/route.ts:107` accepts
   `data.commission` from the inbound MoneyLion webhook body as the authoritative commission amount.
   After signature verification the field is passed unchecked to `revenueTracker.trackEvent`. A
   spoofed (or replayed before timestamp window) webhook from a compromised partner channel can
   inflate commission records.

3. **Timing-safe comparison missing on webhook HMAC** (MEDIUM): `affiliate/webhooks/route.ts:69`
   compares the HMAC with `signature !== expectedHex` (string equality). A timing side-channel
   exists; use `crypto.timingSafeEqual` on the byte buffers instead.

4. **Math.random() for payout references and referral codes** (MEDIUM):
   `payout-service.ts:860,866` and `affiliate-service.ts:450` use `Math.random()`, which is not
   cryptographically random. Payout reference IDs and referral codes can be predicted by an attacker
   who can observe a run of values. Use `crypto.randomBytes` / `crypto.randomUUID`.

5. **Credit score and income accepted from client query params** (MEDIUM):
   `affiliate/offers/route.ts:46-51` accepts `creditScore` and `annualIncome` as unauthenticated
   query parameters and builds the `UserMatchProfile` with them. Callers can manipulate their own
   profile to receive offers intended for higher-score/income segments, or probe offer thresholds.

6. **No rate limiting on /api/affiliate/offers or /api/affiliate/webhooks** (MEDIUM):
   Neither endpoint enforces per-user or per-IP rate limits. The offers GET is cheap but the webhook
   POST path could be hammered to flood the revenue tracker's in-memory event queue.

7. **bank_details stored in plaintext in manual_payout_queue** (MEDIUM):
   `payout-service.ts:404` inserts the full `recipient.bankDetails` object (account number, routing
   number, IBAN) as a JSON column into `manual_payout_queue`. No encryption at the application
   layer; bank account data at rest depends entirely on Supabase-level encryption.

8. **IDOR on payout lookup: no ownership check** (MEDIUM):
   `PayoutService.getPayout(payoutId)` queries `payouts` by ID only with no user ownership filter.
   If this method is exposed via an API route without RLS on the `payouts` table, any authenticated
   user can retrieve any payout by guessing/enumerating IDs.

## 2026-05-01 Notifications Domain Review — Key Findings

1. **Missing authentication on all notification API routes** (CRITICAL): Every handler in
   `src/app/api/notifications/route.ts` (GET/POST/PATCH/DELETE) accepts `userId` from the request
   body or query string with no session/JWT verification. Any anonymous caller can read, create,
   mark-read, or delete notifications for any user by supplying their UUID.

2. **Missing authentication on push/send, push/subscribe, push/schedule** (CRITICAL): The push send
   endpoint (`push/send/route.ts`) accepts `userId`/`userIds` from the request body and dispatches
   push notifications to the named user's devices — no auth check. Similarly subscribe and schedule
   routes accept arbitrary `userId` values.

3. **Preferences route trusts `x-user-id` header, falls back to "demo-user"** (CRITICAL):
   `preferences/route.ts` lines 48, 60, 100 use `request.headers.get("x-user-id") || "demo-user"`.
   Any caller can set this header to impersonate any other user and read or overwrite their
   preferences. The `"demo-user"` fallback exposes a catch-all account.

4. **XSS via unsanitized user-controlled content in email HTML** (HIGH):
   `notification-service.ts` and `notification-service-db.ts` interpolate unescaped caller-supplied
   strings directly into HTML email bodies (e.g., `name`, `customerName`, `itemDescription`,
   `reason`, `documentName`, `senderName`, `bureau`, `planName`, `fileName`). If any of these fields
   originate from user input, an attacker can inject `<script>` tags or `<img onerror=…>` payloads
   into transactional emails.

5. **No rate limiting on any notification endpoint** (HIGH): None of the six routes enforce
   per-user or per-IP rate limits. The push/send route lets any caller flood all of a user's devices.
   The schedule route can queue unlimited future notifications.

6. **notification-service.ts uses in-memory Map with no persistence or auth** (HIGH): The
   singleton `notificationService` stores notifications in a process-local Map. Across serverless
   invocations state is lost, but more critically the GET route at `/api/notifications` relies on
   this store and has no auth — any userId can be enumerated.

7. **notification-service-db.ts markAsRead / deleteNotification have no ownership check** (HIGH):
   `markAsRead(notificationId)` and `deleteNotification(notificationId)` only filter by
   `notificationId`, not by `userId`. Combined with no route-level auth, any caller can mark or
   delete any notification by ID.

8. **No unsubscribe-link signing** (MEDIUM): No HMAC or token is generated for email unsubscribe
   flows. Email links that reference a user's notification preferences would be guessable / forgeable.

9. **schedule/route.ts DELETE has no userId scoping** (MEDIUM):
   `cancelNotification(notificationId)` at `schedule/route.ts:214` cancels any notification matching
   the ID with no check that the caller owns it.

## 2026-05-01 Admin Domain Review — Key Findings

1. **Unauthenticated audit log write (CRITICAL)**: `audit/route.ts POST` (line 95) has NO auth check. Any anonymous caller can inject arbitrary records into audit_logs, corrupting the forensic trail.

2. **Unauthenticated subscription cancel (CRITICAL)**: `subscriptions/route.ts DELETE` (line 140) has NO auth check. Any unauthenticated caller can cancel any subscription by knowing the Stripe ID.

3. **Unauthenticated dispute update (HIGH)**: `disputes/route.ts PATCH` (line 150) has NO auth check. Any caller can update any dispute row, including setting outcomes to "removed".

4. **Mass-assignment on disputes (HIGH)**: `disputes/route.ts PATCH line 175` spreads raw `updates` object into `.update(updates)` with no field whitelist. Any column can be overwritten.

5. **Hardcoded owner PII in source (HIGH)**: `auth/route.ts lines 17-21` — ADMIN_EMAILS array contains two real personal email addresses committed to the repo.

6. **Enterprise tier = admin access (HIGH)**: `auth/route.ts line 84` — any paying enterprise subscriber gets full admin. Paid tier != staff role.

7. **No audit logging for admin mutations (HIGH)**: Users PATCH, subscriptions DELETE, and disputes PATCH perform state changes but write nothing to audit_logs. Actor identity is lost.

8. **No super_admin separation (MEDIUM)**: `requireRole` tops out at "admin". No action requires elevated proof-of-identity beyond a standard admin session.

9. **Uncapped pagination on bulk reads (MEDIUM)**: `audit/route.ts GET` and `logs/route.ts GET` accept arbitrary `limit` values with no cap, enabling accidental or intentional DoS.

10. **Settings PATCH: no schema validation (MEDIUM)**: `settings/route.ts POST lines 45-48` spreads raw request body onto settings object with no Zod or type guard.

11. **Mock data returned on DB errors (LOW)**: `audit/route.ts`, `logs/route.ts`, `stats/route.ts` return fabricated data on DB failure, masking real system state from admins.

## 2026-05-01 Investments Domain Review — Key Findings

1. **IDOR: analytics routes fetch portfolio by ID with no ownership check (CRITICAL)**: `portfolio-analytics.ts` calls `portfolioService.getPortfolio(portfolioId)` and `portfolioService.getHoldings(portfolioId)` — both in `PortfolioServiceFacade`, which intentionally strips the userId filter. Any authenticated user can supply an arbitrary UUID to `/api/investments/analytics/risk?portfolioId=`, `/analytics/performance`, `/analytics/correlation`, `/analytics/diversification`, `/analytics/rebalance` and receive another user's full holdings and risk data.

2. **IDOR: DELETE /holdings/[id] missing user_id in final delete (HIGH)**: The ownership check fetches with `.eq("user_id", …)` but the actual DELETE at line 148 only filters by `.eq("id", id)` — no user_id guard. Between the check and the delete a TOCTOU window exists, and code reviewers/editors can easily break it. The delete should include `.eq("user_id", userId)`.

3. **Unvalidated holdings input in POST /portfolio/analyze (HIGH)**: The `POST` handler at `portfolio/analyze/route.ts` accepts `holdings` directly from the request body and passes them to analysis services without schema validation. Callers can craft arbitrary holdings objects to probe financial calculation behaviour.

4. **console.error leaks internal error objects to server logs (MEDIUM)**: 30+ `console.error("…", error)` calls across analytics routes log the raw Error object. In a cloud logging environment this can surface stack traces, table names, and query fragments. Use a structured logger that strips sensitive fields.

5. **Service-role key instantiated inline in alerts and portfolio/analyze routes (MEDIUM)**: `alerts/route.ts` and `portfolio/analyze/route.ts` call `createClient(NEXT_PUBLIC_SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)` at module scope. The pattern is not wrong per se but bypasses RLS entirely; these routes rely solely on application-layer auth. Prefer `getSupabase()` (anon key + RLS) for user-scoped reads.

6. **No input validation on symbol path parameter in analyze/[symbol] routes (LOW)**: `analyze/[symbol]/route.ts` and sub-routes receive the raw path segment and pass it to market-data services. No length cap, character allowlist, or sanitization. An overly long or specially crafted symbol could reach external APIs or cache keys.

## 2026-05-01 Mobile App Review — Key Findings

1. **DEV auth bypass in production-capable build** (CRITICAL):
   `authStore.ts` lines 45-52 — `if (__DEV__)` block sets `isAuthenticated: true` with hardcoded
   `seedUser`, bypassing Supabase entirely. Metro strips `__DEV__` in production EAS builds, but a
   single misconfigured build ships full auth bypass to end users. Must be extracted to a separate
   dev-only entry point.

2. **creditBalanceStore: no Authorization header (confirmed carry-forward)** (HIGH):
   `creditBalanceStore.ts` lines 82, 101, 130 — all three fetch calls use bare `fetch()`. Every other
   store uses `api` client from `client.ts` which attaches the Bearer token automatically.

3. **Biometric-enabled flag in AsyncStorage, not SecureStore** (HIGH):
   `biometricService.ts` lines 144, 166, 169 — `@fynvita_biometric_enabled` and `@fynvita_biometric_type`
   stored unencrypted. On a rooted/jailbroken device an attacker writes `"false"` to disable the
   biometric gate with no auth challenge required.

4. **Push token in AsyncStorage** (MEDIUM):
   `push-notification-service.ts` line 245 — Expo push token written unencrypted; enables targeted
   push spoofing if storage is exfiltrated.

5. **Unvalidated dynamic URLs in Linking.openURL** (MEDIUM):
   `freeze.tsx:99`, `identity-theft.tsx:377`, `loan.tsx:722`, `marketplace/*.tsx:34` (9 files),
   `help/contact.tsx:64`, `tax/documents.tsx:363-366` — URLs from API responses or component state
   with no `https://` scheme validation. Compromised API or MITM can inject `javascript:` URIs.

6. **No jailbreak detection, no certificate pinning** (MEDIUM):
   No references to jailbreak detection libraries or HPKP/TrustKit anywhere in the codebase.

7. **Negotiation script written to system clipboard** (LOW):
   `bill-negotiator.tsx:685` — full script on clipboard; accessible to any foreground app for ~60s.

## Mobile Dependency Audit (2026-05-01, npm audit)

- Critical: 1 | High: 15 | Moderate: 19 | Low: 4
- CRITICAL: handlebars — JS injection via AST type confusion (2 CVEs, GHSA)
- HIGH: node-forge — Ed25519 signature forgery + basicConstraints bypass; lodash — prototype pollution
  + code injection via _.template; flatted — prototype pollution DoS; tar — path traversal/symlink
  poisoning; undici — decompression DoS + WebSocket 64-bit length overflow; @xmldom/xmldom — XML
  injection/DoS (carried forward from web audit)

## Persistent Patterns to Watch

- Any new AI-calling endpoint: always check for prompt injection sanitization and rate limiting.
- Any new credit_transactions INSERT policy: must be scoped TO service_role.
- Stripe webhook handlers: always enforce UNIQUE on payment intent ID before fulfilling value.
- Mobile store fetch calls: must use `api` client from `client.ts`, never bare `fetch()`.
- Mobile auth-gating flags (biometric enabled, session flags): must go to SecureStore, not AsyncStorage.
- Any Linking.openURL call: validate scheme is `https://` before opening.
- Every admin route handler (GET and mutation) must call requireRole before any business logic.
- Never spread raw request body into a DB update — always use a strict Zod schema with .strict().
