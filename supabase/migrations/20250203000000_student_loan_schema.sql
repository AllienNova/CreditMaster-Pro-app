-- Student Loan Management Schema
-- This migration creates all tables needed for the student loan AI/ML features

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STUDENT LOANS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id TEXT NOT NULL,
  servicer TEXT NOT NULL,
  servicer_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  loan_type TEXT NOT NULL,
  current_balance DECIMAL(12, 2) NOT NULL,
  original_amount DECIMAL(12, 2) NOT NULL,
  interest_rate DECIMAL(5, 2) NOT NULL,
  loan_status TEXT NOT NULL,
  disbursement_date TIMESTAMPTZ,
  default_date TIMESTAMPTZ,
  last_payment_date TIMESTAMPTZ,
  original_balance DECIMAL(12, 2),
  error_flags TEXT[],
  fresh_start_eligible BOOLEAN DEFAULT FALSE,
  rehabilitation_eligible BOOLEAN DEFAULT FALSE,
  discharge_eligible BOOLEAN DEFAULT FALSE,
  borrower_defense_eligible BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, loan_id)
);

-- ============================================================================
-- STUDENT LOAN STRATEGIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_loan_strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES student_loans(id) ON DELETE CASCADE,
  strategy_type TEXT NOT NULL,
  strategy_name TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  success_probability DECIMAL(5, 2),
  estimated_timeline TEXT,
  estimated_cost DECIMAL(10, 2),
  potential_savings DECIMAL(10, 2),
  ai_confidence DECIMAL(5, 2),
  decision_factors JSONB,
  execution_steps JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- SERVICER PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS servicer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  servicer_name TEXT NOT NULL UNIQUE,
  error_rate DECIMAL(5, 2) NOT NULL,
  compliance_score DECIMAL(5, 2) NOT NULL,
  response_quality_score DECIMAL(5, 2) NOT NULL,
  transfer_frequency DECIMAL(5, 2) NOT NULL,
  documentation_quality DECIMAL(5, 2) NOT NULL,
  average_resolution_time INTEGER NOT NULL,
  customer_satisfaction DECIMAL(5, 2) NOT NULL,
  regulatory_actions INTEGER NOT NULL,
  vulnerability_score DECIMAL(5, 2) NOT NULL,
  federal_contractor BOOLEAN DEFAULT FALSE,
  operational_characteristics JSONB,
  vulnerability_indicators JSONB,
  historical_performance JSONB,
  data_quality_score DECIMAL(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FEDERAL PROGRAM APPLICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS federal_program_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES student_loans(id) ON DELETE CASCADE,
  program_type TEXT NOT NULL,
  application_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  application_id TEXT,
  estimated_processing_time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SERVICER COMMUNICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS servicer_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES student_loans(id) ON DELETE CASCADE,
  servicer_name TEXT NOT NULL,
  communication_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  subject TEXT,
  content TEXT,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  response_required BOOLEAN DEFAULT FALSE,
  response_deadline TIMESTAMPTZ,
  attachments JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- REGULATORY COMPLAINTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS regulatory_complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES student_loans(id) ON DELETE CASCADE,
  servicer_name TEXT NOT NULL,
  complaint_type TEXT NOT NULL,
  agency TEXT NOT NULL,
  complaint_text TEXT NOT NULL,
  evidence JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  response_received_at TIMESTAMPTZ,
  response_text TEXT,
  outcome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CREDIT REPORT MONITORING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS credit_report_monitoring (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES student_loans(id) ON DELETE CASCADE,
  bureau TEXT NOT NULL,
  report_date TIMESTAMPTZ NOT NULL,
  account_status TEXT,
  balance_reported DECIMAL(12, 2),
  payment_status TEXT,
  discrepancies JSONB,
  dispute_filed BOOLEAN DEFAULT FALSE,
  dispute_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DOCUMENT ANALYSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES student_loans(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  analysis_results JSONB NOT NULL,
  errors_found JSONB,
  opportunities_identified JSONB,
  confidence_score DECIMAL(5, 2),
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ML PREDICTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ml_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES student_loans(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL,
  model_version TEXT NOT NULL,
  input_features JSONB NOT NULL,
  prediction_result JSONB NOT NULL,
  confidence_score DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SERVICER ERRORS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS servicer_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES student_loans(id) ON DELETE CASCADE,
  servicer_name TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_description TEXT NOT NULL,
  severity TEXT NOT NULL,
  detected_date TIMESTAMPTZ DEFAULT NOW(),
  evidence JSONB,
  resolution_status TEXT DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MONITORING EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS monitoring_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES student_loans(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  severity TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PERFORMANCE ANALYTICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS performance_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_value DECIMAL(12, 2) NOT NULL,
  metric_data JSONB,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Student Loans indexes
CREATE INDEX idx_student_loans_user_id ON student_loans(user_id);
CREATE INDEX idx_student_loans_servicer ON student_loans(servicer_name);
CREATE INDEX idx_student_loans_status ON student_loans(loan_status);
CREATE INDEX idx_student_loans_eligibility ON student_loans(fresh_start_eligible, rehabilitation_eligible, discharge_eligible);

-- Student Loan Strategies indexes
CREATE INDEX idx_strategies_user_id ON student_loan_strategies(user_id);
CREATE INDEX idx_strategies_loan_id ON student_loan_strategies(loan_id);
CREATE INDEX idx_strategies_status ON student_loan_strategies(status);
CREATE INDEX idx_strategies_priority ON student_loan_strategies(priority);

-- Servicer Profiles indexes
CREATE INDEX idx_servicer_profiles_name ON servicer_profiles(servicer_name);
CREATE INDEX idx_servicer_profiles_vulnerability ON servicer_profiles(vulnerability_score);

-- Federal Program Applications indexes
CREATE INDEX idx_federal_apps_user_id ON federal_program_applications(user_id);
CREATE INDEX idx_federal_apps_loan_id ON federal_program_applications(loan_id);
CREATE INDEX idx_federal_apps_status ON federal_program_applications(status);
CREATE INDEX idx_federal_apps_program_type ON federal_program_applications(program_type);

-- Servicer Communications indexes
CREATE INDEX idx_communications_user_id ON servicer_communications(user_id);
CREATE INDEX idx_communications_loan_id ON servicer_communications(loan_id);
CREATE INDEX idx_communications_servicer ON servicer_communications(servicer_name);

-- Regulatory Complaints indexes
CREATE INDEX idx_complaints_user_id ON regulatory_complaints(user_id);
CREATE INDEX idx_complaints_loan_id ON regulatory_complaints(loan_id);
CREATE INDEX idx_complaints_status ON regulatory_complaints(status);

-- Credit Report Monitoring indexes
CREATE INDEX idx_credit_monitoring_user_id ON credit_report_monitoring(user_id);
CREATE INDEX idx_credit_monitoring_loan_id ON credit_report_monitoring(loan_id);
CREATE INDEX idx_credit_monitoring_bureau ON credit_report_monitoring(bureau);

-- Document Analyses indexes
CREATE INDEX idx_document_analyses_user_id ON document_analyses(user_id);
CREATE INDEX idx_document_analyses_loan_id ON document_analyses(loan_id);

-- ML Predictions indexes
CREATE INDEX idx_ml_predictions_user_id ON ml_predictions(user_id);
CREATE INDEX idx_ml_predictions_loan_id ON ml_predictions(loan_id);
CREATE INDEX idx_ml_predictions_type ON ml_predictions(prediction_type);

-- Servicer Errors indexes
CREATE INDEX idx_servicer_errors_user_id ON servicer_errors(user_id);
CREATE INDEX idx_servicer_errors_loan_id ON servicer_errors(loan_id);
CREATE INDEX idx_servicer_errors_servicer ON servicer_errors(servicer_name);
CREATE INDEX idx_servicer_errors_status ON servicer_errors(resolution_status);

-- Monitoring Events indexes
CREATE INDEX idx_monitoring_events_user_id ON monitoring_events(user_id);
CREATE INDEX idx_monitoring_events_loan_id ON monitoring_events(loan_id);
CREATE INDEX idx_monitoring_events_type ON monitoring_events(event_type);

-- Performance Analytics indexes
CREATE INDEX idx_performance_analytics_user_id ON performance_analytics(user_id);
CREATE INDEX idx_performance_analytics_type ON performance_analytics(metric_type);
CREATE INDEX idx_performance_analytics_period ON performance_analytics(period_start, period_end);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE student_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_loan_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE federal_program_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicer_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_report_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicer_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_analytics ENABLE ROW LEVEL SECURITY;

-- Student Loans policies
CREATE POLICY "Users can view their own loans"
  ON student_loans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own loans"
  ON student_loans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own loans"
  ON student_loans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own loans"
  ON student_loans FOR DELETE
  USING (auth.uid() = user_id);

-- Student Loan Strategies policies
CREATE POLICY "Users can view their own strategies"
  ON student_loan_strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own strategies"
  ON student_loan_strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategies"
  ON student_loan_strategies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategies"
  ON student_loan_strategies FOR DELETE
  USING (auth.uid() = user_id);

-- Servicer Profiles policies (public read, admin write)
CREATE POLICY "Anyone can view servicer profiles"
  ON servicer_profiles FOR SELECT
  USING (true);

-- Federal Program Applications policies
CREATE POLICY "Users can view their own applications"
  ON federal_program_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own applications"
  ON federal_program_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications"
  ON federal_program_applications FOR UPDATE
  USING (auth.uid() = user_id);

-- Servicer Communications policies
CREATE POLICY "Users can view their own communications"
  ON servicer_communications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own communications"
  ON servicer_communications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own communications"
  ON servicer_communications FOR UPDATE
  USING (auth.uid() = user_id);

-- Regulatory Complaints policies
CREATE POLICY "Users can view their own complaints"
  ON regulatory_complaints FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own complaints"
  ON regulatory_complaints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own complaints"
  ON regulatory_complaints FOR UPDATE
  USING (auth.uid() = user_id);

-- Credit Report Monitoring policies
CREATE POLICY "Users can view their own credit monitoring"
  ON credit_report_monitoring FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit monitoring"
  ON credit_report_monitoring FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Document Analyses policies
CREATE POLICY "Users can view their own document analyses"
  ON document_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own document analyses"
  ON document_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ML Predictions policies
CREATE POLICY "Users can view their own predictions"
  ON ml_predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own predictions"
  ON ml_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Servicer Errors policies
CREATE POLICY "Users can view their own servicer errors"
  ON servicer_errors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own servicer errors"
  ON servicer_errors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own servicer errors"
  ON servicer_errors FOR UPDATE
  USING (auth.uid() = user_id);

-- Monitoring Events policies
CREATE POLICY "Users can view their own monitoring events"
  ON monitoring_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monitoring events"
  ON monitoring_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Performance Analytics policies
CREATE POLICY "Users can view their own analytics"
  ON performance_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics"
  ON performance_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_student_loans_updated_at
  BEFORE UPDATE ON student_loans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_loan_strategies_updated_at
  BEFORE UPDATE ON student_loan_strategies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_servicer_profiles_updated_at
  BEFORE UPDATE ON servicer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_federal_program_applications_updated_at
  BEFORE UPDATE ON federal_program_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regulatory_complaints_updated_at
  BEFORE UPDATE ON regulatory_complaints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

