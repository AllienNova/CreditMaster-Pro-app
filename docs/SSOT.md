# Single Source of Truth (SSOT) — Fynvita Platform

> **The authoritative reference for all platform facts, metrics, architecture, and status.**
> Generated from full codebase analysis. If this document conflicts with any other doc, THIS document is correct.
> Last Updated: 2026-02-16

---

## 1. Project Identity

| Field | Value |
|-------|-------|
| **Name** | Fynvita — Your Financial Vitality |
| **Repository** | https://github.com/AllienNova/CreditMaster-Pro-app |
| **Description** | AI-powered credit health, financial wellness, and investment intelligence platform |
| **Version** | 1.0.0 |
| **License** | Private |
| **Brand** | Fynvita (formerly CPFI / CreditMaster Pro) |
| **Domain** | fynvita.com |

---

## 2. Technology Stack

### 2.1 Core Framework

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | ^15.5.6 |
| UI Library | React | ^19.0.0 |
| Language | TypeScript (strict mode) | ^5.7.2 |
| Styling | Tailwind CSS | ^3.4.19 |
| Runtime | Node.js | 22.13+ |

### 2.2 Backend & Data

| Service | Technology | Version | Purpose |
|---------|-----------|---------|---------|
| Database | Supabase PostgreSQL | ^2.89.0 | Primary data store |
| Auth | Supabase Auth + SSR | ^0.7.0 | Authentication, JWT, MFA |
| File Storage | AWS S3 | ^3.917.0 | Document uploads |
| Payment | Stripe | ^19.1.0 | Subscriptions, checkout |
| Email | Resend | ^6.2.2 | Transactional email |
| AI Gateway | AIML API (OpenAI SDK) | ^4.77.3 | 300+ AI model access |

### 2.3 Frontend Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| Framer Motion | ^12.29.0 | Animations |
| Recharts | ^3.5.1 | Data visualization |
| Lightweight Charts | ^5.1.0 | Trading charts |
| Lucide React | ^0.563.0 | Icons |
| TanStack React Query | ^5.90.16 | Server state management |
| Zod | ^3.25.76 | Runtime validation |
| date-fns | ^4.1.0 | Date utilities |

### 2.4 Testing Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Jest | ^30.2.0 | Unit + Integration tests |
| Cypress | ^15.5.0 | E2E (API + route validation) |
| Playwright | ^1.57.0 | E2E (browser journeys) |
| Testing Library | ^16.3.0 | Component testing |
| MSW | ^1.3.3 | API mocking |

### 2.5 Build & Quality

| Tool | Version | Purpose |
|------|---------|---------|
| ESLint | ^9.18.0 | Linting |
| ts-jest | ^29.4.5 | TypeScript test transform |
| PostCSS | ^8.5.6 | CSS processing |
| Autoprefixer | ^10.4.23 | CSS compatibility |

---

## 3. Codebase Metrics (Verified)

| Metric | Value | Source |
|--------|-------|--------|
| Total source files (src/) | 1,296 | `find src -name "*.ts" -o -name "*.tsx" \| wc -l` |
| Total lines of code | 79,612 | `wc -l` on all .ts/.tsx files |
| API route files | 248 | `find src/app/api -name "route.ts" \| wc -l` |
| Page files (page.tsx) | 180 | `find src/app -name "page.tsx" \| wc -l` |
| Component files (.tsx) | 225 | `find src/components -name "*.tsx" \| wc -l` |
| Layout files (layout.tsx) | 7 | `find src/app -name "layout.tsx" \| wc -l` |
| Library directories (src/lib/) | 51 | `find src/lib -mindepth 1 -maxdepth 1 -type d` |
| Test files (Jest — web) | 149 | .test.ts + .test.tsx under src/ |
| Test files (Jest — mobile) | 12 | .test.ts + .test.tsx under mobile-app/src/ |
| Test files (Cypress) | 21 | .cy.ts under cypress/e2e/ |
| Test files (Playwright) | 16 | .spec.ts under e2e/ |
| Total test files | 198 | Sum of all test frameworks |
| Estimated test cases | ~1,300+ | Sum of it()/test() calls across all test files |
| Documentation files | 95 | Markdown files in docs/ + root |
| npm dependencies | 28 | package.json dependencies |
| npm devDependencies | 22 | package.json devDependencies |

---

## 4. Architecture Overview

### 4.1 System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                         │
│  180 pages · 225 components · Tailwind CSS · Framer Motion  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               NEXT.JS 15.5 APP ROUTER (Vercel)              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Middleware (src/middleware.ts)                         │ │
│  │  CORS · Auth · Admin RBAC · Security Headers · CSP     │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Server      │  │ Client       │  │ API Routes       │   │
│  │ Components  │  │ Components   │  │ (248 endpoints)  │   │
│  │ (Layouts,   │  │ (Interactive │  │ 41 domains       │   │
│  │  Pages)     │  │  UI, Forms)  │  │                  │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   SECURITY   │  │   BUSINESS   │  │  MONITORING  │
│    LAYER     │  │    LOGIC     │  │    LAYER     │
│              │  │   (51 lib    │  │              │
│ input-val.   │  │  directories)│  │ logger.ts    │
│ output-val.  │  │              │  │ metrics.ts   │
│ rate-limit   │  │ AI services  │  │ audit-log    │
│ auth-mw      │  │ Financial    │  │ health       │
│ pii-protect  │  │ Trading      │  │              │
│ csrf         │  │ Credit       │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
          ┌───────┬────────┼────────┬───────┐
          ▼       ▼        ▼        ▼       ▼
     ┌────────┐┌───────┐┌──────┐┌──────┐┌──────┐
     │ AIML   ││Supa-  ││Stripe││ AWS  ││Resend│
     │ API    ││base   ││      ││ S3   ││      │
     │300+    ││Auth+DB││Pay   ││Files ││Email │
     │models  ││       ││      ││      ││      │
     └────────┘└───────┘└──────┘└──────┘└──────┘
```

### 4.2 Request Flow

1. **Browser** → Next.js middleware (CORS, auth check, security headers)
2. **Middleware** → Route handler (Server Component or API Route)
3. **API Route** → Auth middleware → Input validation → Business logic
4. **Business Logic** → External service (Supabase, Stripe, AIML, S3)
5. **Response** → Output validation → Audit logging → Client

### 4.3 Authentication Flow

```
User → Login Page → Supabase Auth (email/password, OAuth, MFA)
  → JWT Token → @supabase/ssr cookie management
  → Middleware validates session on each request
  → Protected routes redirect to /login (307)
  → Admin routes require admin/super_admin role
```

### 4.4 AI Architecture (3-Layer)

```
Layer 1: AIMLService (src/lib/aiml-service.ts)
  → Direct AIML API wrapper: chat, image, voice, embeddings
  → Model catalog: 300+ models from 8+ providers

Layer 2: ModelRouter (src/lib/model-router.ts)
  → Intelligent model selection based on task type
  → 13 task types: dispute_generation, credit_analysis, chat, etc.
  → Cost/quality/speed optimization

Layer 3: AIOrchestrator (src/lib/ai-orchestrator.ts)
  → High-level workflows: dispute generation, credit analysis
  → Multi-model consensus for critical decisions
  → Chain-of-thought and few-shot prompt strategies
```

---

## 5. API Route Inventory (248 Routes across 41 Domains)

| Domain | Routes | Key Endpoints |
|--------|--------|--------------|
| financial | 64 | Budgeting, calculators, goals, insights, transactions, recurring, net-worth |
| investments | 27 | Portfolio analysis, holdings, risk assessment, recommendations |
| ai | 23 | Chat, consensus, credit analysis, dispute generation, recommendations |
| credit-repair | 13 | Disputes, score, quick-wins, goodwill, impact, timeline |
| marketplace | 12 | Products, listings, reviews, categories |
| admin | 10 | Users, analytics, settings, system management |
| disputes | 9 | CRUD, generate, status tracking, bureau submissions |
| trading | 6 | Orders, positions, strategies, market data |
| credit-monitoring | 5 | Alerts, score history, reports, monitoring |
| credit-builder | 5 | Plans, progress, accounts, recommendations |
| gamification | 5 | Achievements, leaderboard, challenges, rewards |
| notifications | 5 | CRUD, preferences, push, mark-read |
| auth | 5 | Login, signup, callback, reset-password, session |
| analytics | 5 | Dashboard, events, reports, user-activity |
| payment | 4 | Checkout, webhook, subscription, portal |
| monitoring | 4 | Health, metrics, logs, status |
| cron | 4 | Scheduled jobs: cleanup, sync, notifications, reports |
| credit-bureau | 4 | Reports, disputes, score-factors, inquiries |
| chat | 4 | Messages, history, context, sessions |
| tax | 3 | Optimization, documents, estimates |
| student-loans | 3 | Data, strategy, federal programs |
| federal | 3 | Programs, eligibility, applications |
| documents | 3 | CRUD, upload, download |
| servicers | 2 | Loan servicer data, contact info |
| ml | 2 | Predictions, model status |
| credit | 2 | Score, analyze |
| automation | 2 | Rules, triggers |
| Other (14 domains) | 14 | ws, voice, user, test-db, strategies, settings, profile, performance, onboarding, health, federal-programs, email, csrf, credit-report |

---

## 6. Subscription & Pricing Model

| Tier | Monthly | Annual (monthly) | Users | Disputes | AI Messages | Key Features |
|------|---------|------------------|-------|----------|-------------|-------------|
| **Free** | $0 | $0 | 1 | 0 | 10 | Basic credit monitoring, budgeting |
| **Standard** | $29.99 | ~$29.09 (3% off) | 1 | 5 | 100 | Full credit health + financial wellness |
| **Pro** | $99.99 | ~$91.99 (8% off) | 1 | Unlimited | Unlimited | + Investment intelligence + AI coach |
| **Family Duo** | $159.99 | ~$131.19 (18% off) | 2 | Unlimited | Unlimited | All Pro features for 2 members |
| **Family** | $199.99 | ~$163.99 (18% off) | 3 | Unlimited | Unlimited | All Pro features for 3 members |
| **Family Plus** | $399.99 | ~$327.99 (18% off) | 5 | Unlimited | Unlimited | Premium perks for 5 members |

**Payment Processor**: Stripe (checkout sessions, webhooks, subscription lifecycle)
**Stripe Events Handled**: subscription.created/updated/deleted, invoice.paid/payment_failed, payment_intent.succeeded

---

## 7. Security Architecture

### 7.1 Middleware (src/middleware.ts)

- **Public routes**: `/`, `/login`, `/signup`, `/pricing`, `/about`, `/contact`, `/credit/factors`, auth callbacks
- **Protected routes**: Everything else → 307 redirect to `/login`
- **Admin routes**: `/admin/*` → requires `admin` or `super_admin` role
- **CORS**: Whitelisted origins (localhost:3000/3001, fynvita.com, app.fynvita.com)
- **Methods**: GET, POST, PUT, DELETE, PATCH, OPTIONS
- **Security Headers**: CSP, X-Frame-Options (DENY), HSTS, X-Content-Type-Options

### 7.2 Security Services (src/lib/security/)

| Service | File | Lines | Responsibility |
|---------|------|-------|---------------|
| Input Validation | input-validation.ts | ~325 | Prompt injection detection, PII detection, content sanitization |
| Output Validation | output-validation.ts | ~341 | Harmful content filtering, PII leakage prevention |
| Rate Limiting | rate-limiting.ts | ~387 | Per-IP, per-user throttling with cost tracking (in-memory Map) |
| Auth Middleware | auth-middleware.ts | ~400 | JWT authentication, RBAC with 100+ permissions across 14 categories |
| Audit Logging | audit-logging.ts | ~501 | Security event logging, AI interaction tracking (in-memory, last 10K) |

### 7.3 Compliance (src/lib/compliance/)

| Service | File | Lines | Responsibility |
|---------|------|-------|---------------|
| GDPR/CCPA | gdpr-ccpa.ts | ~450 | Data export, deletion, consent management |
| PII Protection | pii-protection.ts | ~400 | PII detection, encryption, masking |

### 7.4 RBAC Model

**Roles**: `user` → `premium` → `admin` → `super_admin`

**Permission Categories** (14): credit, disputes, documents, payments, ai, admin, analytics, notifications, settings, investments, trading, marketplace, gamification, compliance

### 7.5 Known Security Findings

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| SEC-01 | Rate limiter uses in-memory Map (resets on restart) | MEDIUM | Open |
| SEC-02 | PII detection is regex-based (may miss edge cases) | LOW | Accepted |
| SEC-03 | No DAST scanning in CI | MEDIUM | Open |
| SEC-04 | Audit logs stored in-memory (lost on restart) | MEDIUM | Open |
| SEC-05 | CSP allows external domains (Stripe, Plaid, Supabase, AIML) | LOW | Accepted |
| SEC-06 | No secret rotation schedule | LOW | Open |
| SEC-07 | MFA WebAuthn placeholder (TOTP works) | LOW | Open |

---

## 8. Page Inventory (180 pages across ~30 domains)

| Domain | Pages | Key Screens |
|--------|-------|-------------|
| Financial | ~25 | Budgeting, calculators, goals, insights, transactions, bills |
| Dashboard | ~14 | Main dashboard, widgets, overview, activity |
| Credit Builder | ~16 | Plans, progress, accounts, recommendations |
| Admin | ~12 | User management, analytics, settings, moderation |
| Marketplace | ~12 | Browse, listings, product detail, reviews, categories |
| Investments | ~10 | Portfolio, holdings, analysis, recommendations |
| Auth | ~8 | Login, signup, reset-password, callback, MFA |
| Credit Repair | ~8 | Disputes, timeline, letters, results |
| Settings | ~7 | Profile, preferences, notifications, security, billing |
| Onboarding | ~5 | Welcome, profile setup, goals, quiz |
| Disputes | ~5 | List, detail, create, status, history |
| Analytics | ~5 | Reports, trends, insights, export |
| Tax | ~4 | Optimization, documents, estimates, planning |
| Budgeting | ~4 | Overview, categories, transactions, goals |
| Trading | ~3 | Dashboard, orders, positions |
| Billing | ~3 | Subscription, invoices, payment methods |
| Help | ~3 | FAQ, support, contact |
| Other | ~36 | Pricing, landing, credit factors, gamification, student loans, etc. |

---

## 9. Component Inventory (225 components across ~40 directories)

| Category | Count | Key Components |
|----------|-------|---------------|
| Financial | ~48 | Calculators, charts, transaction lists, budget views |
| UI (shared) | ~20 | Buttons, cards, modals, forms, inputs, loading |
| Investments | ~20 | Portfolio cards, holdings table, risk meter |
| Credit Repair | ~10 | Dispute forms, timeline, letter preview |
| Charts | ~9 | Line, bar, pie, area, sparkline, candlestick |
| Auth | ~9 | Login form, signup form, MFA, social auth |
| Trading | ~8 | Order form, position cards, market data |
| Disputes | ~8 | Dispute card, status badge, bureau selector |
| Documents | ~6 | Upload form, file list, preview |
| Notifications | ~6 | Bell icon, notification list, preferences |
| Gamification | ~6 | Achievement badges, leaderboard, progress |
| AI/ML | ~5 | AIChat, CreditAnalyzer, DisputeGenerator, LoanCalculator |
| Chat | ~5 | Message bubble, input, history, context |
| Layout | ~5 | Navbar, sidebar, footer, header |
| Onboarding | ~5 | Welcome wizard, profile form, goal selector |
| Other | ~55 | Admin, marketplace, student loans, settings, etc. |

---

## 10. Library & Service Inventory (328 files across 51 directories)

### 10.1 Core AI Services

| Module | Directory | Key Files | Responsibility |
|--------|-----------|-----------|---------------|
| AIML Service | src/lib/aiml-service.ts | 1 file, ~400 lines | Direct AIML API wrapper (chat, image, voice, embeddings) |
| Model Router | src/lib/model-router.ts | 1 file, ~300 lines | Intelligent model selection (13 task types) |
| AI Orchestrator | src/lib/ai-orchestrator.ts | 1 file, ~600 lines | High-level AI workflows, multi-model consensus |
| AI Module | src/lib/ai/ | ~11 files | AI utilities, model configs, prompt helpers |
| Prompts | src/lib/prompts/ | ~5 files | Advanced prompt templates (dispute, credit, etc.) |

### 10.2 Business Logic

| Module | Directory | Files | Responsibility |
|--------|-----------|-------|---------------|
| Financial | src/lib/financial/ | ~35 | Budgeting, calculators, bills, insights |
| Investments | src/lib/investments/ | ~27 | Portfolio analysis, risk, recommendations |
| Trading | src/lib/trading/ | ~30 | Orders, positions, strategies, market data |
| Credit Repair | src/lib/credit-repair/ | ~14 | Dispute lifecycle, bureau communication |
| Credit Bureau | src/lib/credit-bureau/ | ~8 | Score factors, report parsing |
| Credit Builder | src/lib/credit-builder/ | — | Credit building plans and tracking |
| Credit Monitoring | src/lib/credit-monitoring/ | — | Score alerts, report monitoring |
| Disputes | src/lib/disputes/ | ~5 | Dispute tracking service (~653 lines) |
| Tax | src/lib/tax/ | ~12 | Optimization, compliance, documents |
| Gamification | src/lib/gamification/ | ~9 | Achievements, leaderboard, challenges |
| Marketplace | src/lib/marketplace/ | — | Product listings, transactions |
| Student Loans | src/lib/student-loan-agent/ | ~5 | Loan analysis, federal regulations, strategy |
| Commerce | src/lib/commerce/ | ~12 | E-commerce, cart, orders |

### 10.3 Infrastructure Services

| Module | Directory | Files | Responsibility |
|--------|-----------|-------|---------------|
| Auth | src/lib/auth/ | ~12 | Session management, JWT, MFA, RBAC |
| Security | src/lib/security/ | ~11 | Input/output validation, rate limiting, audit |
| Compliance | src/lib/compliance/ | ~5 | GDPR/CCPA, PII protection |
| Payment | src/lib/payment/ | ~5 | Stripe service (~610 lines) |
| Notifications | src/lib/notifications/ | ~5 | Email, push, in-app (~565 lines) |
| Documents | src/lib/documents/ | ~5 | S3 upload/download (~456 lines) |
| Monitoring | src/lib/monitoring/ | ~8 | Logger (~372 lines), metrics (~480 lines) |
| Email | src/lib/email/ | — | Email templates, delivery |
| Supabase | src/lib/supabase/ | ~5 | Client, server, middleware helpers |
| Database | src/lib/database/ | — | Query helpers, connection management |
| Cache | src/lib/cache/ | — | Caching utilities |
| Realtime | src/lib/realtime/ | — | WebSocket/SSE helpers |

### 10.4 Utility & Cross-Cutting

| Module | Directory | Files | Responsibility |
|--------|-----------|-------|---------------|
| Utils | src/lib/utils/ | — | General utilities |
| Validation | src/lib/validation/ | — | Schema validation helpers |
| Config | src/lib/config/ | — | Environment configuration |
| Analytics | src/lib/analytics/ | — | Event tracking, user analytics |
| Experiments | src/lib/experiments/ | — | Feature flags, A/B testing |
| I18n | src/lib/i18n/ | — | Internationalization |
| Offline | src/lib/offline/ | — | Offline-first support |
| PWA | src/lib/pwa/ | — | Progressive web app utilities |
| Performance | src/lib/performance/ | — | Performance monitoring |
| Onboarding | src/lib/onboarding/ | — | User onboarding flows |

---

## 11. External Service Integration

| Service | Package | Config Vars | Purpose | Failure Mode |
|---------|---------|-------------|---------|-------------|
| AIML API | openai@^4.77.3 | `AIML_API_KEY`, `AIML_API_URL` | AI model gateway (300+ models) | Graceful degradation, retry with fallback model |
| Supabase | @supabase/supabase-js@^2.89.0 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth + PostgreSQL DB | App-breaking: auth fails, data unavailable |
| Stripe | stripe@^19.1.0 | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs | Payments & subscriptions | Checkout fails, webhook retries |
| AWS S3 | @aws-sdk/client-s3@^3.917.0 | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` | Document storage | Upload fails, presigned URLs expire (7-day) |
| Resend | resend@^6.2.2 | `RESEND_API_KEY`, `EMAIL_FROM` | Transactional email | Silent fail, queued for retry |
| Web Push | web-push@^3.6.7 | VAPID keys | Push notifications | Silent fail |

---

## 12. Environment Variables (Required)

| Variable | Scope | Required | Description |
|----------|-------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Yes | Supabase anonymous key |
| `AIML_API_KEY` | Server only | Yes | AIML API authentication |
| `AIML_API_URL` | Server only | No | AIML API base URL (default: https://api.aimlapi.com/v1) |
| `STRIPE_SECRET_KEY` | Server only | Yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Server only | Yes | Stripe webhook signing secret |
| `STRIPE_*_PRICE_ID` | Server only | Yes | Stripe price IDs per tier |
| `AWS_REGION` | Server only | Yes | AWS region for S3 |
| `AWS_ACCESS_KEY_ID` | Server only | Yes | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Server only | Yes | AWS secret key |
| `AWS_S3_BUCKET` | Server only | Yes | S3 bucket name |
| `RESEND_API_KEY` | Server only | Yes | Resend email API key |
| `EMAIL_FROM` | Server only | No | Sender email address |
| `NODE_ENV` | Both | Auto | Environment (development/production/test) |

---

## 13. Testing Summary

### 13.1 Test Pyramid

| Layer | Framework | Files | Est. Cases | Focus |
|-------|-----------|-------|-----------|-------|
| Unit | Jest | ~100 | ~800 | Pure functions, service methods, components |
| Integration | Jest | ~49 | ~300 | API routes, service-to-service, DB |
| E2E (API) | Cypress | 21 | ~190 | Route access, auth enforcement, response format |
| E2E (UI) | Playwright | 16 | ~149 | Full browser journeys, multi-page flows |
| **Total** | | **186** | **~1,300+** | |

### 13.2 Coverage Thresholds (jest.config.ts)

| Metric | Threshold |
|--------|-----------|
| Statements | 80% |
| Branches | 80% |
| Functions | 80% |
| Lines | 80% |

### 13.3 Quality Gates

1. ESLint + Prettier (zero warnings)
2. `tsc --noEmit --strict` (zero errors)
3. Jest (all pass, coverage >= 80%)
4. `next build` (zero errors)
5. Cypress (21 specs pass)
6. Playwright (16 specs pass)

### 13.4 Critical Path Tests

| ID | Path | Framework | Validates |
|----|------|-----------|-----------|
| CP-01 | Auth flow | Playwright | Login → session → protected route |
| CP-02 | Payment checkout | Jest + Cypress | Stripe checkout, webhook handling |
| CP-03 | Credit repair API | Cypress | Auth enforcement on all endpoints |
| CP-04 | Dispute lifecycle | Jest | Create → send → review → resolve |
| CP-05 | AI chat | Cypress | /api/ai/chat requires auth |
| CP-06 | Protected routes | Cypress | 9+ routes redirect to /login |
| CP-07 | Public pages | Cypress | Landing, pricing, credit/factors = 200 |
| CP-08 | Input validation | Jest | Prompt injection, PII detection |
| CP-09 | Rate limiting | Jest | Per-IP and per-user throttling |
| CP-10 | Document upload | Jest | S3 upload, validation, presigned URL |

---

## 14. Deployment

| Setting | Value |
|---------|-------|
| **Host** | Vercel |
| **Build Command** | `next build` |
| **Output** | Standalone (Docker-compatible) |
| **Region** | Auto (Vercel Edge Network) |
| **Node Version** | 22.x |
| **Auto-deploy** | main branch → production |
| **Preview** | All PRs get preview deployments |
| **CI/CD Config** | None (Vercel auto-deploy; no GitHub Actions) |

### Build Configuration (next.config.ts)

- Output: `standalone` (for Docker/serverless)
- 5-chunk optimization strategy
- Webpack caching enabled
- Image optimization: WebP/AVIF, remote patterns for Supabase
- Environment variable validation at build time

---

## 15. Known Issues & Technical Debt

### 15.1 Critical Conflicts (Documentation vs. Code)

| What | CLAUDE.md Claims | Actual |
|------|-----------------|--------|
| API Routes | 21 | **248** |
| Pages | 6 | **180** |
| Components | 10+ | **225** |
| Lines of Code | 15,000+ | **79,612** |
| Source Files | 60+ | **1,296** |
| Test Cases | 83 | **~1,300+** |
| Pricing Tiers | 3 ($29/$79/$199) | **6 (Free/$29.99/$99.99/$159.99/$199.99/$399.99)** |
| Tier Names | Basic/Premium/Enterprise | **Free/Standard/Pro/Family Duo/Family/Family Plus** |

### 15.2 Technical Debt

| ID | Area | Risk | Remediation |
|----|------|------|-------------|
| TD-01 | Deprecated `src/lib/supabase.ts` | Import confusion, auth bugs | Migrate to `@/lib/supabase/client` |
| TD-02 | In-memory rate limiting | Resets on deploy/restart | Move to Redis or Supabase |
| TD-03 | In-memory audit logs (10K cap) | Logs lost on restart | Persist to database |
| TD-04 | In-memory metrics | Data lost on restart | Persist to metrics service |
| TD-05 | Mixed branding (CPFI/CreditMaster/Fynvita) | User confusion | Systematic rename |
| TD-06 | 95 doc files (many overlap/conflict) | Developer confusion | Consolidate |
| TD-07 | No database migrations | Unreproducible environments | Add migration tooling |
| TD-08 | No CI/CD pipeline config | Manual deployment risk | Add GitHub Actions |
| TD-09 | Large component files (300-600+ lines) | Maintainability | Extract sub-components |
| TD-10 | No feature flag infrastructure | Risky deployments | Add flag system |

### 15.3 Pending Architectural Decisions

| ID | Decision | Status |
|----|----------|--------|
| DEC-01 | Supabase client pattern: migrate to `@/lib/supabase/client` | **Decided: Migrate** |
| DEC-02 | State management: Context vs Zustand vs TanStack Query | Open |
| DEC-03 | Caching: None vs Redis vs ISR vs in-memory | Open |
| DEC-04 | Real-time: Polling vs WebSockets vs SSE vs Supabase Realtime | Open |
| DEC-05 | Monorepo: Keep single app vs split (web + mobile + shared) | Open |
| DEC-06 | API versioning: None vs URL-based vs header-based | Open |
| DEC-07 | Feature flags: None vs env vars vs LaunchDarkly | Open |
| DEC-08 | Error monitoring: Console vs Sentry vs Datadog | Open |
| DEC-09 | CI/CD: GitHub Actions vs Vercel CI vs both | Open |
| DEC-10 | Database migrations: Manual vs Prisma vs Supabase CLI | Open |
| DEC-11 | Outdated docs cleanup: Archive vs update vs delete | Open |
| DEC-12 | Brand consolidation: Full rename to Fynvita | **Decided: In progress** |

---

## Cross-Reference

| Related Document | Purpose |
|-----------------|---------|
| `docs/Codebase_Index.md` | Detailed module/service inventory |
| `docs/Plan_Index.md` | Master documentation index (95 files) |
| `docs/Traceability_Matrix.md` | Requirements → Code → Test mapping |
| `docs/Gaps_Conflicts_Decisions.md` | Full conflict/gap/decision tracking |
| `docs/Testing/Test_Strategy.md` | Test approach, environments, gates |
| `docs/Testing/Test_Catalog.md` | Complete test inventory |

---

*Document generated from full codebase analysis on 2026-02-16.*
*Verified metrics: file counts via find/wc, LOC via wc -l, dependency versions via package.json.*
