-- Achievements — the tables behind /api/gamification/achievements.
--
-- WHY NOW. achievement-service.ts and its route were deleted by b6f6efe as a
-- "duplicate of the badge system", then restored (8e5481d) once it emerged
-- they were a concurrent session's work rather than dead code. The route is
-- the ONE restored module that is live by construction — Next.js serves it, so
-- it needs no importer to be reachable — and it queries two tables that exist
-- in no migration. Left as-is it would return a PostgREST error on every call.
--
-- Achievements are NOT the badge system. Badges (badge_definitions,
-- user_badges, badge_progress, served by /api/gamification/badges via
-- gamification-engine.ts) are awarded outright. An achievement carries
-- conditions, a tier, and INCREMENTAL progress toward a target — the
-- current/target/percent triple below has no equivalent in the badge tables.
-- They coexist deliberately; this is not a second copy of one concept.
--
-- Columns are derived from the service's own TypeScript interfaces
-- (achievement-service.ts:32-60) and from every column its queries actually
-- name, not invented. `xp_reward` feeds the existing xp_transactions table,
-- which the service already writes to and which does exist.

CREATE TABLE IF NOT EXISTS public.achievement_definitions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stable business key. The service looks achievements up by code when
  -- checking conditions, so it must be unique.
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL CHECK (category IN ('financial', 'usage', 'learning')),
  tier        TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  xp_reward   INTEGER NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
  -- AchievementCondition[]; evaluated in application code, not SQL.
  conditions  JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS achievement_definitions_active_sort_idx
  ON public.achievement_definitions (is_active, sort_order)
  WHERE is_active;

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id    UUID NOT NULL REFERENCES public.achievement_definitions(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'locked'
                      CHECK (status IN ('locked', 'in_progress', 'completed')),
  current_progress  INTEGER NOT NULL DEFAULT 0 CHECK (current_progress >= 0),
  target_progress   INTEGER NOT NULL DEFAULT 1 CHECK (target_progress > 0),
  progress_percent  INTEGER NOT NULL DEFAULT 0
                      CHECK (progress_percent BETWEEN 0 AND 100),
  completed_at      TIMESTAMPTZ,
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One progress row per user per achievement. Without this an award retry
  -- creates a second row and the user earns the XP twice — the same
  -- double-credit class as FND-026.
  CONSTRAINT user_achievements_user_achievement_key UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS user_achievements_user_status_idx
  ON public.user_achievements (user_id, status);

-- ---------------------------------------------------------------------------
-- Access control
-- ---------------------------------------------------------------------------

ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Definitions are a public catalogue: any signed-in user may read the list of
-- achievements available to them. They carry no personal data.
DROP POLICY IF EXISTS "Anyone authenticated can read achievement definitions"
  ON public.achievement_definitions;
CREATE POLICY "Anyone authenticated can read achievement definitions"
  ON public.achievement_definitions
  FOR SELECT
  TO authenticated
  USING (true);

-- Progress is personal. Read-only for the owner; there is deliberately no
-- user-facing INSERT/UPDATE policy, because a client able to write here could
-- award itself achievements and the XP that comes with them.
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements"
  ON public.user_achievements
  FOR SELECT
  USING (auth.uid() = user_id);

REVOKE ALL ON public.user_achievements FROM PUBLIC;
GRANT SELECT ON public.user_achievements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_achievements TO service_role;
GRANT SELECT ON public.achievement_definitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievement_definitions TO service_role;

COMMENT ON TABLE public.achievement_definitions IS
  'Achievement catalogue for /api/gamification/achievements. Distinct from badge_definitions: achievements carry conditions, a tier, and incremental progress toward a target. Public read; written only by the service role.';

COMMENT ON TABLE public.user_achievements IS
  'Per-user achievement progress. UNIQUE (user_id, achievement_id) prevents an award retry from double-crediting XP. Owner may read; only the service role may write.';
