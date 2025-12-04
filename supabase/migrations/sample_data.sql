-- Sample Data for Credit Repair Accelerator System
-- This script inserts sample data for testing purposes
-- WARNING: Only run this on development/testing environments, NOT production!

-- ============================================================================
-- PREREQUISITES
-- ============================================================================
-- Before running this script, you need a test user in auth.users
-- Replace 'YOUR_TEST_USER_ID' with an actual user ID from auth.users

-- To get a test user ID, run:
-- SELECT id FROM auth.users LIMIT 1;

-- ============================================================================
-- CONFIGURATION
-- ============================================================================
DO $$
DECLARE
  test_user_id UUID := 'YOUR_TEST_USER_ID'; -- REPLACE THIS!
BEGIN
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = test_user_id) THEN
    RAISE EXCEPTION 'Test user % does not exist. Please create a user first or update the test_user_id variable.', test_user_id;
  END IF;
  
  RAISE NOTICE 'Using test user ID: %', test_user_id;
END $$;

-- ============================================================================
-- SAMPLE DATA: credit_repair_scores
-- ============================================================================
INSERT INTO credit_repair_scores (user_id, score, factors, opportunities, estimated_impact, timeline)
VALUES
  (
    'YOUR_TEST_USER_ID',
    75,
    '{
      "utilization": 0.8,
      "payment_history": 0.9,
      "credit_age": 0.6,
      "credit_mix": 0.7,
      "recent_inquiries": 0.5
    }',
    '[
      {"type": "pay_down_utilization", "impact": 30, "timeline": "30-60 days"},
      {"type": "dispute_inaccuracy", "impact": 50, "timeline": "30-90 days"},
      {"type": "goodwill_letter", "impact": 20, "timeline": "60-90 days"}
    ]',
    100,
    '30-90 days'
  );

-- ============================================================================
-- SAMPLE DATA: credit_repair_actions
-- ============================================================================
INSERT INTO credit_repair_actions (user_id, action_type, action_data, status, impact, success_rate, timeline)
VALUES
  (
    'YOUR_TEST_USER_ID',
    'dispute_inaccuracy',
    '{
      "item": "Late payment on Credit Card",
      "creditor": "Chase Bank",
      "strategy": "debt_validation"
    }',
    'in_progress',
    50,
    70.00,
    '30-90 days'
  ),
  (
    'YOUR_TEST_USER_ID',
    'pay_down_utilization',
    '{
      "card": "Chase Freedom",
      "current_balance": 4500,
      "target_balance": 500,
      "payment_amount": 4000
    }',
    'pending',
    30,
    95.00,
    '30-60 days'
  ),
  (
    'YOUR_TEST_USER_ID',
    'goodwill_letter',
    '{
      "creditor": "Discover",
      "late_payment_date": "2024-06-15",
      "reason": "Medical emergency"
    }',
    'completed',
    20,
    60.00,
    '60-90 days'
  );

-- ============================================================================
-- SAMPLE DATA: credit_repair_progress
-- ============================================================================
INSERT INTO credit_repair_progress (user_id, milestone_type, milestone_data, score_before, score_after, impact)
VALUES
  (
    'YOUR_TEST_USER_ID',
    'utilization_improved',
    '{
      "from": 85,
      "to": 30,
      "improvement": 55
    }',
    650,
    680,
    30
  ),
  (
    'YOUR_TEST_USER_ID',
    'dispute_resolved',
    '{
      "item": "Late payment removed",
      "creditor": "Chase Bank"
    }',
    680,
    730,
    50
  );

-- ============================================================================
-- SAMPLE DATA: credit_reports
-- ============================================================================
INSERT INTO credit_reports (user_id, report_data, bureau, report_date, score, accounts, inquiries, collections, public_records)
VALUES
  (
    'YOUR_TEST_USER_ID',
    '{
      "report_id": "EXP-2025-001",
      "generated_at": "2025-01-04T00:00:00Z"
    }',
    'experian',
    '2025-01-04',
    730,
    '[
      {
        "name": "Chase Freedom",
        "type": "Credit Card",
        "balance": 500,
        "limit": 5000,
        "status": "Open",
        "payment_history": "Current"
      },
      {
        "name": "Discover It",
        "type": "Credit Card",
        "balance": 1200,
        "limit": 3000,
        "status": "Open",
        "payment_history": "Current"
      }
    ]',
    '[
      {
        "date": "2024-12-15",
        "creditor": "Capital One",
        "type": "Hard Inquiry"
      }
    ]',
    '[]',
    '[]'
  );

-- ============================================================================
-- SAMPLE DATA: disputes
-- ============================================================================
INSERT INTO disputes (
  user_id, item_type, item_description, creditor_name, account_number,
  balance, inaccuracy_type, strategy, letter_content, status, bureau
)
VALUES
  (
    'YOUR_TEST_USER_ID',
    'Late Payment',
    'Late payment reported on 06/15/2024',
    'Chase Bank',
    '****1234',
    0,
    'Incorrect date',
    'debt_validation',
    'Dear Sir/Madam,

I am writing to dispute a late payment reported on my credit report...

[Full letter content would go here]

Sincerely,
[User Name]',
    'sent',
    'experian'
  ),
  (
    'YOUR_TEST_USER_ID',
    'Collection Account',
    'Medical collection from 2023',
    'ABC Collections',
    '****5678',
    450.00,
    'Not mine',
    'identity_theft',
    'Dear Sir/Madam,

I am writing to dispute a collection account that does not belong to me...

[Full letter content would go here]

Sincerely,
[User Name]',
    'under_review',
    'equifax'
  );

-- ============================================================================
-- SAMPLE DATA: goodwill_letters
-- ============================================================================
INSERT INTO goodwill_letters (
  user_id, creditor_name, account_number, late_payment_date,
  reason, letter_content, status
)
VALUES
  (
    'YOUR_TEST_USER_ID',
    'Discover',
    '****9012',
    '2024-06-15',
    'Medical emergency - hospitalization',
    'Dear Discover Customer Service,

I am writing to request a goodwill adjustment for a late payment...

[Full letter content would go here]

Thank you for your consideration,
[User Name]',
    'sent'
  );

-- ============================================================================
-- SAMPLE DATA: negotiations
-- ============================================================================
INSERT INTO negotiations (
  user_id, collection_agency, original_creditor, account_number,
  original_balance, current_balance, settlement_percentage,
  settlement_amount, scripts, status
)
VALUES
  (
    'YOUR_TEST_USER_ID',
    'XYZ Collections',
    'Old Credit Card Company',
    '****3456',
    1500.00,
    1500.00,
    50.00,
    750.00,
    '{
      "opening": "Hello, I am calling about account ****3456...",
      "negotiation": "I can offer 50% settlement if you agree to delete...",
      "closing": "Please send the agreement in writing..."
    }',
    'negotiating'
  );

-- ============================================================================
-- SAMPLE DATA: credit_cards
-- ============================================================================
INSERT INTO credit_cards (
  user_id, card_name, current_balance, credit_limit,
  statement_date, due_date, last_payment_date, last_payment_amount
)
VALUES
  (
    'YOUR_TEST_USER_ID',
    'Chase Freedom',
    500.00,
    5000.00,
    15,
    10,
    '2025-01-01',
    4000.00
  ),
  (
    'YOUR_TEST_USER_ID',
    'Discover It',
    1200.00,
    3000.00,
    20,
    15,
    '2024-12-28',
    500.00
  ),
  (
    'YOUR_TEST_USER_ID',
    'Capital One Quicksilver',
    2500.00,
    10000.00,
    5,
    1,
    '2024-12-30',
    1000.00
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  scores_count INTEGER;
  actions_count INTEGER;
  progress_count INTEGER;
  reports_count INTEGER;
  disputes_count INTEGER;
  goodwill_count INTEGER;
  negotiations_count INTEGER;
  cards_count INTEGER;
BEGIN
  RAISE NOTICE '=== SAMPLE DATA INSERTION SUMMARY ===';
  
  SELECT COUNT(*) INTO scores_count FROM credit_repair_scores WHERE user_id = 'YOUR_TEST_USER_ID';
  SELECT COUNT(*) INTO actions_count FROM credit_repair_actions WHERE user_id = 'YOUR_TEST_USER_ID';
  SELECT COUNT(*) INTO progress_count FROM credit_repair_progress WHERE user_id = 'YOUR_TEST_USER_ID';
  SELECT COUNT(*) INTO reports_count FROM credit_reports WHERE user_id = 'YOUR_TEST_USER_ID';
  SELECT COUNT(*) INTO disputes_count FROM disputes WHERE user_id = 'YOUR_TEST_USER_ID';
  SELECT COUNT(*) INTO goodwill_count FROM goodwill_letters WHERE user_id = 'YOUR_TEST_USER_ID';
  SELECT COUNT(*) INTO negotiations_count FROM negotiations WHERE user_id = 'YOUR_TEST_USER_ID';
  SELECT COUNT(*) INTO cards_count FROM credit_cards WHERE user_id = 'YOUR_TEST_USER_ID';
  
  RAISE NOTICE 'credit_repair_scores: % records', scores_count;
  RAISE NOTICE 'credit_repair_actions: % records', actions_count;
  RAISE NOTICE 'credit_repair_progress: % records', progress_count;
  RAISE NOTICE 'credit_reports: % records', reports_count;
  RAISE NOTICE 'disputes: % records', disputes_count;
  RAISE NOTICE 'goodwill_letters: % records', goodwill_count;
  RAISE NOTICE 'negotiations: % records', negotiations_count;
  RAISE NOTICE 'credit_cards: % records', cards_count;
  
  RAISE NOTICE 'Total records inserted: %', 
    scores_count + actions_count + progress_count + reports_count + 
    disputes_count + goodwill_count + negotiations_count + cards_count;
  
  RAISE NOTICE '=== SAMPLE DATA INSERTION COMPLETE ===';
END $$;

