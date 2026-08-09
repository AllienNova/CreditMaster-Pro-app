-- notifications.data: the payload column every notification writer already assumes.
--
-- Four cron inserts supply `data` — a column that does not exist on
-- notifications (real columns: id, user_id, type, title, message, read,
-- created_at). PostgREST rejects the whole insert with PGRST204, and all four
-- call sites are FIRE-AND-FORGET:
--
--     await supabase.from("notifications").insert({ ... data: {...} });
--
-- with no `{ error }` destructured and no check. So the insert fails, the cron
-- reports success, and the user is simply never notified. Affected:
--   /api/cron/send-reminders          3 inserts (dispute reminders, bill reminders)
--   /api/cron/check-dispute-status    1 insert  (FCRA 30-day overdue notice)
--
-- The last one matters most: it tells a user their dispute has gone unanswered
-- for 30 days and "may be an FCRA violation". That notification has never been
-- delivered.
--
-- ADD THE COLUMN rather than strip `data` from the inserts. `data` is the
-- established convention across the whole notification layer — see
-- push-notification-service.ts:122 (data: payload.data) and web-push-service.ts
-- (531, 574, 598, 619), all of which carry structured payloads of exactly this
-- shape. The payload is load-bearing: `{ dispute_id }` is what lets a
-- notification deep-link to the dispute it is about. Dropping it to satisfy the
-- schema would silently discard that linkage and make the notification
-- unactionable.
--
-- JSONB with a `{}` default, so existing rows and any writer that omits the
-- field are both valid, and NOT NULL is safe to assert.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.notifications.data IS
  'Structured payload for deep-linking and client-side handling, e.g. {"dispute_id": "..."}. Matches the `data` field used throughout the notification services.';
