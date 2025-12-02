# Testing Guide - CreditMaster Pro MVP

**Status**: 8/11 tasks complete (73%)
**Remaining**: Database, Stripe, and E2E testing

---

## Prerequisites Checklist

Before testing, ensure you have:

- [ ] Supabase project created
- [ ] Stripe account (test mode)
- [ ] Environment variables configured
- [ ] Dependencies installed (`npm install`)

---

## Environment Setup

### 1. Create `.env.local` file

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Stripe
STRIPE_SECRET_KEY=sk_test_your_test_key
NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Resend (Email)
RESEND_API_KEY=re_xxx
EMAIL_FROM=CreditMaster Pro <noreply@creditmaster-pro.com>

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=creditmaster-pro-documents

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AIML API
AIML_API_KEY=your_aiml_key
AIML_API_URL=https://api.aimlapi.com/v1
```

---

## Task 9: Test Database Connections

### Setup Supabase

1. **Create Supabase Project**
   ```bash
   # Go to: https://supabase.com/dashboard
   # Click "New Project"
   # Choose organization, name, and password
   # Wait for project to initialize (~2 minutes)
   ```

2. **Get Connection Details**
   ```bash
   # In Supabase Dashboard:
   # Settings → API
   # Copy:
   #   - Project URL → NEXT_PUBLIC_SUPABASE_URL
   #   - anon/public key → NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

3. **Run Database Migration**
   ```bash
   # In Supabase Dashboard:
   # SQL Editor → New Query
   # Copy contents from: supabase/migrations/001_initial_schema.sql
   # Click "Run"
   # Verify: No errors, all tables created
   ```

4. **Verify Tables Created**
   ```bash
   # In Supabase Dashboard:
   # Table Editor
   # Should see:
   #   - profiles
   #   - disputes
   #   - documents
   #   - notifications
   #   - subscriptions
   ```

### Test Database Operations

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Test User Signup**
   ```bash
   # Visit: http://localhost:3000/login
   # Create new account
   # Check Supabase → Table Editor → profiles
   # Verify: New profile created automatically
   ```

3. **Test Profile Query**
   ```typescript
   // In browser console:
   fetch('/api/test-db').then(r => r.json()).then(console.log)

   // Expected: Profile data returned
   ```

### Verification Checklist

- [ ] Supabase project created
- [ ] Migration ran successfully
- [ ] All 5 tables exist
- [ ] User signup creates profile
- [ ] RLS policies working (users see only their data)

---

## Task 10: Test Stripe Payment Flow

### Setup Stripe

1. **Create Stripe Account**
   ```bash
   # Go to: https://dashboard.stripe.com/register
   # Complete signup
   # Stay in TEST MODE (top right toggle)
   ```

2. **Create Products and Prices**
   ```bash
   # In Stripe Dashboard:
   # Products → Add Product

   # Create 3 products:

   # 1. Basic Plan
   #    Name: Basic
   #    Price: $29/month
   #    Copy Price ID → NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID

   # 2. Premium Plan
   #    Name: Premium
   #    Price: $79/month
   #    Copy Price ID → NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID

   # 3. Enterprise Plan
   #    Name: Enterprise
   #    Price: $199/month
   #    Copy Price ID → NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID
   ```

3. **Get API Keys**
   ```bash
   # In Stripe Dashboard:
   # Developers → API Keys
   # Copy:
   #   - Secret key → STRIPE_SECRET_KEY
   ```

4. **Setup Webhook Endpoint**
   ```bash
   # In Stripe Dashboard:
   # Developers → Webhooks → Add endpoint
   # Endpoint URL: http://localhost:3000/api/payment/webhook
   # (Use Stripe CLI for local testing - see below)

   # Select events:
   #   - customer.subscription.created
   #   - customer.subscription.updated
   #   - customer.subscription.deleted
   #   - invoice.paid
   #   - invoice.payment_failed

   # Copy Signing Secret → STRIPE_WEBHOOK_SECRET
   ```

### Install Stripe CLI (for local testing)

```bash
# Windows (using Scoop)
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Or download from:
# https://github.com/stripe/stripe-cli/releases

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/payment/webhook

# Copy webhook signing secret to .env.local
```

### Test Payment Flow

1. **Test Checkout Button**
   ```bash
   # Visit: http://localhost:3000/pricing
   # Click any "Subscribe" button
   # Expected: Redirect to Stripe Checkout
   ```

2. **Test Payment with Test Card**
   ```bash
   # On Stripe Checkout page:
   # Card: 4242 4242 4242 4242
   # Expiry: Any future date (e.g., 12/34)
   # CVC: Any 3 digits (e.g., 123)
   # ZIP: Any 5 digits (e.g., 12345)
   # Click "Subscribe"
   ```

3. **Verify Success Flow**
   ```bash
   # Expected:
   # 1. Redirect to /payment/success
   # 2. See success message
   # 3. Auto-redirect to /dashboard after 5 seconds
   ```

4. **Verify Database Updates**
   ```bash
   # Check Supabase → subscriptions table
   # Should see:
   #   - New subscription record
   #   - stripe_subscription_id populated
   #   - status = 'active'

   # Check profiles table
   # Should see:
   #   - stripe_customer_id populated
   #   - subscription_tier = 'basic'/'premium'/'enterprise'
   #   - subscription_status = 'active'
   ```

5. **Verify Webhook Received**
   ```bash
   # In Stripe CLI terminal:
   # Should see:
   #   → customer.subscription.created
   #   ← 200 OK

   # In server logs (npm run dev terminal):
   # Should see:
   #   Subscription created: sub_xxx
   ```

### Test Cancel Flow

1. **Test Cancel Button**
   ```bash
   # On Stripe Checkout page:
   # Click "Back" or close tab
   # Expected: Return to /pricing?canceled=true
   ```

2. **Verify Cancel Page**
   ```bash
   # Should see:
   #   - "Payment Canceled" message
   #   - Benefits reminder
   #   - "View Plans Again" button
   ```

### Test Different Cards

```bash
# Success: 4242 4242 4242 4242
# Decline: 4000 0000 0000 0002
# Insufficient funds: 4000 0000 0000 9995
# 3D Secure: 4000 0027 6000 3184

# Full list: https://stripe.com/docs/testing#cards
```

### Verification Checklist

- [ ] Stripe products created (3 plans)
- [ ] Price IDs added to .env.local
- [ ] Stripe CLI installed and authenticated
- [ ] Webhook forwarding active
- [ ] Checkout button works
- [ ] Test payment succeeds
- [ ] Success page displays
- [ ] Subscription created in database
- [ ] Profile updated with tier
- [ ] Webhook received and processed
- [ ] Cancel flow works

---

## Task 11: End-to-End Smoke Test

### Full User Journey Test

1. **Landing Page → Pricing**
   ```bash
   # Visit: http://localhost:3000
   # Click: "View Pricing" or navigation link
   # Expected: Pricing page with 3 tiers
   ```

2. **Select Plan → Login**
   ```bash
   # Click: "Subscribe to Premium - $79/month"
   # Expected: Redirect to login (if not logged in)
   # OR: Redirect to Stripe Checkout (if logged in)
   ```

3. **Signup → Checkout**
   ```bash
   # Create account with:
   #   Email: test@example.com
   #   Password: TestPassword123!
   # Expected: Auto-redirect to Stripe Checkout
   ```

4. **Complete Payment → Success**
   ```bash
   # Enter test card: 4242 4242 4242 4242
   # Click: Subscribe
   # Expected: Redirect to /payment/success
   # Wait: 5 seconds
   # Expected: Redirect to /dashboard
   ```

5. **Dashboard → Profile**
   ```bash
   # Verify dashboard shows:
   #   - User name/email
   #   - Subscription tier badge
   #   - Access to features
   ```

6. **Test Core Feature (Dispute Generation)**
   ```bash
   # Visit: /ai-tools
   # Click: Dispute Generator
   # Enter:
   #   - Bureau: Experian
   #   - Item Type: Late Payment
   #   - Description: Incorrect late payment on 01/2024
   #   - Reason: Never made late payment, all payments on time
   # Click: Generate Dispute Letter
   # Expected: AI generates professional dispute letter
   ```

7. **Verify Notification**
   ```bash
   # Check Supabase → notifications table
   # Should see:
   #   - Welcome notification
   #   - Payment success notification
   ```

8. **Test Subscription Management**
   ```bash
   # In Stripe Dashboard:
   # Customers → Find test customer
   # Subscriptions → Cancel subscription
   # Expected: Webhook triggers
   # Check database: subscription_status = 'canceled'
   ```

### Critical Path Verification

- [ ] Landing page loads
- [ ] Pricing page displays correctly
- [ ] Checkout button redirects to Stripe
- [ ] Test payment completes successfully
- [ ] Success page displays and redirects
- [ ] Dashboard shows subscription tier
- [ ] Dispute generator works (core feature)
- [ ] Notifications created
- [ ] Subscription cancellation works
- [ ] No console errors

---

## Troubleshooting

### Database Connection Issues

**Problem**: Can't connect to Supabase
**Solutions**:
- Verify environment variables are correct
- Check Supabase project is not paused
- Ensure anon key is correct (not service_role key)
- Restart dev server after .env changes

**Problem**: RLS blocks queries
**Solutions**:
- Verify user is authenticated
- Check RLS policies in Supabase
- Ensure auth.uid() matches user_id in queries

### Stripe Issues

**Problem**: Checkout button does nothing
**Solutions**:
- Check browser console for errors
- Verify price IDs are correct
- Ensure user is authenticated
- Check API route logs

**Problem**: Webhook not received
**Solutions**:
- Verify Stripe CLI is running
- Check webhook secret is correct
- Ensure /api/payment/webhook is accessible
- Check server logs for errors

**Problem**: Payment succeeds but database not updated
**Solutions**:
- Check webhook handler logs
- Verify subscriptionService is imported correctly
- Check Supabase connection in webhook handler
- Look for errors in Stripe webhook logs

### General Issues

**Problem**: Build fails
**Solutions**:
```bash
# Clear cache and rebuild
rm -rf .next
npm run build

# Check TypeScript errors
npm run type-check
```

**Problem**: Environment variables not loading
**Solutions**:
- Ensure `.env.local` exists in project root
- Restart dev server after changes
- Use `NEXT_PUBLIC_` prefix for client-side vars
- Check no typos in variable names

---

## Success Criteria

### Minimum Viable Product (MVP) Ready When:

✅ **Database**
- All tables exist
- User signup creates profile
- CRUD operations work
- RLS policies enforced

✅ **Payment**
- Stripe checkout completes
- Subscriptions created
- Webhooks received
- Database synced

✅ **Core Features**
- User can signup/login
- User can subscribe
- User can generate disputes
- Notifications sent

✅ **User Experience**
- No critical bugs
- Payment flow smooth
- Success/error states clear
- Professional UI

---

## Next Steps After Testing

Once all tests pass:

1. **Deploy to Production**
   - Set up Vercel project
   - Add production environment variables
   - Deploy main branch
   - Test production checkout

2. **Configure Production Stripe**
   - Switch to live mode
   - Create production products
   - Set up production webhook
   - Update environment variables

3. **Launch Checklist**
   - [ ] Production deployment successful
   - [ ] Production Stripe configured
   - [ ] Production database migrated
   - [ ] Test production payment flow
   - [ ] Monitor error logs
   - [ ] Set up analytics

---

**Estimated Testing Time**: 2-4 hours
**Total MVP Time**: ~18 hours (as planned!)

Good luck! 🚀
