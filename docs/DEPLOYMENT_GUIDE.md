# CreditMaster Pro - Deployment Guide

**Version**: 1.0.0
**Last Updated**: January 5, 2026
**Platform**: Web (Next.js) & Mobile (React Native/Expo)

---

## 📋 Prerequisites

### Required Accounts & Services

1. **Supabase Account**
   - Sign up at https://supabase.com
   - Create a new project
   - Note your project URL and API keys

2. **Vercel Account** (for web deployment)
   - Sign up at https://vercel.com
   - Connect your GitHub repository

3. **Expo Account** (for mobile deployment)
   - Sign up at https://expo.dev
   - Install Expo CLI: `npm install -g expo-cli`

4. **AI Service Accounts**
   - Anthropic API key (for Claude)
   - OpenAI API key (optional, for GPT models)

### Development Tools

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Git**: Latest version
- **PostgreSQL**: v14.x or higher (for local development)

---

## 🗄️ Database Setup

### 1. Supabase Project Setup

**Create Project**:

1. Log in to Supabase Dashboard
2. Click **"New Project"**
3. Enter project details:
   - Name: `CreditMaster Pro`
   - Database Password: (generate strong password)
   - Region: Choose closest to your users
4. Wait for project to be created (~2 minutes)

**Get Connection Details**:

1. Go to **Settings** → **API**
2. Copy the following:
   - Project URL: `https://[project-id].supabase.co`
   - `anon` public key
   - `service_role` secret key (keep secure!)

### 2. Run Database Migrations

**Using Supabase CLI**:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref [your-project-id]

# Run all migrations
supabase db push

# Verify migrations
supabase db diff
```

**Manual Migration** (if CLI not available):

1. Go to Supabase Dashboard → **SQL Editor**
2. Run migrations in order:
   - `supabase/migrations/20260115_create_financial_chat_tables.sql`
   - `supabase/migrations/20260105_performance_optimizations.sql`
   - Any other migration files in chronological order

### 3. Verify Database Setup

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- Should see: chat_sessions, chat_messages, and other tables

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- All tables should have rowsecurity = true
```

---

## 🌐 Web Application Deployment

### 1. Environment Variables

Create `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# AI Service Configuration
ANTHROPIC_API_KEY=your-anthropic-api-key-here
OPENAI_API_KEY=your-openai-api-key-here (optional)

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Security
NEXTAUTH_SECRET=generate-random-secret-here
NEXTAUTH_URL=https://your-domain.com

# Optional: Analytics
NEXT_PUBLIC_GA_ID=your-google-analytics-id
```

**Generate Secrets**:

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32
```

### 2. Build & Test Locally

````bash
# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Build the application
npm run build


---

## ⚙️ Performance Optimization

### 1. Enable Caching

**Vercel Edge Caching**:
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=120',
          },
        ],
      },
    ];
  },
};
````

**Supabase Connection Pooling**:

- Enabled by default
- Max connections: 100 (adjust based on load)

### 2. Configure CDN

**Static Assets**:

- Automatically served via Vercel Edge Network
- Images optimized with Next.js Image component

**Database Connection**:

- Use connection pooling
- Enable read replicas for high traffic

### 3. Monitor Performance

**Vercel Analytics**:

```bash
# Install Vercel Analytics
npm install @vercel/analytics

# Add to _app.tsx
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

**Supabase Monitoring**:

- Dashboard → **Reports** → **Database**
- Monitor query performance
- Check connection pool usage

---

## 🧪 Testing in Production

### 1. Smoke Tests

```bash
# Test API endpoints
curl https://your-domain.com/api/health

# Test authentication
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test chat API
curl https://your-domain.com/api/chat/financial/sessions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Load Testing

```bash
# Install k6
brew install k6  # macOS
# or
sudo apt-get install k6  # Linux

# Run load test
k6 run load-test.js
```

**load-test.js**:

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  stages: [
    { duration: "2m", target: 100 }, // Ramp up to 100 users
    { duration: "5m", target: 100 }, // Stay at 100 users
    { duration: "2m", target: 0 }, // Ramp down
  ],
};

export default function () {
  let response = http.get("https://your-domain.com/api/health");
  check(response, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

### 3. Security Testing

```bash
# Run security scan
npm audit

# Check for vulnerabilities
npx snyk test

# OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://your-domain.com
```

---

## 📊 Monitoring & Logging

### 1. Application Monitoring

**Vercel Logs**:

```bash
# View real-time logs
vercel logs

# View logs for specific deployment
vercel logs [deployment-url]
```

**Supabase Logs**:

- Dashboard → **Logs** → **Postgres Logs**
- Monitor slow queries
- Check error logs

### 2. Error Tracking

**Sentry Integration**:

```bash
# Install Sentry
npm install @sentry/nextjs

# Initialize Sentry
npx @sentry/wizard -i nextjs
```

**Configure Sentry**:

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### 3. Uptime Monitoring

**UptimeRobot** (free):

1. Sign up at https://uptimerobot.com
2. Add monitor for your domain
3. Configure alerts (email, SMS, Slack)

**Pingdom** (paid):

- More detailed monitoring
- Performance insights
- Global monitoring locations

---

## 🔄 CI/CD Pipeline

### 1. GitHub Actions Workflow

**`.github/workflows/deploy.yml`**:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run test
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: "--prod"
```

### 2. Automated Testing

```yaml
# .github/workflows/test.yml
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
```

### 3. Database Migrations

```yaml
# .github/workflows/migrate.yml
name: Database Migration

on:
  push:
    branches: [main]
    paths:
      - "supabase/migrations/**"

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install -g supabase
      - run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

## 🚨 Rollback Procedures

### 1. Vercel Rollback

**Via Dashboard**:

1. Go to Vercel Dashboard → **Deployments**
2. Find previous working deployment
3. Click **"..."** → **"Promote to Production"**

**Via CLI**:

```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]
```

### 2. Database Rollback

**Restore from Backup**:

```bash
# List backups
supabase db backups list

# Restore from backup
supabase db backups restore [backup-id]
```

**Manual Rollback**:

```sql
-- Rollback specific migration
-- Create reverse migration in supabase/migrations/
-- Example: 20260105_rollback_performance_optimizations.sql

DROP INDEX IF EXISTS idx_chat_sessions_user_archived_updated;
DROP FUNCTION IF EXISTS get_recent_sessions_with_preview;
-- ... reverse all changes
```

### 3. Mobile App Rollback

**Expo OTA Rollback**:

```bash
# Publish previous version
expo publish --release-channel production-rollback

# Update app.json to point to rollback channel
```

---

## 📋 Production Checklist

### Pre-Deployment

- [ ] All tests passing (unit, integration, E2E)
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Error tracking enabled
- [ ] Documentation updated

### Post-Deployment

- [ ] Smoke tests passed
- [ ] Health check endpoint responding
- [ ] Authentication working
- [ ] Database connections stable
- [ ] API endpoints responding
- [ ] Mobile app connecting
- [ ] Monitoring dashboards active
- [ ] Error rates normal
- [ ] Performance metrics acceptable
- [ ] User acceptance testing completed

### Ongoing Maintenance

- [ ] Monitor error rates daily
- [ ] Review performance metrics weekly
- [ ] Update dependencies monthly
- [ ] Security patches applied immediately
- [ ] Database backups verified weekly
- [ ] SSL certificates renewed automatically
- [ ] Logs reviewed regularly
- [ ] User feedback addressed

---

## 🆘 Troubleshooting

### Common Issues

**Issue: "Failed to connect to database"**

- Check Supabase project status
- Verify connection string
- Check firewall rules
- Verify RLS policies

**Issue: "Authentication failed"**

- Check API keys are correct
- Verify JWT token not expired
- Check user exists in database
- Verify RLS policies allow access

**Issue: "Slow API responses"**

- Check database query performance
- Verify caching is working
- Check connection pool usage
- Review slow query logs

**Issue: "Build failed on Vercel"**

- Check build logs for errors
- Verify all dependencies installed
- Check TypeScript errors
- Verify environment variables set

### Getting Help

**Support Channels**:

- **Email**: support@creditmasterpro.com
- **Discord**: discord.gg/creditmasterpro
- **GitHub Issues**: github.com/creditmasterpro/issues
- **Documentation**: docs.creditmasterpro.com

**Emergency Contact**:

- **On-Call Engineer**: +1-800-CREDIT-PRO
- **Security Issues**: security@creditmasterpro.com
- **Response Time**: Within 1 hour for critical issues

---

## 📚 Additional Resources

- [Financial Chat API Documentation](./FINANCIAL_CHAT_API.md)
- [User Guide](./USER_GUIDE_FINANCIAL_CHAT.md)
- [Zero Trust Security Documentation](./ZERO_TRUST_SECURITY.md)
- [Performance Optimization Guide](./PERFORMANCE_OPTIMIZATION_GUIDE.md)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Expo Deployment](https://docs.expo.dev/distribution/introduction/)

# Open http://localhost:3000

````

### 3. Deploy to Vercel

**Option A: Automatic Deployment (Recommended)**

1. Push code to GitHub
2. Go to https://vercel.com/new
3. Import your repository
4. Configure project:
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Add environment variables (from `.env.local`)
6. Click **Deploy**

**Option B: Manual Deployment**

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# ... add all other variables
````

### 4. Configure Custom Domain

1. Go to Vercel Dashboard → **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed
4. Wait for SSL certificate to be issued (~5 minutes)

---

## 📱 Mobile Application Deployment

### 1. Configure App Settings

**Update `app.json`**:

```json
{
  "expo": {
    "name": "CreditMaster Pro",
    "slug": "creditmaster-pro",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "updates": {
      "fallbackToCacheTimeout": 0
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.creditmasterpro.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.creditmasterpro.app"
    },
    "extra": {
      "supabaseUrl": "https://[your-project-id].supabase.co",
      "supabaseAnonKey": "your-anon-key-here"
    }
  }
}
```

### 2. Build for iOS

```bash
# Install dependencies
cd mobile-app
npm install

# Login to Expo
expo login

# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

### 3. Build for Android

```bash
# Build for Android
eas build --platform android

# Submit to Google Play
eas submit --platform android
```

### 4. Over-the-Air (OTA) Updates

```bash
# Publish update
expo publish

# Users will receive update automatically
```

---

## 🔒 Security Configuration

### 1. Enable Row Level Security

Verify RLS is enabled on all tables:

```sql
-- Enable RLS on all tables
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables
```

### 2. Configure CORS

**Supabase Dashboard** → **Settings** → **API**:

- Add your domain to allowed origins
- Example: `https://your-domain.com`

### 3. Set Up SSL/TLS

**Vercel** (automatic):

- SSL certificates are automatically provisioned
- HTTPS is enforced by default

**Custom Server**:

```bash
# Install certbot
sudo apt-get install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com

# Configure nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # ... rest of configuration
}
```

### 4. Configure Security Headers

Already configured in `next.config.js`:

- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
