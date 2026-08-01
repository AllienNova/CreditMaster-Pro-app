-- Community challenges: the participant columns the service has always mapped,
-- plus an ATOMIC participant counter.
--
-- community-challenges-service.ts IS live (/api/gamification/challenges) and was
-- hardened by a labelled IDOR sweep (88276d2), so this is unwired-adjacent real
-- code, not abandonment.
--
-- Its participantToDb/participantFromDb mappers read and write SEVEN columns
-- that do not exist on user_challenge_participation. The real table is only
-- (id, user_id, challenge_id, joined_at, current_progress, is_completed,
-- completed_at, rank). Any insert through participantToDb therefore failed
-- outright, so joining a challenge never persisted a participant row.
--
-- Six are added here because they carry information that cannot be derived:
--   status            participant lifecycle, distinct from is_completed
--   starting_value    baseline at join time — without it, progress on a
--                     "reduce your spending" style challenge is meaningless
--   current_value     latest observed value
--   earned_badge      whether the badge reward was granted
--   earned_xp         how much XP was granted
--   last_updated_at   when progress last moved, distinct from joined_at
--
-- `goal_progress` is deliberately NOT added. It was mapped to progressPercent,
-- which is a PERCENTAGE and is fully derivable from current_progress against
-- the challenge's target_value. Storing a derived percentage invites drift
-- between the two, and the companion code change computes it at read time
-- instead. Adding a column just because code named one is how the phantom
-- columns got here.
--
-- ── community_challenges.current_participants, and why it is an RPC ───────
-- joinChallenge did:
--     .update({ current_participants: challenge.currentParticipants + 1 })
-- which is a read-modify-write on a counter — two people joining at once lose
-- an increment. The column did not exist either, so `challenge.currentParticipants`
-- was undefined and the expression evaluated to NaN.
--
-- This repository already has a first-fix template for exactly this shape:
-- commit d64e8d5 replaced a read-modify-write with an atomic Postgres RPC plus
-- REVOKE/GRANT. The same pattern is used here rather than re-introducing the
-- race with a working column behind it.

ALTER TABLE public.user_challenge_participation
  ADD COLUMN IF NOT EXISTS status          TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.user_challenge_participation
  ADD COLUMN IF NOT EXISTS starting_value  NUMERIC(18,4);
ALTER TABLE public.user_challenge_participation
  ADD COLUMN IF NOT EXISTS current_value   NUMERIC(18,4);
ALTER TABLE public.user_challenge_participation
  ADD COLUMN IF NOT EXISTS earned_badge    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.user_challenge_participation
  ADD COLUMN IF NOT EXISTS earned_xp       INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.user_challenge_participation
  ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ;

ALTER TABLE public.community_challenges
  ADD COLUMN IF NOT EXISTS current_participants INTEGER NOT NULL DEFAULT 0;

-- Atomic increment. `SET x = x + 1` is evaluated by the database under a row
-- lock, so concurrent joins cannot lose an increment the way a read-then-write
-- from the application can.
CREATE OR REPLACE FUNCTION public.increment_challenge_participants(
  p_challenge_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.community_challenges
     SET current_participants = current_participants + 1
   WHERE id = p_challenge_id
  RETURNING current_participants INTO v_count;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge % does not exist', p_challenge_id;
  END IF;

  RETURN v_count;
END;
$$;

-- Mirrors the d64e8d5 template: never callable by an end user directly.
REVOKE EXECUTE ON FUNCTION public.increment_challenge_participants(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.increment_challenge_participants(UUID) TO service_role;

COMMENT ON COLUMN public.user_challenge_participation.starting_value IS
  'Baseline metric when the user joined. Progress on a reduction-style challenge is meaningless without it.';
COMMENT ON FUNCTION public.increment_challenge_participants(UUID) IS
  'Atomic participant counter. Replaces an application-side read-modify-write that lost increments under concurrent joins.';
