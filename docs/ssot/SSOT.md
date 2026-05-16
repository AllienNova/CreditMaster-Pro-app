# Fynvita — Single Source of Truth (SSOT)

> **VERSION-015 — WAVE 7 IN FLIGHT** (2026-05-16)
>
> **Wave 7 (Security & Correctness Remediation) is in flight.** The prior "All 7 waves DONE / 125-of-125 / 100%" claim (VERSION-010 to VERSION-012) was invalidated by a 9-domain comprehensive code review (27 reviewer agents) that opened **33 CRITICAL** + 38 HIGH findings. Wave 7 Phase 0 (Foundation) is underway on branch `remediation/wave-7-foundation`; TASK-PRE-01 (honest re-baseline) completed 2026-05-16. No new feature work begins until Wave 7 closes per `build_order_blueprint.md`.
>
> Current quality (TASK-PRE-01 re-baseline @ `900d286`): tests 14,967 pass / 0 fail / 19 skip and types 0 errors both PASS; `npm run lint` exits 1 with 15 pre-existing legacy errors + 3,193 warnings (non-blocking for the build, not introduced by Wave 7). The **nine-domain audit remains the authoritative signal and is FAIL — 33 CRITICAL findings open.** Ship: **BLOCKED** until Wave 7 closes. See `docs/ssot/health_metrics.md` for the full scorecard.
>
> Pre-launch status (no live users yet) means there is **no current GDPR Art. 33 / CCPA disclosure obligation**, but every finding must close before public launch.
>
> Audit detail: see `docs/ssot/gap_analysis.md` (FND-001 through FND-071). Roadmap: see `MASTER-IMPLEMENTATION-PLAN.md` § Wave 7.

---

> **DICE v3.3 Canonical Artifact** — Originally generated 2026-02-25, re-baselined 2026-05-03
> This is the ONE authoritative reference for the Fynvita platform.
> All other documents defer to this file. When in conflict, this file wins.
>
> **Companion artifacts** (all in `docs/ssot/`):
> - `gap_analysis.md` — **NEW (VERSION-013)** — 71-finding audit register
> - `task_extraction.md` — 80 normalized tasks with stable IDs
> - `dependency_graph.md` — Module and task-level dependencies
> - `build_order_blueprint.md` — 7-wave build plan with merge gates (Wave 7 opened 2026-05-03)
> - `repo_inventory.md` — Complete repository inventory
> - `MASTER-IMPLEMENTATION-PLAN.md` — Executable Task Cards (Step 5)
> - `traceability_matrix.md` — REQ→Build target proof (Step 6)
> - `system_blueprint.md` — UI/UX, agents, security, API/data, DevOps (Step 7)
> - `health_metrics.md` — Quality scorecard (Step 9) — **flipped to RED 2026-05-03**

---

## 1. Project Identity

| Field           | Value                                                                              |
| --------------- | ---------------------------------------------------------------------------------- |
| **Name**        | Fynvita — Your Financial Vitality                                                  |
| **Repository**  | https://github.com/AllienNova/CreditMaster-Pro-app                                 |
| **Description** | AI-powered credit health, financial wellness, and investment intelligence platform |
| **Version**     | 1.0.0                                                                              |
| **License**     | Private                                                                            |
| **Brand**       | Fynvita (formerly CPFI / CreditMaster Pro)                                         |
| **Domain**      | fynvita.com                                                                        |

> **See Also**: [§2 Technology Stack](#2-technology-stack) | [§3 Codebase Metrics](#3-codebase-metrics-verified-2026-02-20)

---

## 2. Technology Stack

### 2.1 Core Framework

| Layer      | Technology               | Version |
| ---------- | ------------------------ | ------- |
| Framework  | Next.js (App Router)     | ^15.5.6 |
| UI Library | React                    | ^19.0.0 |
| Language   | TypeScript (strict mode) | ^5.7.2  |
| Styling    | Tailwind CSS             | ^3.4.19 |
| Runtime    | Node.js                  | 22.13+  |

### 2.2 Backend & Data

| Service      | Technology            | Version  | Purpose                  |
| ------------ | --------------------- | -------- | ------------------------ |
| Database     | Supabase PostgreSQL   | ^2.89.0  | Primary data store       |
| Auth         | Supabase Auth + SSR   | ^0.7.0   | Authentication, JWT, MFA |
| File Storage | AWS S3                | ^3.917.0 | Document uploads         |
| Payment      | Stripe                | ^19.1.0  | Subscriptions, checkout  |
| Email        | Resend                | ^6.2.2   | Transactional email      |
| AI Gateway   | AIML API (OpenAI SDK) | ^4.77.3  | 300+ AI model access     |

### 2.3 Frontend Libraries

| Library              | Version  | Purpose                 |
| -------------------- | -------- | ----------------------- |
| Framer Motion        | ^12.29.0 | Animations              |
| Recharts             | ^3.5.1   | Data visualization      |
| Lightweight Charts   | ^5.1.0   | Trading charts          |
| Lucide React         | ^0.563.0 | Icons                   |
| TanStack React Query | ^5.90.16 | Server state management |
| Zod                  | ^3.25.76 | Runtime validation      |
| date-fns             | ^4.1.0   | Date utilities          |

### 2.4 Testing Stack

| Tool            | Version | Purpose                      |
| --------------- | ------- | ---------------------------- |
| Jest            | ^30.2.0 | Unit + Integration tests     |
| Cypress         | ^15.5.0 | E2E (API + route validation) |
| Playwright      | ^1.57.0 | E2E (browser journeys)       |
| Testing Library | ^16.3.0 | Component testing            |
| MSW             | ^1.3.3  | API mocking                  |

### 2.5 Build & Quality

| Tool         | Version  | Purpose                   |
| ------------ | -------- | ------------------------- |
| ESLint       | ^9.18.0  | Linting                   |
| ts-jest      | ^29.4.5  | TypeScript test transform |
| PostCSS      | ^8.5.6   | CSS processing            |
| Autoprefixer | ^10.4.23 | CSS compatibility         |

> **See Also**: [§12 Environment Variables](#12-environment-variables-required) | [§14 Deployment](#14-deployment)

---

## 3. Codebase Metrics (Verified 2026-03-02)

| Metric                         | Value   | Source                                            |
| ------------------------------ | ------- | ------------------------------------------------- |
| Total source files (src/)      | 1,833   | `find src -name "*.ts" -o -name "*.tsx" \| wc -l` |
| Total lines of code            | 846,417 | `wc -l` on all .ts/.tsx in src/ + mobile-app/     |
| API route files                | 284     | `find src/app/api -name "route.ts" \| wc -l`      |
| API domains                    | 42      | `find src/app/api -mindepth 1 -maxdepth 1 -type d`|
| Page files (page.tsx)          | 199     | `find src/app -name "page.tsx" \| wc -l`          |
| Component files (.tsx)         | 309     | `find src/components -name "*.tsx" \| wc -l`      |
| Layout files (layout.tsx)      | 11      | `find src/app -name "layout.tsx" \| wc -l`        |
| Error boundary files           | 33      | `find src/app -name "error.tsx" \| wc -l`         |
| Loading state files            | 33      | `find src/app -name "loading.tsx" \| wc -l`       |
| Library directories (src/lib/) | 55      | `find src/lib -mindepth 1 -maxdepth 1 -type d`    |
| Root lib files (src/lib/*.ts)  | 13      | Standalone services not in subdirectories          |
| Hook files (src/hooks/)        | 29      | Custom hooks + tests                               |
| Type files (src/types/)        | 4       | Shared TypeScript type definitions                |
| Test files (Jest — web)        | 508     | .test.ts + .test.tsx under src/                   |
| Test files (Jest — mobile)     | 31      | .test.ts + .test.tsx under mobile-app/            |
| Test files (Cypress)           | 21      | .cy.ts under cypress/e2e/                         |
| Test files (Playwright)        | 16      | .spec.ts under e2e/                               |
| Total test files               | 576     | Sum of all test frameworks                        |
| Test suites (Jest)             | 504     | npm test — all passing (506 total, 2 skipped)     |
| Test cases (Jest)              | 13,585  | npm test — all passing (13,604 total, 19 skipped) |
| Documentation files            | 134     | Markdown files in docs/ + root                    |
| npm dependencies               | 33      | package.json dependencies                         |
| npm devDependencies            | 30      | package.json devDependencies                      |
| Mobile app source files        | 141     | .ts/.tsx under mobile-app/src/                    |
| Mobile app routes              | 257     | .tsx under mobile-app/app/                        |
| Mobile app route groups        | 37      | Top-level directories in mobile-app/app/          |

> **See Also**: [§13 Testing Summary](#13-testing-summary) | [§17 Traceability Matrix](#17-traceability-matrix-summary)

---

## 4. Architecture Overview

### 4.1 System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                         │
│  182 pages · 228 components · Tailwind CSS · Framer Motion  │
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
│              │  │   (53 lib    │  │              │
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

     ┌──────────────────────────────────────────┐
     │  TRADING SERVICE (Fly.io — persistent)    │
     │  PCTT 7-stage pipeline · 7 AI agents     │
     │  3 operating modes · 30-Law compliance   │
     │  ┌────────┐ ┌───────┐ ┌──────┐           │
     │  │Alpaca  │ │Upstash│ │Alpha │           │
     │  │Broker  │ │Redis  │ │Vntge │           │
     │  └────────┘ └───────┘ └──────┘           │
     └──────────────────────────────────────────┘
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

### 4.4 AI Architecture (4-Layer)

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

Layer 4: Trading AI Agents (src/lib/trading/ai/)
  → 7 specialized agents: Sentiment, RegimeConfirmation, NewsImpact,
    SignalExplainer, RiskNarrative, EarningsAnalysis, ConsensusArbiter
  → Multi-provider fallback: AIML → Anthropic → OpenAI → xAI
  → 6-layer prompt injection defense
  → 5 degradation levels with circuit breakers per provider
```

> **See Also**: [§5 API Routes](#5-api-route-inventory-248-routes-across-41-domains) | [§7 Security](#7-security-architecture) | [§10 Library & Services](#10-library--service-inventory-477-files-across-53-directories--14-root-files)

---

## 5. API Route Inventory (248 Routes across 41 Domains)

| Domain             | Routes | Key Endpoints                                                                                                                          |
| ------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| financial          | 64     | Budgeting, calculators, goals, insights, transactions, recurring, net-worth                                                            |
| investments        | 27     | Portfolio analysis, holdings, risk assessment, recommendations                                                                         |
| ai                 | 23     | Chat, consensus, credit analysis, dispute generation, recommendations                                                                  |
| credit-repair      | 13     | Disputes, score, quick-wins, goodwill, impact, timeline                                                                                |
| marketplace        | 12     | Products, listings, reviews, categories                                                                                                |
| admin              | 10     | Users, analytics, settings, system management                                                                                          |
| disputes           | 9      | CRUD, generate, status tracking, bureau submissions                                                                                    |
| trading            | 30     | 7-stage pipeline, strategies, signals, orders, positions, watchlists, paper trading, autonomous settings, journal, performance, market data, AI agents, backtesting |
| credit-monitoring  | 5      | Alerts, score history, reports, monitoring                                                                                             |
| credit-builder     | 5      | Plans, progress, accounts, recommendations                                                                                             |
| gamification       | 5      | Achievements, leaderboard, challenges, rewards                                                                                         |
| notifications      | 5      | CRUD, preferences, push, mark-read                                                                                                     |
| auth               | 5      | Login, signup, callback, reset-password, session                                                                                       |
| analytics          | 5      | Dashboard, events, reports, user-activity                                                                                              |
| payment            | 4      | Checkout, webhook, subscription, portal                                                                                                |
| monitoring         | 4      | Health, metrics, logs, status                                                                                                          |
| cron               | 4      | Scheduled jobs: cleanup, sync, notifications, reports                                                                                  |
| credit-bureau      | 4      | Reports, disputes, score-factors, inquiries                                                                                            |
| chat               | 4      | Messages, history, context, sessions                                                                                                   |
| tax                | 3      | Optimization, documents, estimates                                                                                                     |
| student-loans      | 3      | Data, strategy, federal programs                                                                                                       |
| federal            | 3      | Programs, eligibility, applications                                                                                                    |
| documents          | 3      | CRUD, upload, download                                                                                                                 |
| servicers          | 2      | Loan servicer data, contact info                                                                                                       |
| ml                 | 2      | Predictions, model status                                                                                                              |
| credit             | 2      | Score, analyze                                                                                                                         |
| automation         | 2      | Rules, triggers                                                                                                                        |
| Other (14 domains) | 14     | ws, voice, user, test-db, strategies, settings, profile, performance, onboarding, health, federal-programs, email, csrf, credit-report |

> **See Also**: [§4 Architecture](#4-architecture-overview) | [§8 Pages](#8-page-inventory-182-pages-across-47-domains) | [§17 Traceability Matrix](#17-traceability-matrix-summary)

---

## 6. Subscription & Pricing Model

| Tier            | Monthly | Annual (monthly)   | Users | Disputes  | AI Messages | Key Features                            |
| --------------- | ------- | ------------------ | ----- | --------- | ----------- | --------------------------------------- |
| **Free**        | $0      | $0                 | 1     | 0         | 10          | Basic credit monitoring, budgeting      |
| **Standard**    | $29.99  | ~$29.09 (3% off)   | 1     | 5         | 100         | Full credit health + financial wellness |
| **Pro**         | $99.99  | ~$91.99 (8% off)   | 1     | Unlimited | Unlimited   | + Investment intelligence + AI coach    |
| **Family Duo**  | $159.99 | ~$131.19 (18% off) | 2     | Unlimited | Unlimited   | All Pro features for 2 members          |
| **Family**      | $199.99 | ~$163.99 (18% off) | 3     | Unlimited | Unlimited   | All Pro features for 3 members          |
| **Family Plus** | $399.99 | ~$327.99 (18% off) | 5     | Unlimited | Unlimited   | Premium perks for 5 members             |

**Payment Processor**: Stripe (checkout sessions, webhooks, subscription lifecycle)
**Stripe Events Handled**: subscription.created/updated/deleted, invoice.paid/payment_failed, payment_intent.succeeded

> **See Also**: [§11 External Services](#11-external-service-integration) | [§8 Pages](#8-page-inventory-182-pages-across-47-domains)

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

| Service           | File                 | Lines | Responsibility                                                        |
| ----------------- | -------------------- | ----- | --------------------------------------------------------------------- |
| Input Validation  | input-validation.ts  | ~325  | Prompt injection detection, PII detection, content sanitization       |
| Output Validation | output-validation.ts | ~341  | Harmful content filtering, PII leakage prevention                     |
| Rate Limiting     | rate-limiting.ts     | ~387  | Per-IP, per-user throttling with cost tracking (in-memory Map)        |
| Auth Middleware   | auth-middleware.ts   | ~400  | JWT authentication, RBAC with 100+ permissions across 14 categories   |
| Audit Logging     | audit-logging.ts     | ~501  | Security event logging, AI interaction tracking (in-memory, last 10K) |

### 7.3 Compliance (src/lib/compliance/)

| Service        | File              | Lines | Responsibility                            |
| -------------- | ----------------- | ----- | ----------------------------------------- |
| GDPR/CCPA      | gdpr-ccpa.ts      | ~450  | Data export, deletion, consent management |
| PII Protection | pii-protection.ts | ~400  | PII detection, encryption, masking        |

### 7.4 RBAC Model

**Roles**: `user` → `premium` → `admin` → `super_admin`

**Permission Categories** (14): credit, disputes, documents, payments, ai, admin, analytics, notifications, settings, investments, trading, marketplace, gamification, compliance

### 7.5 Known Security Findings

| ID     | Finding                                                     | Severity | Status   |
| ------ | ----------------------------------------------------------- | -------- | -------- |
| SEC-01 | Rate limiter uses in-memory Map (resets on restart)         | MEDIUM   | Open     |
| SEC-02 | PII detection is regex-based (may miss edge cases)          | LOW      | Accepted |
| SEC-03 | No DAST scanning in CI                                      | MEDIUM   | Open     |
| SEC-04 | Audit logs stored in-memory (lost on restart)               | MEDIUM   | Open     |
| SEC-05 | CSP allows external domains (Stripe, Plaid, Supabase, AIML) | LOW      | Accepted |
| SEC-06 | No secret rotation schedule                                 | LOW      | Open     |
| SEC-07 | MFA WebAuthn placeholder (TOTP works)                       | LOW      | Open     |

> **See Also**: [§4 Architecture](#4-architecture-overview) | [§12 Environment Variables](#12-environment-variables-required) | [§10 Library & Services](#10-library--service-inventory-477-files-across-53-directories--14-root-files)

---

## 8. Page Inventory (182 pages across 47 domains)

| Domain           | Pages | Key Screens                                                          |
| ---------------- | ----- | -------------------------------------------------------------------- |
| Financial        | 22    | Budgeting, calculators, goals, insights, transactions, bills         |
| Credit Builder   | 18    | Plans, progress, accounts, recommendations                           |
| Dashboard        | 14    | Main dashboard, widgets, overview, activity                          |
| Marketplace      | 13    | Browse, listings, product detail, reviews, categories                |
| Investments      | 12    | Portfolio, holdings, analysis, recommendations                       |
| Admin            | 12    | User management, analytics, settings, moderation                     |
| Credit Repair    | 8     | Disputes, timeline, letters, results                                 |
| Settings         | 7     | Profile, preferences, notifications, security, billing               |
| Onboarding       | 5     | Welcome, profile setup, goals, quiz                                  |
| Disputes         | 5     | List, detail, create, status, history                                |
| Credit           | 5     | Score, factors, reports, monitoring                                  |
| Analytics        | 5     | Reports, trends, insights, export                                    |
| Tax              | 4     | Optimization, documents, estimates, planning                         |
| Help             | 4     | FAQ, support, contact, guides                                        |
| Budgeting        | 4     | Overview, categories, transactions, goals                            |
| Auth             | 4     | Login, signup, reset-password, callback                              |
| Trading          | 3     | Dashboard, orders, positions                                         |
| Insights         | 3     | Financial insights, trends, recommendations                         |
| Billing          | 3     | Subscription, invoices, payment methods                              |
| Payment          | 2     | Checkout, confirmation                                               |
| Documents        | 2     | Upload, management                                                   |
| Other (26 pages) | 26    | Pricing, landing, about, privacy, terms, student loans, rewards, etc |

> **See Also**: [§9 Components](#9-component-inventory-228-components-across-38-directories) | [§5 API Routes](#5-api-route-inventory-248-routes-across-41-domains) | [§17 Traceability Matrix](#17-traceability-matrix-summary)

---

## 9. Component Inventory (228 components across 38 directories)

| Category          | Count | Key Components                                            |
| ----------------- | ----- | --------------------------------------------------------- |
| Financial         | 50    | Calculators, charts, transaction lists, budget views      |
| UI (shared)       | 21    | Buttons, cards, modals, forms, inputs, loading            |
| Investments       | 21    | Portfolio cards, holdings table, risk meter               |
| Credit Repair     | 11    | Dispute forms, timeline, letter preview                   |
| Charts            | 9     | Line, bar, pie, area, sparkline, candlestick              |
| Auth              | 9     | Login form, signup form, MFA, social auth                 |
| Disputes          | 9     | Dispute card, status badge, bureau selector               |
| Onboarding        | 8     | Welcome wizard, profile form, goal selector               |
| Trading           | 7     | Order form, position cards, market data                   |
| Credit Monitoring | 7     | Score alerts, report monitoring, trend charts             |
| Documents         | 6     | Upload form, file list, preview                           |
| Notifications     | 6     | Bell icon, notification list, preferences                 |
| Gamification      | 6     | Achievement badges, leaderboard, progress                 |
| Credit Bureau     | 5     | Report display, score factors, inquiry list               |
| Chat              | 5     | Message bubble, input, history, context                   |
| Student Loans     | 4     | Loan calculator, strategy dashboard, servicer info        |
| AIML              | 4     | AIChat, CreditAnalyzer, DisputeGenerator, LoanCalculator  |
| Persona           | 3     | Persona selector, profile card, AI strategies             |
| AI Strategies     | 3     | Strategy cards, recommendations, model selector           |
| Other (19 dirs)   | 34    | Admin, marketplace, goals, settings, voice, tax, etc.     |

> **See Also**: [§8 Pages](#8-page-inventory-182-pages-across-47-domains) | [§10 Library & Services](#10-library--service-inventory-477-files-across-53-directories--14-root-files)

---

## 10. Library & Service Inventory (477 files across 53 directories + 14 root files)

### 10.1 Core AI Services

| Module          | Directory                  | Key Files          | Responsibility                                           |
| --------------- | -------------------------- | ------------------ | -------------------------------------------------------- |
| AIML Service    | src/lib/aiml-service.ts    | 1 file, ~400 lines | Direct AIML API wrapper (chat, image, voice, embeddings) |
| Model Router    | src/lib/model-router.ts    | 1 file, ~300 lines | Intelligent model selection (13 task types)              |
| AI Orchestrator | src/lib/ai-orchestrator.ts | 1 file, ~600 lines | High-level AI workflows, multi-model consensus           |
| AI Module       | src/lib/ai/                | ~11 files          | AI utilities, model configs, prompt helpers              |
| Prompts         | src/lib/prompts/           | ~5 files           | Advanced prompt templates (dispute, credit, etc.)        |

### 10.2 Business Logic

| Module            | Directory                   | Files | Responsibility                               |
| ----------------- | --------------------------- | ----- | -------------------------------------------- |
| Financial         | src/lib/financial/          | 76    | Budgeting, calculators, bills, insights      |
| Trading           | src/lib/trading/            | 62    | Orders, positions, strategies, market data   |
| Investments       | src/lib/investments/        | 62    | Portfolio analysis, risk, recommendations    |
| Tax               | src/lib/tax/                | 25    | Optimization, compliance, documents          |
| Commerce          | src/lib/commerce/           | 16    | E-commerce, cart, orders                     |
| Credit Repair     | src/lib/credit-repair/      | 15    | Dispute lifecycle, bureau communication      |
| Connectors        | src/lib/connectors/         | 13    | External service connectors, data rails      |
| Credit Bureau     | src/lib/credit-bureau/      | 10    | Score factors, report parsing                |
| Gamification      | src/lib/gamification/       | 9     | Achievements, leaderboard, challenges        |
| Credit            | src/lib/credit/             | 6     | Core credit utilities and scoring            |
| AI Personalization| src/lib/ai-personalization/ | 6     | Behavioral coaching, personalized insights   |
| Marketplace       | src/lib/marketplace/        | 5     | Product listings, transactions               |
| Goals             | src/lib/goals/              | 5     | Financial goal tracking and planning         |
| Analytics         | src/lib/analytics/          | 5     | Event tracking, user analytics               |
| Disputes          | src/lib/disputes/           | 3     | Dispute tracking service                     |
| Credit Builder    | src/lib/credit-builder/     | 3     | Credit building plans and tracking           |
| Strategies        | src/lib/strategies/         | 3     | Strategy engines and optimization            |
| Student Loans     | src/lib/student-loan-agent/ | 2     | Loan analysis, federal regulations, strategy |

### 10.3 Infrastructure Services

| Module        | Directory              | Files | Responsibility                                |
| ------------- | ---------------------- | ----- | --------------------------------------------- |
| Auth          | src/lib/auth/          | 12    | Session management, JWT, MFA, RBAC            |
| Security      | src/lib/security/      | 11    | Input/output validation, rate limiting, audit |
| Monitoring    | src/lib/monitoring/    | 8     | Logger, metrics, health checks                |
| Compliance    | src/lib/compliance/    | 2     | GDPR/CCPA, PII protection                     |
| Notifications | src/lib/notifications/ | 4     | Email, push, in-app                           |
| Performance   | src/lib/performance/   | 4     | Performance monitoring, profiling             |
| Onboarding    | src/lib/onboarding/    | 4     | User onboarding flows                         |
| Cache         | src/lib/cache/         | 4     | Caching utilities                             |
| Automation    | src/lib/automation/    | 4     | Rules, triggers, workflows                    |
| Payment       | src/lib/payment/       | 3     | Stripe service                                |
| Supabase      | src/lib/supabase/      | 3     | Client, server, middleware helpers            |
| Integrations  | src/lib/integrations/  | 3     | Third-party service integrations              |
| Email         | src/lib/email/         | 3     | Email templates, delivery                     |
| Documents     | src/lib/documents/     | 3     | S3 upload/download                            |
| Database      | src/lib/database/      | 2     | Query helpers, connection management          |
| Offline       | src/lib/offline/       | 2     | Offline-first support                         |
| API           | src/lib/api/           | 3     | API utilities, response helpers               |
| Realtime      | src/lib/realtime/      | 1     | WebSocket/SSE helpers                         |

### 10.4 Utility & Cross-Cutting

| Module      | Directory            | Files | Responsibility                 |
| ----------- | -------------------- | ----- | ------------------------------ |
| Utils       | src/lib/utils/       | 3     | General utilities              |
| Validation  | src/lib/validation/  | 2     | Schema validation helpers      |
| I18n        | src/lib/i18n/        | 3     | Internationalization           |
| Config      | src/lib/config/      | 1     | Environment configuration      |
| Experiments | src/lib/experiments/ | 1     | Feature flags, A/B testing     |
| PWA         | src/lib/pwa/         | 1     | Progressive web app utilities  |
| React Query | src/lib/react-query/ | 1     | Query client configuration     |
| Subscriptions | src/lib/subscriptions/ | 1 | Subscription management        |
| Services    | src/lib/services/    | 1     | Shared service utilities       |
| Test Utils  | src/lib/test-utils/  | 1     | Testing helpers                |
| Audit       | src/lib/audit/       | 1     | Audit trail utilities          |
| Credit Report | src/lib/credit-report/ | 1  | Credit report parsing          |
| Credit Monitoring | src/lib/credit-monitoring/ | 1 | Score alerts, monitoring  |

### 10.5 Root Library Files (src/lib/*.ts)

| File                              | Responsibility                                 |
| --------------------------------- | ---------------------------------------------- |
| aiml-service.ts                   | Direct AIML API wrapper (chat, image, voice)   |
| ai-orchestrator.ts                | High-level AI workflows, multi-model consensus |
| model-router.ts                   | Intelligent model selection (13 task types)     |
| federal-integration-service.ts    | Federal loan program integration               |
| student-loan-ai-engine.ts        | AI-powered student loan analysis               |
| student-loan-service.ts          | Student loan data management                   |
| advanced-dispute-engine.ts       | Advanced dispute generation logic              |
| servicer-intelligence-engine.ts  | Loan servicer intelligence                     |
| ml-prediction-models.ts          | ML prediction model utilities                  |
| pricing.ts                        | Subscription pricing tiers                     |
| rate-limit.ts                     | Rate limiting utilities                        |
| supabase.ts                       | Legacy Supabase client (deprecated)            |
| utils.ts                          | General utility functions                      |
| add.ts                            | Basic utility                                  |

### 10.6 Custom Hooks (src/hooks/ — 22 hooks)

| Hook                       | Purpose                                |
| -------------------------- | -------------------------------------- |
| useAuth                    | Authentication state and actions       |
| useAIInsights              | AI-powered financial insights          |
| useChatQueries             | Chat message queries and mutations     |
| useFormValidation          | Form validation with Zod              |
| useGamification            | Gamification state (XP, achievements)  |
| useHoldings                | Investment holdings data               |
| useMarketData              | Real-time market data                  |
| useMarketDataWebSocket     | WebSocket market data streaming        |
| useOfflineQueue            | Offline action queueing                |
| useOnboardingProgress      | Onboarding flow progress tracking      |
| useOnline                  | Online/offline status detection        |
| usePortfolio               | Portfolio data and analysis            |
| usePullToRefresh           | Pull-to-refresh gesture handling       |
| useRealtimeEvents          | Real-time event subscriptions          |
| useRealTimePrice           | Real-time price updates                |
| useRealtimeUpdates         | Supabase real-time subscriptions       |
| useStockAnalysis           | Stock analysis and research            |
| useTranslation             | i18n translation strings               |
| useWebPushNotifications    | Web push notification management       |
| useOrderExecution          | Trading order execution (hooks/trading/) |
| investments/index          | Investment hooks barrel export          |
| trading/index              | Trading hooks barrel export             |

> **See Also**: [§5 API Routes](#5-api-route-inventory-248-routes-across-41-domains) | [§9 Components](#9-component-inventory-228-components-across-38-directories) | [§17 Traceability Matrix](#17-traceability-matrix-summary)

---

## 11. External Service Integration

| Service  | Package                       | Config Vars                                                                 | Purpose                        | Failure Mode                                    |
| -------- | ----------------------------- | --------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------- |
| AIML API | openai@^4.77.3                | `AIML_API_KEY`, `AIML_API_URL`                                              | AI model gateway (300+ models) | Graceful degradation, retry with fallback model |
| Supabase | @supabase/supabase-js@^2.89.0 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`                 | Auth + PostgreSQL DB           | App-breaking: auth fails, data unavailable      |
| Stripe   | stripe@^19.1.0                | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs                     | Payments & subscriptions       | Checkout fails, webhook retries                 |
| AWS S3   | @aws-sdk/client-s3@^3.917.0   | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` | Document storage               | Upload fails, presigned URLs expire (7-day)     |
| Resend   | resend@^6.2.2                 | `RESEND_API_KEY`, `EMAIL_FROM`                                              | Transactional email            | Silent fail, queued for retry                   |
| Web Push | web-push@^3.6.7               | VAPID keys                                                                  | Push notifications             | Silent fail                                     |

> **See Also**: [§6 Pricing](#6-subscription--pricing-model) | [§12 Environment Variables](#12-environment-variables-required)

---

## 12. Environment Variables (Required)

| Variable                        | Scope           | Required | Description                                             |
| ------------------------------- | --------------- | -------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Client + Server | Yes      | Supabase project URL                                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Yes      | Supabase anonymous key                                  |
| `AIML_API_KEY`                  | Server only     | Yes      | AIML API authentication                                 |
| `AIML_API_URL`                  | Server only     | No       | AIML API base URL (default: https://api.aimlapi.com/v1) |
| `STRIPE_SECRET_KEY`             | Server only     | Yes      | Stripe secret key                                       |
| `STRIPE_WEBHOOK_SECRET`         | Server only     | Yes      | Stripe webhook signing secret                           |
| `STRIPE_*_PRICE_ID`             | Server only     | Yes      | Stripe price IDs per tier                               |
| `AWS_REGION`                    | Server only     | Yes      | AWS region for S3                                       |
| `AWS_ACCESS_KEY_ID`             | Server only     | Yes      | AWS access key                                          |
| `AWS_SECRET_ACCESS_KEY`         | Server only     | Yes      | AWS secret key                                          |
| `AWS_S3_BUCKET`                 | Server only     | Yes      | S3 bucket name                                          |
| `RESEND_API_KEY`                | Server only     | Yes      | Resend email API key                                    |
| `EMAIL_FROM`                    | Server only     | No       | Sender email address                                    |
| `NODE_ENV`                      | Both            | Auto     | Environment (development/production/test)               |

> **See Also**: [§11 External Services](#11-external-service-integration) | [§17.4 Config Dependencies](#174-config-dependencies)

---

## 13. Testing Summary

### 13.1 Test Pyramid

| Layer            | Framework  | Files   | Cases     | Focus                                           |
| ---------------- | ---------- | ------- | --------- | ----------------------------------------------- |
| Unit (web)       | Jest       | 180     | ~2,800    | Pure functions, service methods, components     |
| Unit (mobile)    | Jest       | 17      | ~200      | Mobile components, hooks, services              |
| E2E (API)        | Cypress    | 21      | ~190      | Route access, auth enforcement, response format |
| E2E (UI)         | Playwright | 16      | ~149      | Full browser journeys, multi-page flows         |
| **Total**        |            | **234** | **3,287** | Verified via `npm test` (178 suites, all pass)  |

### 13.2 Coverage Thresholds (jest.config.ts)

| Metric     | Threshold |
| ---------- | --------- |
| Statements | 80%       |
| Branches   | 80%       |
| Functions  | 80%       |
| Lines      | 80%       |

### 13.3 Quality Gates

1. ESLint + Prettier (zero warnings)
2. `tsc --noEmit --strict` (zero errors)
3. Jest (all pass, coverage >= 80%)
4. `next build` (zero errors)
5. Cypress (21 specs pass)
6. Playwright (16 specs pass)

### 13.4 Critical Path Tests

| ID    | Path              | Framework      | Validates                              |
| ----- | ----------------- | -------------- | -------------------------------------- |
| CP-01 | Auth flow         | Playwright     | Login → session → protected route      |
| CP-02 | Payment checkout  | Jest + Cypress | Stripe checkout, webhook handling      |
| CP-03 | Credit repair API | Cypress        | Auth enforcement on all endpoints      |
| CP-04 | Dispute lifecycle | Jest           | Create → send → review → resolve       |
| CP-05 | AI chat           | Cypress        | /api/ai/chat requires auth             |
| CP-06 | Protected routes  | Cypress        | 9+ routes redirect to /login           |
| CP-07 | Public pages      | Cypress        | Landing, pricing, credit/factors = 200 |
| CP-08 | Input validation  | Jest           | Prompt injection, PII detection        |
| CP-09 | Rate limiting     | Jest           | Per-IP and per-user throttling         |
| CP-10 | Document upload   | Jest           | S3 upload, validation, presigned URL   |

> **See Also**: [§17.3 Coverage Gaps](#173-coverage-gaps) | [§15 Known Issues](#15-known-issues--technical-debt)

---

## 14. Deployment

| Setting           | Value                                        |
| ----------------- | -------------------------------------------- |
| **Host**          | Vercel                                       |
| **Build Command** | `next build`                                 |
| **Output**        | Standalone (Docker-compatible)               |
| **Region**        | Auto (Vercel Edge Network)                   |
| **Node Version**  | 22.x                                         |
| **Auto-deploy**   | main branch → production                     |
| **Preview**       | All PRs get preview deployments              |
| **CI/CD Config**  | None (Vercel auto-deploy; no GitHub Actions) |

### Build Configuration (next.config.ts)

- Output: `standalone` (for Docker/serverless)
- 5-chunk optimization strategy
- Webpack caching enabled
- Image optimization: WebP/AVIF, remote patterns for Supabase
- Environment variable validation at build time

> **See Also**: [§2 Technology Stack](#2-technology-stack) | [§12 Environment Variables](#12-environment-variables-required)

---

## 14.5 Mobile App (React Native / Expo)

| Setting          | Value                                        |
| ---------------- | -------------------------------------------- |
| **Framework**    | React Native + Expo SDK                      |
| **Router**       | Expo Router (file-based, mirrors web)        |
| **Source Files** | 138 (.ts/.tsx under mobile-app/src/)         |
| **Route Files**  | 248 (.tsx under mobile-app/app/)             |
| **Route Groups** | 36 top-level directories                     |
| **Test Files**   | 17 (Jest)                                    |

### Route Groups

```
mobile-app/app/
├── (auth)/                # Authentication flow
├── (tabs)/                # Tab navigation
├── activity/              # Activity feed
├── admin/                 # Admin panel
├── analytics/             # Analytics views
├── billing/               # Billing management
├── chat/                  # Chat interface
├── coach/                 # AI financial coach
├── credit/                # Credit overview
├── credit-builder/        # Credit building tools
├── credit-repair/         # Credit repair tools
├── dashboard/             # Main dashboard
├── dispute/ & disputes/   # Dispute management
├── document/ & documents/ # Document management
├── financial/             # Financial tools
├── financial-intelligence/# AI financial insights
├── help/                  # Help & support
├── identity/              # Identity verification
├── insights/              # Financial insights
├── investments/           # Investment portfolio
├── loans/                 # Loan management
├── marketplace/           # Financial marketplace
├── monitoring/            # Credit monitoring
├── notifications/         # Notifications
├── onboarding/            # User onboarding
├── profile/               # User profile
├── recommendations/       # AI recommendations
├── reports/               # Financial reports
├── rewards/               # Gamification rewards
├── search/                # Global search
├── settings/              # App settings
├── student-loans/         # Student loan tools
├── tax/                   # Tax optimization
└── trading/               # Trading interface
```

> **See Also**: [§14 Deployment](#14-deployment) | [§16.4.1 Mobile App Parity](#164-feature-implementation-plans)

---

## 15. Known Issues & Technical Debt

### 15.1 Documentation Accuracy Status

CLAUDE.md still contains historical metrics from early development phases. The authoritative metrics are in this SSOT (Section 3). Key divergences in CLAUDE.md:

| What          | CLAUDE.md States         | SSOT (Authoritative)                                |
| ------------- | ------------------------ | --------------------------------------------------- |
| API Routes    | 21                       | **248**                                             |
| Pages         | 6                        | **182**                                             |
| Components    | 10+                      | **228**                                             |
| Lines of Code | 15,000+                  | **135,900**                                         |
| Source Files  | 60+                      | **1,337**                                           |
| Test Cases    | 83                       | **3,287**                                           |
| Pricing Tiers | 3 ($29/$79/$199)         | **6 (Free/$29.99/$99.99/$159.99/$199.99/$399.99)**  |
| Tier Names    | Basic/Premium/Enterprise | **Free/Standard/Pro/Family Duo/Family/Family Plus** |

> **Note**: CLAUDE.md serves as a pair programming guide and retains the development journey narrative. This SSOT is the canonical reference for current metrics.

### 15.2 Technical Debt

| ID    | Area                                       | Risk                        | Remediation                        |
| ----- | ------------------------------------------ | --------------------------- | ---------------------------------- |
| TD-01 | Deprecated `src/lib/supabase.ts`           | Import confusion, auth bugs | Migrate to `@/lib/supabase/client` |
| TD-02 | In-memory rate limiting                    | Resets on deploy/restart    | Move to Redis or Supabase          |
| TD-03 | In-memory audit logs (10K cap)             | Logs lost on restart        | Persist to database                |
| TD-04 | In-memory metrics                          | Data lost on restart        | Persist to metrics service         |
| TD-05 | Mixed branding (CPFI/CreditMaster/Fynvita) | User confusion              | Systematic rename                  |
| TD-06 | 114 doc files (many overlap/conflict)      | Developer confusion         | Consolidate                        |
| TD-07 | No database migrations                     | Unreproducible environments | Add migration tooling              |
| TD-08 | No CI/CD pipeline config                   | Manual deployment risk      | Add GitHub Actions                 |
| TD-09 | Large component files (300-600+ lines)     | Maintainability             | Extract sub-components             |
| TD-10 | No feature flag infrastructure             | Risky deployments           | Add flag system                    |

### 15.3 Pending Architectural Decisions

| ID     | Decision                                                     | Status                   |
| ------ | ------------------------------------------------------------ | ------------------------ |
| DEC-01 | Supabase client pattern: migrate to `@/lib/supabase/client`  | **Decided: Migrate**     |
| DEC-02 | State management: Context vs Zustand vs TanStack Query       | Open                     |
| DEC-03 | Caching: None vs Redis vs ISR vs in-memory                   | Open                     |
| DEC-04 | Real-time: Polling vs WebSockets vs SSE vs Supabase Realtime | Open                     |
| DEC-05 | Monorepo: Keep single app vs split (web + mobile + shared)   | Open                     |
| DEC-06 | API versioning: None vs URL-based vs header-based            | Open                     |
| DEC-07 | Feature flags: None vs env vars vs LaunchDarkly              | Open                     |
| DEC-08 | Error monitoring: Console vs Sentry vs Datadog               | Open                     |
| DEC-09 | CI/CD: GitHub Actions vs Vercel CI vs both                   | Open                     |
| DEC-10 | Database migrations: Manual vs Prisma vs Supabase CLI        | Open                     |
| DEC-11 | Outdated docs cleanup: Archive vs update vs delete           | Open                     |
| DEC-12 | Brand consolidation: Full rename to Fynvita                  | **Decided: In progress** |

#### 15.3.1 PCTT Trading Decisions (FPCTT-DEC-*)

| ID | Decision | Resolution |
| -- | -------- | ---------- |
| FPCTT-DEC-01 | Fly.io persistent service (not serverless) | **Decided**: Zero cold starts for trading; ~$65/mo |
| FPCTT-DEC-02 | Supabase Realtime over Redis Pub/Sub for client updates | **Decided**: Simpler stack, built-in auth |
| FPCTT-DEC-03 | 7-stage pipeline (not monolithic signal engine) | **Decided**: Modular, testable, extensible |
| FPCTT-DEC-04 | Autonomous-first design (Watch → Guided → Autonomous) | **Decided**: Graduated trust model |
| FPCTT-DEC-05 | Paper trading graduation (30 trades, 30 days, positive expectancy) | **Decided**: Safety gate before live |
| FPCTT-DEC-06 | AIML API as primary AI provider (300+ models) | **Decided**: Cost-effective, fallback chain |
| FPCTT-DEC-07 | Alpaca-first broker (paper + live, fractional shares) | **Decided**: Best API, paper mode built-in |
| FPCTT-DEC-08 | Financial wellness integration (not standalone trading) | **Decided**: Unified platform approach |
| FPCTT-DEC-09 | Lightweight Charts v5 (not TradingView widget) | **Decided**: Free, customizable, no license fees |
| FPCTT-DEC-10 | 3-tier memory: Upstash Redis (hot) + Supabase (warm) + S3 (cold) | **Decided**: Cost-optimized persistence |
| FPCTT-DEC-11 | Upstash Redis for trading state + rate limiting | **Decided**: Serverless Redis, $10/mo |

> **See Also**: [§13 Testing](#13-testing-summary) | [§17.3 Coverage Gaps](#173-coverage-gaps) | [§16 Consolidated Plan](#16-consolidated-implementation-plan)

---

## 16. Consolidated Implementation Plan

> **This section consolidates all implementation plans, roadmaps, upgrade strategies, and feature specs from 26 separate documents into a single authoritative reference. The original docs can be archived to `docs/archive/plans/`.**
>
> **DICE v3.3 Enhancement**: All modules and tasks now reference stable TASK-{DOMAIN}-{NN} identifiers from `docs/ssot/task_extraction.md` (80 normalized tasks).

### 16.1 Module Completion Status

| Module                  | Current Score | Target | Gap  | Priority | Task IDs |
| ----------------------- | ------------- | ------ | ---- | -------- | -------- |
| Tax Optimization        | 100%          | 100    | 0    | Done     | TASK-FIN-07 (remaining export gap only) |
| Budgeting/Financial     | 91%           | 102    | +11  | HIGH     | TASK-FIN-01, FIN-02, FIN-03, FIN-04, FIN-05, FIN-06, FIN-07, FIN-08 |
| Credit Repair           | 88%           | 102    | +14  | HIGH     | TASK-CRD-01, CRD-02, CRD-03, CRD-04, CRD-05, CRD-06 |
| Security                | 75%           | 102    | +27  | HIGH     | TASK-SEC-01, SEC-02, SEC-03, SEC-04, SEC-05 |
| Investment Intelligence | 71%           | 102    | +31  | HIGH     | TASK-INV-01, INV-02, INV-03, INV-04, INV-05, INV-06 |
| Trading System          | 65%           | 102    | +37  | MEDIUM   | TASK-TRD-01, TRD-02, TRD-03, TRD-04, TRD-05, TRD-06, TRD-07 |
| Risk Management         | 65%           | 102    | +37  | MEDIUM   | TASK-RSK-01, RSK-02, RSK-03, RSK-04, RSK-05, RSK-06 |
| AI/ML Features          | 64%           | 102    | +38  | MEDIUM   | TASK-AIM-01, AIM-02 |
| Gamification            | 60%           | 102    | +42  | LOW      | TASK-GMF-01, GMF-02 |
| Mobile App Parity       | 30%           | 102    | +72  | HIGH     | TASK-MOB-01, MOB-02, MOB-03 |
| Global Connector        | 0%            | 102    | +102 | LOW      | TASK-GLC-01 |

**Cross-cutting infrastructure**: TASK-INF-01 through TASK-INF-11, TASK-ADM-01 through TASK-ADM-03, TASK-NTF-01 through TASK-NTF-03, TASK-ONB-01, TASK-DOC-01, TASK-PLT-01, TASK-PLT-02

**Overall Platform Score**: 76/102 → Target: 102/102 (A+ rating)

### 16.2 Roadmap Overview (Q1-Q4 2026)

| Phase                            | Quarter    | Focus                   | Status            | Key Deliverables                                  | Task IDs |
| -------------------------------- | ---------- | ----------------------- | ----------------- | ------------------------------------------------- | -------- |
| **Phase 1: Foundation**          | Q1 2026    | Core platform stability | **100% Complete** | Onboarding UX, chat engine, auth hardening        | (Complete) |
| **Phase 2: Growth**              | Q1-Q2 2026 | Revenue features        | **95% Complete**  | Stripe 6-tier pricing, marketplace, notifications | TASK-NTF-01, NTF-02, NTF-03, PLT-02 |
| **Phase 3: Differentiation**     | Q2 2026    | Competitive moat        | **95% Complete**  | AI personalization, gamification, credit builder  | TASK-AIM-01, GMF-01, GMF-02, CRD-05, CRD-06 |
| **Phase 3.5: AI & Gamification** | Q2-Q3 2026 | Deep integration        | **70% Complete**  | Behavioral coaching, XP system, nudge engine      | TASK-AIM-01, AIM-02, GMF-01, GMF-02 |
| **Phase 4: Scale**               | Q3-Q4 2026 | Infrastructure          | **70% Complete**  | Mobile parity, global connector, trading engines  | TASK-MOB-01, MOB-02, MOB-03, GLC-01, TRD-01 through TRD-07 |
| **Phase 5: Tax Optimization**    | Q4 2026    | Tax module              | **100% Complete** | Tax engine, OCR, retirement optimization          | (Complete, TASK-FIN-07 for remaining export) |

### 16.3 A+ Upgrade Strategy (76 → 102)

**Timeline**: 20 weeks across 8 implementation phases
**Estimated Budget**: ~$3,000/month (ML infra $500, LLM APIs $2,000, market data $200)

#### 16.3.1 Credit Repair Upgrade (88 → 102, 10 weeks)

| Feature                    | Description                                                                   | Effort | Task ID |
| -------------------------- | ----------------------------------------------------------------------------- | ------ | ------- |
| Live Bureau APIs           | Experian ($0.50-2.00/pull), Equifax ($1-3/pull), TransUnion ($0.75-2.50/pull) | L      | TASK-CRD-04 |
| AI OCR Response Processing | Parse bureau responses, extract outcomes, update dispute status               | M      | TASK-CRD-04 (sub-task) |
| ML Success Prediction      | Train model on dispute outcomes; predict success rate before submission       | L      | TASK-CRD-03 |
| Autonomous Dispute Agent   | Full lifecycle: detect → generate → submit → track → resolve                  | XL     | TASK-CRD-01, CRD-02 |

#### 16.3.2 Financial Upgrade (91 → 102, 10 weeks)

| Feature                  | Description                                                 | Effort | Task ID |
| ------------------------ | ----------------------------------------------------------- | ------ | ------- |
| Predictive Cash Flow     | ML-based cash flow forecasting (target >90% accuracy)       | L      | TASK-FIN-05 |
| Smart Payment Scheduling | Optimize payment dates to minimize interest, maximize float | M      | TASK-FIN-01 |
| Gig Economy Support      | Irregular income modeling, 1099 tax estimation              | M      | TASK-FIN-03 |
| Multi-Currency           | International account aggregation, FX conversion            | L      | TASK-GLC-01 (partial) |
| Family Collaboration     | Shared budgets, delegated access, family financial goals    | M      | TASK-ADM-02 |

#### 16.3.3 Trading System Upgrade — PCTT Architecture (12 weeks)

> **Authoritative reference**: `docs/FYNVITA-PCTT-TRADING-SYSTEM.md` (4,563 lines). When in conflict, that document wins for all trading decisions.

**Architecture: Pivot-Constrained Trendline Trading (PCTT) Pipeline**

```
┌──────────────────────────────────────────────────────────────────┐
│  TIER 1 — CLIENT (React Native + Next.js)                        │
│  Mobile app · Web dashboard · TradingView charts                 │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTPS / WebSocket
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  TIER 2 — FRONTEND (Vercel)                                      │
│  Next.js API routes · Auth · Input validation · Rate limiting    │
└──────────────────────────┬───────────────────────────────────────┘
                           │ Internal API
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  TIER 3 — TRADING SERVICE (Fly.io — persistent, zero cold start) │
│                                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ FP-01   │→│ FP-02   │→│ FP-03   │→│ FP-04   │→│ FP-05   │  │
│  │ Regime  │ │ Pivot   │ │Trendline│ │ Signal  │ │Conflu-  │  │
│  │Detection│ │  ID     │ │ Build   │ │  Gen    │ │ ence    │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └────┬────┘  │
│                                                        ▼        │
│  ┌──────────────────┐  ┌─────────┐  ┌─────────────────────┐    │
│  │ 7 AI Agents      │  │ FP-06   │←─│ 30-Law Compliance   │    │
│  │ Sentiment, Regime│  │  Risk   │  │ Engine              │    │
│  │ News, Explainer  │  │ Assess  │  └─────────────────────┘    │
│  │ Risk, Earnings   │  └────┬────┘                              │
│  │ Consensus        │       ▼                                   │
│  └──────────────────┘  ┌─────────┐                              │
│                        │ FP-07   │ → Alpaca (paper or live)     │
│  3 Modes:              │  Trade  │                              │
│  WATCH → GUIDED →      │  Recom  │                              │
│  AUTONOMOUS            └─────────┘                              │
└──────────────────────────┬───────────────────────────────────────┘
                           │
          ┌────────┬───────┼────────┬──────────┐
          ▼        ▼       ▼        ▼          ▼
     ┌────────┐┌───────┐┌──────┐┌─────────┐┌──────┐
     │Supabase││Upstash││Alpaca││ AI APIs  ││Market│
     │  DB    ││ Redis ││Broker││AIML,     ││ Data │
     │  Auth  ││ State ││ API  ││Anthropic ││Alpha │
     │  RLS   ││ Cache ││      ││OpenAI,xAI││Vntge │
     └────────┘└───────┘└──────┘└──────────┘└──────┘
```

**7-Stage Pipeline** (FP-01 → FP-07):

| Stage | Name | Purpose | Key Output |
| ----- | ---- | ------- | ---------- |
| FP-01 | Regime Detection | Classify market as trending/ranging/volatile/breakout | Regime label + confidence |
| FP-02 | Pivot Identification | Detect swing highs/lows using fractal + volume analysis | Confirmed pivot points |
| FP-03 | Trendline Construction | Build support/resistance lines from pivots | Active trendline set |
| FP-04 | Signal Generation | Generate trade signals from trendline + indicator confluence | Raw trade signals |
| FP-05 | Confluence Scoring | Score signals 0-100 across multiple confirmations | Confluence score |
| FP-06 | Risk Assessment | Position sizing, 3-gate risk gateway, 5 circuit breakers | Risk-adjusted parameters |
| FP-07 | Trade Recommendation | Final recommendation with entry/exit/stop | Actionable trade plan |

> Non-PCTT strategies (Mean Reversion, Dual Momentum, Turtle, etc.) bypass FP-02/FP-03 and inject signals at FP-04.

**3 Operating Modes**:

| Mode | Behavior | Graduation Criteria |
| ---- | -------- | ------------------- |
| WATCH | Observe signals, paper trade only | Default for all users |
| GUIDED | Signals sent as notifications, user confirms | 30 paper trades + positive expectancy + 30 days |
| AUTONOMOUS | Automatic execution with circuit breakers | 30 live trades + positive expectancy + law compliance ≥60% |

**Key Features**:

| Feature | Description | Effort | Task ID |
| ------- | ----------- | ------ | ------- |
| 7-Stage Pipeline | PCTT regime → pivot → trendline → signal → confluence → risk → trade | XL | TASK-TRD-03 |
| 7 AI Trading Agents | Sentiment, Regime, News, Explainer, Risk, Earnings, Consensus | L | TASK-TRD-08 |
| 10 Pre-Built Strategies | PCTT Compression, Trend Pullback, Mean Reversion, Wyckoff, etc. | L | TASK-TRD-09 |
| Custom Strategy Builder | Visual rule builder with 30+ indicators, JSONB rules schema | M | TASK-TRD-10 |
| 30-Law Compliance Engine | Every signal scored 0-100 against applicable trading laws | M | TASK-TRD-11 |
| Autonomous Trading Engine | 3-mode system (Watch → Guided → Autonomous) with graduation | L | TASK-TRD-12 |
| Fly.io Trading Service | Persistent process, zero cold starts, WebSocket streaming | M | TASK-TRD-13 |
| Broker Integration | Alpaca (primary), paper trading mode with graduation | L | TASK-TRD-01 |
| Risk Gateway (3-gate) | Pre-trade compliance, risk limits, execution gate + 5 circuit breakers | L | TASK-TRD-04, RSK-03 |
| Backtesting Engine | Historical replay, Monte Carlo, walk-forward + strategy validation | L | TASK-TRD-06 |

**Infrastructure** (~$120/mo): Fly.io ($65) + Vercel ($20) + Supabase Pro ($25) + Upstash Redis ($10)

**Success Metrics**: Sharpe ratio >2.0, max drawdown <15%, win rate >55%, pipeline latency <2s, AI fallback success >99.5%

#### 16.3.4 Risk Management Upgrade — PCTT Risk Gateway (12 weeks)

**3-Gate Risk Gateway** (integrated into PCTT pipeline stage FP-06):

| Gate | Name | Function | Blocks |
| ---- | ---- | -------- | ------ |
| Gate 1 | Pre-Trade Compliance | 30-Law compliance score ≥ threshold, account status check | Non-compliant signals |
| Gate 2 | Risk Limits | Position sizing (Kelly/volatility-adjusted), exposure caps, correlation | Oversized/concentrated trades |
| Gate 3 | Execution Gate | Liquidity check, slippage estimate, market hours validation | Illiquid/after-hours trades |

**5 Circuit Breakers** (auto-pause all trading):

| Breaker | Threshold | Reset |
| ------- | --------- | ----- |
| Daily Loss | 2% of portfolio | Next trading day |
| Weekly Loss | 5% of portfolio | Monday open |
| Monthly Loss | 10% of portfolio | 1st of month |
| Consecutive Losses | 5 trades | Manual review + reset |
| Single Position | 3% of portfolio | Auto (position closed) |

| Feature | Description | Effort | Task ID |
| ------- | ----------- | ------ | ------- |
| 3-Gate Risk Gateway | Pre-trade compliance, risk limits, execution gate | L | TASK-RSK-03 |
| 5 Circuit Breakers | Daily/weekly/monthly/consecutive/position limits | M | TASK-RSK-03 |
| Position Sizing | Kelly Criterion, volatility-adjusted, risk-parity allocation | M | TASK-RSK-02 |
| Correlation Monitor | Cross-asset correlation tracking, diversification scoring | M | TASK-RSK-04 |
| Stress Testing | Historical scenario replay, Monte Carlo VaR, tail risk analysis | L | TASK-RSK-05 |
| Real-Time Risk Dashboard | Live P&L, Greeks exposure, sector concentration | M | TASK-RSK-06 |
| Risk Rules Engine | Configurable TypeScript rules with real-time evaluation | L | TASK-RSK-01 |

### 16.4 Feature Implementation Plans

#### 16.4.1 Mobile App Parity (14 weeks, 680 hours) [TASK-MOB-01, TASK-MOB-02, TASK-MOB-03]

**Stack**: React Native 0.74 + Expo SDK 51
**Gap**: 126 web pages vs 29 mobile screens → 97 screens to implement

| Phase                        | Duration | Screens | Focus                                                    |
| ---------------------------- | -------- | ------- | -------------------------------------------------------- |
| P0: Critical                 | 3 weeks  | 25      | Auth, dashboard, credit score, budgeting, notifications  |
| P1: Credit Karma Competitive | 3 weeks  | 20      | Credit repair, disputes, credit builder, score simulator |
| P2: Financial Intelligence   | 3 weeks  | 22      | Investments, trading, tax, financial tools               |
| P3: Marketplace & Admin      | 3 weeks  | 20      | Marketplace, settings, admin, gamification               |
| P4: Testing & Polish         | 2 weeks  | 10      | E2E tests, performance, accessibility                    |

#### 16.4.2 Intelligent Financial Suite (12 weeks, 3-4 developers) [TASK-FIN-03, TASK-FIN-04, TASK-FIN-05, TASK-FIN-08]

**4 sub-systems**:

1. **Intelligent Banking** [TASK-FIN-08] — Account aggregation, spending categorization, anomaly detection
2. **AI Financial Coach** [TASK-FIN-05] — Behavioral finance coaching, goal-based nudges, emotional spending detection
3. **Expert Asset Scanner** [TASK-INV-01, TASK-INV-02] — Real-time market data (Alpha Vantage, Polygon.io, CoinGecko, Finnhub), portfolio rebalancing
4. **Financial Chat Engine** — Intent detection (10 types), entity extraction (6 types), action execution (10 types)

**New Database Tables**: 8 (banking_accounts, transaction_categories, ai_coaching_sessions, asset_scans, chat_sessions, chat_messages, portfolio_snapshots, market_alerts)

#### 16.4.3 Global Connector Strategy (12 weeks, 3 phases) [TASK-GLC-01]

**3 Rails Architecture**:

| Rail            | Purpose                                                     | Key Integration               |
| --------------- | ----------------------------------------------------------- | ----------------------------- |
| Data Rail       | Account aggregation (bank, brokerage, crypto)               | TrueLayer (EU/UK), Plaid (US) |
| Commercial Rail | Affiliate revenue, insurance leads, product recommendations | Partner APIs, lead-gen        |
| Payment Rail    | Bank-to-bank transfers, card payments, crypto on-ramp       | Banking APIs, card networks   |

**New Database Tables**: 8 (connector_registry, partner_configs, affiliate_clicks, insurance_quotes, payment_rails, bank_connections, transfer_logs, commission_ledger)

#### 16.4.4 AI Personalization & Gamification (5 sprints) [TASK-AIM-01, TASK-AIM-02, TASK-GMF-01, TASK-GMF-02]

| Component                    | Description                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------- |
| Behavioral Finance Coaching  | Pipeline: spending analysis → pattern detection → personalized advice           |
| Goal-Based Nudge System      | Contextual nudges triggered by financial events, idle periods, goal proximity   |
| Emotional Spending Detection | NLP on transaction memos, time-of-day patterns, category clustering             |
| Gamified Dashboard           | ProgressRings, achievement badges (5 rarity tiers), XP/level system (30 levels) |
| Social Features              | Leaderboard (opt-in), challenges (solo + team), referral bonuses                |

**Gamification Leveling**: 30 levels, XP curve = `100 * level^1.5`, max level title: "Financial Sage"

#### 16.4.5 Onboarding Enhancement (138 hours, 3 phases) [TASK-ONB-01]

| Phase                | Hours | Focus                                                | Target Improvement   |
| -------------------- | ----- | ---------------------------------------------------- | -------------------- |
| Phase 1: Critical    | 30h   | Progress save/resume, smart defaults, error recovery | Completion 45% → 55% |
| Phase 2: Enhanced UX | 48h   | Contextual tooltips, skip/defer, adaptive forms      | Completion 55% → 65% |
| Phase 3: Polish      | 60h   | Animations, social proof, A/B testing                | Completion 65% → 75% |

**Targets**: Completion rate 45% → 75%, time 10min → 4min, drop-off 55% → 25%

#### 16.4.6 Tax Optimization Module (Complete)

| Feature                                                  | Status |
| -------------------------------------------------------- | ------ |
| Tax Calculation Engine                                   | Done   |
| Retirement Optimization (Roth conversions, RMD planning) | Done   |
| Document OCR (W-2, 1099 parsing)                         | Done   |
| Scenario Modeling (what-if tax projections)              | Done   |
| Tax-Loss Harvesting Integration                          | Done   |

#### 16.4.7 Financial Chat Engine (Phase 6 Architecture)

```
Intent Types (10): balance_inquiry, spending_analysis, budget_check,
  investment_query, credit_score, bill_reminder, savings_goal,
  transaction_search, financial_advice, general_chat

Entity Types (6): amount, date_range, category, account,
  merchant, financial_metric

Action Types (10): fetch_balance, analyze_spending, check_budget,
  get_portfolio, get_credit_score, list_bills, check_savings,
  search_transactions, generate_advice, conversational_response
```

**Implementation**: FinancialChatEngine (804 lines) with Supabase RLS (8 policies), database triggers (2), helper functions (3)

#### 16.4.8 Plaid Full SDK Integration

**Objective**: Migrate from direct HTTP calls to official Plaid Node.js SDK. Enable all 8 Plaid products for comprehensive financial data aggregation across web and mobile.

| Component | Status | Task |
|-----------|--------|------|
| SDK Migration (direct HTTP → `plaid` npm package) | Planned | TASK-PLD-01 |
| Product Configuration (Auth, Transactions, Balance, Investments, Liabilities, Identity, Income, Enrich) | Planned | TASK-PLD-01 |
| Webhook Infrastructure (item, transaction, income, assets events) | Planned | TASK-PLD-02 |
| Signature Verification (HMAC-SHA256) | Planned | TASK-PLD-02 |
| Mobile Hosted Link (Expo WebView + OAuth redirect) | Planned | TASK-PLD-03 |
| Investment Holdings & Securities Import | Planned | TASK-PLD-04 |
| Liabilities Import (credit, mortgage, student loans) | Planned | TASK-PLD-04 |
| Income Verification & Employment Data | Planned | TASK-PLD-05 |
| Transaction Enrichment (merchant logos, categories, geolocation) | Planned | TASK-PLD-05 |

**Architecture**: `PlaidSDKClient` (singleton) → `PlaidWebhookHandler` → `PlaidProductService` (per-product). All products feed into existing financial, investment, and credit services via adapter pattern.

**Key Files**:
- `src/lib/financial/plaid-service.ts` (existing — to be migrated)
- `src/app/api/financial/plaid/` (existing endpoints — to be extended)
- `src/lib/financial/plaid-webhook-handler.ts` (new)
- `mobile-app/src/components/PlaidHostedLink.tsx` (new)

**Env Variables**: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` (sandbox/development/production), `PLAID_WEBHOOK_SECRET`

#### 16.4.9 DriveWealth Fractional Trading (BaaS)

**Objective**: Integrate DriveWealth Brokerage-as-a-Service for fractional share trading. Enable dollar-based investing with $1 minimums across 4,000+ US equities and 3,000+ ETFs.

| Component | Status | Task |
|-----------|--------|------|
| DriveWealth REST API Client | Planned | TASK-TRD-15 |
| `DriveWealthBrokerAdapter` (implements `BrokerInterface`) | Planned | TASK-TRD-15 |
| SQS Notification Consumer (order fills, account events) | Planned | TASK-TRD-15 |
| Fractional Share Support (8 decimal places, notional orders) | Planned | TASK-TRD-15 |
| Multi-Broker Router (dynamic broker selection) | Planned | TASK-TRD-16 |
| Unified Portfolio Aggregation | Planned | TASK-TRD-16 |
| Dollar-Based Order Engine ($X of AAPL) | Planned | TASK-TRD-17 |
| Auto-Invest / Recurring Scheduler | Planned | TASK-TRD-17 |
| DRIP (Dividend Reinvestment) for Fractional | Planned | TASK-TRD-17 |
| Unified KYC/Account Opening Flow | Planned | TASK-TRD-18 |

**Architecture**: `BrokerRouter` selects broker per order based on: user preference, asset class capability (fractional → DriveWealth, options → Alpaca), cost optimization. Existing `BrokerInterface` in `src/lib/trading/brokers/broker-interface.ts` already defines the adapter contract with `SupportedBroker` type.

**Broker Comparison**:

| Feature | Alpaca (Current) | DriveWealth (New) |
|---------|-----------------|-------------------|
| Fractional Shares | Yes (limited) | Yes (8 decimals, $1 min) |
| Options | Yes | L2 only |
| Assets | US equities, crypto | 4,000+ equities, 3,000+ ETFs, mutual funds, ADRs |
| API Style | REST + WebSocket | REST + FIX + SQS |
| Crypto | Yes | BTC, ETH only |
| License | Own BD | Own BD (SEC/FINRA) |

**Key Files**:
- `src/lib/trading/brokers/broker-interface.ts` (existing — add DriveWealth type)
- `src/lib/trading/brokers/drivewealth-broker.ts` (new)
- `src/lib/trading/brokers/broker-router.ts` (new)
- `src/lib/trading/fractional/` (new directory)

**Env Variables**: `DRIVEWEALTH_API_KEY`, `DRIVEWEALTH_API_SECRET`, `DRIVEWEALTH_API_URL`, `DRIVEWEALTH_SQS_QUEUE_URL`

#### 16.4.10 Multi-Broker Architecture Expansion

**Objective**: Evolve from single-broker (Alpaca) to multi-broker architecture. Phase 1: Alpaca (current) → Phase 2: +DriveWealth → Phase 3: +Tradier → Phase 4: +Apex/IBKR.

**Phasing**:

| Phase | Broker | Timeline | Capabilities Added |
|-------|--------|----------|-------------------|
| 1 (Current) | Alpaca | Done | US equities, options, crypto, paper trading |
| 2 (Wave 6) | +DriveWealth | 8 weeks | Fractional shares, auto-invest, $1 minimums |
| 3 (Future) | +Tradier | TBD | Zero-commission options, advanced options strategies |
| 4 (Future) | +Apex/IBKR | TBD | Global markets, futures, institutional clearing |

**Key Design Decisions**:
- Broker selection is per-order, not per-account (users can trade through multiple brokers)
- Portfolio view aggregates positions across all connected brokers
- Paper trading remains in-house (not routed to broker sandboxes)
- Regulatory disclosures are broker-specific and rendered dynamically

#### 16.4.11 Affiliate Monetization Platform

**Objective**: Build affiliate recommendation and monetization engine using Engine by MoneyLion as the primary marketplace API. Personalized product matching for credit cards, insurance, and loans with compliant revenue tracking.

| Component | Status | Task |
|-----------|--------|------|
| MoneyLion Engine API Integration | Planned | TASK-AFF-01 |
| Product Catalog Sync & Matching | Planned | TASK-AFF-01 |
| Credit Card Recommendation Engine | Planned | TASK-AFF-02 |
| Application Tracking (click → apply → approved) | Planned | TASK-AFF-02 |
| Insurance Product Matching (auto, home, life, renters) | Planned | TASK-AFF-03 |
| Personal Loan Comparison Engine | Planned | TASK-AFF-03 |
| FTC Disclosure Framework | Planned | TASK-AFF-04 |
| CFPB Fair Lending Compliance | Planned | TASK-AFF-04 |
| Revenue Reporting Dashboard | Planned | TASK-AFF-04 |

**Revenue Model**:

| Product | Revenue Type | Expected Range |
|---------|-------------|---------------|
| Credit Cards | CPA (per approval) | $50-200 |
| Personal Loans | CPL (per lead) | $1-70 |
| Insurance | CPA (per sale) | ~$120 |
| Overall ARPU | Blended | $1.50-$6.40/user/month |

**Architecture**: `AffiliateEngine` → `MoneyLionClient` (API) → `ProductMatcher` (scoring) → `ComplianceChecker` (FTC/CFPB). Recommendations surfaced in financial dashboard, credit repair flow, and dedicated marketplace page.

**Key Files**:
- `src/lib/affiliate/` (new directory)
- `src/lib/affiliate/moneylion-client.ts` (new)
- `src/lib/affiliate/product-matcher.ts` (new)
- `src/lib/affiliate/compliance-checker.ts` (new)
- `src/lib/affiliate/revenue-tracker.ts` (new)
- `src/app/api/affiliate/` (new API routes)

**Env Variables**: `MONEYLION_API_KEY`, `MONEYLION_PARTNER_ID`, `MONEYLION_WEBHOOK_SECRET`

### 16.5 Master Task Priority Matrix

| Priority            | Timeframe | Tasks     | Examples                                                                                          | Task IDs |
| ------------------- | --------- | --------- | ------------------------------------------------------------------------------------------------- | -------- |
| **P0: Immediate**   | 2 weeks   | 8 tasks   | Fix CLAUDE.md metrics, persistent rate limiting, audit log persistence, Supabase client migration | TASK-CRD-04, TASK-TRD-01, TASK-TRD-07, TASK-GMF-01 |
| **P1: Short-term**  | 1 month   | 12 tasks  | Credit bureau API integration, ML success prediction, CI/CD pipeline, brand consolidation         | TASK-CRD-02, CRD-05, CRD-06, FIN-01, FIN-02, FIN-03, FIN-06, TRD-03, TRD-04, TRD-05, RSK-01, RSK-02, RSK-03, NTF-01, NTF-02, NTF-03, AIM-01, ADM-01, ADM-02, ADM-03, MOB-01, SEC-01, SEC-02, SEC-03, INF-01, INF-02, INF-03, INF-06, INF-11 |
| **P2: Medium-term** | 1 quarter | 15 tasks  | Trading engine v1, mobile app phase 1-2, global connector phase 1, AI personalization             | TASK-CRD-01, CRD-03, FIN-04, FIN-05, FIN-07, FIN-08, INV-01, INV-02, INV-04, INV-05, INV-06, TRD-02, TRD-06, RSK-04, RSK-05, RSK-06, GMF-02, AIM-02, MOB-02, MOB-03, SEC-04, SEC-05, INF-04, INF-05, INF-07, INF-08, INF-10, ONB-01, DOC-01 |
| **P3: Long-term**   | 6 months  | 15+ tasks | Full mobile parity, global connector phase 2-3, trading engine v2 (ML+LLM), white-label           | TASK-INF-09, PLT-01, PLT-02, GLC-01 |

### 16.6 Competitive Positioning

| Feature Area            | Fynvita | Credit Karma | Betterment | Wealthfront | Mint   | Robinhood |
| ----------------------- | ------- | ------------ | ---------- | ----------- | ------ | --------- |
| Credit Repair (AI)      | Strong  | Basic        | None       | None        | None   | None      |
| Investment Intelligence | Strong  | None         | Strong     | Strong      | None   | Basic     |
| Budgeting/Financial     | Strong  | None         | Basic      | Basic       | Strong | None      |
| Trading                 | Planned | None         | None       | None        | None   | Strong    |
| Tax Optimization        | Done    | Basic        | Tax-loss   | Tax-loss    | None   | None      |
| AI Chat (300+ models)   | Unique  | None         | None       | None        | None   | None      |
| Gamification            | Partial | None         | None       | None        | None   | Partial   |
| Mobile App              | Planned | Full         | Full       | Full        | Full   | Full      |

**Key Differentiator**: Only platform combining AI credit repair + financial wellness + investment intelligence + 300+ AI model access in one product.

### 16.7 Completed Milestones

| Milestone             | Date        | What Was Delivered                                                     |
| --------------------- | ----------- | ---------------------------------------------------------------------- |
| Onboarding Phase 1    | Jan 7, 2026 | Progress save/resume, smart defaults, real-time validation             |
| Onboarding Phase 2    | Jan 7, 2026 | Contextual tooltips, adaptive forms, skip/defer logic                  |
| Phase 6.2 Chat Engine | Jan 5, 2026 | Financial chat web interface, intent detection, entity extraction      |
| Tax Module            | Q4 2025     | Full tax calculation, OCR, retirement optimization, scenario modeling  |
| 6-Tier Pricing        | Q4 2025     | Free → Family Plus ($0-$399.99), Stripe integration                    |
| Security Hardening    | Q4 2025     | Zero Trust audit (Grade A-), 5-layer security, RBAC (100+ permissions) |
| E2E Test Suite        | Q4 2025     | Cypress (21 specs) + Playwright (16 specs) covering critical paths     |

### 16.8 Security Audit Summary (Zero Trust)

**Audit Grade**: A- (0 critical issues, 500+ files audited)

| Layer                                                  | Coverage | Status                    |
| ------------------------------------------------------ | -------- | ------------------------- |
| Authentication (Supabase Auth + JWT + MFA)             | Full     | Pass                      |
| Authorization (RBAC, 14 categories, 100+ permissions)  | Full     | Pass                      |
| Input Validation (prompt injection, PII, sanitization) | Full     | Pass                      |
| Rate Limiting (per-IP, per-user, cost tracking)        | Partial  | In-memory only (TD-02)    |
| Error Handling (structured logging, audit trail)       | Partial  | In-memory only (TD-03/04) |

### 16.9 Trading System Readiness Audit (PCTT)

| Component | Design | Implementation | Test Coverage | Status |
| --------- | ------ | -------------- | ------------- | ------ |
| 7-Stage Pipeline (FP-01→FP-07) | Complete | Partial (pctt-trading-service.ts exists) | ~60% | Needs expansion |
| 7 AI Trading Agents | Complete | Not started | 0% | Wave 3 |
| 3 Operating Modes (Watch/Guided/Auto) | Complete | Not started | 0% | Wave 3 |
| 30-Law Compliance Engine | Complete | Not started | 0% | Wave 3 |
| Risk Gateway (3-gate + 5 breakers) | Complete | Partial (portfolio-risk.ts) | ~60% | Needs expansion |
| 10 Pre-Built Strategies | Complete | Not started | 0% | Wave 3 |
| Custom Strategy Builder | Complete | Not started | 0% | Wave 3 |
| Fly.io Trading Service | Complete | Not started | 0% | Wave 3 |
| Paper Trading + Graduation | Complete | Partial (paper/ exists) | ~50% | Needs graduation logic |
| Alpaca Broker Integration | Complete | Partial (alpaca-broker.ts) | ~60% | Needs PCTT integration |
| Market Data Pipeline | Complete | Not started | 0% | Wave 3 |
| Web Trading UI | Complete | Partial | ~45% | Needs work |
| Mobile Trading UI | Complete | Partial | ~80% | Ready |

> **Authoritative design**: `docs/FYNVITA-PCTT-TRADING-SYSTEM.md` defines 92 implementation tasks across 9 phases (~1,740 hours, 28 weeks). Existing TASK-TRD-* cards cover foundation; PCTT-specific tasks mapped in §16.3.3.

### 16.10 Source Documents (Archivable)

The following 26 documents were consolidated into this section. They can be moved to `docs/archive/plans/`:

| Document                                           | Lines | Key Content Captured                 |
| -------------------------------------------------- | ----- | ------------------------------------ |
| ENHANCEMENT_ROADMAP.md                             | 900   | §16.2 Roadmap, §16.5 Priority Matrix |
| UPGRADE_PLAN_OVERVIEW.md                           | 243   | §16.3 A+ Strategy, budget, timeline  |
| MASTER_TASK_LIST.md                                | 1,115 | §16.1 Status, §16.5 Priority Matrix  |
| MOBILE_APP_PARITY_IMPLEMENTATION_PLAN.md           | 1,229 | §16.4.1 Mobile App                   |
| INTELLIGENT_FINANCIAL_SUITE_IMPLEMENTATION_PLAN.md | 763   | §16.4.2 Financial Suite              |
| INTELLIGENT_BANKING_IMPLEMENTATION_PLAN.md         | 448   | §16.4.2 Banking sub-system           |
| GLOBAL_CONNECTOR_STRATEGY_PLAN.md                  | 992   | §16.4.3 Global Connector             |
| ONBOARDING_UX_ENHANCEMENT_PLAN.md                  | 1,348 | §16.4.5 Onboarding                   |
| AI_PERSONALIZATION_DESIGN.md                       | 842   | §16.4.4 AI Personalization           |
| UPGRADE_TRADING_SYSTEM.md                          | ~400  | §16.3.3 Trading Upgrade              |
| UPGRADE_RISK_MANAGEMENT.md                         | ~400  | §16.3.4 Risk Upgrade                 |
| UPGRADE_CREDIT_REPAIR.md                           | ~300  | §16.3.1 Credit Upgrade               |
| UPGRADE_FINANCIAL.md                               | ~300  | §16.3.2 Financial Upgrade            |
| PHASE_6_ARCHITECTURE_DIAGRAM.md                    | ~500  | §16.4.7 Chat Engine                  |
| ONBOARDING_PHASE1_IMPLEMENTATION.md                | 297   | §16.7 Completed                      |
| ONBOARDING_PHASE2_IMPLEMENTATION.md                | 229   | §16.7 Completed                      |
| PHASE_6.2_IMPLEMENTATION_SUMMARY.md                | ~400  | §16.7 Completed                      |
| phase-6-implementation-guide.md                    | ~300  | §16.4.7 Chat phases                  |
| TAX_OPTIMIZATION_MODULE.md                         | ---   | §16.4.6 Tax (Complete)               |
| TRADING_SYSTEM_AUDIT.md                            | ---   | §16.9 Trading Readiness              |
| FINANCIAL_CHAT_API.md                              | ---   | §16.4.7 Chat API                     |
| FEATURE_GAP_MATRIX.md                              | ---   | §16.6 Competitive                    |
| ZERO_TRUST_AUDIT_REPORT.md                         | 597   | §16.8 Security Audit                 |
| ONBOARDING_IMPLEMENTATION_EXAMPLES.md              | ---   | §16.4.5 (code examples)              |
| ONBOARDING_QUICK_START.md                          | ---   | §16.4.5 (quick start)                |
| ONBOARDING_RECOMMENDATIONS_SUMMARY.md              | ---   | §16.4.5 (summary)                    |

> **See Also**: [§17 Traceability Matrix](#17-traceability-matrix-summary) | [§15 Known Issues](#15-known-issues--technical-debt) | [§3 Metrics](#3-codebase-metrics-verified-2026-02-20)

---

## 17. Traceability Matrix (Summary)

> **Full detail**: [`docs/Traceability_Matrix.md`](../Traceability_Matrix.md) — per-file IDs (ScreenID, ApiID, CodeRef, CompID, TestID, ConfigRef) for every feature domain.

### 17.1 Domain Coverage Summary

| Domain                    | ReqID   | Pages | APIs | Services | Components | Tests | Coverage |
| ------------------------- | ------- | ----- | ---- | -------- | ---------- | ----- | -------- |
| Authentication            | FEAT-01 | 6     | 10   | 26       | 14         | 5     | High     |
| Credit Repair             | FEAT-02 | 20    | 34   | 32       | 25         | 29    | High     |
| Credit Monitoring/Builder | FEAT-03 | 22    | 12   | 6        | 11         | 8     | Medium   |
| Financial Suite           | FEAT-04 | 29    | 47   | 36       | 45         | 30    | High     |
| Investment Platform       | FEAT-05 | 15    | 28   | 29       | 18         | 25    | High     |
| AI/ML Services            | FEAT-06 | 4     | 29   | 21       | 18         | 13    | High     |
| Marketplace               | FEAT-07 | 14    | 12   | 9        | 0          | 7     | Medium   |
| Payment/Subscriptions     | FEAT-08 | 7     | 5    | 6        | 1          | 9     | High     |
| Student Loans             | FEAT-09 | 4     | 9    | 6        | 8          | 6     | Medium   |
| Trading (PCTT)            | FEAT-10 | 3     | 30   | 36       | 8          | 4     | Low (expanding) |
| Notifications             | FEAT-11 | 3     | 7    | 7        | 7          | 1     | Low      |
| Documents                 | FEAT-12 | 3     | 3    | 2        | 6          | 1     | Low      |
| Admin                     | FEAT-13 | 13    | 16   | 9        | 2          | 2     | Low      |
| Onboarding                | FEAT-14 | 6     | 1    | 2        | 7          | 2     | Low      |
| Tax                       | FEAT-15 | 4     | 3    | 16       | 2          | 2     | Low      |
| Plaid Integration     | FEAT-16 | 2     | 6    | 5        | 2          | 0     | Planned  |
| Broker Integration    | FEAT-17 | 1     | 4    | 4        | 2          | 0     | Planned  |
| Affiliate Platform    | FEAT-18 | 2     | 6    | 5        | 3          | 0     | Planned  |
| **Totals (domain-scoped)**| **18**  |**158**|**238**|**257**  | **179**    |**144**| ---      |

### 17.2 Domain → SSOT Section Map

| Domain                    | ReqID   | Primary SSOT Section(s)                                                                             |
| ------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| Authentication            | FEAT-01 | [§7 Security](#7-security-architecture), [§10.3 Auth](#103-infrastructure-services)                 |
| Credit Repair             | FEAT-02 | [§5 API Routes](#5-api-route-inventory-248-routes-across-41-domains), [§8 Pages](#8-page-inventory-182-pages-across-47-domains), [§10.2 Business Logic](#102-business-logic) |
| Credit Monitoring/Builder | FEAT-03 | [§8 Pages](#8-page-inventory-182-pages-across-47-domains), [§9 Components](#9-component-inventory-228-components-across-38-directories) |
| Financial Suite           | FEAT-04 | [§5 API Routes](#5-api-route-inventory-248-routes-across-41-domains), [§10.2 Business Logic](#102-business-logic) |
| Investment Platform       | FEAT-05 | [§5 API Routes](#5-api-route-inventory-248-routes-across-41-domains), [§10.2 Business Logic](#102-business-logic) |
| AI/ML Services            | FEAT-06 | [§5 API Routes](#5-api-route-inventory-248-routes-across-41-domains), [§10.1 Core AI](#101-core-ai-services) |
| Marketplace               | FEAT-07 | [§8 Pages](#8-page-inventory-182-pages-across-47-domains), [§5 API Routes](#5-api-route-inventory-248-routes-across-41-domains) |
| Payment/Subscriptions     | FEAT-08 | [§6 Pricing](#6-subscription--pricing-model), [§11 External Services](#11-external-service-integration) |
| Student Loans             | FEAT-09 | [§10.2 Business Logic](#102-business-logic), [§10.5 Root Files](#105-root-library-files-srclibts)   |
| Trading (PCTT)            | FEAT-10 | [§16.3.3 PCTT Architecture](#1633-trading-system-upgrade--pctt-architecture-12-weeks), [§10.2 Business Logic](#102-business-logic) (trading/ --- 62 files) |
| Notifications             | FEAT-11 | [§10.3 Infrastructure](#103-infrastructure-services), [§11 External Services](#11-external-service-integration) |
| Documents                 | FEAT-12 | [§10.3 Infrastructure](#103-infrastructure-services), [§11 External Services](#11-external-service-integration) |
| Admin                     | FEAT-13 | [§5 API Routes](#5-api-route-inventory-248-routes-across-41-domains), [§8 Pages](#8-page-inventory-182-pages-across-47-domains) |
| Onboarding                | FEAT-14 | [§8 Pages](#8-page-inventory-182-pages-across-47-domains)                                           |
| Tax                       | FEAT-15 | [§10.2 Business Logic](#102-business-logic) (tax/ --- 25 files)                                       |
| Plaid Integration         | FEAT-16 | [§16.4.8 Plaid Full SDK Integration](#1648-plaid-full-sdk-integration)                               |
| Broker Integration        | FEAT-17 | [§16.4.9 DriveWealth Fractional Trading](#1649-drivewealth-fractional-trading-baas), [§16.4.10 Multi-Broker Architecture](#16410-multi-broker-architecture-expansion) |
| Affiliate Platform        | FEAT-18 | [§16.4.11 Affiliate Monetization Platform](#16411-affiliate-monetization-platform)                   |

### 17.3 Coverage Gaps

| Domain            | Services         | Test Files         | Gap Severity                             |
| ----------------- | ---------------- | ------------------ | ---------------------------------------- |
| Trading (PCTT)    | 36 (→100+ planned) | 4                | **HIGH** — Most PCTT pipeline untested; 92 FPCTT tasks pending |
| Notifications     | 7                | 1                  | **HIGH** --- Push notifications untested   |
| Admin             | 9 + 16 APIs      | 2                  | **HIGH** --- Most admin APIs untested      |
| Documents         | 2                | 1 (2 cases)        | **MEDIUM** --- Upload/share untested       |
| Onboarding        | 2 + 7 components | 2                  | **MEDIUM** --- Component tests missing     |
| Tax               | 16               | 2                  | **MEDIUM** --- Only calculator + doc tests |
| Marketplace       | 9                | 5 + 2 E2E          | **LOW** --- Reasonably covered             |
| Credit Monitoring | 6                | 8                  | **LOW** --- Well covered                   |

### 17.4 Config Dependencies

| Service/Feature    | Env Variables Required                                                      |
| ------------------ | --------------------------------------------------------------------------- |
| All pages/routes   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`                 |
| AI features        | `AIML_API_KEY`, `AIML_API_URL`                                              |
| Payments           | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_*_PRICE_ID`           |
| Email              | `RESEND_API_KEY`, `EMAIL_FROM`                                              |
| Documents          | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_REGION` |
| Push notifications | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`                         |
| Market data        | Alpha Vantage, CoinGecko, Polygon API keys (via integrations)               |
| Banking            | Plaid API keys (via `plaid-service.ts`)                                     |
| Plaid (full)       | `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`, `PLAID_WEBHOOK_SECRET`      |
| DriveWealth        | `DRIVEWEALTH_API_KEY`, `DRIVEWEALTH_API_SECRET`, `DRIVEWEALTH_API_URL`, `DRIVEWEALTH_SQS_QUEUE_URL` |
| Affiliate          | `MONEYLION_API_KEY`, `MONEYLION_PARTNER_ID`, `MONEYLION_WEBHOOK_SECRET`     |

### 17.5 Counting Reconciliation

| Metric     | SSOT Raw Count | Matrix Domain Total | Delta | Explanation                                           |
| ---------- | -------------- | ------------------- | ----- | ----------------------------------------------------- |
| Pages      | 182            | 153                 | +29   | Shared pages (layouts, error/loading), utility routes  |
| API Routes | 248            | 222                 | +26   | Cross-cutting routes (cron, monitoring, health, CSRF)  |
| Components | 228            | 172                 | +56   | Shared UI primitives, layout components, chart helpers |

> SSOT §3 counts are raw file counts (`find ... | wc -l`). Matrix totals are domain-scoped and exclude shared/cross-cutting files. Both are correct for their purpose.

> **See Also**: [§16 Consolidated Plan](#16-consolidated-implementation-plan) | [§13 Testing](#13-testing-summary) | [§15 Known Issues](#15-known-issues--technical-debt)

---

## 18. DICE v3.3 Artifact Registry

> Added by DICE v3.3 consolidation on 2026-02-25.

### 18.1 Canonical Artifacts

| # | Artifact | Path | DICE Step | Status |
|---|----------|------|-----------|--------|
| 1 | Single Source of Truth | `docs/ssot/SSOT.md` | Step 4 | This file |
| 2 | Task Extraction | `docs/ssot/task_extraction.md` | Step 2 | Complete (80 tasks) |
| 3 | Dependency Graph | `docs/ssot/dependency_graph.md` | Step 3a | Complete |
| 4 | Build Order Blueprint | `docs/ssot/build_order_blueprint.md` | Step 3b | Complete (6 waves) |
| 5 | Repository Inventory | `docs/ssot/repo_inventory.md` | Step 1 | Complete (106 docs, 1,737 code files) |
| 6 | Master Implementation Plan | `docs/ssot/MASTER-IMPLEMENTATION-PLAN.md` | Step 5 | Complete (80 task cards) |
| 7 | Traceability Matrix | `docs/ssot/traceability_matrix.md` | Step 6 | Complete |
| 8 | System Blueprint | `docs/ssot/system_blueprint.md` | Step 7 | Complete |
| 9 | Archive Index | `docs/archive/ARCHIVE-INDEX.md` | Step 8 | Complete (44 candidates tagged) |
| 10 | Health Metrics | `docs/ssot/health_metrics.md` | Step 9 | Complete |

### 18.2 Task ID System

All implementation tasks use stable identifiers: `TASK-{DOMAIN}-{NN}`

| Domain | Prefix | Count | Example |
|--------|--------|-------|---------|
| Credit | CRD | 6 | TASK-CRD-01 through TASK-CRD-06 |
| Financial | FIN | 8 | TASK-FIN-01 through TASK-FIN-08 |
| Investment | INV | 6 | TASK-INV-01 through TASK-INV-06 |
| Trading | TRD | 18 | TASK-TRD-01 through TASK-TRD-18 |
| Risk | RSK | 6 | TASK-RSK-01 through TASK-RSK-06 |
| Notification | NTF | 3 | TASK-NTF-01 through TASK-NTF-03 |
| Gamification | GMF | 2 | TASK-GMF-01 through TASK-GMF-02 |
| AI/ML | AIM | 2 | TASK-AIM-01 through TASK-AIM-02 |
| Admin | ADM | 3 | TASK-ADM-01 through TASK-ADM-03 |
| Mobile | MOB | 3 | TASK-MOB-01 through TASK-MOB-03 |
| Security | SEC | 5 | TASK-SEC-01 through TASK-SEC-05 |
| Infrastructure | INF | 11 | TASK-INF-01 through TASK-INF-11 |
| Platform | PLT | 2 | TASK-PLT-01 through TASK-PLT-02 |
| Onboarding | ONB | 1 | TASK-ONB-01 |
| Documents | DOC | 1 | TASK-DOC-01 |
| Global Connector | GLC | 1 | TASK-GLC-01 |
| Plaid | PLD | 5 | TASK-PLD-01 through TASK-PLD-05 |
| Affiliate | AFF | 4 | TASK-AFF-01 through TASK-AFF-04 |
| **Total** | --- | **125** | 112 original (all DONE) + 13 Wave 6 |

### 18.3 Build Waves

| Wave | Focus | Tasks | Duration | Gate |
|------|-------|-------|----------|------|
| 0 | Foundation & Infrastructure | 10 | 3 weeks | GATE-0 |
| 1 | Core Feature Build | 13 | 6 weeks | GATE-1 |
| 2 | Feature Depth & Extensions | 19 | 6 weeks | GATE-2 |
| 3 | AI, Gamification & Polish | 19 | 4 weeks | GATE-3 |
| 4 | Mobile, Admin & Integration | 14 | 14 weeks | GATE-4 |
| 5 | Platform & Scale | 5 | 12 weeks | GATE-5 |
| 6 | External Integrations & Monetization | 13 | 8-10 weeks | GATE-6 |

**Total**: 125 tasks (112 DONE + 13 Wave 6), ~40 weeks sequential, ~22-24 weeks with 4 parallel workstreams.

### 18.4 Critical Paths

1. **Trading Pipeline** (12wk): TRD-03 → TRD-04 → TRD-05
5. **PCTT AI + Autonomous Chain** (13wk): TRD-03 → TRD-08/TRD-11 → TRD-12
2. **Credit Bureau** (7wk): CRD-04 → CRD-03
3. **Risk Chain** (5wk): RSK-01 → RSK-02/03/05 → RSK-06
4. **Mobile** (18wk): MOB-01 → MOB-02/03
6. **Plaid Full Integration** (6wk): PLD-01 → PLD-02/03/04/05
7. **Multi-Broker Chain** (8wk): TRD-15 → TRD-16 → TRD-17
8. **Affiliate Platform** (6wk): AFF-01 → AFF-02/03 + AFF-04

### 18.5 Superseded Documents

44 documents in `docs/` have been consolidated into this SSOT and companion artifacts.
See `docs/archive/ARCHIVE-INDEX.md` for the full list with archival status.

---

## Cross-Reference

### External Documents

| Related Document                       | Purpose                               |
| -------------------------------------- | ------------------------------------- |
| `docs/master-plan.md`                 | Master implementation plan (phases, tasks, risks) |
| `docs/gap-analysis.md`               | Gap analysis report (gaps, debt, missing tests) |
| `docs/architecture.md`               | Architecture & dependency document    |
| `docs/ui-design.md`                  | UI design specification & screen flow |
| `docs/Traceability_Matrix.md`         | Requirements → Code → Test mapping    |
| `docs/Codebase_Index.md`              | Detailed module/service inventory     |
| `docs/Plan_Index.md`                  | Master documentation index (95 files) |
| `docs/SSOT_Implementation_Plan.md`    | Task-level implementation tracker     |
| `docs/Gaps_Conflicts_Decisions.md`    | Full conflict/gap/decision tracking   |
| `docs/Testing/Test_Strategy.md`       | Test approach, environments, gates    |
| `docs/Testing/Test_Catalog.md`        | Complete test inventory               |

### Intra-Document Navigation

| Section | Title                          | Anchor                                               |
| ------- | ------------------------------ | ---------------------------------------------------- |
| §1      | Project Identity               | `#1-project-identity`                                |
| §2      | Technology Stack               | `#2-technology-stack`                                |
| §3      | Codebase Metrics               | `#3-codebase-metrics-verified-2026-02-20`            |
| §4      | Architecture Overview          | `#4-architecture-overview`                           |
| §5      | API Route Inventory            | `#5-api-route-inventory-248-routes-across-41-domains`|
| §6      | Subscription & Pricing         | `#6-subscription--pricing-model`                     |
| §7      | Security Architecture          | `#7-security-architecture`                           |
| §8      | Page Inventory                 | `#8-page-inventory-182-pages-across-47-domains`      |
| §9      | Component Inventory            | `#9-component-inventory-228-components-across-38-directories` |
| §10     | Library & Service Inventory    | `#10-library--service-inventory-477-files-across-53-directories--14-root-files` |
| §11     | External Service Integration   | `#11-external-service-integration`                   |
| §12     | Environment Variables          | `#12-environment-variables-required`                 |
| §13     | Testing Summary                | `#13-testing-summary`                                |
| §14     | Deployment                     | `#14-deployment`                                     |
| §14.5   | Mobile App                     | `#145-mobile-app-react-native--expo`                 |
| §15     | Known Issues & Technical Debt  | `#15-known-issues--technical-debt`                   |
| §16     | Consolidated Implementation Plan | `#16-consolidated-implementation-plan`             |
| §17     | Traceability Matrix (Summary)  | `#17-traceability-matrix-summary`                    |
| §18     | DICE v3.3 Artifact Registry    | `#18-dice-v33-artifact-registry`                     |

---

## §19. Audit Findings — Wave 7 Remediation (VERSION-013)

> Added 2026-05-03 in response to comprehensive 9-domain code review.
> Full register: `docs/ssot/gap_analysis.md` (FND-001 through FND-071).
> Roadmap: `MASTER-IMPLEMENTATION-PLAN.md` § Wave 7.

**Headline numbers**:
- Findings opened: **33 CRITICAL** + 38 HIGH (across 9 domains)
- Domains FAIL on audit: Auth+middleware, Payments+Subs, Commerce, Financial services, Investments, Notifications, Admin, AI+Compliance, Mobile (all 9)
- User exposure today: **None** (no live users — Fynvita is pre-launch, branded as financial-education company)
- Pre-launch disclosure obligations: not currently triggered; re-evaluate before public launch
- Tests passed (13,585) but did not catch any of the 33 criticals — detection-gap remediation is part of Wave 7

**Themes**:
1. Auth/RBAC structurally broken (admin endpoints unauth'd, `user_metadata` self-promotion to admin, AIML key reused as inbound auth, middleware whitelists `/api/*`, hardcoded admin emails, enterprise-tier=admin)
2. Webhook idempotency + tier mapping (every paid sub silently lands on `free`, `billing-profile-store` seeds fake Visa 4242, `handleInvoicePaid` swallows errors)
3. Money correctness (Stripe payouts pass dollars to cents-only API → 1% of intended; no idempotency on commerce payouts; affiliate self-referral fraud; non-atomic referral-code increment)
4. Mock-data-as-production (admin analytics returns `Math.random()`, debt API returns hardcoded mock debts, 5 AI-insight routes return static mocks, mobile dispute screen uses `setTimeout` mock data)

**Wave 7 status**: Phase 0 (Prereqs) opens 2026-05-03. Estimated 4 weeks, ~60 tasks, parallel SEC/BE/MOB/DEVOPS streams. Exit gates: every CRITICAL has linked closed task; CI gates active for route-auth, IDOR, mock-data, money-type, npm audit; SEC sign-off on `PUBLIC_ROUTES.ts`, webhook signatures, PII redaction, IDOR audit script.

---

_Single Source of Truth for the Fynvita platform._
_Original: 2026-02-16 | Last verified: 2026-02-23 | DICE v3.3 canonical: 2026-02-25_
_VERSION-009 (2026-03-01): Added §16.4.8-§16.4.11 (Plaid, DriveWealth, Multi-Broker, Affiliate). 13 new tasks (Wave 6). Total: 125 tasks (112 DONE + 13 planned)._
_VERSION-013 (2026-05-03): **AUDIT-DRIVEN RE-BASELINE.** Invalidates "100% done" claim. Opens Wave 7 (Security & Correctness Remediation) with 33 CRITICAL + 38 HIGH findings. See `gap_analysis.md`._
_DICE v3.3 Step 4 output — companion artifacts in `docs/ssot/`._
