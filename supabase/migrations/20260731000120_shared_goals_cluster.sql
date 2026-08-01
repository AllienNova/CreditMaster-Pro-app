-- ============================================================================
-- shared_goals + shared_goal_members + shared_goal_contributions +
-- shared_goal_invitations + shared_goal_updates
--
-- Backs SharedGoalsService (src/lib/gamification/shared-goals-service.ts), a
-- Family/Friends shared-goal feature -- a Family-tier product surface per
-- the pricing model (CLAUDE.md section 10). Classified UNBUILT + tested, not
-- DEAD, despite zero live HTTP route reachability: git log --follow shows a
-- recent, explicitly labeled commit (88276d2, "TASK-ANC-2a IDOR sweep —
-- commitment/leaderboard/challenges/shared-goals") that hardened this exact
-- file against cross-user access, backed by a dedicated
-- shared-goals-service.idor.test.ts. That is active investment in an
-- unwired product surface, not abandonment (see this session's
-- feedback_dead-vs-unwired-tested-code.md).
--
-- Column shapes match goalFromDb/memberFromDb/contributionFromDb/
-- invitationFromDb/updateFromDb exactly (shared-goals-service.ts:399-477),
-- cross-checked against createGoal/getGoal/getUserGoals/getMembers/
-- inviteMember/acceptInvitation/recordContribution/postUpdate/getUpdates.
--
-- All access goes through a service-role client (getSharedGoalsService()
-- singleton), so RLS here is defense-in-depth, not the live authorization
-- path -- that lives in the service's own assertMember() calls. Policies
-- still follow this schema's real-world shape: shared_goal_members is the
-- only table with a direct user_id column; the other four are scoped by
-- goal ownership via an EXISTS membership check against
-- shared_goal_members, matching Supabase's standard pattern for
-- multi-tenant/shared-resource tables where the row itself has no owning
-- user_id (e.g. shared_goal_invitations is keyed by recipient_email, not a
-- user id, since the invitee may not have an account yet).
-- ============================================================================

CREATE TABLE IF NOT EXISTS shared_goals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  emoji               TEXT NOT NULL DEFAULT '',
  target_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'USD',
  start_date          TIMESTAMPTZ NOT NULL,
  target_date         TIMESTAMPTZ NOT NULL,
  visibility          TEXT NOT NULL DEFAULT 'members_only',
  status              TEXT NOT NULL DEFAULT 'active',
  total_contributions INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shared_goals_visibility_check CHECK (
    visibility IN ('private', 'members_only', 'public')
  ),
  CONSTRAINT shared_goals_status_check CHECK (
    status IN ('planning', 'active', 'paused', 'completed', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_shared_goals_status
  ON shared_goals(status);

ALTER TABLE shared_goals ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_shared_goals_updated_at ON shared_goals;
CREATE TRIGGER update_shared_goals_updated_at
  BEFORE UPDATE ON shared_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shared_goal_members (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id                   UUID NOT NULL REFERENCES shared_goals(id) ON DELETE CASCADE,
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name              TEXT NOT NULL,
  avatar_url                TEXT,
  relationship              TEXT,
  role                      TEXT NOT NULL DEFAULT 'contributor',
  commitment_amount         NUMERIC(14,2),
  commitment_frequency      TEXT,
  total_contributed         NUMERIC(14,2) NOT NULL DEFAULT 0,
  contribution_count        INTEGER NOT NULL DEFAULT 0,
  show_contribution_amounts BOOLEAN NOT NULL DEFAULT true,
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  joined_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shared_goal_members_role_check CHECK (
    role IN ('owner', 'admin', 'contributor')
  ),
  CONSTRAINT shared_goal_members_frequency_check CHECK (
    commitment_frequency IS NULL OR commitment_frequency IN (
      'one_time', 'weekly', 'biweekly', 'monthly'
    )
  ),
  CONSTRAINT shared_goal_members_unique_membership UNIQUE (goal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_goal_members_goal_id
  ON shared_goal_members(goal_id);
CREATE INDEX IF NOT EXISTS idx_shared_goal_members_user_id
  ON shared_goal_members(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_goal_members_is_active
  ON shared_goal_members(is_active);

ALTER TABLE shared_goal_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own memberships" ON shared_goal_members;
CREATE POLICY "Users can view own memberships" ON shared_goal_members
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own membership" ON shared_goal_members;
CREATE POLICY "Users can insert own membership" ON shared_goal_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- shared_goals SELECT/UPDATE now that shared_goal_members exists to check against.

DROP POLICY IF EXISTS "Members can view their shared goals" ON shared_goals;
CREATE POLICY "Members can view their shared goals" ON shared_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shared_goal_members m
      WHERE m.goal_id = shared_goals.id
        AND m.user_id = auth.uid()
        AND m.is_active = true
    )
  );

DROP POLICY IF EXISTS "Any authenticated user can create a shared goal" ON shared_goals;
CREATE POLICY "Any authenticated user can create a shared goal" ON shared_goals
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Members can update their shared goals" ON shared_goals;
CREATE POLICY "Members can update their shared goals" ON shared_goals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM shared_goal_members m
      WHERE m.goal_id = shared_goals.id
        AND m.user_id = auth.uid()
        AND m.is_active = true
    )
  );

-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shared_goal_contributions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id     UUID NOT NULL REFERENCES shared_goals(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES shared_goal_members(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  amount      NUMERIC(14,2) NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_goal_contributions_goal_id
  ON shared_goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_shared_goal_contributions_member_id
  ON shared_goal_contributions(member_id);

ALTER TABLE shared_goal_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view goal contributions" ON shared_goal_contributions;
CREATE POLICY "Members can view goal contributions" ON shared_goal_contributions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shared_goal_members m
      WHERE m.goal_id = shared_goal_contributions.goal_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
    )
  );

DROP POLICY IF EXISTS "Members can record contributions" ON shared_goal_contributions;
CREATE POLICY "Members can record contributions" ON shared_goal_contributions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM shared_goal_members m
      WHERE m.goal_id = shared_goal_contributions.goal_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
    )
  );

-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shared_goal_invitations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id          UUID NOT NULL REFERENCES shared_goals(id) ON DELETE CASCADE,
  goal_name        TEXT NOT NULL,
  inviter_name     TEXT NOT NULL,
  recipient_email  TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'contributor',
  personal_message TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  expires_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shared_goal_invitations_role_check CHECK (
    role IN ('owner', 'admin', 'contributor')
  ),
  CONSTRAINT shared_goal_invitations_status_check CHECK (
    status IN ('pending', 'accepted', 'declined', 'expired')
  )
);

CREATE INDEX IF NOT EXISTS idx_shared_goal_invitations_goal_id
  ON shared_goal_invitations(goal_id);
CREATE INDEX IF NOT EXISTS idx_shared_goal_invitations_recipient_email
  ON shared_goal_invitations(recipient_email);

ALTER TABLE shared_goal_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view goal invitations" ON shared_goal_invitations;
CREATE POLICY "Members can view goal invitations" ON shared_goal_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shared_goal_members m
      WHERE m.goal_id = shared_goal_invitations.goal_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
    )
  );

DROP POLICY IF EXISTS "Members can create goal invitations" ON shared_goal_invitations;
CREATE POLICY "Members can create goal invitations" ON shared_goal_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM shared_goal_members m
      WHERE m.goal_id = shared_goal_invitations.goal_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
    )
  );

DROP POLICY IF EXISTS "Members can update goal invitations" ON shared_goal_invitations;
CREATE POLICY "Members can update goal invitations" ON shared_goal_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM shared_goal_members m
      WHERE m.goal_id = shared_goal_invitations.goal_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
    )
  );

-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shared_goal_updates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id     UUID NOT NULL REFERENCES shared_goals(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  type        TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shared_goal_updates_type_check CHECK (
    type IN ('message', 'milestone', 'nudge', 'celebration', 'system')
  )
);

CREATE INDEX IF NOT EXISTS idx_shared_goal_updates_goal_id
  ON shared_goal_updates(goal_id);
CREATE INDEX IF NOT EXISTS idx_shared_goal_updates_created_at
  ON shared_goal_updates(created_at DESC);

ALTER TABLE shared_goal_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view goal updates" ON shared_goal_updates;
CREATE POLICY "Members can view goal updates" ON shared_goal_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shared_goal_members m
      WHERE m.goal_id = shared_goal_updates.goal_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
    )
  );

DROP POLICY IF EXISTS "Members can post goal updates" ON shared_goal_updates;
CREATE POLICY "Members can post goal updates" ON shared_goal_updates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM shared_goal_members m
      WHERE m.goal_id = shared_goal_updates.goal_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
    )
  );
