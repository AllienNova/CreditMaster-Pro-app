# Remediation Plan — wiring the dark code, honestly

- **Date:** 2026-08-09
- **Commit:** `6f3b93c`, branch `fix/restore-from-pre-deletion-state`
- **Inputs:** `gap-analysis.md` · `security-findings.md` · `orphan-module-review.md` · `smoke-test-report.md` · `deleted-feature-audit.md`
- **Scope:** turn dark code into working features, or delete it. Nothing in between.

---

## The premise, corrected

The task began as "the 55 restored modules have no importers — wire them."
Measurement changed the shape of the problem twice:

| Believed | Measured | Command |
|---|---|---|
| ~55 modules orphaned | **319 of 1,507 unreachable**; the 55 are 17% of it. 264 predate the restore | `node scripts/audit-reachability.js` |
| 36 phantom tables fail at runtime today | **1** does (`pctt_positions`) | reachability × `audit-phantom-tables.js` |
| 12 modules on the anon client, 4 of them live cron routes | **8**, all unreachable, all latent | grep on the *import*, not the name |

Both corrections went the same direction: the alarming reading came from
matching **names**, the true reading from following **imports**. That is the
method rule for everything below.

So this is not an outage. It is 319 modules of code that a user cannot reach,
inside a product whose canonical docs describe much of it as shipped. The
deliverable is a decision per module, and **DELETE is a first-class outcome** —
`CLAUDE.md`'s own working agreement #3 says prefer deletion over addition.

---

## Sequencing

```
M0 Prerequisites ──► M1 Triage the 319 ──► M2 Wire (per-module loop) ──► M3 Gates
   (blocking)          (decide, cheap)       (expensive, per module)      (launch)
```

M0 blocks everything. M1 is judgement, not code, and must finish before M2
starts — wiring one module at a time without a decided target set is how 264
modules became dark in the first place.

---

## M0 — Prerequisites (blocking, small, do first)

| ID | Task | Closes | Acceptance |
|---|---|---|---|
| R-001 | Add `rxjs` to `package.json` as a direct dependency | G-007 | `npm ls rxjs` shows it at top level; build green after `rm -rf node_modules && npm ci` |
| R-002 | Upgrade the 18 production-dependency vulns, starting with the `next-auth` critical | G-008 | `npm audit --omit=dev` reports 0 critical, 0 high |
| R-003 | Decide each of the 68 phantom tables: **CREATE / REMAP / DELETE-CALLER** (taxonomy below) | G-002 | a decision row per table, signed off; no table created before its caller's M1 verdict is WIRE |
| R-004 | Convert the 8 anon-client modules to service-role + explicit `user_id` scoping | G-003 | `grep -rl 'from "@/lib/supabase/client"' src/lib` returns only `client.ts` consumers that are genuinely browser-side |
| R-005 | Collapse the two backup-code implementations into one | G-009 | one module, one table, `user_backup_codes` gone |
| **R-006** | **Fix backup-code MFA recovery — it is broken in LIVE code** | SF-01 | a user who loses their TOTP device can complete recovery, proven by the M2 step-8 dogfood recipe end to end |

**R-006 is the only confirmed live defect in this plan** and it outranks
everything else in M0. Verified independently:

```
$ grep -rn "CREATE POLICY" supabase/migrations/*.sql | grep -c backup_codes
0
$ grep -rn "backup_codes.*ENABLE ROW LEVEL SECURITY" supabase/migrations/*.sql
20260516000001_atomic_backup_code_redemption.sql:30
$ grep -rn "redeem_backup_code" supabase/migrations/*.sql | grep -i grant
20260516000001:68: GRANT EXECUTE ON FUNCTION redeem_backup_code(UUID, TEXT) TO service_role;
```

`backup_codes` has RLS **enabled with zero policies anywhere in the migration
set**, so every `authenticated` read and write fails closed. `redeem_backup_code`
is granted to `service_role` only, so the browser client's RPC returns 42501. And
`BackupCodesManagement.tsx` is **reachable** — `src/app/settings/security/page.tsx`
renders it. A live settings screen offers a recovery mechanism that cannot work,
and no test caught it because the suite mocks the client.

Fail-closed, so it is a broken control rather than a bypass. It still means a
user who loses their TOTP device is locked out permanently.

**Design decision — server-side, not RLS policies.** Adding `authenticated`
policies to `backup_codes` would make it work, and it is the wrong fix. It leaves
the browser inserting its own backup codes, which puts code generation and
therefore the entropy under client control. Backup codes are a credential: the
server must generate them, store only hashes, return plaintext exactly once, and
redeem through the existing atomic `SECURITY DEFINER` RPC. That RPC being
`service_role`-only is correct and should stay. Move both `generate` and `verify`
behind API routes using the service role, and build the missing login-time
"use a backup code" step — `auth-service.ts` never calls `verifyBackupCode` at
all today, so even a working table would not have produced a recovery path.

**R-003 is the one that needs judgement, not typing.** Do not create 68 tables.
Checked by column compatibility rather than name similarity:

| Phantom | Verdict | Why |
|---|---|---|
| `user_backup_codes` | REMAP → `backup_codes` | existing table has exactly the columns written at `mfa-service.ts:255,292` |
| `holdings` | REMAP → `investment_holdings` | live table carries the full holding shape |
| `portfolios` | REMAP → `investment_portfolios` | same |
| `bank_accounts` | **CREATE** | `bank_connections` is connection-level (`item_id`, `institution_id`, `provider`); it has **no** account-level columns. The names rhyme, the schemas do not. Remapping on name would have pointed account queries at connection rows. |
| remaining 64 | one row each | most sit behind code whose M1 verdict may be DELETE, in which case the answer is DELETE-CALLER and no migration at all |

---

## M1 — Triage all 319 unreachable modules

Not just the 55. Output is one verdict per module, recorded in
`orphan-module-review.md`:

| Verdict | Meaning | Next step |
|---|---|---|
| `WIRE-NOW` | reachable target exists, no phantom tables, not stale | M2 |
| `WIRE-AFTER-TABLES` | needs migrations first | M2, after R-003 |
| `FIX-FIRST` | has a named defect | fix, then M2 |
| `DELETE` | superseded, speculative, or duplicates a live module | delete in a standalone commit |
| `DO-NOT-WIRE` | would reintroduce a closed finding or fabricate data | leave dark, record why |
| `JEST-INFRA` | `__mocks__`, `setupTests` | exempt |

Two hard constraints on this pass:

1. **Staleness check per module.** The restored copies came from
   `backup/pre-wipe-2026-08-05`, which branched at `cd8fc21` on 2026-05-16. Any
   fix made on the main line between then and the deletion is **absent** from the
   restored copy. This already bit once: `accountability-partners-service.ts`
   came back having silently lost its IDOR ownership checks (fixed in `b1e993a`).
   Diff every restored module against its pre-deletion blob, not against the
   backup.
2. **Three modules must never come back** (they closed numbered findings):
   `billing-profile-store.ts` (FND-016/017, served a fake Visa 4242),
   `score-simulator-service.ts` (DEFAB-2, fabricated credit scores), and the
   three rate limiters removed by `f165e91` (FND-013). Any module importing them
   is BLOCKED until repointed.

`src/lib/trading` (72 unreachable modules) gets its own decision *before*
per-module triage: the PCTT engine is either an M1 product surface or it is not.
Triaging 72 modules individually to answer one product question is waste.

---

## M2 — The per-module wiring loop

One module at a time. Every step produces evidence, and the module is not done
until step 8 passes.

```
1  DECIDE      verdict from M1. If DELETE, delete and stop — that is a complete outcome.
2  READ        the module + its pre-deletion blob. Reconcile any lost fix (staleness).
3  TABLES      apply the R-003 decision. Migration additive-only, per ADR-0001.
4  CLIENT      service-role + explicit .eq("user_id", …). Service role BYPASSES RLS,
               so that filter is the ONLY thing standing between users (FND-030).
5  ROUTE       wrap in withAuth/withRole. Add to PUBLIC_ROUTES.ts only with a written reason.
6  TEST        unit + a real-DB integration test. Mocked-Supabase tests cannot fail on a
               missing table, a missing GRANT, or an RLS policy — the four defects in
               smoke-test-report.md §3 all passed a green suite.
7  GATES       lint · tsc · jest · build · audit:auth · audit:idor · audit-phantom-tables
8  DOGFOOD     the section below. Not optional. Not substitutable by step 7.
```

### Step 8 — the dogfooding recipe

This exists because **every** significant defect found this session was found by
running the app, and **none** was visible to any gate. Broken signup, universal
401s, 163 unreadable relations, a live self-award exploit, a false-green IDOR
audit. 16,599 passing tests saw none of them.

```bash
# 0. Confirm who owns the port. :3000 was held by an unrelated Docker container
#    serving a LibreChat panel, and the first smoke run read its 404s as ours.
lsof -i :3000 || true
npx supabase start && npx supabase db reset     # exits 0 EVEN ON FAILURE — read stdout
npm run dev                                      # note the port it actually binds

# 1. Real user, real token. Not a fixture, not a mock.
#    Supabase issues ES256 via JWKS with the user id in `sub` (RFC 7519).
curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" -H "apikey: $SERVICE_KEY" ...
#    -> if this 500s, signup is broken. That is the bug, not your setup.

# 2. Hit the new endpoint as that user. Assert on the BODY, not just the status.
curl -s "$APP/api/<new-route>" -H "authorization: Bearer $TOKEN"
#    200 with {"data":[]} is a FAILURE if you seeded a row. That is exactly what
#    the anon-client bug looks like: success shape, empty payload, no error.

# 3. Seed a row directly in Postgres, re-request, confirm it comes back.
# 4. Cross-user probe: request user A's resource as user B. MUST be 403/404, never 200.
# 5. Unauthenticated probe: no token. MUST be 401.
# 6. UI: click the actual screen. Screenshot to
#    ~/.claude/screenshots/Fynvita/current/web/. Capture console errors.
# 7. Check the Postgres log for permission-denied and 42P01 — PostgREST swallows
#    plenty into an empty result set.
```

**Evidence required before a module is marked done:** the curl command and its
body for steps 2–5, a screenshot for step 6, and the Postgres log line count for
step 7. "Should work" fails this step by definition.

---

## M3 — Launch gates

Tracked in `docs/deployment/LAUNCH_CHECKLIST.md`, reorganised at `b03edca`.
Gates A–E are **all** M1 preconditions; ordering is **B → A → cohort**, with D
started first because it is owner-gated and has the longest lead time. Gate E
(JWT proven against a real issuer) is new — only the ES256 happy path has been
exercised.

---

## Effort × impact

| | Low effort | Medium | High |
|---|---|---|---|
| **High impact** | R-001 rxjs · R-004 anon client · R-005 backup codes | R-002 vulns · R-003 table taxonomy | M1 triage of 319 · Gate A staging soak |
| **Medium** | Gate B CI wiring | M2 per-module wiring | `src/lib/trading` product decision |
| **Low** | doc drift in CLAUDE.md | — | — |

**Critical path:** `R-003 → M1 triage → M2 wiring → Gate B → Gate A → cohort`.

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Wiring a stale restored module silently reverts a security fix | **High** | M2 step 2 is mandatory; `accountability-partners-service.ts` already proved it |
| 68 migrations written for code that should be deleted | High | R-003 is gated on M1 verdicts, never run ahead of them |
| Service role + a forgotten `user_id` filter = cross-user data | **High** | `audit:idor` ratchet blocks new instances (mutation-tested, `6e049cf`) |
| Dogfooding skipped under time pressure | **High** | it is the only step that has ever caught anything; step 7 passing is not evidence for step 8 |
| Hosted schema differs from local | Medium | **unresolved.** Everything verified so far is a local Supabase |
| `pctt_positions` is hit in production | Medium | the one live phantom; resolve in M0 or confirm the path is dead |

---

## What this plan does not cover

- **Mobile.** 0% coverage, not built, not run, no reachability analysis. Wave 9 scope.
- **The hosted staging/production schema.** Never reconciled against migrations.
- **Whether the 264 pre-existing dark modules were ever intended to ship.** That is product archaeology and needs the owner, not the code.
- **Load, performance, accessibility.** Untouched.

---

## Revision History

| Date | Change |
|---|---|
| 2026-08-09 | Created at `6f3b93c`. Scope widened from the 55 restored modules to all 319 unreachable, after reachability measurement showed the restore was 17% of a pre-existing condition. |
