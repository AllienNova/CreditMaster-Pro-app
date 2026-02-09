-- ============================================================================
-- TAX DOCUMENTS TABLE MIGRATION
-- ============================================================================
-- 
-- Stores uploaded tax documents with OCR extraction results.
-- Supports multi-provider processing with confidence scores.
--
-- Created: 2026-01-21
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TAX DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tax_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Document metadata
  tax_year INTEGER NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_path VARCHAR(500),
  
  -- Extraction results
  extracted_data JSONB,
  extraction_confidence DECIMAL(5,4),
  providers_used TEXT[],
  processing_time_ms INTEGER,
  
  -- Validation
  validation_errors JSONB DEFAULT '[]'::jsonb,
  is_valid BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Manual corrections
  manual_corrections JSONB,
  correction_history JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  status VARCHAR(50) DEFAULT 'extracted',
  requires_review BOOLEAN DEFAULT false,
  review_reasons TEXT[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tax_documents_user_id ON tax_documents(user_id);
CREATE INDEX idx_tax_documents_tax_year ON tax_documents(tax_year);
CREATE INDEX idx_tax_documents_document_type ON tax_documents(document_type);
CREATE INDEX idx_tax_documents_status ON tax_documents(status);
CREATE INDEX idx_tax_documents_user_year ON tax_documents(user_id, tax_year);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE tax_documents ENABLE ROW LEVEL SECURITY;

-- Users can only access their own documents
CREATE POLICY "Users can view own tax documents"
  ON tax_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tax documents"
  ON tax_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tax documents"
  ON tax_documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tax documents"
  ON tax_documents FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- DOCUMENT PROCESSING LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS tax_document_processing_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES tax_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Processing details
  provider VARCHAR(50) NOT NULL,
  success BOOLEAN NOT NULL,
  processing_time_ms INTEGER,
  
  -- Results
  document_type_detected VARCHAR(50),
  confidence DECIMAL(5,4),
  fields_extracted INTEGER,
  error_message TEXT,
  
  -- Raw response (for debugging, auto-deleted after 30 days)
  raw_response JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_doc_processing_log_document ON tax_document_processing_log(document_id);
CREATE INDEX idx_doc_processing_log_user ON tax_document_processing_log(user_id);

-- RLS for processing log
ALTER TABLE tax_document_processing_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own processing logs"
  ON tax_document_processing_log FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_tax_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tax_documents_updated_at
  BEFORE UPDATE ON tax_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_tax_documents_updated_at();

-- ============================================================================
-- CLEANUP FUNCTION (for old processing logs)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_processing_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM tax_document_processing_log
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND raw_response IS NOT NULL;
  
  -- Clear raw_response but keep the log entry
  UPDATE tax_document_processing_log
  SET raw_response = NULL
  WHERE created_at < NOW() - INTERVAL '7 days'
    AND raw_response IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DOCUMENT TYPE ENUM (for reference)
-- ============================================================================

COMMENT ON COLUMN tax_documents.document_type IS 
'Supported types: w2, 1099_div, 1099_int, 1099_b, 1099_nec, 1099_misc, 1099_r, 1099_g, 1099_ssa, k1, 1098, 1098_e, 1098_t, 5498, charitable_receipt, medical_receipt, property_tax, business_expense, unknown';

COMMENT ON COLUMN tax_documents.status IS 
'Status values: pending, processing, extracted, verified, failed, needs_review';

COMMENT ON TABLE tax_documents IS 
'Stores tax documents uploaded by users with AI-extracted data. Documents are processed using multiple OCR providers (OpenAI Vision, Google Vision, LandingAI) with consensus-based field resolution.';
