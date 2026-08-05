---
name: project-track-m-mny3
description: MNY-3 done — referral_codes migration + atomic increment_referral_use RPC + self-referral guard (FND-027, commit 37c7531)
metadata:
  type: project
---

MNY-3 shipped at commit `37c7531` on branch `remediation/wave-7-foundation`.

**Why:** FND-027 — `applyReferralCode` used a non-atomic read-modify-write for `uses_count` (race past `max_uses`) and had no self-referral guard.

**How to apply:** Next Track M task (MNY-4) edits `payout-service.ts` and `commission-calculator.ts` for idempotency keys. MNY-4 must come after MNY-1 (cents conversion already in payout-service.ts).

## Files changed

- `supabase/migrations/20260517000006_referral_codes.sql` — CREATE TABLE (schema-of-record; table existed in live DB only)
- `supabase/migrations/20260517000007_increment_referral_use.sql` — atomic plpgsql RPC with SELECT...FOR UPDATE row lock
- `src/lib/commerce/affiliate/affiliate-service.ts` — `applyReferralCode` now calls `supabase.rpc("increment_referral_use", ...)` + service-layer self-referral fast-fail
- `src/lib/commerce/affiliate/__tests__/affiliate-service.test.ts` — 4 tests updated/added; 63 total (was 60)

## Key correctness points

- `max_uses IS NOT NULL AND uses_count >= max_uses` — the NULL guard is mandatory; `NULL >= N` yields NULL (falsy), which would silently pass uncapped codes through the cap_reached branch
- RPC returns typed status: `invalid | self_referral | cap_reached | applied`
- Self-referral guard at BOTH layers: service layer (fast-fail before RPC) and RPC (`user_id = p_user_id`)
- `REVOKE EXECUTE FROM public, anon, authenticated; GRANT TO service_role` on both table and RPC

## Test results

- Red: 4 failing (3 new MNY-3 tests + 1 updated existing test) before fix
- Green: 63/63 passing after fix
- Full suite: 15,889 passing / 0 failing / 19 skipped (pre-existing env-dependent)
- Type-check: 0 errors
