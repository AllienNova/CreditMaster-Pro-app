# Fynvita System Blueprint

> **Authoritative technical reference for the Fynvita platform.**
> Consolidated from `docs/architecture.md`, `docs/ui-design.md`, and `docs/SSOT.md`.
> Last generated: 2026-02-25

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Technology Stack](#2-technology-stack)
3. [UI/UX Architecture](#3-uiux-architecture)
4. [API Architecture](#4-api-architecture)
5. [Security Architecture](#5-security-architecture)
6. [Data Architecture](#6-data-architecture)
7. [Trading Architecture](#7-trading-architecture)
8. [DevOps & Infrastructure](#8-devops--infrastructure)
9. [Library & Service Map](#9-library--service-map)

---

## 1. System Architecture

### 1.1 High-Level Overview

Fynvita is an AI-powered financial vitality platform combining credit repair, financial wellness, budgeting, investment intelligence, and trading capabilities. The system is built as a Next.js monorepo (web) paired with an Expo/React Native mobile application, backed by Supabase PostgreSQL, and orchestrated through a 3-layer AI architecture accessing 300+ models.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                              │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │   Next.js Web App    │    │   Expo / React Native App    │  │
│  │   (182 pages,        │    │   (138 source files,         │  │
│  │    228 components)   │    │    248 routes, 36 groups)    │  │
│  └──────────┬───────────┘    └──────────────┬───────────────┘  │
└─────────────┼───────────────────────────────┼──────────────────┘
              │           HTTPS / WSS         │
              ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION TIER                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Next.js App Router (Vercel)                  │  │
│  │  ┌────────────┐  ┌────────────┐  ┌───────────────────┐  │  │
│  │  │   Server   │  │   Client   │  │   API Routes      │  │  │
│  │  │ Components │  │ Components │  │   (248 endpoints   │  │  │
│  │  │  (RSC)     │  │ (Hydrated) │  │    across 41       │  │  │
│  │  │            │  │            │  │    domains)        │  │  │
│  │  └────────────┘  └────────────┘  └───────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌───────────┐  ┌───────────┴───────────┐  ┌───────────────┐  │
│  │ SECURITY  │  │    BUSINESS LOGIC     │  │  MONITORING   │  │
│  │  LAYER    │  │                       │  │    LAYER      │  │
│  │           │  │  - AI Orchestrator    │  │               │  │
│  │ - Input   │  │  - Model Router       │  │ - Logging     │  │
│  │ - Output  │  │  - Financial Svc      │  │ - Metrics     │  │
│  │ - Auth    │  │  - Trading Engine     │  │ - Health      │  │
│  │ - Rate    │  │  - Commerce           │  │ - Audit       │  │
│  │ - PII     │  │  - Documents          │  │               │  │
│  └───────────┘  └───────────────────────┘  └───────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│   AIML API       │ │  Supabase    │ │     Stripe       │
│  (300+ models)   │ │ (Auth + DB)  │ │   (Payments)     │
└──────────────────┘ └──────────────┘ └──────────────────┘
              │               │               │
              ▼               ▼               ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│     Resend       │ │   AWS S3     │ │   Web Push       │
│    (Email)       │ │  (Storage)   │ │ (Notifications)  │
└──────────────────┘ └──────────────┘ └──────────────────┘
```

### 1.2 Request Flow

Every request passes through a consistent pipeline:

```
1. Client Request
   ↓
2. Next.js Middleware (CORS, CSP, security headers)
   ↓
3. API Route Handler
   ↓
4. Auth Middleware → JWT validation → RBAC check
   ↓
5. Input Validation → sanitization, prompt injection detection
   ↓
6. Business Logic (service layer)
   ↓
7. Output Validation → PII filtering, content moderation
   ↓
8. Audit Logging → security event recording
   ↓
9. Response to Client
```

### 1.3 AI Architecture (3-Layer Stack)

The AI subsystem uses a 3-layer abstraction to route tasks to optimal models:

```
┌─────────────────────────────────────────┐
│  Layer 3: AI Orchestrator               │
│  - High-level workflows                 │
│  - Multi-model consensus                │
│  - Chain-of-thought orchestration       │
│  - Task decomposition                   │
│  (src/lib/ai-orchestrator.ts — 600 LOC) │
├─────────────────────────────────────────┤
│  Layer 2: Model Router                  │
│  - Task-type → model selection          │
│  - Cost/quality/latency balancing       │
│  - Fallback chains                      │
│  (src/lib/model-router.ts — 400 LOC)   │
├─────────────────────────────────────────┤
│  Layer 1: AIML Service                  │
│  - Direct API wrapper                   │
│  - Chat, image, voice, embeddings       │
│  - Streaming support                    │
│  (src/lib/aiml-service.ts — 400 LOC)   │
└─────────────────────────────────────────┘
         │
         ▼
   AIML API Gateway → 300+ Models
   (Claude 4.5, GPT-5, DeepSeek R1,
    Gemini 2.5, Llama 3.3, Mistral, ...)
```

### 1.4 Authentication Flow

```
User → Login/Signup → Supabase Auth (email/password, OAuth, MFA)
                         ↓
                   JWT Token issued
                         ↓
              Stored in SSR cookies (@supabase/ssr)
                         ↓
              Every request: JWT → middleware → user context
                         ↓
              RBAC check against role + permission matrix
```

Four roles in ascending privilege: `user → premium → admin → super_admin`.

### 1.5 Mobile Architecture

The Expo/React Native app mirrors the web platform with a shared API surface:

```
┌──────────────────────────────────────────┐
│           Expo Router (File-Based)       │
│  ┌────────────┐  ┌────────────────────┐ │
│  │  (auth)/   │  │    (tabs)/         │ │
│  │  login     │  │  dashboard         │ │
│  │  register  │  │  credit-repair     │ │
│  │  forgot    │  │  financial-intel   │ │
│  │  onboard   │  │  investments       │ │
│  └────────────┘  │  profile           │ │
│                  └────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Deep-Linked Routes               │ │
│  │  /coach, /financial-intelligence,  │ │
│  │  /investments, /settings,          │ │
│  │  /credit-repair, /notifications    │ │
│  └────────────────────────────────────┘ │
├──────────────────────────────────────────┤
│  State: Zustand (8 stores)              │
│  Auth │ Credit │ Dashboard │ Dispute    │
│  Financial │ Gamification │ Investment  │
│  Notification                           │
├──────────────────────────────────────────┤
│  API Layer → Next.js Backend            │
└──────────────────────────────────────────┘
```

- **138 source files**, **248 routes**, **36 route groups**
- Zustand 4.5.0 for state management (8 stores in `mobile-app/src/store/`)
- Expo SDK 52.0.49, React Native 0.76.9, expo-router 4.0.22

---

## 2. Technology Stack

### 2.1 Web Application

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | ^15.5.6 |
| UI Library | React (Server + Client Components) | ^19.0.0 |
| Language | TypeScript (strict mode) | ^5.7.2 |
| Styling | Tailwind CSS | ^3.4.19 |
| Runtime | Node.js | 22.13+ |
| Database Client | @supabase/supabase-js | ^2.89.0 |
| Auth (SSR) | @supabase/ssr | ^0.7.0 |
| Payments | stripe | ^17.7.0 |
| Email | resend | ^4.2.0 |
| Storage | @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner | ^3.x |
| Push Notifications | web-push | ^3.6.7 |
| PDF Generation | @react-pdf/renderer | ^4.3.0 |
| Charting | recharts | ^2.15.0, chart.js | ^4.4.8 |
| AI SDK | ai (Vercel AI SDK) | ^4.3.16 |
| Trading | alpaca-trade-api (custom typed) | - |
| Validation | zod | ^3.24.1 |
| Date | date-fns | ^4.1.0 |

### 2.2 Mobile Application

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Expo | ~52.0.49 |
| UI | React Native | 0.76.9 |
| Router | expo-router | ~4.0.22 |
| State | zustand | ^4.5.0 |
| Secure Storage | expo-secure-store | ~14.0.1 |
| Notifications | expo-notifications | ~0.29.14 |
| Haptics | expo-haptics | ~14.0.1 |
| Image | expo-image | ~2.0.7 |
| Linking | expo-linking | ~7.0.5 |
| Auth Storage | @react-native-async-storage/async-storage | 1.23.1 |

### 2.3 Development & Testing

| Tool | Technology | Version |
|------|-----------|---------|
| Test Runner | Jest | ^29.7.0 |
| Component Testing | @testing-library/react | ^16.3.0 |
| E2E (Web) | Cypress | ^13.x |
| E2E (Full) | Playwright (via MCP) | ^1.x |
| Linting | ESLint + Biome | ^9.x / ^1.x |
| Formatting | Prettier / Biome | - |
| Build Analysis | @next/bundle-analyzer | ^15.x |
| Coverage | c8 / jest --coverage | - |

### 2.4 Production Dependencies (33 total)

Core: `next`, `react`, `react-dom`, `typescript`
Database: `@supabase/supabase-js`, `@supabase/ssr`
Payments: `stripe`
Email: `resend`
Storage: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
AI: `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`
Validation: `zod`
Charts: `recharts`, `chart.js`, `react-chartjs-2`
PDF: `@react-pdf/renderer`
Push: `web-push`
UI: `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`
Date: `date-fns`
Other: `uuid`, `bcryptjs`, `jose`, `jsonwebtoken`, `plaid`

### 2.5 Dev Dependencies (30 total)

Types: `@types/react`, `@types/node`, `@types/jest`, `@types/bcryptjs`, `@types/uuid`, `@types/web-push`, `@types/jsonwebtoken`
Testing: `jest`, `ts-jest`, `@testing-library/react`, `@testing-library/jest-dom`, `jest-environment-jsdom`, `cypress`
Linting: `eslint`, `eslint-config-next`, `@biomejs/biome`
Build: `postcss`, `autoprefixer`, `@next/bundle-analyzer`

---

## 3. UI/UX Architecture

### 3.1 Design System

**Brand Colors:**

| Token | Hex | Usage |
|-------|-----|-------|
| Vital Green | #10B981 (Emerald-500) | Primary actions, positive indicators, health scores |
| Trust Blue | #3B82F6 (Blue-500) | Links, informational elements, secondary actions |
| Alert Amber | #F59E0B (Amber-500) | Warnings, pending states |
| Danger Red | #EF4444 (Red-500) | Errors, destructive actions, negative indicators |
| Neutral Slate | #64748B (Slate-500) | Body text, borders, backgrounds |

**Typography:**

| Role | Font | Weight | Size |
|------|------|--------|------|
| Headings (H1) | Inter | Bold (700) | 2.25rem / 36px |
| Headings (H2) | Inter | Semibold (600) | 1.875rem / 30px |
| Headings (H3) | Inter | Semibold (600) | 1.5rem / 24px |
| Body | Inter | Regular (400) | 1rem / 16px |
| Small | Inter | Regular (400) | 0.875rem / 14px |
| Code / Data | JetBrains Mono | Regular (400) | 0.875rem / 14px |

**Spacing Scale:** Tailwind 4px base — `1`=4px, `2`=8px, `3`=12px, `4`=16px, `6`=24px, `8`=32px, `12`=48px, `16`=64px.

**Shadow System:**
- `sm`: Subtle cards — `0 1px 2px rgba(0,0,0,0.05)`
- `md`: Elevated cards — `0 4px 6px -1px rgba(0,0,0,0.1)`
- `lg`: Modals/dropdowns — `0 10px 15px -3px rgba(0,0,0,0.1)`
- `xl`: Floating elements — `0 20px 25px -5px rgba(0,0,0,0.1)`

**Motion Tokens:**
- Duration: `fast`=150ms, `normal`=300ms, `slow`=500ms
- Easing: `ease-out` for enters, `ease-in` for exits, `ease-in-out` for state changes

### 3.2 Dark Mode

- Implementation: Class-based (`dark:` prefix via Tailwind)
- Base background: Slate-900 (#0F172A)
- Surface: Slate-800 (#1E293B)
- Elevated surface: Slate-700 (#334155)
- Border: Slate-600 (#475569)
- Text primary: Slate-100 (#F1F5F9)
- Text secondary: Slate-400 (#94A3B8)

### 3.3 Responsive Breakpoints

Uses Tailwind defaults, mobile-first approach:

| Breakpoint | Width | Target |
|-----------|-------|--------|
| `sm` | 640px | Large phones / landscape |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large displays |

### 3.4 Component Inventory (228 Components)

Components are organized across 38 directories:

| Category | Count | Directory | Key Components |
|----------|-------|-----------|----------------|
| Financial | 49 | `src/components/financial/` | FinancialDashboard, BudgetOverview, SpendingAnalysis, DebtManagement, SavingsTracker, HealthScoreCard, NetWorthTracker, CashFlowAnalysis, BillNegotiationAssistant |
| UI (shared) | 20 | `src/components/ui/` | Button, Card, Modal, Input, Select, Tabs, Badge, Tooltip, Skeleton |
| Credit Repair | 11 | `src/components/credit-repair/` | CreditScoreDisplay, DisputeWizard, CreditTimeline |
| Auth | 9 | `src/components/auth/` | LoginForm, RegisterForm, MFASetup, PasswordReset |
| Charts | 9 | `src/components/charts/` | LineChart, BarChart, PieChart, AreaChart, Gauge |
| Disputes | 8 | `src/components/disputes/` | DisputeList, DisputeDetail, DisputeGenerator, StatusTracker |
| AIML | 5 | `src/components/aiml/` | AIChat, CreditAnalyzer, DisputeGenerator, LoanStrategyCalculator |
| Gamification | 6 | `src/components/gamification/` | AchievementBadge, LevelProgress, StreakTracker |
| Documents | 6 | `src/components/documents/` | DocumentUpload, DocumentList, DocumentViewer |
| Notifications | 6 | `src/components/notifications/` | NotificationCenter, NotificationItem, PushOptIn |
| Credit Monitoring | 6 | `src/components/credit-monitoring/` | ScoreCard, AlertList, FactorBreakdown |
| Chat | 5 | `src/components/chat/` | ChatWindow, MessageList, MessageInput |
| Trading | 12 | `src/components/trading/` | TradingDashboard, OrderForm, PositionList, ChartView |
| Investment | 10 | `src/components/investment/` | PortfolioSummary, HoldingsList, WatchlistView |
| Admin | 8 | `src/components/admin/` | AdminDashboard, UserManager, SystemHealth |
| Other | 58+ | Various | Layout, Navigation, Onboarding, Settings, etc. |

### 3.5 Screen Registry

**Web Application (182 pages across 47 domains):**

Top domains by page count:
- `financial/` — budgets, spending, savings, debt, health-score, bills, income, goals, investments, monitoring, export, context, plaid (64+ pages)
- `admin/` — users, analytics, settings, audit logs, disputes, subscriptions (20+ pages)
- `investments/` — portfolio, analyze, holdings, watchlist (12+ pages)
- `credit-repair/` — disputes, strategies, builder, monitoring (13+ pages)
- `ai/` — chat, consensus, insights, coach, tools (23+ pages)
- `trading/` — orders, positions, paper trading, alerts (10+ pages)

**Mobile Application (248 routes, 36 route groups):**

Primary tab navigation:
- Dashboard (home screen, quick actions)
- Credit Repair (score, disputes, timeline)
- Financial Intelligence (budgets, spending, goals, bills)
- Investments (portfolio, analyze, watchlist, holdings)
- Profile (settings, notifications, security)

Deep-linked routes: `/coach`, `/financial-intelligence`, `/investments`, `/settings`, `/credit-repair`, `/notifications`

### 3.6 Navigation Architecture

**Web:** Next.js App Router file-based routing with nested layouts. Route groups for auth `(auth)`, dashboard `(dashboard)`, and public pages.

**Mobile:** Expo Router file-based routing with:
- `(auth)/_layout.tsx` — auth flow (login, register, forgot-password, onboarding)
- `(tabs)/_layout.tsx` — main tab navigator (5 tabs)
- Deep-link routes for coach, financial-intelligence, investments, settings, credit-repair, notifications

### 3.7 Gradient & Visual Effects

Key gradients used across the platform:
- Hero: `from-emerald-500 via-blue-500 to-purple-600`
- Card accent: `from-emerald-400 to-blue-500`
- Score gauge: `from-red-500 via-yellow-500 to-emerald-500`
- Dark overlay: `from-slate-900/95 to-slate-800/90`

---

## 4. API Architecture

### 4.1 Route Inventory Summary

**248 API routes** organized across **41 domains**.

| Domain | Routes | Base Path |
|--------|--------|-----------|
| Financial | 64 | `/api/financial/*` |
| Investments | 27 | `/api/financial/investments/*`, `/api/investments/*` |
| AI / Chat | 23 | `/api/ai/*`, `/api/financial/ai-insights/*` |
| Admin | 20 | `/api/admin/*` |
| Credit Repair | 13 | `/api/financial/credit-repair/*`, `/api/financial/credit/*` |
| Trading | 10 | `/api/trading/*` |
| Spending | 10 | `/api/financial/spending/*` |
| Budgets | 8 | `/api/financial/budgets/*` |
| Bills | 8 | `/api/financial/bills/*` |
| Savings | 8 | `/api/financial/savings/*` |
| Disputes | 7 | `/api/disputes/*`, `/api/financial/disputes/*` |
| Notifications | 6 | `/api/notifications/*` |
| Documents | 5 | `/api/documents/*` |
| Goals | 5 | `/api/financial/goals/*` |
| Auth | 4 | `/api/auth/*` |
| Payment | 4 | `/api/payment/*` |
| Debt | 3 | `/api/financial/debt/*` |
| Income | 3 | `/api/financial/income/*` |
| Health Score | 3 | `/api/financial/health-score/*` |
| Plaid | 2 | `/api/financial/plaid/*` |
| Export | 2 | `/api/financial/export/*` |
| Other | 13 | Various (monitoring, voice, federal, context, etc.) |

### 4.2 Key API Contracts

**Standard Request Pattern:**
All API routes follow a consistent structure: Authentication → Authorization (RBAC) → Input Validation → Business Logic → Output Validation → Audit Log → Response.

**Standard Error Response:**
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

**HTTP Status Codes Used:**
- `200` — Success
- `201` — Created
- `400` — Bad Request (validation failure)
- `401` — Unauthorized (missing/invalid JWT)
- `403` — Forbidden (insufficient role/permissions)
- `404` — Not Found
- `429` — Too Many Requests (rate limited)
- `500` — Internal Server Error

### 4.3 Authentication & Authorization on Routes

All non-public routes require:
1. Valid JWT in `Authorization: Bearer <token>` header or SSR cookie
2. RBAC role check against required permission
3. Rate limit check per IP and per user

**Public routes (no auth):** Landing page, pricing, auth endpoints (login, register, forgot-password).

**Role-gated routes:**
- `user` — basic financial features, own data CRUD
- `premium` — advanced AI features, bill negotiation, trading, investments
- `admin` — user management, analytics, system configuration
- `super_admin` — all admin + destructive operations, audit log access

### 4.4 Rate Limiting

Limits enforced per-IP and per-user with sliding window:

| Tier | Requests/min | AI Calls/min | Cost Cap/month |
|------|-------------|-------------|----------------|
| Free | 30 | 5 | $0 |
| Basic | 60 | 20 | $50 |
| Premium | 120 | 50 | $200 |
| Enterprise | 300 | 100 | $500 |
| Admin | Unlimited | Unlimited | Unlimited |

### 4.5 External Service Integration Points

| Service | Package | Config Variables | Failure Mode |
|---------|---------|-----------------|--------------|
| AIML API | `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai` | `AIML_API_KEY`, `AIML_API_URL` | Fallback to secondary model; graceful degradation to cached responses |
| Supabase | `@supabase/supabase-js`, `@supabase/ssr` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth fails gracefully; DB ops retry with exponential backoff |
| Stripe | `stripe` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs | Checkout fails with user-facing error; webhooks retry automatically |
| AWS S3 | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` | Upload fails gracefully; presigned URLs auto-refresh on expiry |
| Resend | `resend` | `RESEND_API_KEY`, `EMAIL_FROM` | Email fails silently; logged for retry; no user-blocking |
| Web Push | `web-push` | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Push fails silently; notifications stored for in-app display |

---

## 5. Security Architecture

> ## ⚠ Known Deviations from Documented Model (VERSION-013, 2026-05-03)
>
> The 9-domain audit (2026-05-01..03) found that the 5-layer model below describes the **intended** architecture. Actual implementation has **structural bypasses** at multiple layers. These are tracked as Wave 7 task closures; **trust the table below until Wave 7 closes, not the diagram**.
>
> | Layer | Intended | Actual (pre-Wave-7) | Closing task |
> |-------|----------|---------------------|--------------|
> | 1 — Middleware | All routes pass through middleware auth | `src/middleware.ts:162-169` whitelists ALL `/api/*` paths; only 4 of 118 routes use `withAuth`. **Bypassable.** | TASK-AUTH-04 |
> | 2 — Input validation | Server-authoritative on every field | `payment/checkout/route.ts:30` accepts `successUrl`/`cancelUrl`/`priceId`/`trialDays` from client. `admin/disputes/route.ts:175` mass-assigns raw body. **Bypassable.** | TASK-WBH-06, TASK-IDR-05 |
> | 3 — Auth + RBAC | `app_metadata.role` server-side only | `rbac.ts:322` reads `user_metadata.role` (user-writable in Supabase). `admin/auth/route.ts:17-21` hardcodes admin emails. Enterprise tier = admin grant. **Bypassable.** | TASK-AUTH-01, TASK-AUTH-02 |
> | 4 — Output validation | PII never leaves boundary | `pii-protection.ts` exists but is **never called** in 14 AI call sites; SSN/cards/DOBs forwarded to AIML in cleartext. **Not enforced.** | TASK-CMP-05 |
> | 5 — Audit logging | All admin mutations logged | `admin/audit/route.ts:95` has zero auth (POST). Mutation routes don't write to `audit_logs`. **Inconsistent.** | TASK-ADM-01 |
>
> Additional structural deviations:
> - **Two role enumerations** disagree: `withRole` accepts `enterprise`; `rbac.ts` does not. Same token gets different decisions from different guards. (TASK-AUTH-12)
> - **Three rate-limiter implementations** coexist; public re-export points at the in-memory one (broken on serverless). (TASK-AUTH-06)
> - **In-memory session Map** in `auth-middleware.ts:376` does not survive cold starts. (TASK-AUTH-07)
> - **`AIML_API_KEY` reused as inbound-auth secret** — anyone with the outbound vendor key gets `enterprise`. (TASK-AUTH-05)
>
> See `docs/ssot/gap_analysis.md` for the full register.

### 5.1 Defense-in-Depth Model (5 Layers — INTENDED)

```
┌───────────────────────────────────────────────────────┐
│  Layer 1: MIDDLEWARE                                   │
│  next.config.ts security headers                      │
│  CORS, CSP, HSTS, X-Frame-Options, X-Content-Type    │
├───────────────────────────────────────────────────────┤
│  Layer 2: INPUT VALIDATION                            │
│  src/lib/security/input-validation.ts (400 LOC)       │
│  Zod schema validation, prompt injection detection,   │
│  XSS sanitization, SQL injection prevention,          │
│  payload size limits                                  │
├───────────────────────────────────────────────────────┤
│  Layer 3: AUTH + RBAC                                 │
│  src/lib/security/auth-middleware.ts (400 LOC)        │
│  JWT verification via Supabase, session management,   │
│  role-based access (4 roles), 14 permission           │
│  categories, 100+ individual permissions              │
├───────────────────────────────────────────────────────┤
│  Layer 4: OUTPUT VALIDATION                           │
│  src/lib/security/output-validation.ts (350 LOC)      │
│  PII leak detection, content moderation,              │
│  hallucination detection, response sanitization       │
├───────────────────────────────────────────────────────┤
│  Layer 5: AUDIT LOGGING                               │
│  src/lib/security/audit-logging.ts (450 LOC)          │
│  All AI interactions logged, security events tracked, │
│  compliance events (GDPR/CCPA) recorded               │
└───────────────────────────────────────────────────────┘
```

### 5.2 RBAC Model

**4 Roles (ascending privilege):**

| Role | Inherits From | Key Capabilities |
|------|--------------|------------------|
| `user` | — | Own data CRUD, basic AI (5 calls/min), free-tier features |
| `premium` | `user` | Advanced AI (50 calls/min), bill negotiation, trading, investments, all financial tools |
| `admin` | `premium` | User management, analytics, system configuration, dispute resolution |
| `super_admin` | `admin` | Destructive operations, full audit log access, security config, system-wide changes |

**14 Permission Categories:**
`ai`, `credit`, `disputes`, `documents`, `financial`, `trading`, `investments`, `payments`, `notifications`, `admin`, `users`, `analytics`, `settings`, `audit`

### 5.3 Compliance

**GDPR/CCPA Implementation (`src/lib/compliance/`):**
- Data subject rights: export, deletion, access requests
- Consent management and tracking
- Data retention policies with automatic purging
- Cross-border transfer controls
- Privacy impact assessment tooling

**PII Protection (`src/lib/compliance/pii-protection.ts`, 400 LOC):**
- Detection: regex patterns for SSN, credit card, phone, email, DOB, bank account numbers
- Encryption: AES-256-GCM for PII at rest
- Masking: display-safe masking for UI (e.g., `***-**-1234`)
- Tokenization: reversible tokens for processing without exposing raw PII

### 5.4 Known Security Findings

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| SEC-01 | Medium | Rate limiting in-memory only (lost on restart) | Open — migrate to Redis |
| SEC-02 | Low | Audit logs stored in application memory | Open — migrate to persistent store |
| SEC-03 | Medium | JWT secret rotation not automated | Open — implement key rotation |
| SEC-04 | Low | CORS allows localhost in development | Accepted — dev-only |
| SEC-05 | Medium | No IP-based blocking/allowlisting | Open — planned for Q2 2026 |
| SEC-06 | Low | Email verification not enforced for all flows | Open — planned |
| SEC-07 | Medium | WebSocket connections not rate-limited | Open — planned |

### 5.5 Cryptographic Standards

| Purpose | Algorithm | Notes |
|---------|-----------|-------|
| Password hashing | bcrypt / argon2 | Cost factor 12+ |
| PII encryption | AES-256-GCM | Per-field encryption |
| JWT signing | RS256 / HS256 | Via Supabase |
| TLS | TLS 1.3 | Enforced at edge (Vercel) |
| Presigned URLs | AWS SigV4 | 7-day expiration, auto-refresh |

---

## 6. Data Architecture

### 6.1 Database

**Engine:** Supabase PostgreSQL (hosted)
**Client:** `@supabase/supabase-js` ^2.89.0
**Auth:** `@supabase/ssr` ^0.7.0 (SSR cookie-based sessions)

### 6.2 Migration History (28 Migrations)

Migrations live in `supabase/migrations/` and define the complete schema evolution:

| Migration | Purpose |
|-----------|---------|
| `001_initial_schema.sql` | Core tables: users, profiles, credit_reports, disputes |
| `002_production_enhancements.sql` | Indexes, RLS policies, performance tuning |
| `20251218000000_marketplace_schema.sql` | Marketplace: products, orders, affiliates |
| `20260105_performance_optimizations.sql` | Query optimization, materialized views |
| `20260107000000_onboarding_progress.sql` | User onboarding tracking |
| `20260110_income_sources.sql` | Income source tracking |
| `20260110_subscriptions.sql` | Subscription management |
| `20260110_transaction_rules.sql` | Automated transaction categorization rules |
| `20260110_vitality_scores.sql` | Financial health vitality scoring |
| `20260115_create_financial_chat_tables.sql` | AI financial chat history |
| `20260117_add_trading_tables.sql` | Trading: orders, positions, watchlists, paper trading |
| `20260120000000_gamification_ai_personalization.sql` | Gamification: achievements, streaks, levels, XP |
| `20260121000000_tax_optimization_schema.sql` | Tax optimization strategies and tracking |
| `20260121000001_tax_documents_table.sql` | Tax document storage metadata |
| `20260125000000_add_payout_fields.sql` | Commerce payout tracking fields |
| `20260204000000_web_push_subscriptions.sql` | Web push notification subscriptions |
| `20260204000000_webauthn_tables.sql` | WebAuthn/passkey credential storage |
| `20260217000000_infrastructure_persistence.sql` | Infrastructure state persistence |
| + 10 additional migrations | Various feature-specific schema additions |

### 6.3 Core Entity Relationships

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  users   │────<│  disputes    │     │  documents   │
│          │     │              │     │              │
│ id (PK)  │     │ id (PK)      │     │ id (PK)      │
│ email    │     │ user_id (FK) │     │ user_id (FK) │
│ name     │     │ bureau       │     │ type         │
│ role     │     │ status       │     │ s3_key       │
│ sub_id   │     │ item_type    │     │ mime_type    │
│ sub_stat │     │ letter       │     │ size         │
└────┬─────┘     │ outcome      │     │ url          │
     │           └──────────────┘     └──────────────┘
     │
     │     ┌──────────────┐     ┌──────────────────┐
     ├────<│ notifications│     │ trading_orders   │
     │     │              │     │                  │
     │     │ id (PK)      │     │ id (PK)          │
     │     │ user_id (FK) │     │ user_id (FK)     │
     │     │ type         │     │ symbol           │
     │     │ title        │     │ side (buy/sell)  │
     │     │ message      │     │ quantity         │
     │     │ read         │     │ status           │
     │     └──────────────┘     │ filled_price     │
     │                          └──────────────────┘
     │
     │     ┌──────────────┐     ┌──────────────────┐
     ├────<│ savings_goals│     │ financial_chat   │
     │     │              │     │                  │
     │     │ id (PK)      │     │ id (PK)          │
     │     │ user_id (FK) │     │ user_id (FK)     │
     │     │ name         │     │ messages (JSONB) │
     │     │ target       │     │ model            │
     │     │ current      │     │ created_at       │
     │     │ deadline     │     └──────────────────┘
     │     └──────────────┘
     │
     │     ┌──────────────────┐  ┌──────────────────┐
     ├────<│ gamification     │  │ subscriptions    │
     │     │                  │  │                  │
     │     │ user_id (FK)     │  │ id (PK)          │
     │     │ xp               │  │ user_id (FK)     │
     │     │ level            │  │ stripe_sub_id    │
     │     │ streak           │  │ plan             │
     │     │ achievements[]   │  │ status           │
     │     └──────────────────┘  │ current_period   │
     │                           └──────────────────┘
     │
     └────<  vitality_scores, income_sources, transaction_rules,
             tax_documents, web_push_subscriptions, webauthn_credentials,
             onboarding_progress, marketplace_orders, ...
```

### 6.4 Row-Level Security (RLS)

All tables use Supabase RLS policies:
- Users can only read/write their own records (`auth.uid() = user_id`)
- Admin roles can read all records via service-role key
- Public tables (pricing, features) have open read policies
- Sensitive tables (audit_logs, admin_settings) restricted to admin+ roles

### 6.5 Data Access Patterns

- **Direct Supabase client** for CRUD operations from API routes
- **Service-role key** for admin operations and background jobs
- **Anon key** for public-facing read operations (pricing, features)
- **SSR cookies** for authenticated server-side rendering
- **Presigned S3 URLs** for document access (7-day expiry, auto-refresh)

---

## 7. Trading Architecture — PCTT (Pivot-Constrained Trendline Trading)

> **Authoritative reference**: `docs/FYNVITA-PCTT-TRADING-SYSTEM.md` (4,563 lines). When in conflict with any other document, that file wins for all trading decisions.

### 7.1 4-Tier Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  TIER 1 — CLIENT                                              │
│  React Native (mobile) + Next.js (web)                        │
│  Lightweight Charts v5 · Strategy dashboards · Trade journal  │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTPS / WebSocket
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  TIER 2 — FRONTEND (Vercel)                                   │
│  Next.js 15.5 API Routes · Auth · Input validation            │
│  Rate limiting · RBAC · Audit logging                         │
└──────────────────────────┬───────────────────────────────────┘
                           │ Internal API (authenticated)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  TIER 3 — TRADING SERVICE (Fly.io)                            │
│  Persistent Node.js process · Zero cold starts                │
│  WebSocket streaming · 7-stage pipeline · 7 AI agents         │
│  3 operating modes · 30-Law compliance · Autonomous engine    │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  7-STAGE PCTT PIPELINE                                   │ │
│  │                                                          │ │
│  │  FP-01 ─→ FP-02 ─→ FP-03 ─→ FP-04 ─→ FP-05 ─→ FP-06 │ │
│  │  Regime   Pivot    Trend-   Signal   Conflu-   Risk    │ │
│  │  Detect   Ident    line     Gen      ence     Assess   │ │
│  │                    Build             Score              │ │
│  │                              ↑                  │       │ │
│  │                    (Non-PCTT strategies          │       │ │
│  │                     inject at FP-04)             ▼       │ │
│  │                                               FP-07     │ │
│  │                                               Trade     │ │
│  │                                               Recom     │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────┘
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

### 7.2 7-Stage Pipeline Detail

| Stage | Name | Inputs | Processing | Output |
|-------|------|--------|-----------|--------|
| FP-01 | Regime Detection | OHLCV, volatility metrics | ADX, ATR, Bollinger width → classify trending/ranging/volatile/breakout | Regime label + confidence (0-100) |
| FP-02 | Pivot Identification | OHLCV, regime context | Fractal analysis + volume confirmation → detect swing highs/lows | Confirmed pivot points with strength |
| FP-03 | Trendline Construction | Pivots, price data | Connect valid pivots, test touch count + deviation → build support/resistance | Active trendline set |
| FP-04 | Signal Generation | Trendlines, indicators, regime | Detect breakouts/bounces/compressions → generate trade signals | Raw signals with type + direction |
| FP-05 | Confluence Scoring | Signals, multi-timeframe data | Score each signal 0-100 across volume, momentum, structure, AI | Confluence score + breakdown |
| FP-06 | Risk Assessment | Scored signals, portfolio state | 3-gate risk gateway + 5 circuit breakers + position sizing | Risk-adjusted trade parameters |
| FP-07 | Trade Recommendation | Risk-approved signals | Format entry/exit/stop/size → route to mode handler (Watch/Guided/Auto) | Actionable trade plan |

> Non-PCTT strategies (Mean Reversion, Dual Momentum, Turtle, Wyckoff, etc.) bypass FP-02/FP-03 and inject signals at FP-04.

### 7.3 7 AI Trading Agents

| Agent | Purpose | Invocation Point |
|-------|---------|-----------------|
| SentimentAgent | Social media + news sentiment scoring | FP-05 (confluence) |
| RegimeConfirmationAgent | AI-powered regime validation | FP-01 (regime detection) |
| NewsImpactAgent | Breaking news impact assessment | FP-06 (risk assessment) |
| SignalExplainerAgent | Human-readable trade explanations | FP-07 (recommendation) |
| RiskNarrativeAgent | Risk factor narrative for user | FP-06 (risk assessment) |
| EarningsAnalysisAgent | Pre/post earnings signal adjustment | FP-04 (signal generation) |
| ConsensusArbiterAgent | Multi-agent disagreement resolution | FP-05 (confluence) |

**Multi-Provider Fallback**: AIML API (primary, 300+ models) → Anthropic → OpenAI → xAI. Circuit breaker per provider with 5 degradation levels. 6-layer prompt injection defense.

### 7.4 3 Operating Modes

```
WATCH ──────────────────→ GUIDED ──────────────────→ AUTONOMOUS
(observe + paper trade)   (confirm each trade)       (automatic execution)

Graduation:               Graduation:
30 paper trades           30 live trades
+ positive expectancy     + positive expectancy
+ 30 days minimum         + law compliance ≥ 60%
```

| Mode | Signal Handling | Execution | Safety |
|------|----------------|-----------|--------|
| WATCH | Displayed only, paper trades allowed | None (manual paper) | Full pipeline visible |
| GUIDED | Push notification with full analysis | User confirms each trade | 15-min expiry, can modify |
| AUTONOMOUS | Automatic execution | Immediate via Alpaca API | 5 circuit breakers + kill switch |

### 7.5 30-Law Compliance Engine

Every trade signal is scored 0-100 against applicable trading laws. Signals below the compliance threshold (configurable, default 60) are blocked. Laws include position sizing rules, diversification requirements, risk/reward minimums, and pattern day trader regulations.

### 7.6 Risk Gateway (3-Gate + 5 Circuit Breakers)

**3 Gates** (FP-06):

| Gate | Name | Function |
|------|------|----------|
| Gate 1 | Pre-Trade Compliance | 30-Law score ≥ threshold, account status verified |
| Gate 2 | Risk Limits | Position sizing (Kelly/vol-adjusted), exposure caps, correlation check |
| Gate 3 | Execution Gate | Liquidity check, slippage estimate, market hours validation |

**5 Circuit Breakers** (auto-pause all trading):

| Breaker | Threshold | Reset |
|---------|-----------|-------|
| Daily Loss | 2% of portfolio | Next trading day |
| Weekly Loss | 5% of portfolio | Monday open |
| Monthly Loss | 10% of portfolio | 1st of month |
| Consecutive Losses | 5 trades | Manual review + reset |
| Single Position | 3% of portfolio | Auto (position closed) |

### 7.7 Strategy Library

**10 Pre-Built Strategies**:
1. PCTT Compression Breakout (flagship)
2. Trend Pullback
3. Mean Reversion
4. Wyckoff Accumulation/Distribution
5. Dual Momentum
6. Turtle Trading (modified)
7. Exhaustion Reversal
8. Post-Earnings Announcement Drift (PEAD)
9. Liquidity Sweep
10. Barbell Strategy

**Custom Strategy Builder**: Visual rule builder with 30+ technical indicators, JSONB rules schema stored in `trading_strategies` table.

### 7.8 Paper Trading & Graduation

Paper trading is mandatory before live trading:
- Mirrors real order management with simulated fills
- Realistic slippage modeling via `slippage-model.ts`
- Separate `paper_trading_accounts` table
- **Graduation requirements**: 30 paper trades, positive expectancy (avg_win × win_rate > avg_loss × loss_rate), minimum 30 days active
- After graduation: GUIDED mode unlocked (user confirms each trade)
- After GUIDED graduation: AUTONOMOUS mode unlocked

### 7.9 Trading Services Map

| Service | Path | Responsibility |
|---------|------|---------------|
| Alpaca Broker | `src/lib/trading/brokers/alpaca-broker.ts` | Brokerage API, order execution (paper + live) |
| Technical Indicators | `src/lib/trading/technical-indicators.ts` | SMA, EMA, RSI, MACD, Bollinger Bands, ADX, ATR |
| LLM Guardrails | `src/lib/trading/llm-guardrails.ts` | 6-layer prompt injection defense for AI signals |
| PCTT Trading Service | `src/lib/trading/pctt/pctt-trading-service.ts` | 7-stage pipeline orchestrator |
| Pine Script Generator | `src/lib/trading/pctt/pine-script-generator.ts` | TradingView strategy code generation |
| Portfolio Risk | `src/lib/trading/pctt/portfolio-risk.ts` | VaR, Sharpe ratio, correlation, circuit breakers |
| Slippage Model | `src/lib/trading/pctt/slippage-model.ts` | Execution cost estimation |
| Trailing Stop Manager | `src/lib/trading/pctt/trailing-stop-manager.ts` | Dynamic stop-loss (5 types) |
| Explainable AI | `src/lib/trading/pctt/explainable-ai.ts` | Trade decision explanations |
| Webhook Handler | `src/lib/trading/pctt/webhook-handler.ts` | External signal ingestion |
| Paper Trading | `src/lib/trading/paper/` | Simulated environment + graduation tracking |
| Order Status Tracker | `src/lib/trading/realtime/order-status-tracker.ts` | Real-time order lifecycle via WebSocket |
| Position Manager | `src/lib/trading/positions/` | Position tracking, P&L, portfolio state |
| Trading Notifications | `src/lib/trading/notifications/` | GUIDED mode alerts, execution notifications |
| ISE (Investment Strategy Engine) | `src/lib/trading/ise/` | Investment strategy evaluation |

### 7.10 Trading Database Tables (13 new)

| Table | Purpose |
|-------|---------|
| `trading_strategies` | Strategy definitions (pre-built + custom, JSONB rules) |
| `trading_signals` | Pipeline-generated signals with full provenance |
| `trading_orders` | Order lifecycle (pending → filled → closed) |
| `trading_positions` | Active + historical positions with P&L |
| `trading_journal` | User trade journal + AI-generated notes |
| `paper_trading_accounts` | Virtual accounts for paper trading |
| `autonomous_trading_settings` | Per-user mode, thresholds, circuit breaker config |
| `autonomous_trading_log` | Autonomous execution audit trail |
| `trading_alerts` | Configurable price/signal/mode alerts |
| `trading_watchlists` | User-curated symbol watchlists |
| `ai_provider_health` | AI provider status, latency, failure counts |
| `ai_audit_log` | Every AI invocation with input/output/cost |
| `market_regimes` | Historical regime classifications |

---

## 8. DevOps & Infrastructure

### 8.1 Deployment

| Target | Platform | Method |
|--------|----------|--------|
| Web (Production) | Vercel | Auto-deploy from `main` branch |
| Web (Preview) | Vercel | Auto-deploy from PR branches |
| Standalone | Docker | `Dockerfile` at project root, `node:22-alpine` base |
| Mobile | Expo (EAS) | `eas build` for iOS/Android, `eas update` for OTA |

**Docker Configuration:**
- Base: `node:22-alpine`
- Multi-stage build: deps → build → production
- Output: standalone Next.js server
- Port: 3000

### 8.2 Environment Variables (15 Required)

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anonymous key |
| `AIML_API_KEY` | Server | AIML API authentication |
| `AIML_API_URL` | Server | AIML API base URL |
| `STRIPE_SECRET_KEY` | Server | Stripe payment processing |
| `STRIPE_WEBHOOK_SECRET` | Server | Stripe webhook verification |
| `STRIPE_BASIC_PRICE_ID` | Server | Basic plan price ID |
| `STRIPE_PREMIUM_PRICE_ID` | Server | Premium plan price ID |
| `STRIPE_ENTERPRISE_PRICE_ID` | Server | Enterprise plan price ID |
| `RESEND_API_KEY` | Server | Email delivery |
| `EMAIL_FROM` | Server | Sender email address |
| `AWS_REGION` | Server | S3 bucket region |
| `AWS_ACCESS_KEY_ID` | Server | AWS authentication |
| `AWS_SECRET_ACCESS_KEY` | Server | AWS authentication |
| `AWS_S3_BUCKET` | Server | Document storage bucket |

Additional (for full functionality):
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` — Web Push
- `PLAID_CLIENT_ID`, `PLAID_SECRET` — Plaid bank connection
- `ALPACA_API_KEY`, `ALPACA_API_SECRET` — Trading

### 8.3 CI/CD Pipeline

**GitHub Actions** (`.github/workflows/ci.yml`):

```
Trigger: Push to main, PR to main
Pipeline:
  1. Checkout code
  2. Setup Node.js 22
  3. Install dependencies (npm ci)
  4. Lint (ESLint / Biome)
  5. Type check (tsc --noEmit)
  6. Unit tests (Jest, 80% coverage threshold)
  7. Build (next build)
  8. E2E tests (Cypress / Playwright)
  9. Security audit (npm audit)
  10. Deploy (Vercel auto-deploy on main)
```

### 8.4 Testing Infrastructure

| Framework | Scope | Files | Cases | Coverage Target |
|-----------|-------|-------|-------|-----------------|
| Jest | Unit + Integration (Web) | 180 | ~2,700 | 80% overall, 90% new code, 100% critical paths |
| Jest | Unit (Mobile) | 17 | ~200 | 80% |
| Cypress | E2E (Web) | 21 | ~200 | Critical user flows |
| Playwright | E2E (Full) | 16 | ~180 | Cross-browser, accessibility |

**Total:** 234 test files, 3,287 test cases.

**Coverage Thresholds (Jest config):**
```json
{
  "branches": 80,
  "functions": 80,
  "lines": 80,
  "statements": 80
}
```

### 8.5 Monitoring & Observability

| Component | Implementation | Location |
|-----------|---------------|----------|
| Structured Logging | Custom logger with severity levels | `src/lib/monitoring/logger.ts` (400 LOC) |
| Metrics Tracking | Custom metrics collector | `src/lib/monitoring/metrics.ts` (450 LOC) |
| Audit Trail | Security event logging | `src/lib/security/audit-logging.ts` (450 LOC) |
| Health Check | API endpoint | `/api/health` |
| Error Tracking | Structured error responses + logging | All API routes |
| Vercel Analytics | Web Vitals (LCP, FID, CLS) | Built-in |

### 8.6 Build Performance

| Metric | Value |
|--------|-------|
| Build Time | ~11 seconds |
| First Load JS | < 110 kB |
| Production Bundle | Optimized via Next.js automatic code splitting |
| Static Pages | Pre-rendered where possible |
| Image Optimization | Next.js Image component + `expo-image` on mobile |

---

## 9. Library & Service Map

### 9.1 Overview

The `src/lib/` directory contains **477 files** across **53 directories** plus **14 root-level files**.

### 9.2 AI Services

| File | LOC | Responsibility |
|------|-----|---------------|
| `src/lib/aiml-service.ts` | 400 | Direct AIML API wrapper — chat, image, voice, embeddings, streaming |
| `src/lib/model-router.ts` | 400 | Task-type to model mapping, cost/quality/latency balancing, fallback chains |
| `src/lib/ai-orchestrator.ts` | 600 | High-level AI workflows — dispute generation, credit analysis, multi-model consensus, chain-of-thought |
| `src/lib/prompts/dispute-prompts.ts` | 500 | Advanced prompt templates — few-shot learning, chain-of-thought, self-consistency |

### 9.3 Security Services

| File | LOC | Responsibility |
|------|-----|---------------|
| `src/lib/security/input-validation.ts` | 400 | Input sanitization, Zod validation, prompt injection detection, XSS prevention |
| `src/lib/security/output-validation.ts` | 350 | Output filtering, PII leak detection, content moderation, hallucination detection |
| `src/lib/security/rate-limiting.ts` | 350 | Per-IP/user/API-key rate limits, sliding window, cost tracking |
| `src/lib/security/auth-middleware.ts` | 400 | JWT verification, session management, RBAC enforcement |
| `src/lib/security/audit-logging.ts` | 450 | AI interaction logging, security event recording, compliance events |

### 9.4 Compliance Services

| File | LOC | Responsibility |
|------|-----|---------------|
| `src/lib/compliance/gdpr-ccpa.ts` | 450 | Data subject rights, consent management, retention policies, cross-border controls |
| `src/lib/compliance/pii-protection.ts` | 400 | PII detection, AES-256-GCM encryption, masking, tokenization |

### 9.5 Financial Services

| Directory / File | Responsibility |
|-----------------|---------------|
| `src/lib/financial/spending-analysis-service.ts` | Spending categorization, trends, anomaly detection |
| `src/lib/financial/spending-forecast-service.ts` | Predictive spending forecasts |
| `src/lib/financial/spending-limit-alerts-service.ts` | Budget threshold alerts |
| `src/lib/financial/savings-automation-service.ts` | Automated savings rules and transfers |
| `src/lib/financial/savings-goal-service.ts` | Savings goal CRUD and progress tracking |
| `src/lib/financial/auto-save-rules-service.ts` | Round-up and percentage-based auto-save |
| `src/lib/financial/bill-negotiation-service.ts` | AI-powered bill negotiation |
| `src/lib/financial/bill-calendar-service.ts` | Bill due date tracking and reminders |
| `src/lib/financial/debt-payoff-service.ts` | Debt payoff strategies (avalanche, snowball) |
| `src/lib/financial/income-tracking-service.ts` | Income source management and analysis |
| `src/lib/financial/investment-calculators.ts` | ROI, compound interest, FIRE calculations |
| `src/lib/financial/currency-service.ts` | Multi-currency conversion |
| `src/lib/financial/export-service.ts` | Data export (CSV, PDF, JSON) |
| `src/lib/financial/manual-account-service.ts` | Manual account entry for non-linked accounts |
| `src/lib/financial/plaid-service.ts` | Plaid bank account linking |
| `src/lib/financial/subscription-cancellation-service.ts` | Subscription detection and cancellation assistance |
| `src/lib/financial/transaction-rules-service.ts` | Automated transaction categorization rules |
| `src/lib/financial/vitality-score-service.ts` | Financial health vitality score computation |
| `src/lib/financial/crypto-wallet-service.ts` | Cryptocurrency wallet integration |
| `src/lib/financial/real-estate-tracking-service.ts` | Real estate asset tracking |

### 9.6 Commerce Services

| Directory | Responsibility |
|-----------|---------------|
| `src/lib/commerce/payments/` | Payment processing via Stripe — checkout, webhooks, subscription management |
| `src/lib/commerce/payouts/` | Creator/affiliate payout processing |
| `src/lib/commerce/affiliate/` | Affiliate link tracking and commission calculation |
| `src/lib/commerce/matching/` | Product/service matching engine |
| `src/lib/commerce/offers/` | Promotional offer management |

Key file: `src/lib/commerce/payments/payment-router.ts` — routes payment intents to correct processor.

### 9.7 Document & Notification Services

| File | LOC | Responsibility |
|------|-----|---------------|
| `src/lib/documents/document-service.ts` | 450 | S3 upload/download, presigned URLs, file validation, metadata |
| `src/lib/notifications/notification-service.ts` | 450 | Email (Resend), in-app, push notification delivery |

### 9.8 Trading Services

See [Section 7.9](#79-trading-services-map) for the complete trading service map (15 services across 6 directories).

### 9.9 Goals & Gamification Services

| Directory | Responsibility |
|-----------|---------------|
| `src/lib/goals/services/` | Goal CRUD, progress tracking, optimization recommendations |
| `src/lib/gamification/` | Achievement engine, XP/level system, streak tracking, AI personalization |

### 9.10 Infrastructure & Auth Services

| Directory / File | Responsibility |
|-----------------|---------------|
| `src/lib/auth/` | Authentication helpers, token management, MFA utilities |
| `src/lib/email/` | Email template rendering, send helpers |
| `src/lib/monitoring/logger.ts` | Structured logging with severity levels (400 LOC) |
| `src/lib/monitoring/metrics.ts` | Metrics collection and reporting (450 LOC) |
| `src/lib/federal-integration-service.ts` | Federal student loan program data and regulation engine |
| `src/lib/student-loan-agent/` | Student loan strategy engine and federal regulation engine |
| `src/lib/pricing.ts` | Pricing tier definitions |

### 9.11 Custom Hooks (22 Hooks)

Located in `src/hooks/`:

| Hook | Purpose |
|------|---------|
| `useWebPushNotifications` | Web Push API subscription and permission management |
| `useFinancialData` | Financial data fetching and caching |
| `useCreditScore` | Credit score polling and display |
| `useAuth` | Authentication state and methods |
| `useDisputes` | Dispute list and status management |
| `useDocuments` | Document upload and listing |
| `useNotifications` | Notification polling and mark-as-read |
| `useTradingOrders` | Order submission and status tracking |
| `usePortfolio` | Portfolio value and allocation |
| `useBudgets` | Budget CRUD and analysis |
| `useSavingsGoals` | Savings goal progress |
| `useBills` | Bill tracking and negotiation |
| + 10 additional hooks | Various feature-specific state management |

### 9.12 Mobile State Stores (8 Zustand Stores)

Located in `mobile-app/src/store/`:

| Store | Responsibility |
|-------|---------------|
| `authStore.ts` | Authentication state, JWT tokens, user profile |
| `creditStore.ts` | Credit score, factors, history |
| `dashboardStore.ts` | Dashboard data aggregation |
| `disputeStore.ts` | Dispute list, status tracking |
| `financialStore.ts` | Financial data, transactions, accounts |
| `gamificationStore.ts` | XP, levels, achievements, streaks |
| `investmentStore.ts` | Portfolio, holdings, watchlist |
| `notificationStore.ts` | Push/in-app notification state |

---

## Appendix A: Pricing Tiers

| Tier | Monthly Price | Key Features |
|------|-------------|--------------|
| Free | $0 | Basic dashboard, limited AI (5 calls/min), 1 linked account |
| Starter | $29.99 | 5 disputes/mo, basic AI, 3 linked accounts, email support |
| Professional | $99.99 | Unlimited disputes, advanced AI, 10 accounts, bill negotiation |
| Premium | $159.99 | All Professional + trading, investments, priority support |
| Enterprise | $199.99 | Multi-user, API access, dedicated support, custom integrations |
| White Label | $399.99 | Full platform white-labeling, custom branding, SLA |

## Appendix B: Technical Debt Register

| ID | Severity | Description | Planned Resolution |
|----|----------|-------------|-------------------|
| TD-01 | High | Rate limiting is in-memory only | Migrate to Redis (Q1 2026) |
| TD-02 | High | Audit logs not persisted to DB | Implement persistent audit store (Q1 2026) |
| TD-03 | Medium | No automated JWT key rotation | Implement rotation schedule (Q2 2026) |
| TD-04 | Medium | Test coverage below 90% target | Increase from 81% to 90%+ (ongoing) |
| TD-05 | Medium | No WebSocket rate limiting | Implement WS throttling (Q2 2026) |
| TD-06 | Low | CORS allows localhost in dev | Accepted risk — dev-only configuration |
| TD-07 | Low | Email verification not enforced | Add enforcement flow (Q2 2026) |
| TD-08 | Medium | No caching layer (Redis/CDN) | Implement for hot paths (Q2 2026) |
| TD-09 | Low | Manual account reconciliation | Automate via scheduled jobs (Q3 2026) |
| TD-10 | Medium | Mobile app test coverage low | Increase mobile test suite (Q2 2026) |

## Appendix C: Architectural Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| DEC-01 | Next.js 15 App Router | Server Components for performance, file-based routing, built-in API routes |
| DEC-02 | Supabase over Firebase | PostgreSQL for complex queries, built-in auth, RLS, open-source |
| DEC-03 | AIML API gateway | Single integration point for 300+ models, cost optimization, fallback support |
| DEC-04 | Tailwind CSS | Utility-first for rapid development, consistent design system, small bundle |
| DEC-05 | Zustand for mobile state | Lightweight, no boilerplate, TypeScript-first, compatible with React Native |
| DEC-06 | Expo Router for mobile | File-based routing matching web pattern, deep linking, type-safe |
| DEC-07 | Stripe for payments | Industry standard, webhook reliability, subscription management built-in |
| DEC-08 | AWS S3 for documents | Presigned URLs, encryption at rest, cost-effective at scale |
| DEC-09 | Jest + Cypress + Playwright | Jest for unit speed, Cypress for E2E developer experience, Playwright for cross-browser |
| DEC-10 | Monorepo structure | Shared types, unified CI/CD, simplified dependency management |
| DEC-11 | PCTT for trading | Pivot-Constrained Trendline Trading: 7-stage pipeline, 7 AI agents, multi-provider fallback, 30-law compliance, explainable decisions |
| DEC-12 | 5-layer security | Defense in depth prevents single-point-of-failure in security chain |

---

*This blueprint is auto-generated from source documents. For authoritative details on any section, consult the source files: `docs/architecture.md`, `docs/ui-design.md`, `docs/SSOT.md`.*
