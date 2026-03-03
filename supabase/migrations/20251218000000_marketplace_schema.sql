-- ============================================================================
-- CPFI Marketplace Schema Migration
--
-- Creates tables for:
-- - marketplace_providers: Service providers in the marketplace
-- - marketplace_products: Products/services offered by providers
-- - marketplace_reviews: User reviews for products and providers
-- - tradelines: Authorized user tradelines for credit building
-- ============================================================================

-- ============================================================================
-- MARKETPLACE PROVIDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website VARCHAR(500),
    logo_url VARCHAR(500),
    rating DECIMAL(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),
    bbb_rating VARCHAR(10),
    years_in_business INTEGER CHECK (years_in_business >= 0),
    verified BOOLEAN DEFAULT false,
    category VARCHAR(50) NOT NULL CHECK (category IN ('tradeline', 'credit_repair', 'monitoring', 'education', 'legal', 'coaching')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for marketplace_providers
CREATE INDEX IF NOT EXISTS idx_providers_category ON marketplace_providers(category);
CREATE INDEX IF NOT EXISTS idx_providers_rating ON marketplace_providers(rating DESC);
CREATE INDEX IF NOT EXISTS idx_providers_verified ON marketplace_providers(verified);
CREATE INDEX IF NOT EXISTS idx_providers_name_search ON marketplace_providers USING gin(to_tsvector('english', name));

-- ============================================================================
-- MARKETPLACE PRODUCTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES marketplace_providers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    price_type VARCHAR(20) NOT NULL CHECK (price_type IN ('one_time', 'monthly', 'yearly')),
    rating DECIMAL(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),
    features JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for marketplace_products
CREATE INDEX IF NOT EXISTS idx_products_provider ON marketplace_products(provider_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON marketplace_products(category);
CREATE INDEX IF NOT EXISTS idx_products_price ON marketplace_products(price);
CREATE INDEX IF NOT EXISTS idx_products_rating ON marketplace_products(rating DESC);
CREATE INDEX IF NOT EXISTS idx_products_active ON marketplace_products(active);
CREATE INDEX IF NOT EXISTS idx_products_name_search ON marketplace_products USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- ============================================================================
-- MARKETPLACE REVIEWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES marketplace_products(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES marketplace_providers(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    content TEXT NOT NULL,
    verified_purchase BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0 CHECK (helpful_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Must have either product_id or provider_id
    CONSTRAINT review_target_check CHECK (product_id IS NOT NULL OR provider_id IS NOT NULL)
);

-- Indexes for marketplace_reviews
CREATE INDEX IF NOT EXISTS idx_reviews_user ON marketplace_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON marketplace_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider ON marketplace_reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON marketplace_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON marketplace_reviews(created_at DESC);

-- ============================================================================
-- TRADELINES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tradelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES marketplace_providers(id) ON DELETE CASCADE,
    credit_limit INTEGER NOT NULL CHECK (credit_limit > 0),
    age_months INTEGER NOT NULL CHECK (age_months > 0),
    utilization DECIMAL(5,2) DEFAULT 0 CHECK (utilization >= 0 AND utilization <= 100),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    estimated_score_impact INTEGER DEFAULT 0 CHECK (estimated_score_impact >= 0),
    bureaus_reporting TEXT[] DEFAULT '{}',
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for tradelines
CREATE INDEX IF NOT EXISTS idx_tradelines_provider ON tradelines(provider_id);
CREATE INDEX IF NOT EXISTS idx_tradelines_price ON tradelines(price);
CREATE INDEX IF NOT EXISTS idx_tradelines_credit_limit ON tradelines(credit_limit);
CREATE INDEX IF NOT EXISTS idx_tradelines_age ON tradelines(age_months);
CREATE INDEX IF NOT EXISTS idx_tradelines_score_impact ON tradelines(estimated_score_impact DESC);
CREATE INDEX IF NOT EXISTS idx_tradelines_available ON tradelines(available);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE marketplace_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE tradelines ENABLE ROW LEVEL SECURITY;

-- Providers: Public read, admin write
CREATE POLICY "Public can read providers" ON marketplace_providers
    FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Admin can manage providers" ON marketplace_providers
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Products: Public read active products, admin write
CREATE POLICY "Public can read active products" ON marketplace_products
    FOR SELECT TO authenticated, anon USING (active = true);

CREATE POLICY "Admin can manage products" ON marketplace_products
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Reviews: Public read, authenticated create/update own
CREATE POLICY "Public can read reviews" ON marketplace_reviews
    FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Users can create reviews" ON marketplace_reviews
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON marketplace_reviews
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

-- Tradelines: Public read available, admin write
CREATE POLICY "Public can read available tradelines" ON tradelines
    FOR SELECT TO authenticated, anon USING (available = true);

CREATE POLICY "Admin can manage tradelines" ON tradelines
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_marketplace_providers_updated_at ON marketplace_providers;
CREATE TRIGGER update_marketplace_providers_updated_at
    BEFORE UPDATE ON marketplace_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_marketplace_products_updated_at ON marketplace_products;
CREATE TRIGGER update_marketplace_products_updated_at
    BEFORE UPDATE ON marketplace_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_marketplace_reviews_updated_at ON marketplace_reviews;
CREATE TRIGGER update_marketplace_reviews_updated_at
    BEFORE UPDATE ON marketplace_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tradelines_updated_at ON tradelines;
CREATE TRIGGER update_tradelines_updated_at
    BEFORE UPDATE ON tradelines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION TO UPDATE PROVIDER/PRODUCT RATINGS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update product rating if product_id exists
    IF NEW.product_id IS NOT NULL THEN
        UPDATE marketplace_products
        SET
            rating = (
                SELECT COALESCE(AVG(rating), 0)
                FROM marketplace_reviews
                WHERE product_id = NEW.product_id
            ),
            review_count = (
                SELECT COUNT(*)
                FROM marketplace_reviews
                WHERE product_id = NEW.product_id
            )
        WHERE id = NEW.product_id;
    END IF;

    -- Update provider rating if provider_id exists
    IF NEW.provider_id IS NOT NULL THEN
        UPDATE marketplace_providers
        SET
            rating = (
                SELECT COALESCE(AVG(rating), 0)
                FROM marketplace_reviews
                WHERE provider_id = NEW.provider_id
            ),
            review_count = (
                SELECT COUNT(*)
                FROM marketplace_reviews
                WHERE provider_id = NEW.provider_id
            )
        WHERE id = NEW.provider_id;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ratings_on_review ON marketplace_reviews;
CREATE TRIGGER update_ratings_on_review
    AFTER INSERT OR UPDATE OR DELETE ON marketplace_reviews
    FOR EACH ROW EXECUTE FUNCTION update_rating_stats();

-- ============================================================================
-- SEED DATA (Sample providers for testing)
-- ============================================================================

-- Insert sample providers
INSERT INTO marketplace_providers (name, description, website, category, rating, review_count, bbb_rating, years_in_business, verified) VALUES
    ('TradelinePro', 'Premium authorized user tradelines with guaranteed reporting to all 3 bureaus', 'https://tradelinepro.example.com', 'tradeline', 4.7, 234, 'A+', 8, true),
    ('CreditBoost Services', 'Established tradeline provider with excellent track record', 'https://creditboost.example.com', 'tradeline', 4.5, 189, 'A', 5, true),
    ('ScoreMax Tradelines', 'Affordable tradelines for credit building', 'https://scoremax.example.com', 'tradeline', 4.2, 156, 'A-', 3, true),
    ('CreditRepair Pro', 'Full-service credit repair with money-back guarantee', 'https://creditrepairpro.example.com', 'credit_repair', 4.6, 512, 'A+', 12, true),
    ('DisputeGenius', 'AI-powered credit dispute services', 'https://disputegenius.example.com', 'credit_repair', 4.4, 298, 'A', 4, true),
    ('CreditWatch 360', '24/7 credit monitoring with identity protection', 'https://creditwatch360.example.com', 'monitoring', 4.3, 876, 'A+', 10, true),
    ('Credit Academy', 'Online courses for credit education and financial literacy', 'https://creditacademy.example.com', 'education', 4.8, 432, 'A+', 6, true),
    ('Consumer Law Group', 'Credit attorneys specializing in FCRA and FDCPA violations', 'https://consumerlawgroup.example.com', 'legal', 4.5, 187, 'A', 15, true)
ON CONFLICT DO NOTHING;

-- Insert sample tradelines
INSERT INTO tradelines (provider_id, credit_limit, age_months, utilization, price, estimated_score_impact, bureaus_reporting, available)
SELECT
    id,
    10000,
    36,
    5,
    350,
    25,
    ARRAY['Experian', 'Equifax', 'TransUnion'],
    true
FROM marketplace_providers WHERE name = 'TradelinePro'
ON CONFLICT DO NOTHING;

INSERT INTO tradelines (provider_id, credit_limit, age_months, utilization, price, estimated_score_impact, bureaus_reporting, available)
SELECT
    id,
    25000,
    60,
    3,
    650,
    40,
    ARRAY['Experian', 'Equifax', 'TransUnion'],
    true
FROM marketplace_providers WHERE name = 'TradelinePro'
ON CONFLICT DO NOTHING;

INSERT INTO tradelines (provider_id, credit_limit, age_months, utilization, price, estimated_score_impact, bureaus_reporting, available)
SELECT
    id,
    5000,
    24,
    8,
    225,
    18,
    ARRAY['Experian', 'TransUnion'],
    true
FROM marketplace_providers WHERE name = 'CreditBoost Services'
ON CONFLICT DO NOTHING;

INSERT INTO tradelines (provider_id, credit_limit, age_months, utilization, price, estimated_score_impact, bureaus_reporting, available)
SELECT
    id,
    15000,
    48,
    4,
    475,
    32,
    ARRAY['Experian', 'Equifax', 'TransUnion'],
    true
FROM marketplace_providers WHERE name = 'CreditBoost Services'
ON CONFLICT DO NOTHING;

INSERT INTO tradelines (provider_id, credit_limit, age_months, utilization, price, estimated_score_impact, bureaus_reporting, available)
SELECT
    id,
    3000,
    18,
    10,
    150,
    12,
    ARRAY['Experian', 'Equifax'],
    true
FROM marketplace_providers WHERE name = 'ScoreMax Tradelines'
ON CONFLICT DO NOTHING;

-- Insert sample products
INSERT INTO marketplace_products (provider_id, name, description, category, price, price_type, rating, review_count, features, active)
SELECT
    id,
    'Credit Repair Basic',
    'Basic credit repair service with dispute assistance',
    'credit_repair',
    79.00,
    'monthly',
    4.4,
    156,
    '{"disputes_per_month": 5, "bureaus": ["Experian", "Equifax", "TransUnion"], "support": "email"}',
    true
FROM marketplace_providers WHERE name = 'CreditRepair Pro'
ON CONFLICT DO NOTHING;

INSERT INTO marketplace_products (provider_id, name, description, category, price, price_type, rating, review_count, features, active)
SELECT
    id,
    'Credit Repair Premium',
    'Comprehensive credit repair with unlimited disputes and dedicated specialist',
    'credit_repair',
    149.00,
    'monthly',
    4.7,
    234,
    '{"disputes_per_month": "unlimited", "bureaus": ["Experian", "Equifax", "TransUnion"], "support": "phone", "specialist": true}',
    true
FROM marketplace_providers WHERE name = 'CreditRepair Pro'
ON CONFLICT DO NOTHING;

INSERT INTO marketplace_products (provider_id, name, description, category, price, price_type, rating, review_count, features, active)
SELECT
    id,
    'AI Dispute Generator',
    'AI-powered dispute letter generation and tracking',
    'credit_repair',
    49.00,
    'monthly',
    4.3,
    98,
    '{"ai_letters": true, "tracking": true, "templates": 50}',
    true
FROM marketplace_providers WHERE name = 'DisputeGenius'
ON CONFLICT DO NOTHING;

INSERT INTO marketplace_products (provider_id, name, description, category, price, price_type, rating, review_count, features, active)
SELECT
    id,
    '3-Bureau Monitoring',
    'Real-time monitoring of all 3 credit bureaus',
    'monitoring',
    29.99,
    'monthly',
    4.5,
    412,
    '{"bureaus": 3, "alerts": true, "score_tracking": true, "identity_protection": false}',
    true
FROM marketplace_providers WHERE name = 'CreditWatch 360'
ON CONFLICT DO NOTHING;

INSERT INTO marketplace_products (provider_id, name, description, category, price, price_type, rating, review_count, features, active)
SELECT
    id,
    'Credit Mastery Course',
    'Complete credit education program with certification',
    'education',
    199.00,
    'one_time',
    4.9,
    287,
    '{"modules": 12, "hours": 24, "certificate": true, "lifetime_access": true}',
    true
FROM marketplace_providers WHERE name = 'Credit Academy'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE marketplace_providers IS 'Marketplace service providers offering credit-related products';
COMMENT ON TABLE marketplace_products IS 'Products and services offered by marketplace providers';
COMMENT ON TABLE marketplace_reviews IS 'User reviews for marketplace products and providers';
COMMENT ON TABLE tradelines IS 'Authorized user tradelines available for credit building';
