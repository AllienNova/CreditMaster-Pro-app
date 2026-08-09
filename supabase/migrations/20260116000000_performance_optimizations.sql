-- ============================================================================
-- Performance Optimizations Migration
-- Phase 6.5.1: Database query optimization and additional indexes
-- Created: 2026-01-05
-- ============================================================================

-- ============================================================================
-- ADDITIONAL INDEXES FOR CHAT TABLES
-- ============================================================================

-- Composite index for common query pattern: user_id + archived + updated_at
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_archived_updated 
  ON chat_sessions(user_id, archived, updated_at DESC)
  WHERE archived = FALSE;

-- Composite index for session_id + timestamp for message queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_timestamp 
  ON chat_messages(session_id, timestamp DESC);

-- Index for intent-based queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_intent 
  ON chat_messages(intent_type) 
  WHERE intent_type IS NOT NULL;

-- GIN index for JSONB metadata searches
CREATE INDEX IF NOT EXISTS idx_chat_sessions_metadata_gin 
  ON chat_sessions USING GIN (metadata);

CREATE INDEX IF NOT EXISTS idx_chat_messages_metadata_gin 
  ON chat_messages USING GIN (metadata);

-- ============================================================================
-- OPTIMIZED STORED PROCEDURES
-- ============================================================================

-- Optimized procedure: Get recent sessions with message preview
CREATE OR REPLACE FUNCTION get_recent_sessions_with_preview(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  message_count INTEGER,
  last_message_at TIMESTAMPTZ,
  last_message_content TEXT,
  last_message_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_messages AS (
    SELECT DISTINCT ON (m.session_id)
      m.session_id,
      m.content,
      m.role
    FROM chat_messages m
    ORDER BY m.session_id, m.timestamp DESC
  )
  SELECT
    s.id,
    s.title,
    s.created_at,
    s.updated_at,
    s.message_count,
    s.last_message_at,
    lm.content AS last_message_content,
    lm.role AS last_message_role
  FROM chat_sessions s
  LEFT JOIN latest_messages lm ON lm.session_id = s.id
  WHERE s.user_id = p_user_id AND s.archived = FALSE
  ORDER BY s.updated_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Optimized procedure: Get session messages with pagination
CREATE OR REPLACE FUNCTION get_session_messages_paginated(
  p_session_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  role TEXT,
  content TEXT,
  -- Quoted: `timestamp` is a type keyword, so a bare `timestamp TIMESTAMPTZ`
  -- column definition is a syntax error here and aborted the migration chain.
  "timestamp" TIMESTAMPTZ,
  metadata JSONB,
  intent_type TEXT,
  intent_confidence NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.role,
    m.content,
    m.timestamp,
    m.metadata,
    m.intent_type,
    m.intent_confidence
  FROM chat_messages m
  WHERE m.session_id = p_session_id
  ORDER BY m.timestamp ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- MATERIALIZED VIEW FOR SESSION STATISTICS (Optional)
-- ============================================================================

-- Create materialized view for session statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS chat_session_stats AS
SELECT
  s.id AS session_id,
  s.user_id,
  s.message_count,
  COUNT(CASE WHEN m.role = 'user' THEN 1 END) AS user_message_count,
  COUNT(CASE WHEN m.role = 'assistant' THEN 1 END) AS assistant_message_count,
  COUNT(CASE WHEN m.role = 'system' THEN 1 END) AS system_message_count,
  AVG(LENGTH(m.content)) AS avg_message_length,
  MIN(m.timestamp) AS first_message_at,
  MAX(m.timestamp) AS last_message_at
FROM chat_sessions s
LEFT JOIN chat_messages m ON m.session_id = s.id
WHERE s.archived = FALSE
GROUP BY s.id, s.user_id, s.message_count;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_session_stats_session_id 
  ON chat_session_stats(session_id);

CREATE INDEX IF NOT EXISTS idx_chat_session_stats_user_id 
  ON chat_session_stats(user_id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_chat_session_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY chat_session_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VACUUM AND ANALYZE
-- ============================================================================

-- Analyze tables to update statistics
ANALYZE chat_sessions;
ANALYZE chat_messages;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON chat_session_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_sessions_with_preview(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_messages_paginated(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_chat_session_stats() TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_recent_sessions_with_preview IS 'Optimized query to get recent sessions with last message preview';
COMMENT ON FUNCTION get_session_messages_paginated IS 'Optimized paginated query for session messages';
COMMENT ON MATERIALIZED VIEW chat_session_stats IS 'Cached statistics for chat sessions to improve dashboard performance';

