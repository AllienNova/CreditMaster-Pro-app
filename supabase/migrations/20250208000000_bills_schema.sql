-- ============================================================================
-- BILLS SCHEMA MIGRATION
-- ============================================================================

-- Create bill_frequency enum
CREATE TYPE bill_frequency AS ENUM (
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly'
);

-- Create bill_status enum
CREATE TYPE bill_status AS ENUM (
  'active',
  'paused',
  'cancelled'
);

-- Create bill_category enum
CREATE TYPE bill_category AS ENUM (
  'utilities',
  'rent',
  'mortgage',
  'insurance',
  'subscription',
  'loan',
  'credit_card',
  'phone',
  'internet',
  'streaming',
  'other'
);

-- Create bills table
CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_name TEXT NOT NULL,
  category bill_category NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  frequency bill_frequency NOT NULL,
  next_due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  last_paid_date TIMESTAMP WITH TIME ZONE,
  last_paid_amount DECIMAL(10, 2),
  status bill_status NOT NULL DEFAULT 'active',
  is_auto_pay BOOLEAN NOT NULL DEFAULT false,
  account_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create bill_payments table
CREATE TABLE bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  paid_date TIMESTAMP WITH TIME ZONE NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_late BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create bill_alerts table
CREATE TABLE bill_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('upcoming', 'overdue', 'amount_change', 'new_bill')),
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_bills_user_id ON bills(user_id);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_next_due_date ON bills(next_due_date);
CREATE INDEX idx_bills_category ON bills(category);

CREATE INDEX idx_bill_payments_bill_id ON bill_payments(bill_id);
CREATE INDEX idx_bill_payments_user_id ON bill_payments(user_id);
CREATE INDEX idx_bill_payments_paid_date ON bill_payments(paid_date);

CREATE INDEX idx_bill_alerts_user_id ON bill_alerts(user_id);
CREATE INDEX idx_bill_alerts_bill_id ON bill_alerts(bill_id);
CREATE INDEX idx_bill_alerts_read ON bill_alerts(read);

-- Create updated_at trigger for bills
CREATE OR REPLACE FUNCTION update_bills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bills_updated_at_trigger
  BEFORE UPDATE ON bills
  FOR EACH ROW
  EXECUTE FUNCTION update_bills_updated_at();

-- Enable Row Level Security
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bills
CREATE POLICY "Users can view their own bills"
  ON bills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bills"
  ON bills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bills"
  ON bills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bills"
  ON bills FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for bill_payments
CREATE POLICY "Users can view their own bill payments"
  ON bill_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bill payments"
  ON bill_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for bill_alerts
CREATE POLICY "Users can view their own bill alerts"
  ON bill_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own bill alerts"
  ON bill_alerts FOR UPDATE
  USING (auth.uid() = user_id);

