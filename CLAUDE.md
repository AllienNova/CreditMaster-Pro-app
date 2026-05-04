# CLAUDE.md - Fynvita Pair Programming Guide

> Canonical AI context for the Fynvita platform. All metrics sourced from `docs/ssot/`.
> Last verified: 2026-05-03 | DICE v3.3 | **VERSION-013 — AUDIT-DRIVEN RE-BASELINE**

---

> ## ⚠ STATUS BANNER (2026-05-03)
>
> **The prior "All 7 waves DONE / 125-of-125 / 100%" claim (VERSION-010..012) is invalidated.** A 9-domain comprehensive code review (27 reviewer agents) opened **33 CRITICAL** + 38 HIGH findings. **Ship: BLOCKED** until Wave 7 (Security & Correctness Remediation) closes.
>
> Pre-launch context: no live users yet, so no GDPR Art. 33 / CCPA disclosure obligation triggered today. Re-evaluate before public launch.
>
> See `docs/ssot/gap_analysis.md` (71-finding register) and `docs/ssot/MASTER-IMPLEMENTATION-PLAN.md` § Wave 7 (59 tasks across 8 phases).
>
> **First-fix template** (already shipped): commit `d64e8d5` — atomic Postgres RPC + `UNIQUE` constraint + `REVOKE EXECUTE FROM PUBLIC; GRANT TO service_role`. Reuse for invoice.paid idempotency, atomic referral-code increment, and other read-modify-write replacements.

---

## 1. Quick Context

| Field | Value |
|-------|-------|
| **Project** | Fynvita - Your Financial Vitality Platform |
| **Repository** | `github.com/AllienNova/CreditMaster-Pro-app` |
| **Brand** | Fynvita (formerly CPFI / CreditMaster Pro) — pre-launch, branded as financial-education company |
| **Phase** | **Wave 7 (Remediation) opened 2026-05-03**. Waves 0-6 prior tasks marked NEEDS_VERIFICATION pending re-audit. |
| **Quality** | **9/9 domains FAIL audit** (33 CRITICAL + 38 HIGH open) — see `docs/ssot/gap_analysis.md` |
| **Canonical Docs** | `docs/ssot/SSOT.md` (single source of truth); `docs/ssot/gap_analysis.md` (audit findings) |

---

## 2. Tech Stack

### Web Application

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15.5.6 (App Router) |
| **UI** | React 19.0, TypeScript 5.7.2 (strict), Tailwind CSS |
| **Backend** | Next.js API Routes (serverless) |
| **Database** | Supabase PostgreSQL + Auth + RLS |
| **Runtime** | Node.js 20.19.5 (nvm) |
| **Payments** | Stripe (subscriptions + webhooks) |
| **Email** | Resend |
| **Storage** | AWS S3 (presigned URLs) |
| **AI** | AIML API (300+ models) |

### Mobile Application

| Layer | Technology |
|-------|-----------|
| **Framework** | Expo SDK 52.0.49 / React Native 0.76.9 |
| **Navigation** | expo-router 4.0.22 (file-based) |
| **State** | Zustand (8 stores) |
| **Charts** | react-native-gifted-charts |

### Testing

| Tool | Purpose |
|------|---------|
| **Jest** | Unit + integration (504 suites, 13,585 cases, 508 test files) |
| **Cypress** | E2E (21 specs) |
| **Playwright** | E2E + visual (16 specs) |

---

## 3. Codebase Metrics

> Source: `docs/ssot/health_metrics.md` (2026-03-02, live verification)

| Metric | Value |
|--------|-------|
| **Total Files (src/)** | 1,833 |
| **Source Files (excl. tests)** | 1,325 |
| **Lines of Code** | 846,417 |
| **Test Files (Jest web)** | 508 |
| **Test Files (all frameworks)** | 576 (Jest 508 + mobile 31 + Cypress 21 + Playwright 16) |
| **API Routes** | 284 (42 domains) |
| **Pages** | 199 |
| **Components** | 309 |
| **Layouts** | 11 |
| **Library Dirs** | 55 |
| **Custom Hooks** | 29 |
| **DB Migrations** | 30 |
| **Mobile App Source** | 141 |
| **Mobile App Routes** | 257 (37 route groups) |
| **Documentation Files** | 134 |

---

## 4. Directory Structure

```
src/
  app/                  # Next.js App Router
    api/                # 284 API routes (42 domains)
      admin/            # Admin CRUD, auth, metrics, analytics
      financial/        # Budgets, bills, credit, debt, goals, income, savings, spending, transactions
      documents/        # Upload, CRUD
      notifications/    # CRUD, push, preferences
      trading/          # Orders, positions, watchlist, paper trading
    (pages)/            # 199 pages
  components/           # 309 components
    financial/          # Dashboard, budgets, bills, goals, savings, spending, debt
    aiml/               # Chat, CreditAnalyzer, DisputeGenerator
  lib/                  # 55 library directories
    financial/          # Core financial services
    trading/            # PCTT architecture (brokers, pipeline, ai-agents, paper, positions, realtime)
    security/           # Input/output validation, auth, audit, rate limiting
    compliance/         # GDPR/CCPA, PII protection
    commerce/           # Payments, payouts, affiliate, matching, offers
    auth/               # Authentication services
    notifications/      # Notification services
    documents/          # Document services
    goals/              # Goal services
    email/              # Email services
  hooks/                # 29 custom hooks
  types/                # TypeScript type definitions
mobile-app/             # Expo/React Native
  app/                  # 257 routes (37 route groups)
    (auth)/             # Authentication screens
    (tabs)/             # Tab navigation (investments, etc.)
    coach/              # Financial coach
    financial-intelligence/
    investments/        # Holdings, watchlist, analysis
  src/
    store/              # 8 Zustand stores
    data/               # Static data
supabase/
  migrations/           # 30 migration files
```

---

## 5. Key Architecture Patterns

### 3-Layer AI Architecture
`AIMLService` (raw API) -> `ModelRouter` (model selection by task/cost/quality) -> `AIOrchestrator` (workflows: disputes, credit analysis, consensus)

### 5-Layer Security
Auth Middleware -> Input Validation (prompt injection, PII detection) -> RBAC (4 roles: user/premium/admin/super_admin, 14 categories, 100+ permissions) -> Output Validation -> Audit Logging

### Trading PCTT Architecture
Pivot-Constrained Trendline Trading: 4-tier architecture (Client → Vercel → Fly.io Trading Service → External APIs). 7-stage pipeline: Regime Detection → Pivot Identification → Trendline Construction → Signal Generation → Confluence Scoring → Risk Assessment → Trade Recommendation. 3 modes: WATCH → GUIDED → AUTONOMOUS. 7 AI agents, 10 pre-built strategies, 30-law compliance engine, 3-gate risk gateway + 5 circuit breakers.

### API Route Pattern
Every route follows: Authenticate -> Authorize (RBAC) -> Validate Input -> Business Logic -> Audit Log -> Response

### Service Layer Pattern
Singleton classes exported as default instances. Types co-located. Errors logged with context.

### Mobile State Management
8 Zustand stores: auth, credit, dashboard, dispute, financial, gamification, investment, notification

### Database Pattern
Supabase PostgreSQL with Row-Level Security (RLS). 30 migrations. All queries parameterized.

---

## 6. Development Commands

```bash
# Development
npm run dev                    # Start Next.js dev server (port 3000)
npm run build                  # Production build
npm run lint                   # ESLint via next lint
npx tsc --noEmit               # Type check (strict mode)

# Testing
npm test                       # Run all Jest tests
npm test -- --coverage         # Tests with coverage report
npm test -- path/to/file       # Run specific test file
npx cypress run                # Cypress E2E (headless)
npx playwright test            # Playwright E2E

# Security
npm audit                      # Dependency vulnerability scan

# Mobile
cd mobile-app && npx expo start  # Start Expo dev server
```

---

## 7. Environment Variables

| Variable | Purpose | Prefix |
|----------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Client |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server only) | Server |
| `AIML_API_KEY` | AIML API access (300+ models) | Server |
| `AIML_API_URL` | AIML API endpoint | Server |
| `STRIPE_SECRET_KEY` | Stripe payments | Server |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification | Server |
| `RESEND_API_KEY` | Email delivery | Server |
| `AWS_ACCESS_KEY_ID` | S3 file storage | Server |
| `AWS_SECRET_ACCESS_KEY` | S3 file storage | Server |
| `AWS_S3_BUCKET` | S3 bucket name | Server |
| `AWS_REGION` | AWS region | Server |
| `PLAID_CLIENT_ID` | Plaid bank linking | Server |
| `PLAID_SECRET` | Plaid secret | Server |
| `ALPACA_API_KEY` | Alpaca trading broker | Server |
| `DRIVEWEALTH_API_KEY` | DriveWealth fractional trading (Wave 6) | Server |
| `DRIVEWEALTH_API_URL` | DriveWealth API endpoint (Wave 6) | Server |
| `MONEYLION_API_KEY` | Engine by MoneyLion affiliate (Wave 6) | Server |

---

## 8. Testing

### Current State (2026-03-02)

| Metric | Value |
|--------|-------|
| **Test Suites** | 504 passed, 2 skipped, 506 total |
| **Test Cases** | 13,585 passed, 19 skipped, 13,604 total |
| **Pass Rate** | 99.86% |
| **Failures** | 0 |
| **Execution Time** | ~15s |

### Coverage by Domain

| Domain | Status | Notes |
|--------|--------|-------|
| Financial Services | PASS (>=80%) | 45+ test files |
| Trading Engine | PASS (>=80%) | 15+ test files (was ~60%, TASK-TRD-07 DONE) |
| Credit Services | PASS (>=80%) | 8+ test files |
| Investment Services | PASS (>=80%) | 6+ test files |
| Security/Auth | PASS (>=80%) | 10+ test files |
| Notifications | PASS (>=80%) | 5+ test files (was ~50%, TASK-NTF-03 DONE) |
| Admin | PASS (>=80%) | 8+ test files (was ~50%, TASK-ADM-03 DONE) |
| Components (UI) | PASS (>=70%) | 40+ test files |
| API Routes | PASS (>=80%) | 80+ test files |
| Mobile App | NOT STARTED (0%) | TASK-MOB-01 (Wave 4) |

### Test File Location
Tests are co-located: `src/**/__tests__/*.test.ts(x)` alongside their source modules.

---

## 9. Quality Gates

Run in order after any code change:

```
1. LINT     npm run lint              # 0 blocking errors (7 non-blocking, 841 warnings)
2. TYPES    npx tsc --noEmit          # 0 errors (production + test)
3. TEST     npm test                  # 13,585 passing, 0 failures
4. BUILD    npm run build             # SUCCESS, 539 kB first load JS
5. SECURITY npm audit                 # 0 production vulns (2 low dev-only)
6. AUDIT    9-domain code review      # FAIL — 33 CRITICAL + 38 HIGH (Wave 7)
```

### Quality Scorecard (VERSION-013, 2026-05-03)

| Gate | Status | Notes |
|------|--------|-------|
| Tests Pass (0 failures) | PASS | But did not catch any of the 33 CRITICAL audit findings |
| Type Safety (0 prod errors) | PASS | |
| Build Succeeds | PASS | |
| Lint Clean (0 blocking) | PASS | |
| Security (0 prod vulns) | PASS | npm audit clean; audit-driven CRITICALs are code-level not deps |
| Coverage >=80% (overall) | PASS | Coverage measures presence of tests, not negative-auth tests |
| Coverage >=80% (per-domain) | PASS (web domains) | |
| Mobile Coverage | FAIL (0%) | TASK-MOB-01..07 in Wave 7 |
| **Per-domain audit (NEW)** | **FAIL (9/9)** | **Auth, Payments, Commerce, Financial, Investments, Notifications, Admin, AI+Compliance, Mobile** |
| **33 CRITICAL findings open** | **FAIL** | **See `docs/ssot/gap_analysis.md`** |

**Overall: RED (web + mobile)**. Ship: BLOCKED until Wave 7 closes.

---

## 10. Pricing Model (6 Tiers)

| Tier | Price | Key Features |
|------|-------|-------------|
| Free | $0 | Credit score (1 bureau), basic budgeting, 10 AI chats/mo |
| Standard | $29.99/mo | All 3 bureaus, 10 AI disputes/mo, smart budgeting, debt strategies |
| Pro | $99.99/mo | Unlimited disputes, bill negotiation, investment suite, 24/7 AI coach |
| Family Duo | $159.99/mo | 2 members, all Pro features, shared goals, joint account tracking |
| Family | $199.99/mo | 3 members, all Pro features, kids education, college savings |
| Family Plus | $399.99/mo | 5 members, all Pro features, estate planning, premium support |

---

## 11. Current Build Plan

8 waves now (Wave 7 opened 2026-05-03 in response to comprehensive audit). Task IDs follow `TASK-{DOMAIN}-{NN}` pattern.

| Wave | Focus | Status | Tasks |
|------|-------|--------|-------|
| 0 | Foundation fixes | DONE (NEEDS_VERIFICATION) | INF-01 through INF-10, SEC-01 |
| 1 | Core gaps | DONE (NEEDS_VERIFICATION — TRD-07, NTF-03, ADM-03 reopened) | TRD-07, NTF-03, ADM-03, coverage gates |
| 2 | Financial depth | DONE (NEEDS_VERIFICATION) | Bill negotiation, savings, debt |
| 3 | Trading + Commerce | DONE (NEEDS_VERIFICATION — commerce reopened) | PCTT, paper trading, marketplace |
| 4 | Mobile + Platform | DONE (NEEDS_VERIFICATION — mobile reopened) | Gamification, onboarding, mobile parity |
| 5 | Scale + Polish | DONE (NEEDS_VERIFICATION) | Performance, monitoring, white-label |
| 6 | External Integrations | DONE | Plaid SDK, DriveWealth, Affiliate (13 tasks) |
| **7** | **Security & Correctness Remediation** | **NOT_STARTED** | **59 tasks across 8 phases — see MASTER-IMPLEMENTATION-PLAN.md** |

### Wave 7 — Security & Correctness Remediation

| Phase | Focus | Task IDs |
|-------|-------|----------|
| 0 | Prereqs (re-baseline, branch policy, feature flags, lint guards, branch hygiene on `feat/asset-system-regen`) | TASK-PRE-01..06 |
| 1 | Auth/RBAC rebuild (remove `user_metadata` role, remove admin email whitelist, wire 284 routes through existing `withAuth`, middleware deny-by-default with `PUBLIC_ROUTES.ts`, kill AIML key reuse, single rate limiter) | TASK-AUTH-01..12 |
| 2 | Webhook idempotency + tier mapping (`processed_webhook_events` UNIQUE table; fix `getTierFromPriceId`; remove `billing-profile-store` mock; rethrow swallowed errors; server-authoritative checkout fields) | TASK-WBH-01..07 |
| 3 | Money correctness (Stripe payout cents conversion, atomic `increment_referral_use` RPC, self-referral guard, `Idempotency-Key` on transfers, `Money` branded type) | TASK-MNY-01..07 |
| 4 | Mock-data sweep (admin analytics, billing profile, debt API, AI insights, mobile dispute screen; lint rule escalation) | TASK-MOK-01..06 |
| 5 | Compliance + AI hygiene (consent persistence, breach notification wiring, GDPR cascade table expansion, ModelRouter enforcement, PII redaction) | TASK-CMP-01..05 |
| 6 | Mobile hardening (SecureStore migration, `Linking.openURL` allowlist, `npm audit fix`, delete deprecated `financialStore`, remove `__DEV__` auth bypass) | TASK-MOB-01..07 |
| 7 | IDOR sweep (audit script + portfolio/plaid/notification/admin fixes) | TASK-IDR-01..05 |

### Critical findings to know about (full list: `docs/ssot/gap_analysis.md`)

- **FND-001** middleware whitelists ALL `/api/*`; only 4 of 118 routes use `withAuth`
- **FND-005** `getUserRole` reads `user_metadata.role` → user can self-grant admin
- **FND-003/004** hardcoded admin emails + enterprise tier = admin
- **FND-024** Stripe payout sends dollars as cents → 1% of intended payout (live financial loss before launch)
- **FND-018** `getTierFromPriceId` references nonexistent env vars → every paid sub silently lands on `free`
- **FND-014/015** `handleInvoicePaid` swallows errors silently → no Stripe retry on transient failures
- **FND-016/017** `billing-profile-store` returns fake Visa 4242 to every new user; `updatePlan` activates without calling Stripe
- **FND-030** `portfolio-service` deliberately omits `user_id` filter → IDOR on holdings/P&L for any authenticated user
- **FND-041..044** all 4 `/api/notifications/*` routes accept `userId` from body/query with no auth
- **FND-049..053** admin endpoints unauth'd; `analytics` returns `Math.random()`; mock data on DB error
- **FND-056..058** GDPR breach notification is a no-op; consent stored in process-local Map; cascade-delete missing ~34 tables
- **FND-064** mobile `__DEV__` auth bypass — one bad EAS flag from shipping fully-authenticated mock user

### Wave 6 Breakdown (13 tasks)

| Stream | Tasks | Focus |
|--------|-------|-------|
| Plaid Integration | PLD-01 through PLD-05 | Full SDK, webhooks, mobile, investments, income |
| Broker Expansion | TRD-15 through TRD-18 | DriveWealth, multi-broker router, fractional, KYC |
| Affiliate Monetization | AFF-01 through AFF-04 | Engine by MoneyLion, credit cards, insurance, compliance |

### Task Completion Status (Re-baselined 2026-05-03, VERSION-013)

> Prior "125/125 DONE / 100%" status was invalidated by the 9-domain audit. All 125 originals are NEEDS_VERIFICATION pending TASK-PRE-01 re-run; Wave 7 adds 59 new remediation tasks.

| Wave | Status | Count |
|------|--------|------:|
| 0-6 (originals) | NEEDS_VERIFICATION (some REOPENED) | 125 |
| 7 (Security & Correctness Remediation) | NOT_STARTED | 59 |
| **Total** | **mixed** | **184** |

---

## 12. Known Issues

| Issue | Severity | Location | Notes |
|-------|----------|----------|-------|
| ~~3 TS2556 errors~~ | ~~Low~~ | ~~Test files~~ | **FIXED** (2026-02-25) — removed unnecessary spread wrappers |
| 7 ESLint errors | Low | Non-blocking | Build succeeds |
| 841 ESLint warnings | Info | Legacy code | `no-explicit-any`, `no-unused-vars`, `display-name` |
| ~~`systeminformation` CVE~~ | ~~Critical~~ | ~~Dev-only~~ | **FIXED** (2026-02-25) — resolved via `npm audit fix` |
| `cookie` in `msw` | Low | Test-only | Mock Service Worker dep; requires breaking change to fix |
| Mobile test coverage 0% | High | `mobile-app/` | Tracked as TASK-MOB-01 (Wave 4) |

---

## 13. Canonical Documentation

All truth lives in `docs/ssot/`. When in doubt, these files win over CLAUDE.md.

| File | Purpose |
|------|---------|
| `docs/ssot/SSOT.md` | Single Source of Truth (master reference) |
| `docs/ssot/system_blueprint.md` | Architecture, security, data, trading, DevOps |
| `docs/ssot/health_metrics.md` | Quality scorecard (test/lint/build/security) |
| `docs/ssot/MASTER-IMPLEMENTATION-PLAN.md` | All 125 task cards with dependencies |
| `docs/ssot/gap_analysis.md` | Coverage gaps and remediation |
| `docs/ssot/build_order_blueprint.md` | Wave sequencing and gate criteria |
| `docs/ssot/traceability_matrix.md` | Requirement-to-implementation tracing |
| `docs/ssot/dependency_analysis.md` | Module dependency graph |
| `docs/ssot/ui_design.md` | Design system and component specs |
| `docs/ssot/architecture.md` | High-level architecture diagrams |

---

## 14. Pair Programming Notes

### Context Loading
- Read `docs/ssot/SSOT.md` first for any architectural question
- Read `docs/ssot/health_metrics.md` for current quality state
- Read `docs/ssot/MASTER-IMPLEMENTATION-PLAN.md` for task assignments

### Code Conventions
- TypeScript strict mode, no `any` (use `unknown` + type guards)
- `const` over `let`, never `var`
- `@/` path alias for all imports
- Co-located tests: `__tests__/` next to source
- Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`

### Common Gotchas
- Supabase client uses `createClient` from `@supabase/supabase-js` (not a custom wrapper -- `src/lib/supabase.ts` was deleted)
- Mobile stores are Zustand (not Redux) -- 8 stores in `mobile-app/src/store/`
- Trading uses Alpaca and DriveWealth brokers with multi-broker routing -- API keys required for live tests (skipped in CI)
- AIML API key required for AI features -- tests mock the service layer
- All 19 skipped tests are environment-dependent (live API keys), not flaky

---

_Sourced from SSOT verified 2026-03-02 (VERSION-012). Update this file when SSOT changes._
