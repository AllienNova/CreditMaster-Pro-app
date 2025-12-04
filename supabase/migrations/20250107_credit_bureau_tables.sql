-- Credit Bureau Integration Tables
-- Created: 2025-01-07
-- Purpose: Store credit reports, accounts, inquiries, and public records

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CREDIT REPORTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bureau TEXT NOT NULL CHECK (bureau IN ('experian', 'equifax', 'transunion')),
  report_date DATE NOT NULL,
  credit_score INTEGER CHECK (credit_score >= 300 AND credit_score <= 850),
  score_factors TEXT[],
  raw_data JSONB NOT NULL,
  parsed_data JSONB NOT NULL,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, bureau, report_date)
);

-- Indexes for credit_reports
CREATE INDEX idx_credit_reports_user_id ON credit_reports(user_id);
CREATE INDEX idx_credit_reports_bureau ON credit_reports(bureau);
CREATE INDEX idx_credit_reports_report_date ON credit_reports(report_date);
CREATE INDEX idx_credit_reports_imported_at ON credit_reports(imported_at);

-- RLS policies for credit_reports
ALTER TABLE credit_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit reports"
  ON credit_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit reports"
  ON credit_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit reports"
  ON credit_reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit reports"
  ON credit_reports FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- CREDIT ACCOUNTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES credit_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL,
  account_number TEXT,
  creditor_name TEXT NOT NULL,
  balance DECIMAL(10, 2),
  credit_limit DECIMAL(10, 2),
  payment_status TEXT,
  opened_date DATE,
  closed_date DATE,
  last_payment_date DATE,
  payment_history JSONB,
  is_disputed BOOLEAN DEFAULT FALSE,
  dispute_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for credit_accounts
CREATE INDEX idx_credit_accounts_report_id ON credit_accounts(report_id);
CREATE INDEX idx_credit_accounts_user_id ON credit_accounts(user_id);
CREATE INDEX idx_credit_accounts_creditor_name ON credit_accounts(creditor_name);
CREATE INDEX idx_credit_accounts_payment_status ON credit_accounts(payment_status);
CREATE INDEX idx_credit_accounts_is_disputed ON credit_accounts(is_disputed);

-- RLS policies for credit_accounts
ALTER TABLE credit_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit accounts"
  ON credit_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit accounts"
  ON credit_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit accounts"
  ON credit_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit accounts"
  ON credit_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- CREDIT INQUIRIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES credit_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('hard', 'soft')),
  creditor_name TEXT NOT NULL,
  inquiry_date DATE NOT NULL,
  is_disputed BOOLEAN DEFAULT FALSE,
  dispute_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for credit_inquiries
CREATE INDEX idx_credit_inquiries_report_id ON credit_inquiries(report_id);
CREATE INDEX idx_credit_inquiries_user_id ON credit_inquiries(user_id);
CREATE INDEX idx_credit_inquiries_inquiry_type ON credit_inquiries(inquiry_type);
CREATE INDEX idx_credit_inquiries_inquiry_date ON credit_inquiries(inquiry_date);
CREATE INDEX idx_credit_inquiries_is_disputed ON credit_inquiries(is_disputed);

-- RLS policies for credit_inquiries
ALTER TABLE credit_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit inquiries"
  ON credit_inquiries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit inquiries"
  ON credit_inquiries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit inquiries"
  ON credit_inquiries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit inquiries"
  ON credit_inquiries FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- PUBLIC RECORDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES credit_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  filing_date DATE,
  status TEXT,
  amount DECIMAL(10, 2),
  court_name TEXT,
  case_number TEXT,
  is_disputed BOOLEAN DEFAULT FALSE,
  dispute_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for public_records
CREATE INDEX idx_public_records_report_id ON public_records(report_id);
CREATE INDEX idx_public_records_user_id ON public_records(user_id);
CREATE INDEX idx_public_records_record_type ON public_records(record_type);
CREATE INDEX idx_public_records_filing_date ON public_records(filing_date);
CREATE INDEX idx_public_records_is_disputed ON public_records(is_disputed);

-- RLS policies for public_records
ALTER TABLE public_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own public records"
  ON public_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own public records"
  ON public_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own public records"
  ON public_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own public records"
  ON public_records FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_credit_reports_updated_at
  BEFORE UPDATE ON credit_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_accounts_updated_at
  BEFORE UPDATE ON credit_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS
-- =====================================================

-- View for latest credit scores by bureau
CREATE OR REPLACE VIEW latest_credit_scores AS
SELECT DISTINCT ON (user_id, bureau)
  user_id,
  bureau,
  credit_score,
  report_date,
  imported_at
FROM credit_reports
ORDER BY user_id, bureau, report_date DESC, imported_at DESC;

-- View for account summary by user
CREATE OR REPLACE VIEW account_summary AS
SELECT
  user_id,
  COUNT(*) as total_accounts,
  COUNT(*) FILTER (WHERE payment_status = 'current') as current_accounts,
  COUNT(*) FILTER (WHERE payment_status LIKE '%late%') as late_accounts,
  COUNT(*) FILTER (WHERE closed_date IS NOT NULL) as closed_accounts,
  SUM(balance) as total_balance,
  SUM(credit_limit) as total_credit_limit,
  CASE
    WHEN SUM(credit_limit) > 0 THEN (SUM(balance) / SUM(credit_limit) * 100)
    ELSE 0
  END as utilization_rate
FROM credit_accounts
GROUP BY user_id;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE credit_reports IS 'Stores credit reports from Experian, Equifax, and TransUnion';
COMMENT ON TABLE credit_accounts IS 'Stores individual credit accounts from credit reports';
COMMENT ON TABLE credit_inquiries IS 'Stores credit inquiries (hard and soft pulls)';
COMMENT ON TABLE public_records IS 'Stores public records like bankruptcies, judgments, liens';
COMMENT ON VIEW latest_credit_scores IS 'Shows the most recent credit score for each bureau per user';
COMMENT ON VIEW account_summary IS 'Provides summary statistics for credit accounts by user';

