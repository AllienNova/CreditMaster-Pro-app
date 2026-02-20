<div align="center">

# Fynvita

**Your Financial Vitality Platform**

AI-powered credit repair, financial wellness, and investment intelligence — unified in a single platform.

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-000?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tests](https://img.shields.io/badge/tests-3%2C287%20passing-brightgreen)](#testing)
[![License](https://img.shields.io/badge/license-Proprietary-red)](#license)

[Documentation](docs/) · [Project Status](PROJECT_STATUS.md) · [Roadmap](ROADMAP.md)

</div>

---

## Overview

Fynvita is a holistic financial health platform combining AI-powered credit repair, comprehensive financial management, and investment intelligence. With intelligent model routing across 300+ AI models, enterprise-grade security, and GDPR/CCPA compliance, it helps users take full control of their financial picture.

### Key Capabilities

- **Credit Repair** — AI-generated dispute letters, credit score analysis, goodwill letter generation, automated bureau communication
- **Financial Management** — Budget optimization, debt payoff strategies, bill negotiation, savings automation, cash flow analysis
- **Investment Intelligence** — Portfolio analysis, technical/fundamental/sentiment research, tax-loss harvesting, price alerts
- **Student Loan Optimization** — Repayment strategy comparison, PSLF eligibility, federal program integration
- **Credit Building** — Score simulation, utilization optimization, credit mix analysis, authorized user strategies
- **AI Financial Coaching** — Behavioral nudges, smart insights, personalized recommendations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15.5 (App Router), React 19, TypeScript 5.7, Tailwind CSS |
| **Backend** | Next.js API Routes (serverless), Node.js 22 |
| **Database** | Supabase (PostgreSQL) with Row-Level Security |
| **Auth** | Supabase Auth + NextAuth (email/password, OAuth, MFA, WebAuthn) |
| **AI/ML** | AIML API (300+ models), OpenAI, Anthropic — intelligent model routing |
| **Payments** | Stripe (subscriptions, checkout, webhooks) |
| **Email** | Resend (transactional email) |
| **Storage** | AWS S3 (document storage with presigned URLs) |
| **Mobile** | React Native / Expo |
| **Testing** | Jest 30, Playwright 1.57, Cypress 15, React Testing Library |
| **Deployment** | Vercel |

## Architecture

```
Client (Browser / Mobile)
    |
    v
Next.js App Router ──── API Routes (248 endpoints)
    |                        |
    |-- Security Layer       |-- AI Orchestrator ── AIML API (300+ models)
    |   |-- Input validation |
    |   |-- Rate limiting    |-- Business Logic
    |   |-- Auth middleware   |   |-- Credit repair engine
    |   +-- PII protection   |   |-- Financial services
    |                        |   |-- Investment analysis
    |-- Monitoring           |   +-- Student loan agent
    |   |-- Structured logs  |
    |   |-- Metrics          |-- Data Layer
    |   +-- Audit trail      |   |-- Supabase (PostgreSQL)
    |                        |   |-- AWS S3 (documents)
    +-- Compliance           |   +-- Stripe (payments)
        |-- GDPR/CCPA       |
        +-- FCRA             +-- Email (Resend)
```

## Project Metrics

| Metric | Value |
|--------|-------|
| API Endpoints | 248 |
| Web Pages | 182 |
| React Components | 228 |
| Test Suites | 178 |
| Tests Passing | 3,287 |
| TypeScript Errors | 0 |
| Dependencies | 63 (33 prod + 30 dev) |

## Getting Started

### Prerequisites

- Node.js 22+ and npm
- Supabase account ([supabase.com](https://supabase.com))
- AIML API key ([aimlapi.com](https://aimlapi.com))

### Installation

```bash
git clone https://github.com/AllienNova/CreditMaster-Pro-app.git
cd CreditMaster-Pro-app

npm install
cp .env.example .env.local
# Edit .env.local with your credentials

npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Environment Variables

Copy `.env.example` and fill in your credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI
AIML_API_KEY=your_aiml_api_key
AIML_BASE_URL=https://api.aimlapi.com/v1

# Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
RESEND_API_KEY=re_...

# Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
```

See `.env.example` for the complete list of configuration options.

## Development

```bash
npm run dev              # Development server
npm run type-check       # TypeScript strict check
npm run lint             # ESLint
npm run build            # Production build
```

## Testing

```bash
npm test                 # Run all unit/integration tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

npm run e2e              # Playwright E2E tests
npm run e2e:ui           # Playwright interactive UI
npm run cypress:open     # Cypress interactive runner
npm run cypress:run      # Cypress headless
```

## Project Structure

```
src/
|-- app/                     # Next.js App Router
|   |-- api/                 # 248 API endpoints
|   |   |-- ai/              # Chat, consensus, orchestration
|   |   |-- credit-repair/   # Disputes, goodwill, negotiations
|   |   |-- financial/       # Budgets, goals, bills, spending
|   |   |-- investments/     # Portfolio, signals, analysis
|   |   |-- admin/           # User management, analytics
|   |   +-- ...
|   |-- dashboard/           # User dashboard
|   |-- credit-builder/      # Credit building tools (16 pages)
|   |-- financial/           # Financial management
|   |-- investments/         # Investment portal
|   |-- marketplace/         # Financial product marketplace
|   +-- ...
|-- components/              # 228 React components
|   |-- aiml/                # AI-powered components
|   |-- credit-repair/       # Credit repair UI
|   |-- financial/           # Financial management UI
|   |-- investments/         # Investment analysis UI
|   |-- trading/             # Trading tools UI
|   +-- ui/                  # Shared UI primitives
|-- lib/                     # Core business logic & services
|   |-- ai/                  # AI engine, entity extraction
|   |-- auth/                # Authentication, RBAC, sessions
|   |-- credit-repair/       # Credit repair services
|   |-- financial/           # Budget, spending, goals, savings
|   |-- investments/         # Portfolio, signals, tax-loss harvesting
|   |-- trading/             # Order management, PCTT, correlation
|   |-- security/            # Input/output validation, rate limiting
|   |-- compliance/          # GDPR, CCPA, PII protection
|   +-- monitoring/          # Logging, metrics, error tracking
|-- hooks/                   # Custom React hooks
+-- types/                   # Shared TypeScript types
docs/                        # Documentation
mobile-app/                  # React Native / Expo mobile app
```

## API Overview

| Domain | Endpoints | Description |
|--------|-----------|-------------|
| AI Services | ~40 | Chat, coaching, insights, orchestration |
| Credit Repair | ~60 | Disputes, goodwill, negotiations, monitoring |
| Financial | ~80 | Budgets, goals, bills, spending, savings |
| Investments | ~30 | Portfolio, signals, research, crypto |
| Admin | ~20 | Users, analytics, audit, monitoring |
| Marketplace | ~12 | Products, providers, reviews |
| Payments | ~6 | Checkout, webhooks, subscriptions |

See [docs/](docs/) for detailed API documentation.

## Security

- Input validation with prompt injection detection
- Output validation with PII leak prevention
- Rate limiting with per-user and per-IP quotas
- Role-based access control (RBAC) with 4 tiers
- Audit logging for all sensitive operations
- GDPR and CCPA compliance with data export/deletion
- Encrypted PII storage with field-level encryption
- HTTPS-only, secure cookies, CSP headers
- FCRA compliance for credit-related operations

## Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel --prod
```

Add all environment variables from `.env.example` in your Vercel project settings. The app auto-deploys on push to `main`.

See [docs/deployment/](docs/deployment/) for detailed deployment guides.

## Documentation

| Document | Description |
|----------|-------------|
| [Project Status](PROJECT_STATUS.md) | Current status and recommendations |
| [Roadmap](ROADMAP.md) | Implementation roadmap |
| [Testing Status](TESTING_STATUS.md) | Test infrastructure and coverage |
| [Quick Reference](QUICK_REFERENCE.md) | Developer quick-start commands |
| [CLAUDE.md](CLAUDE.md) | Architecture deep-dive for AI pair programming |
| [docs/](docs/) | Full documentation library |

## License

Proprietary — All rights reserved.

---

<div align="center">

**Fynvita** — Built by [AlienNova](https://github.com/AllienNova)

</div>
