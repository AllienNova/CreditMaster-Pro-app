-- Test script for Credit Repair Accelerator schema migration
-- This script validates that all tables, indexes, and RLS policies were created correctly
-- Run this after applying the migration to verify everything is working

-- ============================================================================
-- TEST 1: Verify all tables exist
-- ============================================================================
DO $$
DECLARE
  table_count INTEGER;
  missing_tables TEXT[];
BEGIN
  RAISE NOTICE '=== TEST 1: Verifying all tables exist ===';
  
  -- Check for all required tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'credit_repair_scores',
    'credit_repair_actions',
    'credit_repair_progress',
    'credit_reports',
    'disputes',
    'goodwill_letters',
    'negotiations',
    'credit_cards'
  );
  
  IF table_count = 8 THEN
    RAISE NOTICE '✓ All 8 tables exist';
  ELSE
    RAISE WARNING '✗ Expected 8 tables, found %', table_count;
    
    -- Find missing tables
    SELECT ARRAY_AGG(t.table_name)
    INTO missing_tables
    FROM (
      VALUES 
        ('credit_repair_scores'),
        ('credit_repair_actions'),
        ('credit_repair_progress'),
        ('credit_reports'),
        ('disputes'),
        ('goodwill_letters'),
        ('negotiations'),
        ('credit_cards')
    ) AS expected(table_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = expected.table_name
    );
    
    IF missing_tables IS NOT NULL THEN
      RAISE WARNING 'Missing tables: %', missing_tables;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- TEST 2: Verify all indexes exist
-- ============================================================================
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  RAISE NOTICE '=== TEST 2: Verifying all indexes exist ===';
  
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND indexname LIKE 'idx_credit_%';
  
  IF index_count >= 20 THEN
    RAISE NOTICE '✓ Found % indexes (expected at least 20)', index_count;
  ELSE
    RAISE WARNING '✗ Expected at least 20 indexes, found %', index_count;
  END IF;
END $$;

-- ============================================================================
-- TEST 3: Verify RLS is enabled on all tables
-- ============================================================================
DO $$
DECLARE
  rls_count INTEGER;
BEGIN
  RAISE NOTICE '=== TEST 3: Verifying RLS is enabled ===';
  
  SELECT COUNT(*) INTO rls_count
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN (
    'credit_repair_scores',
    'credit_repair_actions',
    'credit_repair_progress',
    'credit_reports',
    'disputes',
    'goodwill_letters',
    'negotiations',
    'credit_cards'
  )
  AND rowsecurity = true;
  
  IF rls_count = 8 THEN
    RAISE NOTICE '✓ RLS enabled on all 8 tables';
  ELSE
    RAISE WARNING '✗ RLS should be enabled on 8 tables, found %', rls_count;
  END IF;
END $$;

-- ============================================================================
-- TEST 4: Verify RLS policies exist
-- ============================================================================
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '=== TEST 4: Verifying RLS policies exist ===';
  
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN (
    'credit_repair_scores',
    'credit_repair_actions',
    'credit_repair_progress',
    'credit_reports',
    'disputes',
    'goodwill_letters',
    'negotiations',
    'credit_cards'
  );
  
  -- Each table should have 4 policies (SELECT, INSERT, UPDATE, DELETE)
  -- credit_repair_progress has 3 (no UPDATE)
  IF policy_count >= 31 THEN
    RAISE NOTICE '✓ Found % RLS policies (expected at least 31)', policy_count;
  ELSE
    RAISE WARNING '✗ Expected at least 31 RLS policies, found %', policy_count;
  END IF;
END $$;

-- ============================================================================
-- TEST 5: Verify triggers exist
-- ============================================================================
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  RAISE NOTICE '=== TEST 5: Verifying triggers exist ===';
  
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%updated_at%';
  
  IF trigger_count = 7 THEN
    RAISE NOTICE '✓ All 7 updated_at triggers exist';
  ELSE
    RAISE WARNING '✗ Expected 7 updated_at triggers, found %', trigger_count;
  END IF;
END $$;

-- ============================================================================
-- TEST 6: Verify column constraints
-- ============================================================================
DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  RAISE NOTICE '=== TEST 6: Verifying column constraints ===';
  
  -- Check for CHECK constraints
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.check_constraints
  WHERE constraint_schema = 'public';
  
  IF constraint_count >= 10 THEN
    RAISE NOTICE '✓ Found % CHECK constraints (expected at least 10)', constraint_count;
  ELSE
    RAISE WARNING '✗ Expected at least 10 CHECK constraints, found %', constraint_count;
  END IF;
END $$;

-- ============================================================================
-- TEST 7: Test INSERT operations (requires auth.uid())
-- ============================================================================
-- Note: This test will fail if not run in authenticated context
-- Uncomment to test with a real user_id

-- DO $$
-- DECLARE
--   test_user_id UUID := 'your-test-user-id-here';
--   test_score_id UUID;
-- BEGIN
--   RAISE NOTICE '=== TEST 7: Testing INSERT operations ===';
--   
--   -- Test insert into credit_repair_scores
--   INSERT INTO credit_repair_scores (user_id, score, factors, opportunities)
--   VALUES (
--     test_user_id,
--     75,
--     '{"utilization": 0.8, "payment_history": 0.9}',
--     '[{"type": "pay_down_utilization", "impact": 30}]'
--   )
--   RETURNING id INTO test_score_id;
--   
--   IF test_score_id IS NOT NULL THEN
--     RAISE NOTICE '✓ Successfully inserted test record';
--     
--     -- Clean up test data
--     DELETE FROM credit_repair_scores WHERE id = test_score_id;
--     RAISE NOTICE '✓ Successfully deleted test record';
--   ELSE
--     RAISE WARNING '✗ Failed to insert test record';
--   END IF;
-- END $$;

-- ============================================================================
-- TEST 8: Verify foreign key constraints
-- ============================================================================
DO $$
DECLARE
  fk_count INTEGER;
BEGIN
  RAISE NOTICE '=== TEST 8: Verifying foreign key constraints ===';
  
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints
  WHERE constraint_schema = 'public'
  AND constraint_type = 'FOREIGN KEY'
  AND table_name IN (
    'credit_repair_scores',
    'credit_repair_actions',
    'credit_repair_progress',
    'credit_reports',
    'disputes',
    'goodwill_letters',
    'negotiations',
    'credit_cards'
  );
  
  IF fk_count = 8 THEN
    RAISE NOTICE '✓ All 8 foreign key constraints exist';
  ELSE
    RAISE WARNING '✗ Expected 8 foreign key constraints, found %', fk_count;
  END IF;
END $$;

-- ============================================================================
-- TEST 9: Verify JSONB columns
-- ============================================================================
DO $$
DECLARE
  jsonb_count INTEGER;
BEGIN
  RAISE NOTICE '=== TEST 9: Verifying JSONB columns ===';
  
  SELECT COUNT(*) INTO jsonb_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND data_type = 'jsonb'
  AND table_name IN (
    'credit_repair_scores',
    'credit_repair_actions',
    'credit_repair_progress',
    'credit_reports',
    'negotiations'
  );
  
  IF jsonb_count >= 10 THEN
    RAISE NOTICE '✓ Found % JSONB columns (expected at least 10)', jsonb_count;
  ELSE
    RAISE WARNING '✗ Expected at least 10 JSONB columns, found %', jsonb_count;
  END IF;
END $$;

-- ============================================================================
-- TEST 10: Verify generated columns
-- ============================================================================
DO $$
DECLARE
  generated_count INTEGER;
BEGIN
  RAISE NOTICE '=== TEST 10: Verifying generated columns ===';
  
  SELECT COUNT(*) INTO generated_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'credit_cards'
  AND column_name = 'utilization'
  AND is_generated = 'ALWAYS';
  
  IF generated_count = 1 THEN
    RAISE NOTICE '✓ Generated column (utilization) exists';
  ELSE
    RAISE WARNING '✗ Generated column (utilization) not found';
  END IF;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== MIGRATION TEST SUMMARY ===';
  RAISE NOTICE 'All tests completed. Review the output above for any warnings.';
  RAISE NOTICE 'If all tests show ✓, the migration was successful!';
END $$;

