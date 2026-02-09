-- ============================================================================
-- Financial Chat Tables Migration
-- Phase 6.1: Create chat_sessions and chat_messages tables
-- Created: 2026-01-15
-- ============================================================================

-- ============================================================================
-- CHAT SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  archived BOOLEAN NOT NULL DEFAULT FALSE
);

-- Indexes for chat_sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_archived ON chat_sessions(archived) WHERE archived = FALSE;

-- ============================================================================
-- CHAT MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  intent_type TEXT,
  intent_confidence NUMERIC(5, 4)
);

-- Indexes for chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on chat_sessions
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sessions
CREATE POLICY "Users can view their own chat sessions"
  ON chat_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own sessions
CREATE POLICY "Users can create their own chat sessions"
  ON chat_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own sessions
CREATE POLICY "Users can update their own chat sessions"
  ON chat_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own sessions (archive)
CREATE POLICY "Users can delete their own chat sessions"
  ON chat_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages from their own sessions
CREATE POLICY "Users can view messages from their own sessions"
  ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Policy: Users can create messages in their own sessions
CREATE POLICY "Users can create messages in their own sessions"
  ON chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Policy: Users can update messages in their own sessions
CREATE POLICY "Users can update messages in their own sessions"
  ON chat_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Policy: Users can delete messages from their own sessions
CREATE POLICY "Users can delete messages from their own sessions"
  ON chat_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Function: Increment message count and update last_message_at
CREATE OR REPLACE FUNCTION increment_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions
  SET
    message_count = message_count + 1,
    last_message_at = NEW.timestamp,
    updated_at = NOW()
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-increment message count when message is inserted
CREATE TRIGGER trigger_increment_message_count
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_message_count();

-- ============================================================================
-- STORED PROCEDURES
-- ============================================================================

-- Procedure: Get session with message count
CREATE OR REPLACE FUNCTION get_session_with_stats(p_session_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  title TEXT,
  metadata JSONB,
  message_count INTEGER,
  last_message_at TIMESTAMPTZ,
  archived BOOLEAN,
  user_message_count INTEGER,
  assistant_message_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    s.created_at,
    s.updated_at,
    s.title,
    s.metadata,
    s.message_count,
    s.last_message_at,
    s.archived,
    COUNT(CASE WHEN m.role = 'user' THEN 1 END)::INTEGER AS user_message_count,
    COUNT(CASE WHEN m.role = 'assistant' THEN 1 END)::INTEGER AS assistant_message_count
  FROM chat_sessions s
  LEFT JOIN chat_messages m ON m.session_id = s.id
  WHERE s.id = p_session_id
  GROUP BY s.id;
END;
$$ LANGUAGE plpgsql;

-- Procedure: Archive old sessions
CREATE OR REPLACE FUNCTION archive_old_sessions(p_days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  UPDATE chat_sessions
  SET archived = TRUE
  WHERE
    archived = FALSE
    AND updated_at < NOW() - (p_days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Procedure: Get user session summary
CREATE OR REPLACE FUNCTION get_user_session_summary(p_user_id UUID)
RETURNS TABLE (
  total_sessions INTEGER,
  active_sessions INTEGER,
  archived_sessions INTEGER,
  total_messages INTEGER,
  last_activity TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_sessions,
    COUNT(CASE WHEN archived = FALSE THEN 1 END)::INTEGER AS active_sessions,
    COUNT(CASE WHEN archived = TRUE THEN 1 END)::INTEGER AS archived_sessions,
    COALESCE(SUM(message_count), 0)::INTEGER AS total_messages,
    MAX(updated_at) AS last_activity
  FROM chat_sessions
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE chat_sessions IS 'Stores financial chat sessions for users';
COMMENT ON TABLE chat_messages IS 'Stores individual messages within chat sessions';

COMMENT ON COLUMN chat_sessions.user_id IS 'Reference to the user who owns this session';
COMMENT ON COLUMN chat_sessions.title IS 'Optional title for the chat session';
COMMENT ON COLUMN chat_sessions.metadata IS 'Additional metadata (tags, context, etc.)';
COMMENT ON COLUMN chat_sessions.message_count IS 'Cached count of messages in this session';
COMMENT ON COLUMN chat_sessions.last_message_at IS 'Timestamp of the last message in this session';
COMMENT ON COLUMN chat_sessions.archived IS 'Whether this session has been archived';

COMMENT ON COLUMN chat_messages.session_id IS 'Reference to the parent chat session';
COMMENT ON COLUMN chat_messages.role IS 'Message role: user, assistant, or system';
COMMENT ON COLUMN chat_messages.content IS 'The message content';
COMMENT ON COLUMN chat_messages.metadata IS 'Additional metadata (formatting, attachments, etc.)';
COMMENT ON COLUMN chat_messages.intent_type IS 'Detected intent type from AI analysis';
COMMENT ON COLUMN chat_messages.intent_confidence IS 'Confidence score for the detected intent (0-1)';

-- ============================================================================
-- GRANTS (Optional - adjust based on your security model)
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_messages TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_session_with_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_session_summary(UUID) TO authenticated;
