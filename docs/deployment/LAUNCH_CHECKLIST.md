# Fynvita — Production Launch Checklist

> **M1 status (2026-08-09): NO-GO.** Not "GO WITH CONDITIONS" — that verdict was
> issued 2026-07-24 and four of the facts it rested on have since been measured
> false. Gates A, B and D are entirely unstarted; Gate C has two of five boxes.
> Authoritative verification record: [`docs/qa/qa-report.md`](../qa/qa-report.md)
> and [`docs/specs/smoke-test-report.md`](../specs/smoke-test-report.md).

**Naming collision, read this first.** `docs/superpowers/plans/2026-04-16-fynvita-asset-system-regen.md`
also defines "Gate A" through "Gate D" — brand-asset approval points, entirely
unrelated to launch. When a commit, task, or report says "Gate C", it means the
one in THIS file unless it says "brand gate".

## Numbers corrected 2026-08-09 (each re-measured, not copied)

The stale figures below had been carried forward unverified and were being cited
as evidence.

| Claim in the prior revision | Measured 2026-08-09 | Command |
|---|---|---|
| "441 tests" | **16,599 passing**, 19 skipped, 820 suites | `npx jest` |
| "295/295 routes wrapped" | **305/305** | `npm run audit:auth` |
| "32 vulns (1 critical)" — CLAUDE.md §9 and §11 carry the same figure | **33 total**, and the number that matters is the one nobody was reporting: **18 of them are in PRODUCTION dependencies** (1 critical, 10 high, 7 moderate). The critical is `next-auth`. | `npm audit --omit=dev` |
| Gate C "200 tables derived" | **202** (achievements + erasure migrations landed since) | `node scripts/schema-from-migrations.js` |
| — (not previously tracked) | **68 tables are queried by code but created by no migration** | `node scripts/audit-phantom-tables.js` |
| — (not previously tracked) | **12 modules / 25 call sites still use the session-less anon client**, so their reads return zero rows under RLS with no error | see `docs/specs/gap-analysis.md` |

---

## 🔒 M1 Launch Gates — BLOCKING (read before anything else)

**Gates A, B, C and D are ALL M1 preconditions.** The prior revision said "Gates
A–C are the M1 launch preconditions" one line after Gate D declared itself M1
scope. Gate D is a precondition; it is not optional and not post-launch.

Ordering constraint: **B before A** (the CI gates must be blocking before the
production flag flips, or nothing catches a regression during the flip), and
**A before the beta cohort**. D is independent of A/B/C and is owner-gated, so it
should start now — it has the longest lead time of the four.

Wave 7 remediation closed 30 of the 32 enumerated M1 CRITICALs (FND-001 inert, FND-026 partial), verified from source (`docs/qa/qa-report.md`).
But the app currently runs on **one** auth-enforcement layer, not the intended two: per-route
`withAuth`/`withRole` guards are LIVE (`audit:auth` reports 305/305 routes wrapped), while the
**middleware deny-by-default backstop is OFF** — feature flag `auth.deny_by_default` seeds `false`
(`src/lib/flags/`, `src/middleware.ts`). This is **FND-001 (INERT_BEHIND_FLAG)**, tracked as
**TASK-AUTH-04-staging**. "Tests green" is NOT clearance for the items below.

> **Why "tests green" is not clearance, with this repo's own receipts.** On
> 2026-08-09 the suite was green — 16,599 tests, 0 failures, clean lint, clean
> types, successful build — while (1) signup was completely broken, (2) every
> authenticated API request returned 401, (3) `service_role` could not read 163
> relations, and (4) `POST /api/gamification/achievements` let any authenticated
> user mint themselves any achievement. All four were found by RUNNING the app;
> none was visible to any gate. Details in `docs/specs/smoke-test-report.md` §3.
> The suite mocks the Supabase client, so no missing GRANT, no absent table and
> no RLS failure can ever fail it.

### Gate A — Flip auth to deny-by-default ("permanently dark")

Closing FND-001 means denying every request unless a route is explicitly public. Do NOT flip the
flag straight to production — a wrong `PUBLIC_ROUTES.ts` entry silently re-opens a hole.

- [ ] Enable `auth.deny_by_default = true` in **staging only**
- [ ] Run **24 h of synthetic monitoring** on staging, green across all of:
  - [ ] every Stripe / affiliate / Plaid **webhook** endpoint
  - [ ] **signup / login / OAuth** flows
  - [ ] all routes intentionally public per `src/lib/auth/PUBLIC_ROUTES.ts`
- [ ] **SEC sign-off on `src/lib/auth/PUBLIC_ROUTES.ts`** — every allow-listed path reviewed and justified
- [ ] Only after both above: flip `auth.deny_by_default = true` in **production**
- [ ] Post-flip: confirm no legitimate traffic 401s in the first hour. Rollback = flip flag back to `false` (no redeploy)

### Gate B — Wire auth gates into CI as BLOCKING

These pass locally today but are not enforced per-PR — which is exactly how an FND-001-class
regression slips back in.

- [ ] `npm run audit:auth` (`scripts/verify-auth-coverage.ts`) added to CI and **fails the build** on any unclassified route (must stay 305/305 — was 295 when this line was written; the count moves as routes are added, so CI asserts "all classified", never a hardcoded number)
- [ ] `npm run test:auth-negative` added to CI and **fails the build** if the negative-auth suite drops below its floor (≥568; 611 at last run)
- [ ] `npm run audit:idor` added to CI and **fails the build** on any NEW unscoped service-role query. Ratchets against `scripts/idor-baseline.json` (83 findings frozen 2026-08-09); the baseline may only shrink. Mutation-tested in both directions — see commit `6e049cf`.
- [ ] `node scripts/audit-phantom-tables.js` added to CI **once the 68 phantom tables are closed**; it exits non-zero today by design. Wiring it before then would force it to be disabled, which is how the previous gate rotted.
- [ ] All four wired into CI **before** the production flag flip in Gate A

> Gate B exists because `audit:auth` was silently FAILING with 11 offenders on
> 2026-08-09 while the checklist listed it as a passing blocking gate. A gate
> nobody runs is not a gate. Each box above is "wired into CI and fails the
> build", never "passes locally".

### Gate C — Other operator-gated M1 blockers (detail in `docs/qa/qa-report.md`)

- [x] **Live/staging schema audit** — **done 2026-08-01 against a local Postgres from `supabase db reset`.** `supabase/migrations/` applies cleanly from zero (99 migrations). Reconciliation is exact: 158 user-scoped relations live vs 158 derived from migrations, **zero drift in either direction**; 200 tables derived vs 208 live, the difference being exactly the 8 VIEWS, with **zero column differences** across all 200 shared tables. The payout/affiliate tables this item called absent are present in both. Four cascade entries name tables that do not exist (`ai_interactions`, `goals`, `savings_accounts`, `spending_categories`) — all vestigial, none queried by any code, all skipped by the function's `to_regclass` guard, and now asserted as known-vestigial by a test so a fifth cannot appear unnoticed. **Caveat: this verifies the migration set against a LOCAL database. It does not prove the hosted staging/production schema matches — that still needs the same reconciliation run against those.**
- [x] **FND-026 dual payout-rail decision** — **merged, verified in code 2026-08-01.** `commission-calculator.ts:1-11` declares payout execution lives *exclusively* in `payout-service.ts`; the file has no `affiliate_payouts` writes and no payment-provider calls (its only writes are `commission_earned` and a commission rule). `payout-service` carries Stripe idempotency keys derived from the payout row id (`payout-service.ts:309,392`). The register still cites `commission-calculator.ts:370-428`, line numbers that no longer contain what the finding describes. **Still needs SEC sign-off**, but the engineering condition is met and nothing is wired to a trigger.
- [ ] **`main` branch protection** — require PR + review + CODEOWNERS enforcement
- [ ] **`npm audit`** — re-measured 2026-08-09: **18 vulnerabilities in production dependencies** (1 critical, 10 high, 7 moderate) out of 33 total. The critical is `next-auth`. Every doc that tracks this cites only the combined total ("32 vulns, 1 critical"), which hides the split; update CLAUDE.md §9/§11 in the same change that fixes the vulns. Report `npm audit --omit=dev` alongside the total from now on — a prod-vs-dev split is the only form of this number that is decision-relevant.
- [ ] **68 phantom tables closed** — code queries 68 tables that no migration creates (`node scripts/audit-phantom-tables.js`). Each is a runtime PostgREST `42P01` on a real user's first request. Invisible to types, lint, build and all 16,599 tests. See `docs/specs/remediation-plan.md`.
- [ ] **12 modules moved off the session-less anon client** — 25 call sites whose reads silently return zero rows under RLS, including all four `/api/cron/*` routes, which have no user session by definition. A cron job that writes nothing and reports success is worse than one that crashes.
- [ ] **Closed-beta cohort** — invite the limited real-user cohort only after Gates A + B pass

### Gate D — Multi-provider payments preconditions (NEW 2026-08-01, see ADR-0011)

The TrueLayer surface (EU/UK pay-in, partner pay-out, bank aggregation) is M1 scope.
Engineering cannot clear any of these; each blocks TASK-PAY-07/08.

- [ ] **TrueLayer licence confirmation** — written confirmation that Fynvita operates as an agent/distributor under TrueLayer's PIS authorisation. Their contractual conditions become build requirements (SCA handling, consent capture, retention).
- [ ] **Stripe Connect confirmation** — written confirmation covering partner payouts under Stripe's licence.
- [ ] **Seven `TRUELAYER_*` secrets into Doppler** — incl. `TRUELAYER_PRIVATE_KEY` + `TRUELAYER_SIGNING_KEY_ID` (JWS request signing) and `TRUELAYER_WEBHOOK_SECRET`; plus sandbox accounts for both providers.
- [ ] **`.env.example` entries** — currently zero for TrueLayer.
- [ ] **Sandbox integration evidence** — `npm run test:payments-sandbox` green (real round-trip + webhook per rail) and reconciliation reporting 0 drift. Mocked-SDK unit tests are explicitly NOT sufficient: that standard is what let FND-024 (dollars sent as cents → 1% payout) and B1 ($50 payout netting $0) reach `main` with a green suite.

### Gate E — JWT verification proven against a real issuer

Added 2026-08-09. `src/lib/auth/jwt-validation.ts` was rewritten after **every
authenticated request was found to be returning 401**: Supabase issues ES256
tokens via JWKS carrying the user id in `sub` (RFC 7519 §4.1.2), while the
validator required HS256 and a non-standard `userId` claim. The 611-test
negative-auth suite could not catch it because it only ever asserts that
*unauthenticated* requests are rejected — no test had ever presented a real
token.

- [x] ES256/JWKS path exercised against a genuine local-Supabase access token — 5 endpoints returned 200 (`docs/specs/smoke-test-report.md` §2)
- [ ] `algorithms` stays PINNED to `["ES256","RS256"]` at the `jwtVerify` call, asserted by a test that fails if the pin is widened
- [ ] **Legacy HS256 branch** (`jwt-validation.ts:96-105`): strategy is chosen from the token's own UNVERIFIED header, so an attacker does select which branch runs. The classic alg-confusion attack — signing HS256 with the JWKS public key as the HMAC secret — does **not** apply here: `verifyHs256` keys off `JWT_SECRET`/`SUPABASE_JWT_SECRET`, which is independent of the JWKS material, and returns `null` when unset (`jwt-validation.ts:151-157`). Residual exposure is therefore exactly "is that secret set, and is it strong?" Decide: delete the branch, or keep it and assert `JWT_SECRET` is unset in production. Do not leave it undecided — it has never been exercised live.
- [ ] **`issuer` / `audience` are not pinned** on either path. Currently mitigated rather than checked: `createRemoteJWKSet` fetches only this project's JWKS, so a token from a foreign Supabase project fails on unknown `kid`. That is one accident away from being wrong. Pin both explicitly.
- [ ] Negative-token matrix, each asserted to 401: expired · wrong issuer · wrong audience · `alg: none` · HS256 signed with the JWKS public key as the HMAC secret · valid signature but unknown `kid`
- [ ] JWKS fetch failure is fail-CLOSED, with a test that stubs the JWKS endpoint to 500 and asserts 401 rather than a bypass
- [ ] Hosted Supabase JWKS URL confirmed reachable from the deployed runtime (only `127.0.0.1:54321` has been proven)

> Gate E is separate from Gate A on purpose. Gate A is about which routes are
> reachable; Gate E is about whether the token those routes trust is verified
> correctly. Passing A while E is open means every route is guarded by a check
> that has been proven for exactly one happy path.

---

> Passing every box in the generic checklist below does NOT satisfy these gates.
> **Gates A–E are all M1 launch preconditions**; the sections that follow are the
> standard production checklist. Gate D is owner-gated and has the longest lead
> time, so it starts first even though it is lettered fourth.

---

## Pre-Launch Verification

### ✅ Code & Build

- [ ] All tests passing (`npm test` — 16,599 as of 2026-08-09; the suite mocks Supabase, so green here proves nothing about the database)
- [ ] E2E tests passing (`npm run test:e2e` - 7 suites)
- [ ] Production build succeeds (`npm run build`)
- [ ] No TypeScript errors
- [ ] No ESLint warnings in production code
- [ ] Bundle size is acceptable (< 500KB first load)

### ✅ Environment & Configuration

- [ ] All environment variables set in Vercel Dashboard
- [ ] Supabase production project configured
- [ ] Stripe live keys configured (NOT test keys!)
- [ ] AIML API production key set
- [ ] SendGrid/Email service configured
- [ ] Sentry DSN configured
- [ ] Google Analytics ID set

### ✅ Database

- [ ] All migrations applied to production Supabase
- [ ] RLS policies verified and tested
- [ ] Database backups enabled (PITR for Pro)
- [ ] Connection pooling enabled
- [ ] Indexes created for performance

### ✅ Security

- [ ] HTTPS enforced (Vercel handles this)
- [ ] Security headers configured in `next.config.js`
- [ ] CORS origins restricted to production domain
- [ ] Rate limiting enabled
- [ ] CSRF protection active
- [ ] Input sanitization in place
- [ ] No secrets exposed in client-side code
- [ ] Environment variables are not logged

### ✅ Authentication

- [ ] Supabase Auth site URL set to production domain
- [ ] Redirect URLs configured correctly
- [ ] Email templates customized with branding
- [ ] Password reset flow tested
- [ ] OAuth providers configured (if applicable)

### ✅ Payments (Stripe)

- [ ] Live API keys configured
- [ ] Webhook endpoint registered: `/api/webhooks/stripe`
- [ ] Webhook secret configured
- [ ] All price IDs match live products
- [ ] Subscription flow tested end-to-end
- [ ] Refund process documented

### ✅ Monitoring & Alerting

- [ ] Sentry project created and configured
- [ ] Error alerts enabled
- [ ] Google Analytics tracking
- [ ] Health check endpoint working: `/api/health`
- [ ] Uptime monitoring configured (UptimeRobot/Pingdom)

### ✅ Domain & DNS

- [ ] Domain registered and verified
- [ ] DNS pointing to Vercel
- [ ] SSL certificate active (automatic with Vercel)
- [ ] www redirect configured
- [ ] Email DNS records (SPF, DKIM, DMARC) for SendGrid

### ✅ Legal & Compliance

- [ ] Privacy Policy page complete and linked
- [ ] Terms of Service page complete and linked
- [ ] Cookie consent banner implemented
- [ ] FCRA compliance disclosures in place
- [ ] GDPR compliance (if serving EU users)
- [ ] Contact information visible

### ✅ SEO & Marketing

- [ ] Meta tags on all pages
- [ ] Open Graph images configured
- [ ] robots.txt configured
- [ ] sitemap.xml generated
- [ ] Google Search Console verified
- [ ] Social media links working

---

## Deployment Steps

### Step 1: Final Code Review

```bash
# Run all checks
npm run lint
npm run type-check
npm test
npm run build
```

### Step 2: Deploy to Vercel

```bash
# Option A: Git push (auto-deploy)
git push origin main

# Option B: Vercel CLI
vercel --prod
```

### Step 3: Verify Deployment

1. Check build logs in Vercel Dashboard
2. Test production URL: `https://CPFI.pro`
3. Test authentication flow
4. Test payment flow with a small transaction
5. Verify API endpoints respond correctly

### Step 4: Post-Deploy Verification

- [ ] Homepage loads correctly
- [ ] Login/Register works
- [ ] Dashboard accessible after login
- [ ] Dispute creation works
- [ ] Letter generation works
- [ ] Payment checkout works
- [ ] Mobile app connects to production API

### Step 5: Monitor

1. Watch Sentry for errors (first 24 hours critical)
2. Check Vercel Analytics for performance
3. Monitor Supabase dashboard for database health
4. Review Stripe dashboard for payment issues

---

## Rollback Plan

If critical issues found:

### Quick Rollback (< 5 min)

```bash
# Revert to previous deployment in Vercel Dashboard
# Or via CLI:
vercel rollback
```

### Database Rollback

```bash
# Use Supabase Point-in-Time Recovery
# Or restore from latest backup
```

### Feature Flag Disable

Set in environment variables:

```
ENABLE_MARKETPLACE=false
ENABLE_STUDENT_LOANS=false
ENABLE_AI_CHAT=false
```

---

## Emergency Contacts

| Role             | Contact              |
| ---------------- | -------------------- |
| Tech Lead        | [Add contact]        |
| DevOps           | [Add contact]        |
| Supabase Support | support@supabase.com |
| Vercel Support   | support@vercel.com   |
| Stripe Support   | support@stripe.com   |

---

## Post-Launch Tasks

### Day 1

- [ ] Monitor error rates closely
- [ ] Respond to any user issues
- [ ] Check payment transactions
- [ ] Review performance metrics

### Week 1

- [ ] Gather user feedback
- [ ] Fix any reported bugs
- [ ] Optimize slow queries
- [ ] Review analytics data

### Month 1

- [ ] Feature usage analysis
- [ ] Performance optimization
- [ ] Security audit
- [ ] Plan next release

---

## Revision History

| Date | Change |
|---|---|
| 2026-08-09 | Gates reorganised. M1 verdict corrected to NO-GO. Five stale figures re-measured and replaced (tests 441→16,599; routes 295→305; `npm audit` split out to 18 **production** vulns incl. 1 critical, a split no doc was reporting; schema 200→202 tables). Resolved the "Gates A–C are the M1 preconditions" / "Gate D is M1 scope" contradiction — all are preconditions. Added Gate E (JWT verification proven against a real issuer). Added the brand-gate naming-collision note. Added three new Gate C blockers found by running the app: 68 phantom tables, 12 modules on the session-less anon client, and the false-green `audit:auth`. |
| 2025-12-04 | Version 1.0.0. |

**Last Updated:** 2026-08-09
**Version:** 1.1.0
