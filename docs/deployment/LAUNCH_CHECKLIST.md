# 🚀 CPFI (Credit Pro & Financial Intelligence) - Production Launch Checklist

> **Wave 7 M1 status (2026-07-24): GO WITH CONDITIONS for M1 Closed Beta — NOT "ship ready".**
> The security gate immediately below is BLOCKING and its conditions are unmet today.
> Authoritative verification record: [`docs/qa/qa-report.md`](../qa/qa-report.md).

---

## 🔒 Wave 7 M1 Security Gate — BLOCKING (read before anything else)

Wave 7 remediation closed 26 M1-scope CRITICALs, verified from source (`docs/qa/qa-report.md`).
But the app currently runs on **one** auth-enforcement layer, not the intended two: per-route
`withAuth`/`withRole` guards are LIVE (`audit:auth` reports 295/295 routes wrapped), while the
**middleware deny-by-default backstop is OFF** — feature flag `auth.deny_by_default` seeds `false`
(`src/lib/flags/`, `src/middleware.ts`). This is **FND-001 (INERT_BEHIND_FLAG)**, tracked as
**TASK-AUTH-04-staging**. "Tests green" is NOT clearance for the items below.

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

- [ ] `npm run audit:auth` (`scripts/verify-auth-coverage.ts`) added to CI and **fails the build** on any unclassified route (must stay 295/295)
- [ ] `npm run test:auth-negative` added to CI and **fails the build** if the negative-auth suite drops below its floor (≥568; 611 at last run)
- [ ] Both wired into CI **before** the production flag flip in Gate A

### Gate C — Other operator-gated M1 blockers (detail in `docs/qa/qa-report.md`)

- [ ] **Live/staging schema audit** — payout/affiliate tables + the 5 GDPR-erasure tables are absent from `supabase/migrations/` (schema drift; unverifiable from files)
- [ ] **FND-026 dual payout-rail decision** — merge or explicitly kill one of the two payout codepaths *before* either is wired to a trigger
- [ ] **`main` branch protection** — require PR + review + CODEOWNERS enforcement
- [ ] **`npm audit`** — 32 vulns (1 critical); run `npm audit fix` + assess the critical before public launch
- [ ] **Closed-beta cohort** — invite the limited real-user cohort only after Gates A + B pass

> Passing every box in the generic checklist below does NOT satisfy this gate. Gates A–C are the
> M1 launch preconditions; the sections that follow are the standard production checklist.

---

## Pre-Launch Verification

### ✅ Code & Build

- [ ] All tests passing (`npm test` - 441 tests)
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

**Last Updated:** 2025-12-04
**Version:** 1.0.0
