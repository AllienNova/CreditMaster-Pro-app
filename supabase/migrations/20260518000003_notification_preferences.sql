-- TASK-NTF-04 — Create notification_preferences table (FND-048)
--
-- preferences/route.ts held preferences in a module-level Record (cold-start
-- loss, races, process-local — not durable). This migration creates the backing
-- table so preferences survive across serverless cold starts and instances.
--
-- FK references auth.users(id) ON DELETE CASCADE (not profiles) — ordering-safe
-- and the more common user-FK target in this codebase. The GDPR erasure RPC
-- (20260401000000_gdpr_erasure_rpc.sql:35 and
-- 20260518000002_expand_erasure_cascade.sql:62) already references this table
-- by name — creating it makes those dangling references valid.
--
-- user_id is PRIMARY KEY (one row per user; upsert pattern for PUT).

CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    push_enabled    BOOLEAN NOT NULL DEFAULT true,
    email_enabled   BOOLEAN NOT NULL DEFAULT true,
    sms_enabled     BOOLEAN NOT NULL DEFAULT false,
    channels        JSONB   NOT NULL DEFAULT '{
        "dispute_update": true,
        "score_change": true,
        "payment_reminder": true,
        "document_processed": true,
        "recommendation": true,
        "system": true,
        "promotion": false
    }'::jsonb,
    quiet_hours     JSONB   NOT NULL DEFAULT '{
        "enabled": false,
        "start": "22:00",
        "end": "08:00"
    }'::jsonb,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- (no separate user_id index — the PRIMARY KEY already provides a unique index on user_id)

-- Row Level Security: owner-only access
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
CREATE POLICY "Users can view own notification preferences"
    ON notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON notification_preferences;
CREATE POLICY "Users can insert own notification preferences"
    ON notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
CREATE POLICY "Users can update own notification preferences"
    ON notification_preferences FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notification preferences" ON notification_preferences;
CREATE POLICY "Users can delete own notification preferences"
    ON notification_preferences FOR DELETE
    USING (auth.uid() = user_id);

-- Service role can manage all rows (for server-side upsert via service key)
DROP POLICY IF EXISTS "Service role can manage all notification preferences" ON notification_preferences;
CREATE POLICY "Service role can manage all notification preferences"
    ON notification_preferences FOR ALL
    USING (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Refuse direct PostgREST access; the route reaches this table via the
-- service-role client only (matches the Wave 7 table-migration pattern).
REVOKE ALL ON notification_preferences FROM public, anon, authenticated;
GRANT ALL ON notification_preferences TO service_role;

COMMENT ON TABLE notification_preferences IS 'Per-user notification preferences (durable, replaces process-local Record)';
