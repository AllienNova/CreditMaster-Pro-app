# Gap Analysis — Audit-Driven Findings Register

> **VERSION-013** — Generated 2026-05-03
> Source: 9-domain comprehensive code review (security + architecture + code quality), 27 reviewer agents.
> **Re-baseline**: invalidates the prior "125/125 DONE / 100%" status reported in VERSION-010 through VERSION-012.

---

## 1. Audit Summary

| Field | Value |
|-------|-------|
| Audit window | 2026-05-01 to 2026-05-03 |
| Methodology | 9 domains × 3 reviewer specialties (Security / Architecture / Code Quality) = 27 parallel reviews |
| Domains covered | Auth + middleware, Payments + Subscriptions, Commerce, Financial services, Investments (non-trading), Notifications, Admin, AI + Compliance, Mobile app |
| Domains previously reviewed (this session) | Credit repair, Trading (already remediated where possible — see commit `d64e8d5`) |
| Findings opened | **33 CRITICAL**, ~50 HIGH, ~21 MEDIUM, ~21 LOW |
| User exposure today | **None** (no live users yet — Fynvita branded as financial-education company in pre-launch) |
| Disclosure obligations | Not currently triggered (no user data exposure to disclose). Re-evaluate before public launch. |
| Ship decision | **BLOCKED** — Wave 7 must complete before launch |

**Critical interpretation:** Test pass rate of 99.86% (13,585 / 13,604) did **not** catch any of the 33 criticals. Pass rate is not a substitute for negative-auth tests, money-precision tests, or mock-data lint rules. Detection-gap remediation is part of Wave 7.

---

## 2. Findings Register

Severity scale: **C** = Critical (exploitable today / financial-loss / regulatory); **H** = High (data integrity, data exposure, broken contract); **M** = Medium (correctness, observability); **L** = Low (style, maintainability).

### Theme 1 — Authentication / Authorization (structurally broken)

| ID | Sev | File:Line | Finding | Linked Task |
|----|-----|-----------|---------|-------------|
| FND-001 | C | `src/middleware.ts:162-169` | Middleware whitelists ALL `/api/*` paths; only 4 of 118 routes use `withAuth` | TASK-AUTH-04 |
| FND-002 | C | `src/lib/security/auth-middleware.ts:287-289` | `validateAPIKey` compares inbound caller key against `AIML_API_KEY` (outbound vendor key) → anyone with that secret gets `enterprise` role | TASK-AUTH-05 |
| FND-003 | C | `src/app/api/admin/auth/route.ts:17-21` | Personal email addresses (`khonour@yahoo.com`, `kimhons@gmail.com`) hardcoded as admin grant | TASK-AUTH-02 |
| FND-004 | C | `src/app/api/admin/auth/route.ts:84` | Enterprise subscription tier = admin → any paying customer gets full admin | TASK-AUTH-02 |
| FND-005 | C | `src/lib/auth/rbac.ts:322` | `getUserRole()` reads `user_metadata.role` which is user-writable in Supabase → self-grant admin | TASK-AUTH-01 |
| FND-006 | C | `src/app/api/strategies/recommend/route.ts:31` | Endpoint with zero auth, comment says "auth can be added later" | TASK-AUTH-03 |
| FND-007 | H | `src/lib/security/auth-middleware.ts:376` | In-memory `sessions` Map on serverless — sessions lost on every cold start | TASK-AUTH-07 |
| FND-008 | H | `src/lib/security/csrf.ts:13-14` | `CSRF_SECRET` falls back to hardcoded `"default-csrf-secret-change-in-production"` | TASK-AUTH-09 |
| FND-009 | H | `src/lib/auth/auth-service.ts:118-119` | Profile insert failure swallowed during signup → user authenticated but profile-less | TASK-AUTH-11 |
| FND-010 | H | `src/lib/auth/backup-codes.ts:34-35` | Backup-code TOCTOU: delete-then-insert with no transaction → user locked out of 2FA recovery on insert failure | TASK-AUTH-10 |
| FND-011 | H | `src/lib/security/auth-middleware.ts:287-289` | API key comparison is non-constant-time (timing side-channel) | TASK-AUTH-08 |
| FND-012 | H | `src/lib/auth/api-guard.ts:104` vs `src/lib/auth/rbac.ts:10` | Two role enumerations diverge — `enterprise` recognized in `withRole` but absent from `rbac.ts` permissions | TASK-AUTH-12 |
| FND-013 | H | `src/lib/security/rate-limiter.ts` vs `src/lib/security/rate-limiting.ts` vs `src/lib/security/redis-rate-limiting.ts` | Three rate-limiter implementations — public surface re-exports only the in-memory one | TASK-AUTH-06 |

### Theme 2 — Webhook idempotency + tier mapping

| ID | Sev | File:Line | Finding | Linked Task |
|----|-----|-----------|---------|-------------|
| FND-014 | C | `src/lib/payment/stripe-service.ts:644-647` | `handleInvoicePaid` swallows errors with `void error` → renewal credit-resets silently lost; Stripe sees 200, no retry | TASK-WBH-04 |
| FND-015 | C | `src/lib/payment/stripe-service.ts:685-688` | `handleInvoicePaymentFailed` empty catch — payment-failure events vanish | TASK-WBH-04 |
| FND-016 | C | `src/lib/payment/billing-profile-store.ts:42-75` | `createSeedProfile` returns fake Visa 4242 + fake paid invoice for every new user as production billing data | TASK-WBH-03 |
| FND-017 | C | `src/lib/payment/billing-profile-store.ts:154-172` | `updatePlan` is a mock — activates plans without calling Stripe; user can self-grant any tier | TASK-WBH-03 |
| FND-018 | H | `src/lib/subscriptions/subscription-service.ts:462-470` | `getTierFromPriceId` references nonexistent env vars → every webhook-driven subscription silently lands on `free` | TASK-WBH-02 |
| FND-019 | H | `src/app/api/payment/checkout/route.ts:30,67-68` | `successUrl`/`cancelUrl` accepted from client → open-redirect post-payment | TASK-WBH-06 |
| FND-020 | H | `src/app/api/payment/checkout/route.ts:30,64` | `priceId` accepted from client without whitelist → arbitrary-price checkout | TASK-WBH-06 |
| FND-021 | H | `src/app/api/payment/checkout/route.ts:30,69` | `trialDays` accepted from client without cap → infinite free trials | TASK-WBH-06 |
| FND-022 | H | `src/lib/payment/stripe-service.ts:577-648` | `invoice.paid` has no idempotency guard → Stripe retry double-resets credits | TASK-WBH-01 |
| FND-023 | H | `src/lib/payment/stripe-service.ts:553-575` vs `subscription-service.ts:14` | Latent circular dependency between `stripe-service` ↔ `subscription-service` | TASK-WBH-07 |

### Theme 3 — Money correctness (Commerce)

| ID | Sev | File:Line | Finding | Linked Task |
|----|-----|-----------|---------|-------------|
| FND-024 | C | `src/lib/commerce/payouts/payout-service.ts:263,340` | Stripe transfer sends `payout.amount` as cents but value is in dollars → $100 payout sends $1 (1% of intended). Same bug at `stripe.payouts.create`. | TASK-MNY-01 |
| FND-025 | C | `src/lib/affiliate/revenue-tracker.ts:71` | Inbound webhook revenue events stored only in process-local array → lost on every cold start | TASK-MNY-05 |
| FND-026 | C | `src/lib/commerce/affiliate/commission-calculator.ts:370-428` + `src/lib/commerce/payouts/payout-service.ts:157-198` | Two parallel payout codepaths with no idempotency keys → double-pay risk | TASK-MNY-04 |
| FND-027 | H | `src/lib/commerce/affiliate/affiliate-service.ts:291-311` | `applyReferralCode` allows self-referral; non-atomic increment lets concurrent users race past `max_uses` | TASK-MNY-02, TASK-MNY-03 |
| FND-028 | H | `src/app/api/affiliate/webhooks/route.ts:107` | Webhook accepts inbound `commission` value verbatim (no server-side recalculation) | TASK-MNY-07 |
| FND-029 | H | `src/lib/commerce/affiliate/commission-calculator.ts:213-247` | Commission aggregation uses IEEE-754 float addition → drift across many small commissions | TASK-MNY-06 |

### Theme 4 — Investments (cross-user data leak)

| ID | Sev | File:Line | Finding | Linked Task |
|----|-----|-----------|---------|-------------|
| FND-030 | C | `src/lib/investments/portfolio-service.ts:144-161` (called by 5 analytics routes) | `getPortfolio()`/`getHoldings()` deliberately omit `user_id` filter → full IDOR on holdings/P&L/risk | TASK-IDR-02 |
| FND-031 | C | `src/lib/investments/portfolio-analytics.ts` (multiple) | Three division-by-zero bugs producing `Infinity`/`NaN` in Calmar/Information ratio | TASK-INV-01 |
| FND-032 | C | `src/lib/investments/services/PerformanceCalculator.ts:286-300` | Hardcoded `beta=1.0`, `correlation=0.85`, S&P=10% — fabricated benchmark figures served as real | TASK-INV-02 |
| FND-033 | H | `src/app/api/investments/portfolio/analyze/route.ts:29-48` | Holdings array accepted from request body with no schema validation | TASK-INV-03 |
| FND-034 | H | `src/app/api/investments/holdings/[id]/route.ts:146-149` | DELETE TOCTOU — ownership check then delete in non-atomic statements | TASK-IDR-02 |
| FND-035 | H | `src/lib/investments/services/PerformanceCalculator.ts:151` | `calculateVolatility` math wrong — single day's percent × `sqrt(period)` is not annualized stddev | TASK-INV-04 |

### Theme 5 — Financial services (IDOR + Plaid token exposure)

| ID | Sev | File:Line | Finding | Linked Task |
|----|-----|-----------|---------|-------------|
| FND-036 | H | `src/lib/financial/plaid-service.ts:289-295` | `getTransactions(accountId)` filters only on account_id, no user_id → IDOR exposing transaction history | TASK-IDR-03 |
| FND-037 | H | `src/lib/financial/plaid-service.ts:178-190` | `getAccessToken(itemId)` filters only on item_id, no user_id → IDOR exposing Plaid access tokens | TASK-IDR-03 |
| FND-038 | H | `src/app/api/financial/plaid/income/route.ts:28` | Plaid access token accepted as GET query parameter (logged in URLs everywhere) | TASK-IDR-03 |
| FND-039 | H | `src/lib/financial/financial-service.ts:243-244` | `setMonth(getMonth() - 1)` rollover bug — Jan 31 produces March 1 | TASK-FIN-01 |
| FND-040 | H | `src/lib/financial/financial-service.ts:145,253,297,339` | N+1 serial Plaid calls in `getMonthlyTrend` (6 months × N accounts sequentially) | TASK-FIN-02 |

### Theme 6 — Notifications (entire domain bypassable)

| ID | Sev | File:Line | Finding | Linked Task |
|----|-----|-----------|---------|-------------|
| FND-041 | C | `src/app/api/notifications/route.ts:7-122` | All 4 verbs accept `userId` from body/query with **zero authentication** → spoof/read/write any user | TASK-NTF-01 |
| FND-042 | C | `src/app/api/notifications/preferences/route.ts:48` | Identity from spoofable `x-user-id` header with `"demo-user"` fallback | TASK-NTF-01 |
| FND-043 | C | `src/app/api/notifications/push/send/route.ts:32-49` | No auth → flood any user's devices by spoofing `userId` | TASK-NTF-01 |
| FND-044 | C | `src/app/api/notifications/push/subscribe/route.ts:22-157` | No auth → register/enumerate push subscriptions for any user | TASK-NTF-01 |
| FND-045 | H | `src/lib/notifications/notification-service.ts` (templates) | All email templates interpolate user-controlled strings unsanitized → stored XSS in transactional emails | TASK-NTF-02 |
| FND-046 | H | `src/lib/notifications/notification-service-db.ts:123,161` | `markAsRead`/`deleteNotification` filter only by notification ID → IDOR | TASK-IDR-04 |
| FND-047 | H | `src/lib/notifications/notification-service.ts:52` (in-memory Map) | In-app notifications stored in process-scoped `Map` → lost on every cold start; CRUD silently returns stale data | TASK-NTF-03 |
| FND-048 | H | `src/app/api/notifications/preferences/route.ts:25-44` | Preferences in module-level in-memory Record → race conditions, cold-start data loss | TASK-NTF-03 |

### Theme 7 — Admin (unauthenticated mutations + fake data)

| ID | Sev | File:Line | Finding | Linked Task |
|----|-----|-----------|---------|-------------|
| FND-049 | C | `src/app/api/admin/audit/route.ts:95` | POST has zero auth → anyone can poison the forensic audit trail | TASK-ADM-01 |
| FND-050 | C | `src/app/api/admin/subscriptions/route.ts:140` | DELETE has zero auth → anyone can cancel any subscription by ID | TASK-ADM-01 |
| FND-051 | C | `src/app/api/admin/disputes/route.ts:150-176` | PATCH has zero auth + mass-assignment (raw `updates` spread to DB) | TASK-ADM-01 |
| FND-052 | C | `src/app/api/admin/analytics/route.ts` | Returns `Math.random()` data — never queries DB | TASK-MOK-01 |
| FND-053 | C | `src/app/api/admin/stats/route.ts:28-37`, `audit/route.ts:83-92`, `logs/route.ts:81-90` | Hardcoded mock numbers as fallback on DB error → operators read fabricated metrics | TASK-MOK-01 |
| FND-054 | H | `src/app/api/admin/disputes/route.ts:175` | `update(updates)` with no field whitelist → caller can overwrite `user_id`, `status`, etc. | TASK-ADM-02 |
| FND-055 | H | `src/app/api/admin/audit/route.ts:26`, `logs/route.ts:26` | `limit` parsed with no upper bound → unbounded query, OOM risk | TASK-ADM-03 |

### Theme 8 — AI + Compliance (regulatory gaps)

| ID | Sev | File:Line | Finding | Linked Task |
|----|-----|-----------|---------|-------------|
| FND-056 | C | `src/lib/compliance/gdpr-ccpa.ts:432-439` | `sendBreachNotification` is a no-op; GDPR Art. 33 72-hour notification will not fire | TASK-CMP-02 |
| FND-057 | C | `src/lib/compliance/gdpr-ccpa.ts:547-601` | `ConsentManagementService` stores consent in process-local Map → lost on every cold start | TASK-CMP-01 |
| FND-058 | C | `supabase/migrations/20260401000000_gdpr_erasure_rpc.sql` | `delete_user_data_cascade` RPC missing ~34 user-linked tables (broker_connections, trade_history, push_subscriptions, sessions, webauthn_credentials, etc.) → erasure leaves PII | TASK-CMP-03 |
| FND-059 | H | `src/app/api/ai/chat/route.ts:64` | Accepts arbitrary client-supplied `model` string with no cap → cost burn via expensive frontier models | TASK-CMP-04 |
| FND-060 | H | `src/app/api/voice/synthesize/route.ts:11,38` | No auth + no model whitelist on TTS endpoint | TASK-CMP-04 |
| FND-061 | H | 14 callers across financial/investment/credit/trading | Bypass `ModelRouter` and call `AIMLService` directly → 3-layer architecture is documentation, not enforced | TASK-CMP-04 |
| FND-062 | H | `src/lib/ai/financial-chat-engine.ts:205-208` | Prompt injection: user `message` interpolated into system prompt via `.replace()` | TASK-CMP-05 |
| FND-063 | H | `src/lib/ai/chat-engine.ts:144-146` (multiple) | `pii-protection.ts` exists but is never called before AI requests → SSN/cards/DOBs forwarded to AIML in cleartext | TASK-CMP-05 |

### Theme 9 — Mobile app

| ID | Sev | File:Line | Finding | Linked Task |
|----|-----|-----------|---------|-------------|
| FND-064 | C | `mobile-app/src/store/authStore.ts:45-52` | `__DEV__` auth bypass sets `isAuthenticated: true` with hardcoded `seedUser` — one bad EAS build flag from shipping fully-authenticated mock user | TASK-MOB-06 |
| FND-065 | C | mobile npm audit | `handlebars` JS injection CVEs (transitive); 15 HIGH dep findings (`node-forge`, `lodash`, `tar`, `undici`) | TASK-MOB-03 |
| FND-066 | C | `mobile-app/src/store/syncStore.ts:231` | Offline sync writes to deprecated `financialStore`; UI reads from new modular stores → diverged state after reconnect | TASK-MOB-04 |
| FND-067 | C | `mobile-app/src/store/index.ts:220` | `useFinancialStore` aliased deprecated; 5 screens still depend on it; 20 stores exist (vs documented 8) | TASK-MOB-04 |
| FND-068 | C | `mobile-app/app/dispute/[id].tsx:29-47` | Production route uses `setTimeout` with mock data instead of the real `useDisputeStore`; duplicate `dispute/` and `disputes/` route segments register both | TASK-MOK-05 |
| FND-069 | H | `mobile-app/src/services/biometrics/biometricService.ts:144,166,169` | Biometric flag in unencrypted `AsyncStorage` → rooted device bypass | TASK-MOB-01 |
| FND-070 | H | 13 call sites of `Linking.openURL(url)` | URLs from API responses with no scheme allowlist → `javascript:` URI injection | TASK-MOB-02 |
| FND-071 | H | `mobile-app/src/store/creditBalanceStore.ts:82,101,130` | Bare `fetch()` calls with no `Authorization` header (RN has no cookie jar) | TASK-MOB-07 |

---

## 3. Critical Counts by Theme

| Theme | Critical | High | Total open |
|-------|---------:|-----:|-----------:|
| 1. Auth/RBAC | 6 | 7 | 13 |
| 2. Webhooks + tier mapping | 4 | 6 | 10 |
| 3. Money + Commerce | 3 | 3 | 6 |
| 4. Investments | 3 | 3 | 6 |
| 5. Financial services | 0 | 5 | 5 |
| 6. Notifications | 4 | 4 | 8 |
| 7. Admin | 5 | 2 | 7 |
| 8. AI + Compliance | 3 | 5 | 8 |
| 9. Mobile | 5 | 3 | 8 |
| **TOTAL** | **33** | **38** | **71 documented** |

(Additional ~33 MEDIUM and ~21 LOW findings tracked in source review transcripts but not enumerated here for brevity. Reference reviewer outputs in `/private/tmp/claude-502/.../tasks/*.output` for full lists.)

---

## 4. False-Positive Log — Prior "100% Done" Claim

| Prior claim (VERSION-010 to VERSION-012) | Actual state (VERSION-013) |
|------------------------------------------|----------------------------|
| "All 7 waves DONE (125/125 tasks complete, 100%)" | False. Live CRITICAL bypasses across 9 domains. |
| "Platform Score 102/102 modules complete" | False. Auth, Payments, Commerce, Notifications, Admin all FAIL audit. |
| "Quality Scorecard: GREEN" | False. Per-domain RED on auth/commerce/payments/notifications/admin. |
| "Coverage >= 80% (per-domain) PASS (all web domains)" | Coverage gate did not catch any of the 33 criticals — pass rate measures presence of tests, not negative-auth or money-precision tests. |
| "Mobile Coverage NOT STARTED (0%)" | True. Confirmed by audit. Mobile findings discovered without test backstop. |
| "TASK-NTF-03 DONE" | False. Notification domain entirely unauth'd; in-memory store; XSS in templates. Reopened. |
| "TASK-ADM-03 DONE" | False. 3 admin endpoints unauth'd; analytics returns `Math.random()`; mock fallbacks. Reopened. |

**Root cause of false-positive**: Prior task verification relied on "tests pass + lint clean + build OK" rather than "negative-auth tests exist + money-precision tests exist + mock-data lint rule exists + manual security review". The Wave 7 exit gates close this loop.

---

## 5. Detection Gaps

| Gap | Why tests didn't catch it | Wave 7 fix |
|-----|---------------------------|------------|
| No negative-auth tests | Tests assert routes work for the authenticated user; never assert they fail for anonymous/wrong-user callers | TASK-AUTH-03 acceptance: integration test enumerates routes and asserts 401 without token + 403 without permission |
| No IDOR tests | Tests use a single test user; never assert that one user's resources are inaccessible to another | TASK-IDR-01: AST + grep audit script, integration tests assert cross-user 403 |
| No money-precision tests | Money math tested with whole-dollar inputs; never with fractional cents | TASK-MNY-06: `Money` branded type + `$10.00 → 1000` regression test on every Stripe call |
| No mock-data lint | `Math.random()` in production paths is invisible to test suite | TASK-PRE-05: ESLint rule blocking `Math.random()` outside `__tests__/`, `lib/random/` |
| No webhook idempotency tests | Each handler tested once; duplicate-delivery scenario never replayed | TASK-WBH-01: `stripe_webhook_events` UNIQUE table + replay-100x integration test |
| No prompt-injection tests | AI integration tests use clean inputs; never craft `Ignore previous instructions...` payloads | TASK-CMP-05: PII redaction unit tests + adversarial prompt corpus in test fixtures |

---

## 6. Cross-References

- **Prior remediation template**: commit `d64e8d5` (atomic Postgres RPC + `UNIQUE` constraint + `REVOKE EXECUTE FROM PUBLIC; GRANT TO service_role`). Reusable for FND-022, FND-026, FND-027, FND-028.
- **Reusable infrastructure already in tree**: `src/lib/auth/api-guard.ts` (`withAuth`/`withPermission`/`withRole` exports) — fix for FND-001/006 is wiring, not building.
- **Known-good rate limiter**: `src/lib/security/redis-rate-limiting.ts` is the only serverless-safe one. Delete the other three under TASK-AUTH-06.
- **Wave 7 task cards**: see `MASTER-IMPLEMENTATION-PLAN.md` § Wave 7.
- **Per-domain reviewer outputs** (full transcripts, do NOT read from main session — large): `/private/tmp/claude-502/.../tasks/*.output`.
