# Fynvita Credentials & API Keys Cookbook

> Everything you need to get Fynvita running — from local dev to production.
> Organized by priority. Each service includes: what it does, how to get credentials, where to put them, and estimated cost.

---

## Table of Contents

1. [Quick Start (Minimum Viable Dev)](#1-quick-start-minimum-viable-dev)
2. [Supabase (Database + Auth)](#2-supabase--database--auth)
3. [AIML API (AI Engine)](#3-aiml-api--ai-engine)
4. [Stripe (Payments)](#4-stripe--payments)
5. [Resend (Dev Email)](#5-resend--dev-email)
6. [AWS S3 (Document Storage)](#6-aws-s3--document-storage)
7. [VAPID Keys (Web Push Notifications)](#7-vapid-keys--web-push-notifications)
8. [Plaid (Bank Linking)](#8-plaid--bank-linking)
9. [Alpaca (Stock Trading)](#9-alpaca--stock-trading)
10. [DriveWealth (Fractional Trading)](#10-drivewealth--fractional-trading)
11. [Engine by MoneyLion (Affiliate)](#11-engine-by-moneylion--affiliate)
12. [OCR Providers (Tax Document Scanning)](#12-ocr-providers--tax-document-scanning)
13. [Credit Bureau APIs](#13-credit-bureau-apis)
14. [Production-Only Services](#14-production-only-services)
    - [SendGrid (Production Email)](#141-sendgrid--production-email)
    - [Sentry (Error Monitoring)](#142-sentry--error-monitoring)
    - [Google Analytics 4](#143-google-analytics-4)
    - [Upstash Redis (Optional Cache)](#144-upstash-redis--optional-cache)
15. [Self-Generated Secrets](#15-self-generated-secrets)
16. [Mobile App Configuration](#16-mobile-app-configuration)
17. [Webhook Configuration](#17-webhook-configuration)
18. [Vercel Deployment](#18-vercel-deployment)
19. [DNS & Domain Setup](#19-dns--domain-setup)
20. [Master Environment Variable Reference](#20-master-environment-variable-reference)
21. [Cost Summary](#21-cost-summary)

---

## 1. Quick Start (Minimum Viable Dev)

To run Fynvita locally with core features, you need **only 4 services**:

| # | Service | Gets You | Free Tier? |
|---|---------|----------|------------|
| 1 | **Supabase** | Database, auth, user management | Yes (500MB DB) |
| 2 | **AIML API** | AI chat, credit analysis, dispute generation | Yes (limited) |
| 3 | **Stripe** | Payment processing (test mode) | Yes (test mode is free) |
| 4 | **Resend** | Email notifications | Yes (100 emails/day) |

Everything else (S3, Plaid, Alpaca, credit bureaus, etc.) is optional for local development — the app gracefully degrades when these keys are missing.

### Quick Setup (5 minutes)

```bash
# 1. Clone and install
git clone https://github.com/AllienNova/CreditMaster-Pro-app.git
cd CreditMaster-Pro-app
npm install

# 2. Create your env file
cp .env.local.example .env.local

# 3. Fill in the 4 required services (instructions below)
# 4. Start the dev server
npm run dev
```

---

## 2. Supabase — Database + Auth

**What it does**: PostgreSQL database with Row-Level Security, user authentication (email/password, OAuth, MFA), real-time subscriptions, and file storage.

**Why Fynvita needs it**: All user data, financial records, transactions, disputes, goals, and settings are stored here. Auth handles signup/login/sessions.

**Cost**: Free tier = 500MB database, 1GB file storage, 50K monthly active users. Paid starts at $25/mo.

### Step-by-Step

1. Go to [supabase.com](https://supabase.com) and sign up (GitHub login works)
2. Click **"New Project"**
3. Choose your organization (or create one)
4. Set:
   - **Project name**: `fynvita` (or any name you like)
   - **Database password**: Generate a strong password and **save it** (you won't see it again)
   - **Region**: Choose the closest to your users (e.g., `East US (Virginia)` for US)
5. Wait ~2 minutes for the project to provision
6. Go to **Settings** → **API** (left sidebar)
7. Copy these three values:

| Value | Where to Find | Env Variable |
|-------|--------------|--------------|
| Project URL | Under "Project URL" | `NEXT_PUBLIC_SUPABASE_URL` |
| Anon/Public key | Under "Project API keys" → `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Service Role key | Under "Project API keys" → `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

> **WARNING**: The `service_role` key bypasses Row-Level Security. NEVER expose it to the browser. It goes in server-side env only.

### Where to Put These

```env
# .env.local (development)
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhY...

# .env (general — also needs service role)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhY...
```

### Run Migrations

After creating the project, run the database migrations:

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Link to your project
supabase link --project-ref abcdefghij

# Run all 30 migrations
supabase db push
```

The migrations are in `supabase/migrations/` and create all required tables, RLS policies, and indexes.

### Mobile App

The mobile app also needs these (with `EXPO_PUBLIC_` prefix):

```env
# mobile-app/.env
EXPO_PUBLIC_SUPABASE_URL=https://abcdefghij.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. AIML API — AI Engine

**What it does**: Provides access to 300+ AI models (GPT-4o, Claude, DeepSeek, Flux, etc.) through a single API key. Fynvita uses it for credit analysis, dispute letter generation, financial coaching, spending insights, and investment research.

**Why Fynvita needs it**: Powers all AI features — without it, AI chat, dispute generation, credit analysis, and smart budgeting won't work.

**Cost**: Pay-per-token. Most models are $0.001–$0.01 per 1K tokens. Typical development usage: $5–$20/month. Production depends on user volume.

### Step-by-Step

1. Go to [aimlapi.com](https://aimlapi.com)
2. Click **"Get Started"** or **"Sign Up"**
3. Create an account (email or GitHub)
4. Go to **Dashboard** → **API Keys**
5. Click **"Create API Key"**
6. Copy the generated key

### Where to Put These

```env
# .env.local (development)
AIML_API_KEY=your_aiml_api_key_here
AIML_API_URL=https://api.aimlapi.com/v1

# .env (model configuration — optional overrides)
AIML_BASE_URL=https://api.aimlapi.com/v1
AIML_DEFAULT_CHAT_MODEL=anthropic/claude-4.5-sonnet
AIML_REASONING_MODEL=deepseek/deepseek-r1
AIML_FAST_MODEL=openai/gpt-4o-mini
AIML_IMAGE_MODEL=flux-pro
AIML_VOICE_MODEL=tts-1-hd
```

### Feature Flags (Optional)

These enable/disable specific AI capabilities:

```env
ENABLE_MULTI_MODEL=true          # Use multiple AI models (recommended)
ENABLE_VOICE_ASSISTANT=true      # Voice synthesis features
ENABLE_IMAGE_GENERATION=true     # Image generation (e.g., chart previews)
ENABLE_SEMANTIC_SEARCH=true      # Semantic search across financial data
```

---

## 4. Stripe — Payments

**What it does**: Handles subscription billing for Fynvita's 6 pricing tiers (Free through Family Plus), one-time payments, and webhook-based event processing.

**Why Fynvita needs it**: Without Stripe, users can't upgrade from the free tier. All subscription management, billing, and payment history depend on it.

**Cost**: 2.9% + $0.30 per transaction. No monthly fees. Test mode is completely free.

### Step-by-Step

#### A. Create Account & Get API Keys

1. Go to [stripe.com](https://stripe.com) and sign up
2. After signup, you're in **Test Mode** by default (toggle at top-right)
3. Go to **Developers** → **API Keys**
4. Copy:
   - **Publishable key** (`pk_test_...`) — safe for the browser
   - **Secret key** (`sk_test_...`) — server-side only, click "Reveal test key"

#### B. Create Products & Price IDs

Fynvita has 6 tiers × 2 billing cycles = 10 price IDs to create (Free tier has no price ID).

1. Go to **Products** → **Add Product** for each:

| Product Name | Monthly Price | Annual Price | Annual Discount |
|-------------|--------------|-------------|-----------------|
| Fynvita Standard | $29.99/mo | $349.08/yr ($29.09/mo) | 3% |
| Fynvita Pro | $99.99/mo | $1,103.88/yr ($91.99/mo) | 8% |
| Fynvita Family Duo | $159.99/mo | $1,573.70/yr ($131.14/mo) | 18% |
| Fynvita Family | $199.99/mo | $1,967.90/yr ($163.99/mo) | 18% |
| Fynvita Family Plus | $399.99/mo | $3,935.88/yr ($327.99/mo) | 18% |

2. For each product:
   - Click **"Add Product"**
   - Enter the name and description
   - Under **Pricing**, add a **Recurring** price with the monthly amount
   - Click **"Add another price"** and add the **Annual** recurring price
   - After saving, click into the product → copy each **Price ID** (`price_...`)

3. Map the IDs to env variables:

```env
# .env.local
STRIPE_SECRET_KEY=sk_test_51abc...

# Monthly prices
STRIPE_STANDARD_PRICE_ID=price_1Abc...
STRIPE_PRO_PRICE_ID=price_1Def...
STRIPE_FAMILY_DUO_PRICE_ID=price_1Ghi...
STRIPE_FAMILY_PRICE_ID=price_1Jkl...
STRIPE_FAMILY_PLUS_PRICE_ID=price_1Mno...

# Annual prices
STRIPE_STANDARD_ANNUAL_PRICE_ID=price_1Pqr...
STRIPE_PRO_ANNUAL_PRICE_ID=price_1Stu...
STRIPE_FAMILY_DUO_ANNUAL_PRICE_ID=price_1Vwx...
STRIPE_FAMILY_ANNUAL_PRICE_ID=price_1Yza...
STRIPE_FAMILY_PLUS_ANNUAL_PRICE_ID=price_1Bcd...
```

#### C. Set Up Webhook (Local Development)

1. Install the Stripe CLI:
   ```bash
   brew install stripe/stripe-cli/stripe    # macOS
   ```
2. Login:
   ```bash
   stripe login
   ```
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/payment/webhook
   ```
4. The CLI will print a webhook signing secret (`whsec_...`). Copy it:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

#### D. Production Webhook

For production (Vercel), set up the webhook in the Stripe Dashboard:
1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. URL: `https://fynvita.com/api/payment/webhook`
3. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
4. Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET` in Vercel env vars

---

## 5. Resend — Dev Email

**What it does**: Sends transactional emails — welcome emails, password resets, dispute status updates, payment receipts, bill negotiation results.

**Why Fynvita needs it**: Users need email notifications for account actions, dispute progress, and payment confirmations.

**Cost**: Free tier = 100 emails/day, 3,000/month. Paid starts at $20/mo for 50K emails.

### Step-by-Step

1. Go to [resend.com](https://resend.com) and sign up
2. Go to **API Keys** in the sidebar
3. Click **"Create API Key"**
4. Name it `fynvita-dev`, select **Full access**
5. Copy the key (`re_...`)

```env
# .env.local
RESEND_API_KEY=re_123abc...
EMAIL_FROM=Fynvita <noreply@fynvita.com>
```

### Domain Verification (Production)

For production emails that don't land in spam:

1. In Resend, go to **Domains** → **Add Domain**
2. Enter `fynvita.com`
3. Add the DNS records Resend provides (SPF, DKIM, DMARC):
   - **TXT** record for SPF verification
   - **CNAME** records for DKIM
   - **TXT** record for DMARC (optional but recommended)
4. Wait for verification (~5 minutes to 24 hours)
5. Once verified, emails from `@fynvita.com` addresses will be trusted

> **Note**: Production uses **SendGrid** for SMTP (see [Section 14.1](#141-sendgrid--production-email)). Resend is for development.

---

## 6. AWS S3 — Document Storage

**What it does**: Stores uploaded documents — tax forms, dispute letters, credit reports, identity verification docs. Uses presigned URLs for secure, time-limited access.

**Why Fynvita needs it**: Users upload documents for credit disputes, tax optimization, and identity verification. These need durable, secure cloud storage.

**Cost**: ~$0.023/GB/month for storage, $0.09/GB for data transfer. Typical dev usage: <$1/month. Free tier: 5GB for 12 months.

> **Alternative**: Supabase Storage works as a drop-in replacement for development. S3 is recommended for production.

### Step-by-Step

1. Go to [aws.amazon.com](https://aws.amazon.com) → sign in or create account
2. Search for **S3** in the console

#### A. Create a Bucket

1. Click **"Create bucket"**
2. Bucket name: `fynvita-documents` (must be globally unique — add a suffix if taken)
3. Region: `us-east-1` (or match your Vercel region)
4. **Block all public access**: YES (leave enabled — we use presigned URLs)
5. Click **"Create bucket"**

#### B. Create an IAM User

1. Go to **IAM** → **Users** → **Create user**
2. User name: `fynvita-s3-service`
3. Click **Next** → **Attach policies directly**
4. Search for and attach: `AmazonS3FullAccess` (or create a custom policy scoped to your bucket)
5. Click through to create the user
6. Go to the user → **Security credentials** → **Create access key**
7. Use case: **Application running outside AWS**
8. Copy both the **Access Key ID** and **Secret Access Key**

> **Security tip**: For production, create a custom IAM policy that only allows access to your specific bucket:
> ```json
> {
>   "Version": "2012-10-17",
>   "Statement": [{
>     "Effect": "Allow",
>     "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
>     "Resource": "arn:aws:s3:::fynvita-documents/*"
>   }]
> }
> ```

```env
# .env.local
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalrXUtn...
AWS_S3_BUCKET=fynvita-documents
```

#### C. CORS Configuration (for direct browser uploads)

In the S3 bucket → **Permissions** → **CORS**, add:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["http://localhost:3000", "https://fynvita.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 7. VAPID Keys — Web Push Notifications

**What it does**: Enables browser push notifications (the ones that pop up even when the tab is closed). VAPID (Voluntary Application Server Identification) keys identify your server to push services.

**Why Fynvita needs it**: Bill payment reminders, dispute status updates, price alerts, budget warnings — all sent as push notifications.

**Cost**: Free. You generate the keys yourself.

### Step-by-Step

1. Run this command in your project directory:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. It outputs a public key and private key. Copy both.

```env
# .env (shared)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BEl62iUYgU...  # Long base64 string
VAPID_PRIVATE_KEY=3ZP5kJm...                 # Shorter base64 string
VAPID_SUBJECT=mailto:support@fynvita.com     # Contact email for push services
```

> These are generated once and reused across all environments. If you regenerate them, all existing push subscriptions become invalid and users must re-subscribe.

---

## 8. Plaid — Bank Linking

**What it does**: Connects users' bank accounts to Fynvita. Pulls transaction history, account balances, income data, investment holdings, and liabilities (credit cards, student loans, mortgages).

**Why Fynvita needs it**: Core financial management features — spending analysis, budget tracking, cash flow, bill detection, income verification — all depend on bank transaction data.

**Cost**: Free sandbox (unlimited). Production: $0.30/connection per month (Pay As You Go) or custom pricing. Development environment is free.

### Step-by-Step

1. Go to [dashboard.plaid.com/signup](https://dashboard.plaid.com/signup) and sign up
2. After email verification, you'll land on the Plaid Dashboard
3. Go to **Team** → **Keys** (left sidebar)
4. Copy:
   - **Client ID** — the alphanumeric identifier
   - **Sandbox Secret** — for development (safe, uses test data)
   - **Development Secret** — for staging (connects to real banks, limited to 100 items)
   - **Production Secret** — for live usage (requires application approval)

```env
# .env (general)
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_sandbox_secret        # Use sandbox for dev
PLAID_ENV=sandbox                        # sandbox | development | production
```

### Plaid Environments

| Environment | Real Banks? | Cost | Use For |
|-------------|------------|------|---------|
| `sandbox` | No (test data) | Free | Local development, CI tests |
| `development` | Yes (100 items) | Free | Staging, QA testing |
| `production` | Yes (unlimited) | $0.30/item/mo | Live users |

### Production Approval

To go live with Plaid in production:
1. Go to **Dashboard** → **Going Live**
2. Submit your company info, use case, and compliance details
3. Plaid reviews (typically 1–2 weeks)
4. Once approved, swap `PLAID_ENV=production` and use the production secret

### Webhook Setup (Production)

In the Plaid Dashboard → **Webhooks**:
- URL: `https://fynvita.com/api/financial/plaid/webhooks`
- Events: `TRANSACTIONS`, `ITEM`, `AUTH`, `INVESTMENTS`, `LIABILITIES`, `INCOME`

The webhook handler at `src/app/api/financial/plaid/webhooks/route.ts` verifies webhook signatures using HMAC-SHA256 before processing.

---

## 9. Alpaca — Stock Trading

**What it does**: Commission-free stock trading API. Fynvita uses it for market data, order placement, portfolio management, and paper trading.

**Why Fynvita needs it**: Powers the investment/trading features — portfolio analysis, trade execution, watchlists, price alerts, and paper trading mode.

**Cost**: Free for paper trading + market data. Live trading: no commissions, but requires a brokerage account with funded balance.

### Step-by-Step

1. Go to [app.alpaca.markets/signup](https://app.alpaca.markets/signup)
2. Sign up for a **developer account** (not a brokerage account — that's for live trading)
3. After signup, go to **Paper Trading** in the sidebar
4. Click **"View"** next to your API keys
5. Copy:
   - **API Key ID** (`PK...`)
   - **Secret Key** (`...`) — shown once, save it

```env
# .env (general)
ALPACA_API_KEY=PK1234567890
ALPACA_API_SECRET=abcdefghij1234567890
ALPACA_BASE_URL=https://paper-api.alpaca.markets    # Paper trading
# ALPACA_BASE_URL=https://api.alpaca.markets         # Live trading
```

### Paper vs Live

| Mode | URL | Risk | Requirements |
|------|-----|------|-------------|
| Paper | `paper-api.alpaca.markets` | None (fake money) | Just API keys |
| Live | `api.alpaca.markets` | Real money | Approved brokerage account + funding |

> **Recommendation**: Keep `paper-api` URL for development and testing. Only switch to live when you're ready for real trading.

---

## 10. DriveWealth — Fractional Trading

**What it does**: Enables fractional share trading (buy $5 of Apple instead of a full share), international investors, and embedded brokerage features.

**Why Fynvita needs it**: Fractional trading engine, dollar-based orders, auto-invest scheduling, and DRIP (dividend reinvestment).

**Cost**: Custom pricing (enterprise). Sandbox is free for development.

### Step-by-Step

1. Go to [developer.drivewealth.com](https://developer.drivewealth.com)
2. Click **"Get Started"** or **"Request Access"**
3. Fill out the partner application form:
   - Company name, use case, expected volume
   - This is a B2B platform — they review applications
4. After approval (typically 1–2 weeks), you'll receive:
   - **API Key**
   - **API URL** (sandbox and production)
   - Documentation access

```env
# .env (general)
DRIVEWEALTH_API_KEY=your_drivewealth_api_key
DRIVEWEALTH_API_URL=https://bo-api.sandbox.drivewealth.com/back-office   # Sandbox
# DRIVEWEALTH_API_URL=https://bo-api.drivewealth.com/back-office          # Production
DRIVEWEALTH_API_SECRET=your_drivewealth_secret                            # If provided
```

> **Note**: DriveWealth is a B2B API — approval requires a business entity and compliance review. Start the application early as it takes time.

---

## 11. Engine by MoneyLion — Affiliate

**What it does**: Financial product marketplace API. Matches users with credit cards, personal loans, insurance, and other financial products. Fynvita earns affiliate revenue on referrals.

**Why Fynvita needs it**: Powers the affiliate monetization layer — credit card recommendations, loan matching, insurance matching, and product marketplace.

**Cost**: Free to integrate. Revenue is earned per qualified lead/conversion.

### Step-by-Step

1. Go to [engine.moneylion.com](https://engine.moneylion.com) (formerly Even Financial)
2. Click **"Become a Partner"** or **"Sign Up"**
3. Fill out the partner application:
   - Website URL, monthly traffic, use case
   - Compliance information (FTC disclosures, etc.)
4. After approval, you'll get:
   - **API Key**
   - **API URL** (sandbox + production)
   - Access to the partner dashboard

```env
# .env (general)
MONEYLION_API_KEY=your_moneylion_api_key
MONEYLION_API_URL=https://api.engine.moneylion.com/v3   # Production
# MONEYLION_API_URL=https://sandbox.engine.moneylion.com/v3  # Sandbox
```

> **Note**: Like DriveWealth, this is a B2B partnership. The approval process involves compliance review. Apply early.

---

## 12. OCR Providers — Tax Document Scanning

**What it does**: Extracts text from uploaded tax documents (W-2s, 1099s, receipts). Uses a multi-provider strategy: OpenAI Vision (primary) → Google Cloud Vision (secondary) → LandingAI (tertiary fallback).

**Why Fynvita needs it**: The tax optimization module scans uploaded documents to auto-populate deduction categories, income verification, and tax strategy recommendations.

**Cost**: You only need ONE provider. OpenAI Vision is recommended.

### Provider A: OpenAI Vision (Recommended Primary)

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Go to **API Keys** → **Create new secret key**
4. Name it `fynvita-ocr`
5. Copy the key (`sk-...`)

```env
OPENAI_API_KEY=sk-...
```

**Cost**: ~$0.01 per image (GPT-4 Vision). Very cheap for document scanning.

### Provider B: Google Cloud Vision (Optional Secondary)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (or select existing)
3. Go to **APIs & Services** → **Library** → search "Cloud Vision API" → **Enable**
4. Go to **APIs & Services** → **Credentials** → **Create Credentials** → **API Key**
5. Copy the key
6. (Recommended) Restrict the key to only the Cloud Vision API

```env
GOOGLE_VISION_API_KEY=AIza...
```

**Cost**: First 1,000 units/month free, then $1.50/1,000 units.

### Provider C: LandingAI (Optional Tertiary)

1. Go to [landing.ai](https://landing.ai)
2. Sign up for an account
3. Go to your profile → API Keys
4. Generate a key

```env
LANDING_AI_API_KEY=your_key
```

> **Recommendation**: Start with just OpenAI Vision. Add Google Vision later if you need redundancy. LandingAI is rarely needed.

---

## 13. Credit Bureau APIs

**What it does**: Direct API access to Experian, Equifax, and TransUnion for pulling credit reports, scores, and dispute status.

**Why Fynvita needs it**: Live credit data for credit repair features — score tracking, dispute filing, report analysis. Without these, the app uses mock data.

**Cost**: Enterprise pricing. Varies by bureau and data product. Typically requires a business entity and compliance certification.

> **Important**: Credit bureau APIs require significant compliance work (FCRA certification, permissible purpose, data security review). This is a major undertaking — plan months, not weeks.

### Experian

1. Go to [developer.experian.com](https://developer.experian.com)
2. Register for a developer account
3. Apply for API access (review process)
4. After approval:

```env
EXPERIAN_API_KEY=your_experian_api_key
EXPERIAN_API_SECRET=your_experian_api_secret
EXPERIAN_CLIENT_ID=your_experian_client_id
EXPERIAN_BASE_URL=https://sandbox-us-api.experian.com    # Sandbox
# EXPERIAN_BASE_URL=https://us-api.experian.com           # Production
```

### Equifax

1. Go to [developer.equifax.com](https://developer.equifax.com)
2. Register and apply for API access
3. After approval:

```env
EQUIFAX_API_KEY=your_equifax_api_key
EQUIFAX_API_SECRET=your_equifax_api_secret
EQUIFAX_CLIENT_ID=your_equifax_client_id
EQUIFAX_BASE_URL=https://api.sandbox.equifax.com    # Sandbox
# EQUIFAX_BASE_URL=https://api.equifax.com           # Production
```

### TransUnion

1. Go to [developer.transunion.com](https://developer.transunion.com)
2. Register and apply for API access
3. After approval:

```env
TRANSUNION_API_KEY=your_transunion_api_key
TRANSUNION_API_SECRET=your_transunion_api_secret
TRANSUNION_CLIENT_ID=your_transunion_client_id
TRANSUNION_BASE_URL=https://netaccess-test.transunion.com   # Sandbox
# TRANSUNION_BASE_URL=https://netaccess.transunion.com       # Production
```

### Global Toggle

```env
BUREAU_API_ENVIRONMENT=sandbox    # sandbox | production
```

> **Recommendation**: Start with `sandbox` mode. The app has comprehensive mock data for development. Only pursue production bureau access when you're ready for a live launch with real credit data.

---

## 14. Production-Only Services

These are needed only when deploying to production (Vercel).

### 14.1 SendGrid — Production Email

**What it does**: SMTP relay for production email delivery (higher volume and deliverability than Resend).

**Why production needs it**: Resend's free tier is fine for dev, but production needs reliable delivery for password resets, dispute notifications, and payment receipts.

**Cost**: Free tier = 100 emails/day. Essentials starts at $19.95/mo for 50K emails.

#### Step-by-Step

1. Go to [sendgrid.com](https://sendgrid.com) and sign up
2. Go to **Settings** → **API Keys** → **Create API Key**
3. Name: `fynvita-production`, permissions: **Full Access**
4. Copy the key (`SG.xxx`)
5. Go to **Settings** → **Sender Authentication** → verify your domain (`fynvita.com`)

```env
# .env.production.local
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.your_api_key_here
EMAIL_FROM=noreply@fynvita.com
EMAIL_REPLY_TO=support@fynvita.com
```

### 14.2 Sentry — Error Monitoring

**What it does**: Catches runtime errors in production, tracks performance, provides stack traces with source maps.

**Why production needs it**: You need to know when things break before your users tell you.

**Cost**: Free tier = 5K errors/month, 10K transactions. Team plan $26/mo.

#### Step-by-Step

1. Go to [sentry.io](https://sentry.io) and sign up
2. Create a project → select **Next.js**
3. Copy the **DSN** from the setup page
4. Go to **Settings** → **Auth Tokens** → **Create New Token**

```env
# .env.production.local
SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/789
SENTRY_AUTH_TOKEN=sntrys_xxx
```

### 14.3 Google Analytics 4

**What it does**: User behavior analytics — page views, feature usage, conversion funnels.

**Cost**: Free.

#### Step-by-Step

1. Go to [analytics.google.com](https://analytics.google.com)
2. Create an account and property for `fynvita.com`
3. Set up a **Web** data stream
4. Copy the **Measurement ID** (`G-XXXXXXXXXX`)

```env
# .env.production.local
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 14.4 Upstash Redis — Optional Cache

**What it does**: Serverless Redis for caching API responses, rate limiting, and session storage. Compatible with Vercel serverless functions.

**Why it's optional**: The app works without it — Redis caching just makes it faster.

**Cost**: Free tier = 10K commands/day. Pay-as-you-go starts at $0.2/100K commands.

#### Step-by-Step

1. Go to [console.upstash.com](https://console.upstash.com)
2. Create a database
3. Region: `us-east-1` (match your Vercel region)
4. Copy the **Redis URL**

```env
# .env.production.local (optional)
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379
```

---

## 15. Self-Generated Secrets

These values don't come from external services — you generate them yourself.

### Authentication Secrets

```bash
# Generate NEXTAUTH_SECRET (32 bytes, base64)
openssl rand -base64 32
# Example output: K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=

# Generate JWT_SECRET (different from above)
openssl rand -base64 32
```

```env
# .env.production.local
NEXTAUTH_URL=https://fynvita.com
NEXTAUTH_SECRET=K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=
JWT_SECRET=another-different-32-byte-secret-here
```

### Encryption Key

```bash
# Generate AES-256 encryption key (32 bytes, hex = 64 chars)
openssl rand -hex 32
# Example output: a1b2c3d4e5f6...  (64 hex characters)
```

```env
# .env.production.local
ENCRYPTION_KEY=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
```

> **WARNING**: If you change the encryption key, all previously encrypted data (PII, credit info) becomes unreadable. Back it up securely.

### Cron Job Secret

```bash
# Generate cron secret (for Vercel Cron job authentication)
openssl rand -base64 32
```

```env
# .env.production.local
CRON_SECRET=your-generated-cron-secret
```

### VAPID Keys (Reminder)

```bash
npx web-push generate-vapid-keys
```

See [Section 7](#7-vapid-keys--web-push-notifications) for details.

---

## 16. Mobile App Configuration

The Expo mobile app (`mobile-app/`) uses a separate `.env` file with `EXPO_PUBLIC_` prefixed variables.

### Step-by-Step

```bash
cd mobile-app
cp .env.example .env
```

### Required Variables

```env
# mobile-app/.env
EXPO_PUBLIC_SUPABASE_URL=https://abcdefghij.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_API_URL=http://localhost:3000/api     # Dev
# EXPO_PUBLIC_API_URL=https://fynvita.com/api     # Production
EXPO_PUBLIC_APP_NAME=Fynvita
EXPO_PUBLIC_APP_VERSION=1.0.0
```

### API URL by Platform (Development)

| Platform | EXPO_PUBLIC_API_URL |
|----------|-------------------|
| Android Emulator | `http://10.0.2.2:3000/api` (auto-detected) |
| iOS Simulator | `http://localhost:3000/api` (auto-detected) |
| Physical Device | `http://YOUR_MACHINE_IP:3000/api` |
| Production | `https://fynvita.com/api` |

### EAS Build (App Store Deployment)

For EAS builds, set environment variables in `eas.json` or Expo's environment secrets:

```bash
# Optional: EAS project ID for builds
EAS_PROJECT_ID=your-eas-project-id
```

### App Variant

The `app.config.js` uses `APP_VARIANT` to differentiate builds:

| Variant | Bundle ID | Use |
|---------|-----------|-----|
| `development` | `com.fynvita.app.dev` | Dev builds |
| `preview` | `com.fynvita.app.preview` | TestFlight/Internal |
| (default) | `com.fynvita.app` | Production |

---

## 17. Webhook Configuration

Three services send webhooks to Fynvita that need to be configured in their respective dashboards.

### Stripe Webhook

| Setting | Value |
|---------|-------|
| **URL** | `https://fynvita.com/api/payment/webhook` |
| **Events** | `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed` |
| **Config location** | Stripe Dashboard → Developers → Webhooks |
| **Local testing** | `stripe listen --forward-to localhost:3000/api/payment/webhook` |

### Plaid Webhook

| Setting | Value |
|---------|-------|
| **URL** | `https://fynvita.com/api/financial/plaid/webhooks` |
| **Events** | `TRANSACTIONS`, `ITEM`, `AUTH`, `INVESTMENTS`, `LIABILITIES`, `INCOME` |
| **Config location** | Plaid Dashboard → Webhooks |
| **Verification** | HMAC-SHA256 signature |

### Plaid Auth Webhook

| Setting | Value |
|---------|-------|
| **URL** | `https://fynvita.com/api/financial/plaid/auth-webhook` |
| **Config location** | Plaid Dashboard → Webhooks (same page, separate URL) |

---

## 18. Vercel Deployment

### Environment Variables

All env vars from `.env.production.local` must be added to Vercel:

1. Go to [vercel.com](https://vercel.com) → your project → **Settings** → **Environment Variables**
2. Add each variable (production scope)
3. Sensitive values (API keys, secrets): mark as **Sensitive** (encrypted at rest)

### Cron Jobs (Pre-configured)

The `vercel.json` already defines 3 cron jobs that run automatically:

| Job | Schedule | Endpoint |
|-----|----------|----------|
| Check dispute status | Daily at 9:00 AM UTC | `/api/cron/check-dispute-status` |
| Send reminders | Mondays at 10:00 AM UTC | `/api/cron/send-reminders` |
| Cleanup expired sessions | Daily at 3:00 AM UTC | `/api/cron/cleanup-expired-sessions` |

These run on Vercel's Pro plan ($20/mo) — the Hobby plan only supports 1 cron job.

### Function Configuration (Pre-configured)

| Functions | Max Duration | Memory |
|-----------|-------------|--------|
| All API routes (`src/app/api/**/*.ts`) | 30s | 1024MB |
| AI routes (`src/app/api/ai/**/*.ts`) | 60s | 1024MB |
| Dispute generation | 60s | 1024MB |

### Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

Or connect your GitHub repo for auto-deployment on push to `main`.

---

## 19. DNS & Domain Setup

If you're using `fynvita.com` (or any custom domain):

### Vercel DNS

1. In Vercel → your project → **Settings** → **Domains** → add `fynvita.com`
2. Add DNS records at your registrar:
   - **A** record: `76.76.21.21` (Vercel)
   - **CNAME** for `www`: `cname.vercel-dns.com`

### Email DNS (for Resend/SendGrid)

Add these records at your registrar (exact values from Resend/SendGrid):

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| TXT | `@` | `v=spf1 include:sendgrid.net ~all` | SPF |
| CNAME | `s1._domainkey` | `s1.domainkey.u123.wl.sendgrid.net` | DKIM |
| CNAME | `s2._domainkey` | `s2.domainkey.u123.wl.sendgrid.net` | DKIM |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:...` | DMARC |

### SSL

Vercel provides free SSL certificates automatically. No action needed.

---

## 20. Master Environment Variable Reference

Complete list of all 77+ environment variables, organized by where they go.

### `.env.local` (Local Development — Required)

| Variable | Service | Required? |
|----------|---------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | **Yes** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | **Yes** |
| `STRIPE_SECRET_KEY` | Stripe | **Yes** |
| `STRIPE_STANDARD_PRICE_ID` | Stripe | **Yes** |
| `STRIPE_PRO_PRICE_ID` | Stripe | **Yes** |
| `STRIPE_FAMILY_DUO_PRICE_ID` | Stripe | **Yes** |
| `STRIPE_FAMILY_PRICE_ID` | Stripe | **Yes** |
| `STRIPE_FAMILY_PLUS_PRICE_ID` | Stripe | **Yes** |
| `STRIPE_STANDARD_ANNUAL_PRICE_ID` | Stripe | **Yes** |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Stripe | **Yes** |
| `STRIPE_FAMILY_DUO_ANNUAL_PRICE_ID` | Stripe | **Yes** |
| `STRIPE_FAMILY_ANNUAL_PRICE_ID` | Stripe | **Yes** |
| `STRIPE_FAMILY_PLUS_ANNUAL_PRICE_ID` | Stripe | **Yes** |
| `STRIPE_WEBHOOK_SECRET` | Stripe | **Yes** |
| `RESEND_API_KEY` | Resend | **Yes** |
| `EMAIL_FROM` | Resend | **Yes** |
| `AIML_API_KEY` | AIML | **Yes** |
| `AIML_API_URL` | AIML | **Yes** |
| `NEXT_PUBLIC_APP_URL` | App | **Yes** |
| `AWS_REGION` | S3 | Optional |
| `AWS_ACCESS_KEY_ID` | S3 | Optional |
| `AWS_SECRET_ACCESS_KEY` | S3 | Optional |
| `AWS_S3_BUCKET` | S3 | Optional |

### `.env` (Shared Config — All Environments)

| Variable | Service | Required? |
|----------|---------|-----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | **Yes** |
| `AIML_BASE_URL` | AIML | **Yes** |
| `AIML_DEFAULT_CHAT_MODEL` | AIML | Optional |
| `AIML_REASONING_MODEL` | AIML | Optional |
| `AIML_FAST_MODEL` | AIML | Optional |
| `AIML_IMAGE_MODEL` | AIML | Optional |
| `AIML_VOICE_MODEL` | AIML | Optional |
| `ENABLE_MULTI_MODEL` | Feature flag | Optional |
| `ENABLE_VOICE_ASSISTANT` | Feature flag | Optional |
| `ENABLE_IMAGE_GENERATION` | Feature flag | Optional |
| `ENABLE_SEMANTIC_SEARCH` | Feature flag | Optional |
| `OPENAI_API_KEY` | OCR | Optional |
| `GOOGLE_VISION_API_KEY` | OCR | Optional |
| `LANDING_AI_API_KEY` | OCR | Optional |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push | Optional |
| `VAPID_PRIVATE_KEY` | Push | Optional |
| `VAPID_SUBJECT` | Push | Optional |
| `PLAID_CLIENT_ID` | Plaid | Optional |
| `PLAID_SECRET` | Plaid | Optional |
| `PLAID_ENV` | Plaid | Optional |
| `ALPACA_API_KEY` | Alpaca | Optional |
| `ALPACA_API_SECRET` | Alpaca | Optional |
| `ALPACA_BASE_URL` | Alpaca | Optional |
| `DRIVEWEALTH_API_KEY` | DriveWealth | Optional |
| `DRIVEWEALTH_API_URL` | DriveWealth | Optional |
| `DRIVEWEALTH_API_SECRET` | DriveWealth | Optional |
| `MONEYLION_API_KEY` | MoneyLion | Optional |
| `MONEYLION_API_URL` | MoneyLion | Optional |
| `BUREAU_API_ENVIRONMENT` | Bureaus | Optional |
| `EXPERIAN_API_KEY` | Experian | Optional |
| `EXPERIAN_API_SECRET` | Experian | Optional |
| `EXPERIAN_CLIENT_ID` | Experian | Optional |
| `EXPERIAN_BASE_URL` | Experian | Optional |
| `EQUIFAX_API_KEY` | Equifax | Optional |
| `EQUIFAX_API_SECRET` | Equifax | Optional |
| `EQUIFAX_CLIENT_ID` | Equifax | Optional |
| `EQUIFAX_BASE_URL` | Equifax | Optional |
| `TRANSUNION_API_KEY` | TransUnion | Optional |
| `TRANSUNION_API_SECRET` | TransUnion | Optional |
| `TRANSUNION_CLIENT_ID` | TransUnion | Optional |
| `TRANSUNION_BASE_URL` | TransUnion | Optional |

### `.env.production.local` (Production — Vercel)

| Variable | Service | Required? |
|----------|---------|-----------|
| `NODE_ENV` | App | **Yes** (`production`) |
| `NEXT_PUBLIC_APP_URL` | App | **Yes** |
| `NEXT_PUBLIC_APP_NAME` | App | **Yes** |
| `NEXTAUTH_URL` | Auth | **Yes** |
| `NEXTAUTH_SECRET` | Auth | **Yes** (self-generated) |
| `JWT_SECRET` | Auth | **Yes** (self-generated) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe | **Yes** (`pk_live_...`) |
| `STRIPE_PRICE_BASIC` | Stripe | **Yes** |
| `STRIPE_PRICE_PRO` | Stripe | **Yes** |
| `STRIPE_PRICE_PREMIUM` | Stripe | **Yes** |
| `SMTP_HOST` | SendGrid | **Yes** |
| `SMTP_PORT` | SendGrid | **Yes** |
| `SMTP_USER` | SendGrid | **Yes** |
| `SMTP_PASSWORD` | SendGrid | **Yes** |
| `EMAIL_FROM` | SendGrid | **Yes** |
| `EMAIL_REPLY_TO` | SendGrid | **Yes** |
| `SENTRY_DSN` | Sentry | **Yes** |
| `SENTRY_AUTH_TOKEN` | Sentry | **Yes** |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 | **Yes** |
| `LOG_LEVEL` | App | Optional (`info`) |
| `ENCRYPTION_KEY` | Security | **Yes** (self-generated) |
| `RATE_LIMIT_ENABLED` | Security | Optional (`true`) |
| `RATE_LIMIT_MAX_REQUESTS` | Security | Optional (`100`) |
| `RATE_LIMIT_WINDOW_MS` | Security | Optional (`60000`) |
| `CORS_ORIGINS` | Security | **Yes** |
| `CRON_SECRET` | Vercel | **Yes** (self-generated) |
| `ENABLE_MARKETPLACE` | Feature flag | Optional |
| `ENABLE_STUDENT_LOANS` | Feature flag | Optional |
| `ENABLE_AI_CHAT` | Feature flag | Optional |
| `ENABLE_ADVANCED_STRATEGIES` | Feature flag | Optional |
| `REDIS_URL` | Upstash | Optional |

### `mobile-app/.env`

| Variable | Service | Required? |
|----------|---------|-----------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase | **Yes** |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase | **Yes** |
| `EXPO_PUBLIC_API_URL` | App | **Yes** |
| `EXPO_PUBLIC_APP_NAME` | App | Optional |
| `EXPO_PUBLIC_APP_VERSION` | App | Optional |

---

## 21. Cost Summary

### Development (Local)

| Service | Monthly Cost |
|---------|-------------|
| Supabase (Free) | $0 |
| AIML API (light usage) | $5–$20 |
| Stripe (test mode) | $0 |
| Resend (100 emails/day) | $0 |
| AWS S3 (Free tier) | $0 |
| OpenAI Vision (OCR, light) | $1–$5 |
| **Total Dev** | **$5–$25/mo** |

### Production (Estimated, Pre-Revenue)

| Service | Monthly Cost |
|---------|-------------|
| Vercel Pro | $20 |
| Supabase Pro | $25 |
| AIML API (moderate) | $50–$200 |
| Stripe | 2.9% + $0.30/transaction |
| SendGrid (Essentials) | $20 |
| Resend (backup) | $0 |
| AWS S3 | $5–$20 |
| Sentry (Free) | $0 |
| Google Analytics | $0 |
| Plaid (Pay-as-you-go) | $0.30/connection/mo |
| Alpaca | $0 (no commission) |
| VAPID, NEXTAUTH, JWT, etc. | $0 (self-generated) |
| **Total Pre-Revenue** | **~$120–$265/mo + Stripe fees** |

### Enterprise/B2B Services (Requires Approval)

| Service | Cost | Lead Time |
|---------|------|-----------|
| DriveWealth | Custom (enterprise) | 1–2 weeks approval |
| Engine by MoneyLion | Free (revenue share) | 1–2 weeks approval |
| Experian API | Custom (enterprise) | Weeks–months |
| Equifax API | Custom (enterprise) | Weeks–months |
| TransUnion API | Custom (enterprise) | Weeks–months |

---

## Checklist

Use this to track which credentials you've obtained:

### Must-Have (Development)
- [ ] Supabase project URL + anon key + service role key
- [ ] AIML API key
- [ ] Stripe secret key (test mode) + 10 price IDs + webhook secret
- [ ] Resend API key

### Should-Have (Full Feature Dev)
- [ ] AWS S3 bucket + IAM credentials
- [ ] VAPID keys (self-generated)
- [ ] OpenAI API key (for OCR)
- [ ] Plaid client ID + sandbox secret

### Nice-to-Have (Trading Features)
- [ ] Alpaca API key + secret (paper trading)
- [ ] DriveWealth API key (requires approval)
- [ ] MoneyLion API key (requires approval)

### Production Launch
- [ ] All "Must-Have" with live/production keys
- [ ] NEXTAUTH_SECRET (self-generated)
- [ ] JWT_SECRET (self-generated)
- [ ] ENCRYPTION_KEY (self-generated)
- [ ] CRON_SECRET (self-generated)
- [ ] Stripe live keys (`pk_live_`, `sk_live_`)
- [ ] Stripe production webhook configured
- [ ] SendGrid API key + domain verified
- [ ] Sentry DSN + auth token
- [ ] Google Analytics measurement ID
- [ ] Plaid webhook URL configured
- [ ] DNS records configured (A, CNAME, SPF, DKIM, DMARC)
- [ ] Vercel env vars all set
- [ ] Domain SSL active (auto via Vercel)

### Future/Enterprise
- [ ] Credit bureau API credentials (Experian, Equifax, TransUnion)
- [ ] Google Cloud Vision API key
- [ ] LandingAI API key
- [ ] Upstash Redis URL

---

*Generated 2026-03-03. Update this document when adding new external services or environment variables.*
