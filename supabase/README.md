# Supabase Setup Guide

## Quick Start

### 1. Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Name: `CPFI-pro-dev` (or your preferred name)
4. Database Password: Generate strong password and **save it**
5. Region: Choose closest to you
6. Click "Create new project"

### 2. Get Environment Variables

Once project is created, go to Project Settings → API:

```bash
# Add to .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run Database Migration

#### Option A: Supabase Dashboard (Easiest)

1. Go to SQL Editor in your Supabase dashboard
2. Click "New Query"
3. Copy entire contents of `migrations/001_initial_schema.sql`
4. Paste into SQL editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. Verify tables created in Table Editor

#### Option B: Supabase CLI (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Run migration
supabase db push
```

### 4. Verify Setup

Run this test query in SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE';
```

You should see:
- profiles
- disputes
- documents
- notifications
- subscriptions

### 5. Test Authentication

1. Create a test user through your app's signup flow
2. Check in Supabase Dashboard → Authentication → Users
3. Verify profile was auto-created in Table Editor → profiles

## Table Structure

### profiles
- User profile extending auth.users
- Auto-created on signup via trigger
- Stores subscription info

### disputes
- Credit dispute tracking
- Links to profiles (user_id)
- Status workflow: draft → sent → under_review → resolved

### documents
- File metadata (actual files in S3)
- Links to profiles (user_id)
- Stores S3 keys and URLs

### notifications
- In-app notifications
- Email notification tracking
- Read/unread status

### subscriptions
- Stripe subscription sync
- Links to profiles (user_id)
- Stores subscription status

## Row Level Security (RLS)

All tables have RLS enabled. Users can only:
- View their own data
- Create their own records
- Update their own records
- Delete their own records

This is enforced at the database level for security.

## Testing the Database

### Create Test Dispute

```sql
-- Get your user ID first
SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Create test dispute
INSERT INTO disputes (
  user_id,
  bureau,
  item_type,
  item_description,
  reason,
  letter_content,
  status
) VALUES (
  'your-user-id-here',
  'experian',
  'late_payment',
  'Late payment on account #12345',
  'This payment was never late, reporting error',
  'Sample dispute letter content...',
  'draft'
);

-- Verify it was created
SELECT * FROM disputes WHERE user_id = 'your-user-id-here';
```

## Common Issues

### Issue: Tables not visible
**Solution**: Make sure you ran the migration as a postgres admin, not as authenticated user

### Issue: RLS blocking inserts
**Solution**: Ensure you're authenticated (check auth.uid() returns your user ID)

```sql
-- Check current user
SELECT auth.uid();
```

### Issue: Profile not auto-created
**Solution**: Check if trigger exists:

```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

## Migration History

| Version | Date | Description |
|---------|------|-------------|
| 001 | 2025-11-29 | Initial schema - all core tables |
| 002 | 2025-12-04 | Production enhancements - audit logs, sessions, tracking |

## Production Setup

### Step 1: Create Production Project

1. Create new project at https://supabase.com/dashboard
2. Choose region closest to your users (us-east-1 recommended)
3. Save project URL and API keys securely

### Step 2: Run All Migrations

```bash
# Link to production project
supabase link --project-ref YOUR_PROD_PROJECT_REF

# Push all migrations
supabase db push
```

### Step 3: Configure Authentication

In Supabase Dashboard > Authentication > Settings:

1. **Site URL**: `https://CPFI.pro`
2. **Redirect URLs**:
   - `https://CPFI.pro/auth/callback`
   - `https://CPFI.pro/dashboard`
3. **Rate Limits**: Configure for production load

### Step 4: Configure Storage Buckets

Create in Dashboard > Storage:
- `documents` (private) - Credit reports, ID docs
- `avatars` (public) - Profile pictures

### Step 5: Enable Backups

1. Go to Database > Backups
2. Enable Point-in-Time Recovery (PITR) for Pro plan
3. Set backup retention (7+ days)

## Production Tables (Migration 002)

| Table | Description |
|-------|-------------|
| `sessions` | Active user sessions |
| `audit_logs` | Security audit trail |
| `uploads` | Temporary file tracking |
| `credit_scores` | Score history |
| `dispute_template_usage` | Template effectiveness |
| `strategy_usage` | Strategy effectiveness |

## Useful CLI Commands

```bash
# Check migration status
supabase migration list

# Create new migration
supabase migration new migration_name

# Push to remote
supabase db push

# Generate TypeScript types
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
```

## Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Status Page: https://status.supabase.com
