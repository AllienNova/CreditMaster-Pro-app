# Investment Platform Deployment Guide

## Overview

This guide covers deploying the CreditMaster Pro Investment Platform to production.

---

## Prerequisites

- Vercel account with Pro plan
- Supabase project (Production)
- Redis/Upstash account
- AIML API key
- Market data API keys (Alpha Vantage, Polygon.io, CoinGecko)

---

## Environment Variables

### Required Variables

Create a `.env.production` file with the following variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis Cache
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# AI Services
AIML_API_KEY=your-aiml-api-key
AIML_BASE_URL=https://api.aimlapi.com/v1
AIML_DEFAULT_MODEL=anthropic/claude-4.5-sonnet
AIML_REASONING_MODEL=deepseek/deepseek-r1
AIML_FAST_MODEL=openai/gpt-4o-mini

# Market Data APIs
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
POLYGON_API_KEY=your-polygon-key
COINGECKO_API_KEY=your-coingecko-key

# Application
NEXT_PUBLIC_APP_URL=https://app.creditmaster-pro.com
NODE_ENV=production

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Monitoring
SENTRY_DSN=your-sentry-dsn
VERCEL_ANALYTICS_ID=your-analytics-id
```

---

## Vercel Deployment

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Link Project

```bash
vercel link
```

### 4. Set Environment Variables

```bash
# Set all environment variables
vercel env add DATABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# ... repeat for all variables
```

Or use the Vercel dashboard to add environment variables.

### 5. Deploy to Production

```bash
# Deploy to production
vercel --prod

# Or use GitHub integration for automatic deployments
git push origin main
```

---

## Database Migration

### 1. Run Migrations

```bash
# Connect to production database
psql $DATABASE_URL

# Run migration scripts
\i migrations/20251217000001_cpfi_financial_suite_schema.sql
```

### 2. Verify Tables

```sql
-- Check that all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'cpfi_%';
```

### 3. Enable Row Level Security

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'cpfi_%';
```

---

## Redis Cache Setup

### 1. Create Upstash Redis Database

1. Go to https://upstash.com
2. Create a new Redis database
3. Select region closest to your Vercel deployment
4. Copy REST URL and token

### 2. Configure Cache

```typescript
// lib/redis.ts
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

### 3. Test Connection

```bash
# Test Redis connection
curl -X POST $UPSTASH_REDIS_REST_URL/set/test/value \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
```

---

## API Keys Configuration

### Alpha Vantage

1. Sign up at https://www.alphavantage.co
2. Get free API key (500 requests/day)
3. For production, upgrade to premium plan

### Polygon.io

1. Sign up at https://polygon.io
2. Get API key
3. Choose plan based on usage (Starter: $99/month)

### CoinGecko

1. Sign up at https://www.coingecko.com/api
2. Get API key
3. Free tier: 10,000 requests/month

---

## Performance Optimization

### 1. Enable Edge Functions

```typescript
// app/api/investments/route.ts
export const runtime = "edge";
export const preferredRegion = "iad1"; // US East
```

### 2. Configure Caching

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: "/api/investments/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=120",
          },
        ],
      },
    ];
  },
};
```

### 3. Enable Compression

```typescript
// next.config.js
module.exports = {
  compress: true,
};
```

---

## Monitoring Setup

### 1. Sentry Error Tracking

```bash
npm install @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### 2. Vercel Analytics

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 3. Custom Metrics

```typescript
// lib/metrics.ts
export async function trackMetric(name: string, value: number) {
  await fetch("/api/metrics", {
    method: "POST",
    body: JSON.stringify({ name, value }),
  });
}
```

---

## Health Checks

### 1. Create Health Check Endpoint

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    aiml: await checkAIML(),
    marketData: await checkMarketData(),
  };

  const healthy = Object.values(checks).every((c) => c.status === "ok");

  return Response.json(
    {
      status: healthy ? "healthy" : "degraded",
      checks,
    },
    {
      status: healthy ? 200 : 503,
    },
  );
}
```

### 2. Configure Uptime Monitoring

Use services like:

- Vercel Monitoring
- UptimeRobot
- Pingdom

---

## Rollback Procedure

If deployment fails:

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback <deployment-url>
```

---

## Post-Deployment Checklist

- [ ] All environment variables set
- [ ] Database migrations completed
- [ ] Redis cache connected
- [ ] API keys configured and tested
- [ ] Health check endpoint responding
- [ ] Error tracking configured
- [ ] Analytics enabled
- [ ] SSL certificate active
- [ ] Custom domain configured
- [ ] Rate limiting enabled
- [ ] Backup strategy in place

---

## Support

For deployment issues, contact: devops@creditmaster-pro.com
