---
name: project-track-n-adm1
description: ADM-1 done (commit c7a786e); field whitelist on admin dispute PATCH — mass-assignment fix (FND-051/054)
metadata:
  type: project
---

ADM-1 done at commit `c7a786e` on `remediation/wave-7-foundation`.

**Why:** `.update(updates)` on the disputes table spread raw caller input — any admin-role user could overwrite `user_id`, `id`, `created_at`, or any column.

**What was changed:**
- `src/app/api/admin/disputes/route.ts`: added `buildWhitelistedPayload()` that picks only `{ status, outcome, notes, resolved_at, sent_at }` from the caller-supplied `updates`. Returns `null` on invalid enum values. Returns empty-object on a body with only non-whitelisted keys → both cases return 400 before `.update()` is called.
- `src/app/api/admin/disputes/__tests__/route.test.ts`: expanded from 4 → 9 tests; added 5 ADM-1 whitelist tests in a new describe block.

**Whitelist (real column names from supabase/types.ts):** `status`, `outcome`, `notes`, `resolved_at`, `sent_at`. Excluded: `user_id`, `id`, `created_at`, `bureau`, `item_type`, `item_description`, `reason`, `letter_content`, `template_id`, `strategy_id`.

**Status enum validated:** `"draft" | "sent" | "under_review" | "resolved" | "rejected"` (matches `DisputeStatus` in `dispute-service-db.ts`). Outcome enum: `"removed" | "updated" | "verified"`.

**Test mock pattern:** Use `{ json: jest.fn().mockResolvedValue(body) } as unknown as NextRequest` — NOT `new NextRequest(url, { body: JSON.stringify(...) })`. The latter doesn't parse in the node test environment. Matches pattern in `stats-and-disputes.test.ts`. See [[feedback-supabase-mock-terminal-resolver]].

**How to apply:** For any future PATCH route with a DB `.update()` call — always define an explicit `ALLOWED_KEYS` set, pick only those, validate enum fields, reject empty payload with 400.

**Full suite:** 16,153 passing / 0 failing / 19 skipped. Type-check: 0 errors.
