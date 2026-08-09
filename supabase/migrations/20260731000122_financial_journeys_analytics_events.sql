-- ============================================================================
-- financial_journeys + analytics_events
--
-- Two independent UNBUILT+reachable tables from the shared-goals/gig-income/
-- misc cluster triage.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- financial_journeys
--
-- Backs FinancialJourneyService (src/lib/gamification/financial-journey-
-- service.ts). Classified UNBUILT + tested, not DEAD, despite zero live HTTP
-- reachability: git log --follow shows a recent, explicitly labeled commit
-- (1d24dd9, "TASK-ANC-2b IDOR sweep — gamification-engine/points/achievement/
-- partners/journey") that added an ownership check to updateProgress,
-- backed by a dedicated financial-journey-service.idor.test.ts -- the same
-- active-investment signal as shared_goals in the prior commit, not
-- abandonment.
--
-- Column shape matches toDbFormat/fromDbFormat exactly (financial-journey-
-- service.ts:773-831). waypoints is a JSONB array of the full Waypoint
-- objects (each with its own nested requirements array) -- the service
-- reads/writes it wholesale, never queries into individual waypoint fields
-- at the SQL level, so a single JSONB column is the correct shape, not a
-- normalized child table.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financial_journeys (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_name               TEXT NOT NULL,
  current_phase              TEXT NOT NULL DEFAULT 'foundation',
  overall_progress           NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_waypoints            INTEGER NOT NULL DEFAULT 0,
  completed_waypoints        INTEGER NOT NULL DEFAULT 0,
  waypoints                  JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_date                 TIMESTAMPTZ NOT NULL,
  projected_completion_date  TIMESTAMPTZ,
  last_updated               TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT financial_journeys_phase_check CHECK (
    current_phase IN (
      'foundation', 'stability', 'growth', 'wealth_building', 'financial_freedom'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_financial_journeys_user_id
  ON financial_journeys(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_journeys_created_at
  ON financial_journeys(created_at DESC);

ALTER TABLE financial_journeys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own financial journeys" ON financial_journeys;
CREATE POLICY "Users can view own financial journeys" ON financial_journeys
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own financial journeys" ON financial_journeys;
CREATE POLICY "Users can insert own financial journeys" ON financial_journeys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own financial journeys" ON financial_journeys;
CREATE POLICY "Users can update own financial journeys" ON financial_journeys
  FOR UPDATE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- analytics_events
--
-- Backs POST/GET /api/analytics/events directly (src/app/api/analytics/
-- events/route.ts) -- no intermediate service, the route file itself is the
-- only caller. POST always attributes to the authenticated caller's own
-- user.id (never trusts a client-supplied userId) and both handlers use a
-- service-role client, so RLS is defense-in-depth: the route's own auth
-- guards (withAuth for POST, withRole("admin") for the aggregate GET) are
-- the live authorization path.
--
-- Column shape matches the POST insert exactly (route.ts:42-51):
-- event_type, user_id, session_id, properties (JSONB), page, referrer,
-- user_agent, created_at.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  page       TEXT,
  referrer   TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id
  ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type
  ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
  ON analytics_events(created_at DESC);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own analytics events" ON analytics_events;
CREATE POLICY "Users can view own analytics events" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);
