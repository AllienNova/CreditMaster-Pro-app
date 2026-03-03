# Architecture Document -- Fynvita Platform

> Generated: 2026-02-23
> Generator: `docs/architecture.md` template via SSOT extraction
> Sources: [docs/SSOT.md](SSOT.md) SS2, SS4, SS5, SS7, SS10, SS11, SS12 | [docs/Codebase_Index.md](Codebase_Index.md) | [package.json](../package.json) | `supabase/migrations/` (28 files) | `src/lib/` (53 directories, 14 root files)
> Project root: `/Users/kimalhonourdjam/Documents/Projects/Github Projects/Fynvita`

---

## 1. System Architecture

### 1.1 High-Level Diagram

```
+-----------------------------------------------------------------+
|                      CLIENT (Browser)                            |
|  182 pages . 228 components . Tailwind CSS . Framer Motion       |
+-------------------------------+---------------------------------+
                                | HTTPS
                                v
+-----------------------------------------------------------------+
|                NEXT.JS 15.5 APP ROUTER (Vercel)                  |
|  +------------------------------------------------------------+ |
|  |  Middleware (src/middleware.ts)                              | |
|  |  CORS . Auth . Admin RBAC . Security Headers . CSP          | |
|  +------------------------------------------------------------+ |
|  +---------------+  +----------------+  +--------------------+   |
|  | Server        |  | Client         |  | API Routes         |   |
|  | Components    |  | Components     |  | (248 endpoints)    |   |
|  | (Layouts,     |  | (Interactive   |  | 41 domains         |   |
|  |  Pages)       |  |  UI, Forms)    |  |                    |   |
|  +---------------+  +----------------+  +--------------------+   |
+-------------------------------+---------------------------------+
                                |
           +--------------------+--------------------+
           v                    v                    v
  +--------------+     +--------------+     +--------------+
  |   SECURITY   |     |   BUSINESS   |     |  MONITORING  |
  |    LAYER     |     |    LOGIC     |     |    LAYER     |
  |              |     |   (53 lib    |     |              |
  | input-val.   |     |  directories)|     | logger.ts    |
  | output-val.  |     |              |     | metrics.ts   |
  | rate-limit   |     | AI services  |     | audit-log    |
  | auth-mw      |     | Financial    |     | health       |
  | pii-protect  |     | Trading      |     |              |
  | csrf         |     | Credit       |     |              |
  +--------------+     +--------------+     +--------------+
           |                    |                    |
           +--------------------+--------------------+
                                |
           +--------+--------+--+--------+--------+
           v        v        v           v        v
      +--------++-------++------+   +------++------+
      | AIML   || Supa- || Stripe|  | AWS  || Resend|
      | API    || base  ||       |  | S3   ||       |
      | 300+   || Auth  || Pay   |  | Files|| Email |
      | models || +DB   ||       |  |      ||       |
      +--------++-------++------+   +------++------+
```

### 1.2 Mobile App Architecture

```
+---------------------------------------------------------+
|              MOBILE APP (React Native + Expo)            |
|  138 source files . 248 routes . 36 route groups         |
|  Expo Router (file-based) mirrors web structure          |
+--------------------------+------------------------------+
                           | HTTPS
                           v
                   Same API backend as web
```

### 1.3 Request Flow

1. **Browser** -> Next.js middleware (CORS, auth check, security headers)
2. **Middleware** -> Route handler (Server Component or API Route)
3. **API Route** -> Auth middleware -> Input validation -> Business logic
4. **Business Logic** -> External service (Supabase, Stripe, AIML, S3)
5. **Response** -> Output validation -> Audit logging -> Client

### 1.4 Authentication Flow

```
User -> Login Page -> Supabase Auth (email/password, OAuth, MFA)
  -> JWT Token -> @supabase/ssr cookie management
  -> Middleware validates session on each request
  -> Protected routes redirect to /login (307)
  -> Admin routes require admin/super_admin role
```

### 1.5 AI Architecture (3-Layer)

```
+---------------------------------------------------+
|  Layer 3: AI Orchestrator                         |
|  src/lib/ai-orchestrator.ts (~600 lines)          |
|  High-level workflows:                            |
|  - Dispute generation                             |
|  - Credit analysis                                |
|  - Multi-model consensus                          |
|  - Chain-of-thought strategies                    |
+------------------------+--------------------------+
                         | uses
                         v
+---------------------------------------------------+
|  Layer 2: Model Router                            |
|  src/lib/model-router.ts (~300 lines)             |
|  Intelligent selection:                           |
|  - 13 task types                                  |
|  - Cost/quality/speed optimization                |
|  - Fallback model chains                          |
+------------------------+--------------------------+
                         | selects
                         v
+---------------------------------------------------+
|  Layer 1: AIML Service                            |
|  src/lib/aiml-service.ts (~400 lines)             |
|  Direct API wrapper:                              |
|  - Chat completions                               |
|  - Image generation                               |
|  - Voice synthesis                                |
|  - Embeddings                                     |
|  Gateway to 300+ models from 8+ providers         |
+---------------------------------------------------+
```

---

## 2. Technology Stack

### 2.1 Core Framework

| Layer      | Technology               | Version  | Purpose                    |
| ---------- | ------------------------ | -------- | -------------------------- |
| Framework  | Next.js (App Router)     | ^15.5.6  | Full-stack React framework |
| UI Library | React                    | ^19.0.0  | Component rendering        |
| Language   | TypeScript (strict mode) | ^5.7.2   | Type-safe development      |
| Styling    | Tailwind CSS             | ^3.4.19  | Utility-first CSS          |
| Runtime    | Node.js                  | 22.13+   | Server runtime             |

### 2.2 Backend & Data

| Service      | Package                  | Version  | Purpose                  |
| ------------ | ------------------------ | -------- | ------------------------ |
| Database     | Supabase PostgreSQL      | ^2.89.0  | Primary data store       |
| Auth         | Supabase Auth + SSR      | ^0.7.0   | Authentication, JWT, MFA |
| File Storage | AWS S3 (client-s3)       | ^3.917.0 | Document uploads         |
| Payment      | Stripe                   | ^19.1.0  | Subscriptions, checkout  |
| Email        | Resend                   | ^6.2.2   | Transactional email      |
| AI Gateway   | AIML API (OpenAI SDK)    | ^4.77.3  | 300+ AI model access     |

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

| Tool            | Version  | Purpose                      |
| --------------- | -------- | ---------------------------- |
| Jest            | ^30.2.0  | Unit + Integration tests     |
| Cypress         | ^15.5.0  | E2E (API + route validation) |
| Playwright      | ^1.57.0  | E2E (browser journeys)       |
| Testing Library | ^16.3.0  | Component testing            |
| MSW             | ^1.3.3   | API mocking                  |

### 2.5 Build & Quality

| Tool         | Version  | Purpose                   |
| ------------ | -------- | ------------------------- |
| ESLint       | ^9.18.0  | Linting                   |
| ts-jest      | ^29.4.5  | TypeScript test transform |
| PostCSS      | ^8.5.6   | CSS processing            |
| Autoprefixer | ^10.4.23 | CSS compatibility         |

---

## 3. Dependency Graph

### 3.1 External Dependencies (33 production)

| Package                        | Version  | Category       | Purpose                              |
| ------------------------------ | -------- | -------------- | ------------------------------------ |
| next                           | ^15.5.6  | Core           | Full-stack React framework           |
| react                          | ^19.0.0  | Core           | UI rendering                         |
| react-dom                      | ^19.0.0  | Core           | DOM rendering                        |
| typescript                     | ^5.7.2   | Core (dev)     | Type checking                        |
| @supabase/supabase-js          | ^2.89.0  | Data & Auth    | Supabase client                      |
| @supabase/ssr                  | ^0.7.0   | Data & Auth    | SSR-safe auth cookies                |
| @supabase/auth-helpers-nextjs  | ^0.15.0  | Data & Auth    | Next.js auth helpers                 |
| openai                         | ^4.77.3  | AI             | AIML API gateway (OpenAI-compatible) |
| @anthropic-ai/sdk              | ^0.71.2  | AI             | Anthropic SDK                        |
| stripe                         | ^19.1.0  | Payments       | Server-side Stripe API               |
| @stripe/stripe-js              | ^8.1.0   | Payments       | Client-side Stripe.js                |
| @aws-sdk/client-s3             | ^3.917.0 | Storage        | S3 file operations                   |
| @aws-sdk/s3-request-presigner  | ^3.917.0 | Storage        | Presigned URL generation             |
| resend                         | ^6.2.2   | Email          | Transactional email delivery         |
| web-push                       | ^3.6.7   | Notifications  | Push notification delivery           |
| tailwindcss                    | ^3.4.19  | UI             | Utility-first CSS                    |
| framer-motion                  | ^12.29.0 | UI             | Animations and transitions           |
| recharts                       | ^3.5.1   | UI             | Data visualization charts            |
| lightweight-charts             | ^5.1.0   | UI             | Trading candlestick charts           |
| lucide-react                   | ^0.563.0 | UI             | Icon library                         |
| @heroicons/react               | ^2.2.0   | UI             | Icon library (Heroicons)             |
| @react-email/components        | ^1.0.1   | UI             | Email template components            |
| @tanstack/react-query          | ^5.90.16 | Data           | Server state management              |
| zod                            | ^3.25.76 | Data           | Runtime schema validation            |
| date-fns                       | ^4.1.0   | Data           | Date manipulation                    |
| jsonwebtoken                   | ^9.0.3   | Auth           | JWT sign/verify                      |
| isomorphic-dompurify           | ^2.35.0  | Security       | HTML sanitization                    |
| multer                         | ^2.0.2   | Upload         | File upload middleware               |
| next-auth                      | ^4.24.13 | Auth           | NextAuth.js (OAuth providers)        |
| nodemailer                     | ^7.0.10  | Email          | SMTP email (fallback)                |
| react-swipeable                | ^7.0.2   | UI             | Swipe gesture detection              |
| tailwind-merge                 | ^3.4.0   | UI             | Tailwind class merging               |

### 3.2 Dev Dependencies (30)

| Package                        | Version  | Purpose                          |
| ------------------------------ | -------- | -------------------------------- |
| @playwright/test               | ^1.57.0  | E2E browser testing              |
| @axe-core/playwright           | ^4.11.0  | Accessibility testing            |
| @testing-library/react         | ^16.3.0  | Component testing                |
| @testing-library/dom           | ^10.4.1  | DOM testing utilities            |
| @testing-library/jest-dom      | ^6.9.1   | Jest DOM matchers                |
| @testing-library/user-event    | ^14.6.1  | User interaction simulation      |
| jest                           | ^30.2.0  | Test runner                      |
| jest-environment-jsdom         | ^30.2.0  | Browser-like test environment    |
| jest-watch-typeahead           | ^3.0.1   | Jest interactive filter          |
| jsdom-global                   | ^3.0.2   | Global jsdom setup               |
| cypress                        | ^15.5.0  | E2E testing (API-focused)        |
| msw                            | ^1.3.3   | API mocking                      |
| node-mocks-http                | ^1.17.2  | HTTP request/response mocks      |
| node-fetch                     | ^2.7.0   | Fetch polyfill for tests         |
| undici                         | ^7.16.0  | HTTP client for tests            |
| wait-on                        | ^9.0.1   | Wait for server (Cypress)        |
| ts-jest                        | ^29.4.5  | TypeScript Jest transformer      |
| eslint                         | ^9.18.0  | Linting                          |
| eslint-config-next             | ^15.5.6  | Next.js ESLint rules             |
| postcss                        | ^8.5.6   | CSS processing                   |
| autoprefixer                   | ^10.4.23 | CSS vendor prefixes              |
| @types/jest                    | ^29.5.14 | Jest type definitions            |
| @types/node                    | ^22.19.3 | Node.js type definitions         |
| @types/react                   | ^19.2.2  | React type definitions           |
| @types/react-dom               | ^19.0.2  | ReactDOM type definitions        |
| @types/jsonwebtoken            | ^9.0.10  | JWT type definitions             |
| @types/multer                  | ^2.0.0   | Multer type definitions          |
| @types/nodemailer              | ^7.0.3   | Nodemailer type definitions      |
| @types/react-swipeable         | ^4.3.0   | Swipeable type definitions       |
| @types/uuid                    | ^10.0.0  | UUID type definitions            |
| @types/web-push                | ^3.6.4   | Web Push type definitions        |

### 3.3 Internal Module Dependencies

```
src/app/ (Pages + API Routes)
  +-- depends on -> src/components/ (UI)
  +-- depends on -> src/lib/ (Business Logic)
  +-- depends on -> src/hooks/ (State)

src/components/ (228 components)
  +-- depends on -> src/hooks/ (State)
  +-- depends on -> src/lib/ (Services)
  +-- depends on -> src/types/ (Type definitions)

src/hooks/ (22 hooks)
  +-- depends on -> src/lib/ (Services)
  +-- depends on -> src/types/ (Type definitions)

src/lib/ (477 files, 53 directories, 14 root files)
  +-- depends on -> External packages
  +-- depends on -> src/types/ (Type definitions)
```

**Key internal dependency chains:**

```
AI Orchestrator -> Model Router -> AIML Service -> openai (external)
Dispute Service -> AI Orchestrator -> Model Router -> AIML Service
Auth Middleware -> Supabase Client -> @supabase/supabase-js (external)
Stripe Service -> stripe (external)
Document Service -> @aws-sdk/client-s3 (external)
Notification Service -> resend (external) + supabase (external)
```

### 3.4 Circular Dependency Check

| Issue                            | Severity | Notes                                              |
| -------------------------------- | -------- | -------------------------------------------------- |
| Deprecated `src/lib/supabase.ts` | HIGH     | Should use `@/lib/supabase/client` (TD-01, DEC-01) |
| No circular dependency detection | LOW      | Consider `depcheck` or `madge` tooling             |
| No known circular imports        | --       | Not verified by tooling                            |

---

## 4. API Contracts

### 4.1 Route Inventory (248 Routes, 41 Domains)

| Domain             | Routes | Key Endpoints                                                         |
| ------------------ | ------ | --------------------------------------------------------------------- |
| financial          | 64     | Budgeting, calculators, goals, insights, transactions, net-worth      |
| investments        | 27     | Portfolio analysis, holdings, risk assessment, recommendations        |
| ai                 | 23     | Chat, consensus, credit analysis, dispute generation, recommendations |
| credit-repair      | 13     | Disputes, score, quick-wins, goodwill, impact, timeline               |
| marketplace        | 12     | Products, listings, reviews, categories                               |
| admin              | 10     | Users, analytics, settings, system management                         |
| disputes           | 9      | CRUD, generate, status tracking, bureau submissions                   |
| trading            | 6      | Orders, positions, strategies, market data                            |
| credit-monitoring  | 5      | Alerts, score history, reports, monitoring                            |
| credit-builder     | 5      | Plans, progress, accounts, recommendations                           |
| gamification       | 5      | Achievements, leaderboard, challenges, rewards                       |
| notifications      | 5      | CRUD, preferences, push, mark-read                                   |
| auth               | 5      | Login, signup, callback, reset-password, session                     |
| analytics          | 5      | Dashboard, events, reports, user-activity                            |
| payment            | 4      | Checkout, webhook, subscription, portal                              |
| monitoring         | 4      | Health, metrics, logs, status                                        |
| cron               | 4      | Scheduled jobs: cleanup, sync, notifications, reports                |
| credit-bureau      | 4      | Reports, disputes, score-factors, inquiries                          |
| chat               | 4      | Messages, history, context, sessions                                 |
| tax                | 3      | Optimization, documents, estimates                                   |
| student-loans      | 3      | Data, strategy, federal programs                                     |
| federal            | 3      | Programs, eligibility, applications                                  |
| documents          | 3      | CRUD, upload, download                                               |
| servicers          | 2      | Loan servicer data, contact info                                     |
| ml                 | 2      | Predictions, model status                                            |
| credit             | 2      | Score, analyze                                                       |
| automation         | 2      | Rules, triggers                                                      |
| Other (14 domains) | 14     | ws, voice, user, test-db, strategies, settings, profile, etc.        |

### 4.2 Standard API Route Pattern

All API routes follow this pipeline:

```
POST/GET -> Auth Middleware -> Input Validation -> Business Logic
  -> Output Validation -> Audit Logging -> JSON Response
```

**Standard Response Format:**
```json
{
  "data": { "..." },
  "error": null
}
```

**Error Response Format:**
```json
{
  "data": null,
  "error": "Human-readable error message"
}
```

### 4.3 Authentication Requirements

| Route Pattern       | Auth Required | Role Required        |
| ------------------- | ------------- | -------------------- |
| `/api/auth/*`       | No            | --                   |
| `/api/monitoring/*` | No            | --                   |
| `/api/health`       | No            | --                   |
| `/api/admin/*`      | Yes           | admin or super_admin |
| `/api/*` (other)    | Yes           | user (any role)      |

### 4.4 Rate Limiting

| Scope    | Limit        | Window  | Notes                     |
| -------- | ------------ | ------- | ------------------------- |
| Per-IP   | Configurable | Sliding | In-memory Map (TD-02)     |
| Per-User | Configurable | Sliding | Cost-tracked per AI model |
| Per-Key  | Configurable | Sliding | API key rate limiting     |

---

## 5. Database Schema

### 5.1 Supabase PostgreSQL -- Migration Inventory (28 files)

| Migration File                                       | Purpose                                                  |
| ---------------------------------------------------- | -------------------------------------------------------- |
| `001_initial_schema.sql`                             | Core tables: users, profiles, disputes, documents        |
| `002_production_enhancements.sql`                    | Indexes, RLS policies, performance optimizations         |
| `20250107_credit_bureau_tables.sql`                  | Credit bureau reports, score factors, inquiries          |
| `20250203000000_student_loan_schema.sql`             | Student loan data, servicers, repayment plans            |
| `20250203_user_settings.sql`                         | User settings and preferences                            |
| `20250204000000_credit_repair_schema.sql`            | Credit repair disputes, bureau tracking                  |
| `20250207000000_financial_intelligence_schema.sql`   | Financial intelligence: budgets, insights, forecasts     |
| `20250208000000_bills_schema.sql`                    | Bills tracking, recurring payments, reminders            |
| `20250211000000_billing_profiles.sql`                | Billing profiles, payment methods                        |
| `20251217000001_cpfi_financial_suite_schema.sql`     | Financial suite: transactions, accounts, categories      |
| `20251218000000_marketplace_schema.sql`              | Marketplace: products, listings, reviews, categories     |
| `20260105_performance_optimizations.sql`             | Query optimization, materialized views                   |
| `20260107000000_onboarding_progress.sql`             | Onboarding flow tracking                                 |
| `20260110_income_sources.sql`                        | Income source management                                 |
| `20260110_subscriptions.sql`                         | Subscription management (6 tiers)                        |
| `20260110_transaction_rules.sql`                     | Transaction categorization rules                         |
| `20260110_vitality_scores.sql`                       | Financial vitality scoring                               |
| `20260115_create_financial_chat_tables.sql`          | Chat sessions, messages, context                         |
| `20260117_add_trading_tables.sql`                    | Trading orders, positions, strategies                    |
| `20260120000000_gamification_ai_personalization.sql` | XP, achievements, leaderboards, coaching sessions        |
| `20260121000000_tax_optimization_schema.sql`         | Tax calculations, scenarios, deductions                  |
| `20260121000001_tax_documents_table.sql`             | Tax document OCR and storage                             |
| `20260125000000_add_payout_fields.sql`               | Payout tracking for marketplace                          |
| `20260204000000_web_push_subscriptions.sql`          | Web push notification subscriptions                      |
| `20260204000000_webauthn_tables.sql`                 | WebAuthn/passkey credentials                             |
| `20260217000000_infrastructure_persistence.sql`      | Rate limiting, audit logs persistence tables             |
| `sample_data.sql`                                    | Development seed data                                    |
| `test_migration.sql`                                 | Migration testing scaffold                               |

### 5.2 Key Entity Relationships

```
users (1) <-> (N) disputes
users (1) <-> (N) documents
users (1) <-> (N) notifications
users (1) <-> (1) subscriptions
users (1) <-> (N) trading_orders
users (1) <-> (N) chat_sessions
users (1) <-> (N) achievements
users (1) <-> (1) onboarding_progress
users (1) <-> (N) tax_calculations
users (1) <-> (N) financial_goals
users (1) <-> (N) transactions
users (1) <-> (N) income_sources
users (1) <-> (N) vitality_scores
users (1) <-> (N) web_push_subscriptions
users (1) <-> (N) webauthn_credentials
```

### 5.3 Row-Level Security

All tables use Supabase RLS with policies ensuring:
- Users can only read/write their own data
- Admin users have elevated access
- Service role bypasses RLS for server-side operations

### 5.4 Migration Tooling Status

| Aspect              | Current State                               | Risk / Note                          |
| ------------------- | ------------------------------------------- | ------------------------------------ |
| Tooling             | Manual SQL files in `supabase/migrations/`  | No automated migration runner        |
| Recommended         | Supabase CLI for migration management       | Decision pending (DEC-10)            |
| Reproducibility     | Not guaranteed across environments          | TD-07: Add migration tooling         |

---

## 6. Security Architecture

### 6.1 Defense in Depth (5 Layers)

```
Layer 1: Middleware (src/middleware.ts, ~264 lines)
  -> CORS whitelisting (localhost:3000/3001, fynvita.com, app.fynvita.com)
  -> HTTP methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
  -> Security headers: CSP, X-Frame-Options (DENY), HSTS, X-Content-Type-Options
  -> Auth check: JWT validation, session management
  -> Route protection: public routes whitelist, admin RBAC

Layer 2: Input Validation (src/lib/security/input-validation.ts, ~325 lines)
  -> Prompt injection detection
  -> PII detection (regex-based)
  -> Content sanitization
  -> Request body validation

Layer 3: Business Logic + Auth (src/lib/security/auth-middleware.ts, ~400 lines)
  -> JWT authentication
  -> Role-based access control (4 roles, 14 permission categories, 100+ permissions)
  -> Rate limiting (src/lib/security/rate-limiting.ts, ~387 lines)

Layer 4: Output Validation (src/lib/security/output-validation.ts, ~341 lines)
  -> Harmful content filtering
  -> PII leakage prevention
  -> Response sanitization

Layer 5: Audit & Monitoring (src/lib/security/audit-logging.ts, ~501 lines)
  -> Security event logging
  -> AI interaction tracking
  -> In-memory store (last 10K events -- TD-03)
```

### 6.2 RBAC Model

**Role Hierarchy:** `user` -> `premium` -> `admin` -> `super_admin`

**14 Permission Categories:** credit, disputes, documents, payments, ai, admin, analytics, notifications, settings, investments, trading, marketplace, gamification, compliance

### 6.3 Compliance

| Framework | File                                 | Lines | Status                                    |
| --------- | ------------------------------------ | ----- | ----------------------------------------- |
| GDPR/CCPA | src/lib/compliance/gdpr-ccpa.ts      | ~450  | Data export, deletion, consent management |
| PII       | src/lib/compliance/pii-protection.ts | ~400  | Detection, encryption, masking            |

### 6.4 Security Findings (from SSOT SS7.5)

| ID     | Finding                                                     | Severity | Status   |
| ------ | ----------------------------------------------------------- | -------- | -------- |
| SEC-01 | Rate limiter uses in-memory Map (resets on restart)         | MEDIUM   | Open     |
| SEC-02 | PII detection is regex-based (may miss edge cases)          | LOW      | Accepted |
| SEC-03 | No DAST scanning in CI                                      | MEDIUM   | Open     |
| SEC-04 | Audit logs stored in-memory (lost on restart)               | MEDIUM   | Open     |
| SEC-05 | CSP allows external domains (Stripe, Plaid, Supabase, AIML) | LOW      | Accepted |
| SEC-06 | No secret rotation schedule                                 | LOW      | Open     |
| SEC-07 | MFA WebAuthn placeholder (TOTP works)                       | LOW      | Open     |

**Audit Grade:** A- (0 critical issues)

---

## 7. Environment & Configuration

### 7.1 Required Environment Variables

| Variable                        | Scope           | Required | Service      | Notes                                  |
| ------------------------------- | --------------- | -------- | ------------ | -------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Client + Server | Yes      | Supabase     | Project URL                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Yes      | Supabase     | Anonymous key                          |
| `AIML_API_KEY`                  | Server only     | Yes      | AIML API     | Authentication                         |
| `AIML_API_URL`                  | Server only     | No       | AIML API     | Default: https://api.aimlapi.com/v1    |
| `STRIPE_SECRET_KEY`             | Server only     | Yes      | Stripe       | Server-side API key                    |
| `STRIPE_WEBHOOK_SECRET`         | Server only     | Yes      | Stripe       | Webhook signing secret                 |
| `STRIPE_*_PRICE_ID`            | Server only     | Yes      | Stripe       | Price IDs per subscription tier        |
| `AWS_REGION`                    | Server only     | Yes      | AWS S3       | e.g. us-east-1                         |
| `AWS_ACCESS_KEY_ID`             | Server only     | Yes      | AWS S3       | IAM access key                         |
| `AWS_SECRET_ACCESS_KEY`         | Server only     | Yes      | AWS S3       | IAM secret key                         |
| `AWS_S3_BUCKET`                 | Server only     | Yes      | AWS S3       | Bucket name                            |
| `RESEND_API_KEY`                | Server only     | Yes      | Resend       | Email API key                          |
| `EMAIL_FROM`                    | Server only     | No       | Resend       | Sender email address                   |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`  | Client          | No       | Web Push     | VAPID public key                       |
| `VAPID_PRIVATE_KEY`             | Server only     | No       | Web Push     | VAPID private key                      |
| `NODE_ENV`                      | Both            | Auto     | Node.js      | development / production / test        |

### 7.2 External Service Dependencies

| Service  | Package                        | Config Variables                                                     | Failure Mode                                    |
| -------- | ------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------- |
| AIML API | openai@^4.77.3                 | `AIML_API_KEY`, `AIML_API_URL`                                       | Graceful degradation, retry with fallback model |
| Supabase | @supabase/supabase-js@^2.89.0  | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`          | App-breaking: auth fails, data unavailable      |
| Stripe   | stripe@^19.1.0                 | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs              | Checkout fails, webhook retries                 |
| AWS S3   | @aws-sdk/client-s3@^3.917.0    | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` | Upload fails, presigned URLs expire (7-day)    |
| Resend   | resend@^6.2.2                  | `RESEND_API_KEY`, `EMAIL_FROM`                                       | Silent fail, queued for retry                   |
| Web Push | web-push@^3.6.7                | VAPID keys                                                           | Silent fail                                     |

### 7.3 Configuration Files

| File                 | Path (relative)       | Purpose                                  |
| -------------------- | --------------------- | ---------------------------------------- |
| next.config.ts       | `next.config.ts`      | Next.js build, image, output settings    |
| tailwind.config.ts   | `tailwind.config.ts`  | Tailwind theme, plugins, dark mode       |
| tsconfig.json        | `tsconfig.json`       | TypeScript compiler options              |
| jest.config.ts       | `jest.config.ts`      | Jest test configuration                  |
| cypress.config.ts    | `cypress.config.ts`   | Cypress E2E configuration                |
| playwright.config.ts | `playwright.config.ts`| Playwright E2E configuration             |
| .eslintrc.json       | `.eslintrc.json`      | ESLint rules                             |
| postcss.config.mjs   | `postcss.config.mjs`  | PostCSS plugins                          |
| src/middleware.ts     | `src/middleware.ts`   | Next.js middleware (auth, CORS, headers) |

### 7.4 Build & Deployment

| Setting           | Value                                |
| ----------------- | ------------------------------------ |
| Host              | Vercel                               |
| Build Command     | `next build`                         |
| Output            | Standalone (Docker-compatible)       |
| Region            | Auto (Vercel Edge Network)           |
| Node Version      | 22.x                                 |
| Auto-deploy       | main branch -> production            |
| Preview           | All PRs get preview deployments      |
| CI/CD Config      | None yet (TD-08; Vercel auto-deploy) |

### 7.5 Quality Gates

| Gate     | Tool                        | Threshold                          |
| -------- | --------------------------- | ---------------------------------- |
| Lint     | ESLint + Prettier           | Zero warnings                      |
| Types    | tsc --noEmit --strict       | Zero errors                        |
| Tests    | Jest                        | All pass, coverage >= 80%          |
| Build    | next build                  | Zero errors                        |
| E2E API  | Cypress (21 specs)          | All pass                           |
| E2E UI   | Playwright (16 specs)       | All pass                           |

---

## 8. Cross-References

### 8.1 This Document References

| Source Document                                                 | Sections Used                                      |
| --------------------------------------------------------------- | -------------------------------------------------- |
| [docs/SSOT.md](SSOT.md)                                        | SS2 (Tech Stack), SS4 (Architecture), SS5 (API Routes), SS7 (Security), SS10 (Services), SS11 (External Services), SS12 (Env Vars) |
| [docs/Codebase_Index.md](Codebase_Index.md)                    | Module inventory, API route breakdown, component listing |
| [package.json](../package.json)                                 | All dependency versions (33 prod, 30 dev)          |
| `supabase/migrations/` (28 files)                               | Database schema evolution                          |
| `src/lib/` (53 dirs, 14 root files)                            | Internal module structure                          |

### 8.2 Documents That Reference This Document

| Document                                                        | Context                                            |
| --------------------------------------------------------------- | -------------------------------------------------- |
| [docs/SSOT.md](SSOT.md)                                        | Cross-reference section lists this as architecture doc |
| [docs/master-plan.md](master-plan.md)                           | Architecture decisions referenced in planning      |
| [docs/gap-analysis.md](gap-analysis.md)                         | Architecture gaps and technical debt               |
| [docs/Traceability_Matrix.md](Traceability_Matrix.md)           | Requirement -> Code -> Test mapping uses arch layers |
| [docs/ui-design.md](ui-design.md)                               | Screen registry references API contracts           |
| [docs/Codebase_Index.md](Codebase_Index.md)                    | Detailed module inventory (this doc summarizes)    |
| [docs/Plan_Index.md](Plan_Index.md)                            | Master documentation index includes this file      |

### 8.3 Related Documents

| Document                                                        | Relationship                                       |
| --------------------------------------------------------------- | -------------------------------------------------- |
| [docs/SSOT_Implementation_Plan.md](SSOT_Implementation_Plan.md) | Task-level implementation tracker                  |
| [docs/Gaps_Conflicts_Decisions.md](Gaps_Conflicts_Decisions.md) | Full conflict/gap/decision tracking                |
| [docs/ZERO_TRUST_AUDIT_REPORT.md](ZERO_TRUST_AUDIT_REPORT.md) | Security audit details (referenced in SS6.4)       |
| [docs/TRADING_SYSTEM_AUDIT.md](TRADING_SYSTEM_AUDIT.md)        | Trading system readiness audit                     |

---

_Generated on 2026-02-23._
_Source data: SSOT.md SS2 (Tech Stack), SS4 (Architecture), SS5 (API Routes), SS7 (Security), SS10 (Services), SS11 (External Services), SS12 (Env Vars); Codebase_Index.md; package.json (33 prod + 30 dev deps); supabase/migrations/ (28 SQL files); src/lib/ (53 directories + 14 root files)._
_Cross-references verified bidirectionally against SSOT.md, master-plan.md, gap-analysis.md, Traceability_Matrix.md, ui-design.md, Codebase_Index.md, and Plan_Index.md._
