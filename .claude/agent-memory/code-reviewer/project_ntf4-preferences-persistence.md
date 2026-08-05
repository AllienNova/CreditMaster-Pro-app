---
name: ntf4-preferences-persistence
description: NTF-4 (7c83542) approved; service-role client means .eq("user_id", user.id) IS the IDOR control (RLS bypassed); missing REVOKE template on new table is MEDIUM; body.channels type guard absent is MEDIUM
metadata:
  type: project
---

Commit 7c83542 approved. `notification_preferences` table created with RLS enabled and owner-only policies, but the route uses `SUPABASE_SERVICE_ROLE_KEY` so RLS is bypassed at runtime — ownership is enforced entirely by `.eq("user_id", user.id)` in the route (airtight: hardcodes `user_id: user.id` in the upsert payload at route.ts:168).

**Why:** FND-048 HIGH — module-level `preferencesStore` Record lost preferences on cold start. Table + upsert pattern fixes this. GDPR erasure RPC table-name reference now resolves.

**How to apply:** When reviewing new Supabase table migrations in this codebase, check for the REVOKE template from `20260517000000_processed_webhook_events.sql` (`REVOKE ALL ON … FROM public, anon, authenticated`). If the route uses service-role (bypasses RLS), the application-layer `.eq("user_id", user.id)` is the sole IDOR control — verify it is hardcoded, not caller-supplied.

Open follow-ons (non-blocking, not tracked as tasks yet):
- Add `REVOKE ALL ON notification_preferences FROM public, anon, authenticated` to the migration (MEDIUM)
- Add type guard for `body.channels` / `body.quietHours` in PUT before spread (MEDIUM — malformed value causes 500 not 400)
- Replace `void _error` with logger call in GET (line 119) and PUT (line 184) catch blocks (LOW)
- Remove redundant `CREATE INDEX` on PK column `user_id` (LOW)
