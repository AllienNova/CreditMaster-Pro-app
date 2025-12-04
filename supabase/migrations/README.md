# Credit Repair Accelerator - Database Migrations

This directory contains all database migrations for the Credit Repair Accelerator system.

## Migrations

### 20250203000000_student_loan_schema.sql
- Student loan management tables
- Servicer intelligence
- Federal program applications
- Strategy tracking

### 20250204000000_credit_repair_schema.sql
- **Credit Repair Accelerator schema** (NEW)
- 8 tables with full schemas, indexes, and RLS policies
- Comprehensive credit repair system

## Tables Created

### 1. credit_repair_scores
Stores user credit repair scores over time with factors and opportunities.

**Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK to auth.users)
- `score` (INTEGER, 0-100)
- `factors` (JSONB)
- `opportunities` (JSONB)
- `estimated_impact` (INTEGER)
- `timeline` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Indexes**:
- `user_id`, `created_at`, `score`

### 2. credit_repair_actions
Tracks all credit repair actions with status and outcomes.

**Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `action_type` (TEXT, CHECK constraint)
- `action_data` (JSONB)
- `status` (TEXT, CHECK constraint)
- `impact` (INTEGER)
- `success_rate` (DECIMAL)
- `timeline` (TEXT)
- `started_at`, `completed_at` (TIMESTAMPTZ)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Action Types**:
- dispute_inaccuracy
- pay_down_utilization
- goodwill_letter
- pay_for_delete
- remove_inquiry
- optimize_payment_timing
- add_authorized_user
- credit_builder_loan
- secured_credit_card
- debt_consolidation

**Indexes**:
- `user_id`, `status`, `action_type`, `created_at`

### 3. credit_repair_progress
Tracks milestones and progress over time.

**Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `milestone_type` (TEXT)
- `milestone_data` (JSONB)
- `achieved_at` (TIMESTAMPTZ)
- `score_before`, `score_after` (INTEGER)
- `impact` (INTEGER)
- `created_at` (TIMESTAMPTZ)

**Indexes**:
- `user_id`, `achieved_at`, `milestone_type`

### 4. credit_reports
Stores credit report data from all three bureaus.

**Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `report_data` (JSONB)
- `bureau` (TEXT, CHECK: experian/equifax/transunion)
- `report_date` (DATE)
- `score` (INTEGER, 300-850)
- `accounts`, `inquiries`, `collections`, `public_records` (JSONB)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Indexes**:
- `user_id`, `bureau`, `report_date`, `score`

### 5. disputes
Tracks all credit report disputes with full lifecycle.

**Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `item_type`, `item_description` (TEXT)
- `creditor_name`, `account_number` (TEXT)
- `balance` (DECIMAL)
- `inaccuracy_type` (TEXT)
- `strategy` (TEXT, CHECK constraint - 10 strategies)
- `letter_content` (TEXT)
- `status` (TEXT, CHECK constraint)
- `bureau` (TEXT, CHECK constraint)
- `sent_at`, `response_received_at` (TIMESTAMPTZ)
- `outcome` (TEXT, CHECK constraint)
- `notes` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Strategies**:
- basic_dispute
- debt_validation
- method_of_verification
- procedural_violation
- statute_of_limitations
- identity_theft
- mixed_file
- creditor_direct
- goodwill
- pay_for_delete

**Indexes**:
- `user_id`, `status`, `bureau`, `strategy`, `created_at`

### 6. goodwill_letters
Tracks goodwill letter requests to creditors.

**Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `creditor_name`, `account_number` (TEXT)
- `late_payment_date` (DATE)
- `reason` (TEXT)
- `letter_content` (TEXT)
- `status` (TEXT, CHECK constraint)
- `sent_at`, `response_received_at` (TIMESTAMPTZ)
- `outcome` (TEXT, CHECK constraint)
- `notes` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Indexes**:
- `user_id`, `status`, `created_at`

### 7. negotiations
Tracks pay-for-delete negotiations with collection agencies.

**Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `collection_agency`, `original_creditor` (TEXT)
- `account_number` (TEXT)
- `original_balance`, `current_balance` (DECIMAL)
- `settlement_percentage` (DECIMAL)
- `settlement_amount` (DECIMAL)
- `scripts` (JSONB)
- `status` (TEXT, CHECK constraint)
- `negotiated_at`, `paid_at`, `deleted_at` (TIMESTAMPTZ)
- `notes` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Indexes**:
- `user_id`, `status`, `created_at`

### 8. credit_cards
Stores user credit card data for utilization optimization.

**Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `card_name` (TEXT)
- `current_balance`, `credit_limit` (DECIMAL)
- `utilization` (DECIMAL, GENERATED COLUMN)
- `statement_date`, `due_date` (INTEGER, 1-31)
- `last_payment_date` (DATE)
- `last_payment_amount` (DECIMAL)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Indexes**:
- `user_id`, `utilization`, `statement_date`

## Security

### Row Level Security (RLS)
All tables have RLS enabled with policies ensuring users can only access their own data.

**Policies per table**:
- SELECT: Users can view their own records
- INSERT: Users can insert their own records
- UPDATE: Users can update their own records
- DELETE: Users can delete their own records

### Triggers
All tables with `updated_at` columns have triggers to automatically update the timestamp on row updates.

## How to Apply Migrations

### Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push

# Or apply specific migration
supabase db push --file supabase/migrations/20250204000000_credit_repair_schema.sql
```

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `20250204000000_credit_repair_schema.sql`
4. Paste and run the SQL

### Using psql

```bash
psql -h your-supabase-host -U postgres -d postgres -f supabase/migrations/20250204000000_credit_repair_schema.sql
```

## Testing Migrations

After applying the migration, run the test script to verify everything is working:

```bash
psql -h your-supabase-host -U postgres -d postgres -f supabase/migrations/test_migration.sql
```

The test script will verify:
1. All tables exist
2. All indexes exist
3. RLS is enabled
4. RLS policies exist
5. Triggers exist
6. Column constraints exist
7. Foreign key constraints exist
8. JSONB columns exist
9. Generated columns exist

## Sample Data

To insert sample data for testing, see `sample_data.sql`.

## Rollback

To rollback the migration, run:

```sql
-- Drop all tables (in reverse order due to foreign keys)
DROP TABLE IF EXISTS credit_cards CASCADE;
DROP TABLE IF EXISTS negotiations CASCADE;
DROP TABLE IF EXISTS goodwill_letters CASCADE;
DROP TABLE IF EXISTS disputes CASCADE;
DROP TABLE IF EXISTS credit_reports CASCADE;
DROP TABLE IF EXISTS credit_repair_progress CASCADE;
DROP TABLE IF EXISTS credit_repair_actions CASCADE;
DROP TABLE IF EXISTS credit_repair_scores CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
```

## Next Steps

After applying the migration:

1. ✅ Verify all tables created correctly
2. ✅ Run test script
3. ✅ Insert sample data (optional)
4. ✅ Create database service layer
5. ✅ Update API routes
6. ✅ Update components

## Support

For issues or questions, refer to:
- Supabase Documentation: https://supabase.com/docs
- PostgreSQL Documentation: https://www.postgresql.org/docs/

