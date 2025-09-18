-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    address JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'premium', 'enterprise')),
    onboarding_completed BOOLEAN DEFAULT FALSE
);

-- Create credit_reports table
CREATE TABLE IF NOT EXISTS credit_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    bureau TEXT NOT NULL CHECK (bureau IN ('experian', 'equifax', 'transunion')),
    report_date DATE NOT NULL,
    credit_score INTEGER CHECK (credit_score >= 300 AND credit_score <= 850),
    raw_data JSONB NOT NULL DEFAULT '{}',
    parsed_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create credit_items table
CREATE TABLE IF NOT EXISTS credit_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    report_id UUID REFERENCES credit_reports(id) ON DELETE CASCADE NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('account', 'inquiry', 'public_record', 'collection')),
    creditor TEXT NOT NULL,
    furnisher TEXT,
    account_number TEXT,
    account_type TEXT,
    balance DECIMAL(12,2),
    original_balance DECIMAL(12,2),
    credit_limit DECIMAL(12,2),
    payment_status TEXT NOT NULL,
    date_opened DATE,
    date_closed DATE,
    last_payment_date DATE,
    first_reported_date DATE NOT NULL,
    last_reported_date DATE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'disputed', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create strategies table
CREATE TABLE IF NOT EXISTS strategies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    strategy_name TEXT NOT NULL,
    strategy_type TEXT NOT NULL,
    legal_basis TEXT NOT NULL,
    success_rate DECIMAL(5,2) NOT NULL CHECK (success_rate >= 0 AND success_rate <= 100),
    tier INTEGER NOT NULL CHECK (tier >= 1 AND tier <= 7),
    target_items TEXT[] NOT NULL,
    key_tactics TEXT[] NOT NULL,
    prerequisites TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create strategy_executions table
CREATE TABLE IF NOT EXISTS strategy_executions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES credit_items(id) ON DELETE CASCADE NOT NULL,
    strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE NOT NULL,
    execution_status TEXT DEFAULT 'pending' CHECK (execution_status IN ('pending', 'executing', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    success BOOLEAN,
    outcome_details JSONB DEFAULT '{}',
    next_strategy_recommended UUID REFERENCES strategies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dispute_history table
CREATE TABLE IF NOT EXISTS dispute_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_id UUID REFERENCES credit_items(id) ON DELETE CASCADE NOT NULL,
    strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE NOT NULL,
    dispute_date DATE NOT NULL,
    bureau TEXT NOT NULL CHECK (bureau IN ('experian', 'equifax', 'transunion', 'furnisher')),
    dispute_reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'verified', 'deleted', 'modified')),
    response_date DATE,
    outcome TEXT,
    next_action TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_analysis table
CREATE TABLE IF NOT EXISTS ai_analysis (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES credit_items(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL CHECK (analysis_type IN ('credit_item', 'portfolio', 'strategy_selection')),
    analysis_data JSONB NOT NULL DEFAULT '{}',
    confidence_score DECIMAL(5,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    recommendations TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('credit_report', 'dispute_letter', 'response_letter', 'legal_document')),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('dispute_update', 'strategy_recommendation', 'credit_score_change', 'system_alert')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    plan TEXT NOT NULL CHECK (plan IN ('basic', 'premium', 'enterprise')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    stripe_subscription_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
('documents', 'documents', false),
('generated-letters', 'generated-letters', false)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Credit reports policies
CREATE POLICY "Users can view own credit reports" ON credit_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credit reports" ON credit_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own credit reports" ON credit_reports FOR UPDATE USING (auth.uid() = user_id);

-- Credit items policies
CREATE POLICY "Users can view own credit items" ON credit_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credit items" ON credit_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own credit items" ON credit_items FOR UPDATE USING (auth.uid() = user_id);

-- Strategy executions policies
CREATE POLICY "Users can view own strategy executions" ON strategy_executions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own strategy executions" ON strategy_executions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own strategy executions" ON strategy_executions FOR UPDATE USING (auth.uid() = user_id);

-- Dispute history policies
CREATE POLICY "Users can view own dispute history" ON dispute_history 
FOR SELECT USING (auth.uid() = (SELECT user_id FROM credit_items WHERE id = item_id));
CREATE POLICY "Users can insert own dispute history" ON dispute_history 
FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM credit_items WHERE id = item_id));
CREATE POLICY "Users can update own dispute history" ON dispute_history 
FOR UPDATE USING (auth.uid() = (SELECT user_id FROM credit_items WHERE id = item_id));

-- AI analysis policies
CREATE POLICY "Users can view own ai analysis" ON ai_analysis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ai analysis" ON ai_analysis FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Documents policies
CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscriptions" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Strategies are public (read-only)
CREATE POLICY "Anyone can view strategies" ON strategies FOR SELECT USING (true);

-- Storage policies
CREATE POLICY "Users can upload own documents" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT USING (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own documents" ON storage.objects FOR UPDATE USING (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own documents" ON storage.objects FOR DELETE USING (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credit_reports_user_id ON credit_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_reports_bureau ON credit_reports(bureau);
CREATE INDEX IF NOT EXISTS idx_credit_items_user_id ON credit_items(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_items_report_id ON credit_items(report_id);
CREATE INDEX IF NOT EXISTS idx_credit_items_type ON credit_items(item_type);
CREATE INDEX IF NOT EXISTS idx_credit_items_status ON credit_items(status);
CREATE INDEX IF NOT EXISTS idx_strategy_executions_user_id ON strategy_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_executions_status ON strategy_executions(execution_status);
CREATE INDEX IF NOT EXISTS idx_dispute_history_item_id ON dispute_history(item_id);
CREATE INDEX IF NOT EXISTS idx_dispute_history_status ON dispute_history(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Create functions for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credit_items_updated_at BEFORE UPDATE ON credit_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

