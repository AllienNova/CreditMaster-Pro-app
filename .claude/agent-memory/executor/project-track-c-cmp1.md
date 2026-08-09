---
name: project-track-c-cmp1
description: CMP-1 done (commit 84dd1fc); consent_records UNIQUE dropped, ConsentManagementService DB write-through, GDPR/CCPA upsert→insert
metadata:
  type: project
---

CMP-1 fully shipped. Initial commit `84dd1fc`; review-fix commit `cc0fe6c` on branch `remediation/wave-7-foundation`.

**Why:** FND-057 — `ConsentManagementService` held append-only consent history in a process-local `Map`, lost on every cold start. GDPR Art. 7 requires demonstrable consent over time.

**Schema change:** Migration `20260518000000_consent_history.sql` — `ALTER TABLE consent_records DROP CONSTRAINT consent_records_user_id_consent_type_key` + `CREATE INDEX idx_consent_records_history ON consent_records (user_id, consent_type, timestamp DESC)`.

**Service change:** `ConsentManagementService` now accepts `DbClient` (constructor-injected, defaults to `supabaseAdmin`). All methods are `async`. `recordConsent` → `INSERT`. `hasConsent` → `SELECT … ORDER BY timestamp DESC LIMIT 1 .maybeSingle()` (not `.single()` — zero rows = `false`, real error = throw). `getUserConsents`/`exportConsentHistory` → `SELECT … ORDER BY timestamp DESC`. The `Map` is gone.

**GDPR/CCPA change:** `GDPRComplianceService.objectToProcessing` and `CCPAComplianceService.optOutOfSale` changed from `upsert` to `insert` — both write `granted: false` rows (append, not overwrite).

**How to apply:** CMP-2 re-reads `gdpr-ccpa.ts` (line numbers shifted); do not trust the pre-CMP-1 line references.

**Test pattern for ConsentManagementService:** The Supabase chain has two terminal patterns:
- `getUserConsents`: `...order()` is directly awaited → mock `order` to return thenable-builder hybrid (Promise.resolve + Object.assign builder methods) so `data` resolves for await and builder is available for chain
- `hasConsent`: `...order().limit().maybeSingle()` → same thenable-builder hybrid on `order`; `maybeSingle` is `jest.fn().mockResolvedValue({data: row | null, error: null | {message}})`

**Cold-start proof pattern:** `capturedInserts` array shared by two instances; instance A writes (inserts captured), instance B constructed fresh with same mock db reads from `capturedInserts` — the old `Map` impl fails both assertions (empty Map → `[]` and `false`).
