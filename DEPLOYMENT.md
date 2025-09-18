# CreditMaster Pro - Production Deployment Guide

## 🚀 Quick Deployment Overview

CreditMaster Pro is designed for seamless deployment on Vercel + Supabase. This guide covers complete production deployment.

## 📋 Prerequisites

### Required Accounts
- [Vercel Account](https://vercel.com) (Free tier available)
- [Supabase Account](https://supabase.com) (Free tier available)
- [OpenAI Account](https://openai.com) (API access required)
- [Stripe Account](https://stripe.com) (for payments)

### Required Tools
- Git
- Node.js 18+
- npm or pnpm

## 🏗️ Deployment Architecture

```
Production Setup:
├── Marketing Site (marketing-site/) → creditmaster.pro
├── Main App (app/) → app.creditmaster.pro
├── Database → Supabase PostgreSQL
├── Authentication → Supabase Auth
├── File Storage → Supabase Storage
├── Payments → Stripe
└── AI/ML → OpenAI + Hugging Face
```

## 📊 Step 1: Supabase Setup

### 1.1 Create Supabase Project
```bash
# Go to https://supabase.com/dashboard
# Click "New Project"
# Choose organization and region
# Set database password (save this!)
```

### 1.2 Configure Database
```bash
# In Supabase Dashboard → SQL Editor
# Run the database schema files:

# 1. Run main schema
# Copy content from: database/supabase-schema.sql
# Execute in SQL Editor

# 2. Run improvement schema  
# Copy content from: database/supabase-improvement-schema.sql
# Execute in SQL Editor
```

### 1.3 Configure Authentication
```bash
# In Supabase Dashboard → Authentication → Settings
# Enable Email authentication
# Configure email templates (optional)
# Set site URL: https://app.creditmaster.pro
# Add redirect URLs:
#   - https://app.creditmaster.pro/auth/callback
#   - http://localhost:3000/auth/callback (for development)
```

### 1.4 Configure Storage
```bash
# In Supabase Dashboard → Storage
# Create bucket: "credit-reports"
# Set bucket to private
# Configure RLS policies for user access
```

### 1.5 Get API Keys
```bash
# In Supabase Dashboard → Settings → API
# Copy these values:
# - Project URL
# - Anon public key  
# - Service role key (keep secret!)
```

## 🌐 Step 2: Vercel Deployment

### 2.1 Deploy Main Application

```bash
# 1. Fork/Clone repository
git clone https://github.com/AllienNova/CreditMaster-Pro-app.git
cd CreditMaster-Pro-app

# 2. Install Vercel CLI
npm i -g vercel

# 3. Deploy main app
cd app
vercel --prod

# Follow prompts:
# - Link to existing project? No
# - Project name: creditmaster-pro-app
# - Directory: ./app
# - Override settings? No
```

### 2.2 Deploy Marketing Site

```bash
# Deploy marketing site
cd ../marketing-site
vercel --prod

# Follow prompts:
# - Link to existing project? No  
# - Project name: creditmaster-pro-marketing
# - Directory: ./marketing-site
# - Override settings? No
```

### 2.3 Configure Environment Variables

#### Main App Environment Variables (app.creditmaster.pro)
```bash
# In Vercel Dashboard → Project → Settings → Environment Variables
# Add these variables:

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=sk-your_openai_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_APP_URL=https://app.creditmaster.pro
NODE_ENV=production
```

#### Marketing Site Environment Variables (creditmaster.pro)
```bash
# In Vercel Dashboard → Marketing Project → Settings → Environment Variables

VITE_APP_URL=https://app.creditmaster.pro
VITE_API_URL=https://app.creditmaster.pro
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
NODE_ENV=production
```

### 2.4 Configure Custom Domains

```bash
# In Vercel Dashboard → Project → Settings → Domains

# Main App:
# Add domain: app.creditmaster.pro
# Configure DNS: CNAME app.creditmaster.pro → cname.vercel-dns.com

# Marketing Site:  
# Add domain: creditmaster.pro
# Add domain: www.creditmaster.pro
# Configure DNS: 
#   - A creditmaster.pro → 76.76.19.19
#   - CNAME www.creditmaster.pro → cname.vercel-dns.com
```

## 💳 Step 3: Stripe Configuration

### 3.1 Setup Stripe Account
```bash
# 1. Go to https://stripe.com
# 2. Create account and complete verification
# 3. Go to Dashboard → Developers → API Keys
# 4. Copy Publishable and Secret keys
```

### 3.2 Configure Products and Pricing
```bash
# In Stripe Dashboard → Products
# Create products matching our pricing:

# Starter Plan
# - Name: CreditMaster Pro - Starter
# - Price: $99.99/month
# - Billing: Recurring monthly

# Professional Plan  
# - Name: CreditMaster Pro - Professional
# - Price: $139.99/month
# - Billing: Recurring monthly

# Pro Elite Plan
# - Name: CreditMaster Pro - Pro Elite  
# - Price: $299/month
# - Billing: Recurring monthly
```

### 3.3 Configure Webhooks
```bash
# In Stripe Dashboard → Developers → Webhooks
# Add endpoint: https://app.creditmaster.pro/api/webhooks/stripe
# Select events:
#   - customer.subscription.created
#   - customer.subscription.updated  
#   - customer.subscription.deleted
#   - invoice.payment_succeeded
#   - invoice.payment_failed
```

## 🤖 Step 4: AI/ML Configuration

### 4.1 OpenAI Setup
```bash
# 1. Go to https://platform.openai.com
# 2. Create API key
# 3. Add billing method
# 4. Set usage limits (recommended: $100/month initially)
```

### 4.2 Hugging Face Model
```bash
# The ML model is already integrated
# No additional setup required
# Model: roseyshi/creditscore (RandomForest)
```

## 🔒 Step 5: Security Configuration

### 5.1 Environment Security
```bash
# Verify all secrets are properly set
# Never commit .env files to git
# Use Vercel environment variables for all secrets
# Enable 2FA on all service accounts
```

### 5.2 Database Security
```bash
# In Supabase Dashboard → Settings → Database
# Enable Row Level Security (RLS) on all tables
# Verify RLS policies are active
# Enable database backups
```

### 5.3 API Security
```bash
# Rate limiting is built into the application
# CORS is configured for app.creditmaster.pro only
# All API endpoints require authentication
```

## 📊 Step 6: Monitoring & Analytics

### 6.1 Vercel Analytics
```bash
# In Vercel Dashboard → Project → Analytics
# Enable Web Analytics
# Enable Speed Insights
# Monitor performance metrics
```

### 6.2 Supabase Monitoring
```bash
# In Supabase Dashboard → Reports
# Monitor database performance
# Track API usage
# Set up alerts for high usage
```

### 6.3 Error Tracking (Optional)
```bash
# Recommended: Sentry integration
# Add to environment variables:
SENTRY_DSN=your_sentry_dsn
```

## 🧪 Step 7: Testing Production

### 7.1 Functionality Testing
```bash
# Test complete user flow:
# 1. Visit https://creditmaster.pro
# 2. Sign up for account
# 3. Upload credit report
# 4. Generate improvement plan
# 5. Create disputes
# 6. Generate reports
# 7. Test payment flow
```

### 7.2 Performance Testing
```bash
# Use tools:
# - Google PageSpeed Insights
# - GTmetrix
# - Vercel Speed Insights
# Target: 90+ performance score
```

## 🚀 Step 8: Go Live Checklist

### Pre-Launch
- [ ] All environment variables configured
- [ ] Database schema deployed
- [ ] Stripe products created
- [ ] Custom domains configured
- [ ] SSL certificates active
- [ ] All tests passing
- [ ] Performance optimized

### Launch Day
- [ ] Monitor error rates
- [ ] Check payment processing
- [ ] Verify email delivery
- [ ] Monitor database performance
- [ ] Track user registrations

### Post-Launch
- [ ] Set up monitoring alerts
- [ ] Configure backup schedules
- [ ] Plan scaling strategy
- [ ] Monitor costs and usage

## 💰 Cost Estimation

### Monthly Costs (1,000 users)
- Vercel Pro: $20/month
- Supabase Pro: $25/month  
- OpenAI API: $200/month
- Stripe fees: 2.9% + $0.30 per transaction
- **Total: ~$300/month**

### Revenue (1,000 users)
- Average: $194,792/month
- **Profit: $194,492/month (99.8% margin)**

## 🆘 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check Node.js version (requires 18+)
node --version

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Database Connection Issues
```bash
# Verify Supabase URL and keys
# Check RLS policies
# Ensure database is not paused
```

#### Payment Issues
```bash
# Verify Stripe keys (test vs live)
# Check webhook endpoints
# Verify product IDs match
```

## 📞 Support

- **Documentation**: [GitHub Repository](https://github.com/AllienNova/CreditMaster-Pro-app)
- **Issues**: [GitHub Issues](https://github.com/AllienNova/CreditMaster-Pro-app/issues)
- **Email**: support@creditmaster.pro

---

**🎉 Congratulations! CreditMaster Pro is now live and ready to generate revenue!**

