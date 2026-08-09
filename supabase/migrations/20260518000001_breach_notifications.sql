-- CMP-2: breach_notifications table (FND-056)
-- Records the outcome (sent / failed) of every GDPR Art. 33 breach notification
-- attempt. Service-role-only RLS — no user can read or write these rows directly.

CREATE TABLE IF NOT EXISTS breach_notifications (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  breach_id    text        NOT NULL,
  user_id      uuid        NOT NULL,
  notified_at  timestamptz NOT NULL DEFAULT now(),
  channel      text        NOT NULL,
  status       text        NOT NULL CHECK (status IN ('sent', 'failed')),
  error        text        NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup by breach_id when correlating all notifications for a single breach
CREATE INDEX IF NOT EXISTS breach_notifications_breach_id_idx
  ON breach_notifications (breach_id);

-- RLS: enable but allow no public access — service role bypasses RLS by design
ALTER TABLE breach_notifications ENABLE ROW LEVEL SECURITY;

-- No explicit policies → all roles other than service_role are denied by default.
-- Enforce principle of least privilege: revoke execute from public and grant only
-- to service_role (mirrors the d64e8d5 template used throughout Wave 7).
REVOKE ALL ON breach_notifications FROM PUBLIC;
GRANT SELECT, INSERT ON breach_notifications TO service_role;
