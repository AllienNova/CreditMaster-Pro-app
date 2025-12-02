# Supabase Setup Guide

## Quick Start

### 1. Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Name: `creditmaster-pro-dev` (or your preferred name)
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

## Next Steps

After database setup:

1. Update services to use database version:
   - `dispute-service-db.ts` → `dispute-service.ts`
   - `document-service-db.ts` → `document-service.ts`
   - `notification-service-db.ts` → `notification-service.ts`

2. Test API routes with database

3. Build UI components for:
   - Dispute list/tracker
   - Document upload
   - Notification center

## Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Project Dashboard: https://supabase.com/dashboard/project/your-project-id
