# Remediation Plan — wiring the dark code, honestly

- **Date:** 2026-08-09
- **Commit:** `6f3b93c`, branch `fix/restore-from-pre-deletion-state`
- **Inputs:** `gap-analysis.md` · `security-findings.md` · `orphan-module-review.md` · `smoke-test-report.md` · `deleted-feature-audit.md`
- **Scope:** turn dark code into working features, or delete it. Nothing in between.

---

## The premise, corrected

The task began as "the restored modules have no importers — wire them."
Measurement changed the shape of the problem twice:

| Believed | Measured | Command |
|---|---|---|
| ~55 modules orphaned | **312 of 1,507 unreachable** (web only); only **32** came from the restore, **280** predate it | `node scripts/audit-reachability.js` |
| 36 phantom tables fail at runtime today | **0** behind Next.js-reachable code; the 3 that look reachable belong to the Fly.io trading service | `audit-phantom-tables.js --json` × reachability |
| 12 modules on the anon client, 4 of them live cron routes | **8**, all unreachable, all latent | grep on the *import*, not the name |

Both corrections went the same direction: the alarming reading came from
matching **names**, the true reading from following **imports**. That is the
method rule for everything below.

So this is not an outage. It is 312 modules of code that a user cannot reach,
inside a product whose canonical docs describe much of it as shipped. The
deliverable is a decision per module, and **DELETE is a first-class outcome** —
`CLAUDE.md`'s own working agreement #3 says prefer deletion over addition.

---

## Sequencing

```
M0 Prerequisites ──► M1 Triage the 312 ──► M2 Wire (per-module loop) ──► M3 Gates
   (blocking)          (decide, cheap)       (expensive, per module)      (launch)
```

M0 blocks everything. M1 is judgement, not code, and must finish before M2
starts — wiring one module at a time without a decided target set is how 280
modules became dark in the first place.

---

## M0 — Prerequisites (blocking, small, do first)

| ID | Task | Closes | Acceptance |
|---|---|---|---|
| R-001 | Add `rxjs` to `package.json` as a direct dependency | G-007 | `npm ls rxjs` shows it at top level; build green after `rm -rf node_modules && npm ci` |
| R-002 | Upgrade the 18 production-dependency vulns, starting with the `next-auth` critical | G-008 | `npm audit --omit=dev` reports 0 critical, 0 high |
| R-003a | Decide the 4 tables whose verdict does not depend on M1 (`user_backup_codes`, `holdings`, `portfolios`, `bank_accounts`) | G-002 | a decision row for each, signed off. Owner: **unassigned — needs a name** |
| R-003b | Decide the remaining 63 phantom tables | G-002 | **runs AFTER M1**, not in M0 — each verdict depends on its caller's. No table is created before its caller's verdict is WIRE |
| R-004 | Convert the 8 anon-client modules to service-role + explicit `user_id` scoping | G-003 | `grep -rl 'from "@/lib/supabase/client"' src/lib` returns only `client.ts` consumers that are genuinely browser-side |
| R-005 | Collapse the two backup-code implementations into one | G-009 | one module, one table, `user_backup_codes` gone |
| **R-007** | **Make `/api/health` actually check something** | G-012 | each probe performs real work; with Supabase stopped, `/api/health` returns 503 and `?type=ready` returns `ready:false`. Proven by stopping the dependency, not by reading the code. |
| **R-006** | **Fix backup-code MFA recovery — it is broken in LIVE code** | SF-01 | ALL of: (a) a user who loses their TOTP device completes recovery, proven end to end by the M2 step-8 recipe; (b) codes are **≥128-bit** — today they are `crypto.randomBytes(4)`, i.e. **32 bits** (`backup-codes.ts:58`); (c) a **rate limit + lockout** on the redemption endpoint, with a test that proves it trips; (d) codes stored hashed, plaintext returned exactly once |

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

**Do not trade a fail-CLOSED defect for a fail-OPEN one.** Backup codes are
`crypto.randomBytes(4)` — **32 bits** (`backup-codes.ts:58`) — and the module
has no rate limiting (`grep -niE "ratelimit|throttle|attempts"` returns
nothing). "Recovery works" as the sole acceptance criterion would ship a
brute-forceable credential endpoint, which is strictly worse than today's
lockout. Widen the codes and rate-limit the endpoint in the same change.

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
| `user_backup_codes` | **DELETE-CALLER** (was wrongly "REMAP") | one-row-per-user `{user_id, codes: JSON[], updated_at}` vs one-row-per-code `{id, user_id, code TEXT, used, ...}`. Not compatible; the upsert has no unique constraint to conflict against. `mfa-service` is the orphaned duplicate — R-005 deletes it. |
| `holdings` | **DELETE-CALLER** (was wrongly "REMAP") | shape matches `investment_holdings`, but its only non-test caller is DO-NOT-WIRE |
| `portfolios` | **DELETE-CALLER** | 4 non-test sites, all in `PortfolioRebalanceService.ts`, which is unreachable and whose sole importer is `AutoRebalanceScheduler` (DO-NOT-WIRE). An earlier revision said REMAP, contradicting the rule applied to `holdings` in the row above. |
| `bank_accounts` | **CREATE** | `bank_connections` is connection-level (`item_id`, `institution_id`, `provider`); it has **no** account-level columns. The names rhyme, the schemas do not. Remapping on name would have pointed account queries at connection rows. |
| remaining 64 | one row each | most sit behind code whose M1 verdict may be DELETE, in which case the answer is DELETE-CALLER and no migration at all |

---

## M1 — Triage all 312 unreachable modules

Not just the 32 restored ones. Output is one verdict per module, recorded in
`orphan-module-review.md`:

| Verdict | Meaning | Next step |
|---|---|---|
| `WIRE-NOW` | reachable target exists, no phantom tables, not stale | M2 |
| `WIRE-AFTER-TABLES` | needs migrations first | M2, after R-003 |
| `FIX-FIRST` | has a named defect | fix, then M2 |
| `DELETE` | superseded, speculative, or duplicates a live module | **OWNER APPROVAL REQUIRED per batch — never autonomous.** Route to a human queue, record the approval in `orphan-module-review.md`, then delete in a standalone commit |
| `DO-NOT-WIRE` | would reintroduce a closed finding or fabricate data | leave dark, record why |
| `JEST-INFRA` | `__mocks__`, `setupTests` | exempt |

### Verdicts already returned (`orphan-module-review.md`)

| Verdict | Count |
|---|---:|
| `WIRE-NOW` | 38 |
| `DO-NOT-WIRE` | 18 |
| `JEST-INFRA` | 3 |
| **Total reviewed** | **59** |

(An earlier revision of this table read 38 / 21 / 3 / 1 = 63. That did not
reconcile with its own source: a mechanical count of the `orphan-module-review.md`
table gives 59, and that document carries a section headed "No pure
WIRE-AFTER-TABLES cases". The inflated figures were mine, not the reviewer's.)

**Four modules are DO-NOT-WIRE for fabricated money movement.** Each writes a
row asserting a transfer, contribution, donation, or trade happened, with no
call to any payment, banking, or brokerage rail — and each carries an in-code
comment admitting it:

| Module | What it fabricates |
|---|---|
| `auto-save-rules-service.ts:475-506` | sets `save_transfers.status = "completed"` and increments rule stats; no banking call in the file |
| `ContributionSchedulerService.ts:627-639` | `executeTransfer()` voids all three arguments and returns `true` unconditionally |
| `commitment-device-service.ts:399-423` | writes `consequence_executed: true` plus a `commitment_donations` row naming a real charity and a dollar amount |
| `AutoRebalanceScheduler.ts:425-493` | invents `orderId`, `executedPrice`, `commission`; returns `success: true` |

Two of these are worse than "writes to a phantom table and 500s":

- **`ContributionSchedulerService`** feeds `completeContribution()`, which
  increments **`financial_goals.current_amount` — a real, live, user-facing
  table.** Missing schema does not block it. Wiring it as-is moves a real
  progress bar with money that never moved.
- **`commitment-device-service`** tells a user that a named charity received a
  donation in their name when nothing was sent.

This is the same class as FND-016/017 (fake Visa 4242) and DEFAB-2 (fabricated
credit scores), both of which were closed by deletion. Treatment is the
achievements precedent: gate the path (501 / flag) until the real integration
exists. `success: true` must never ship without a real downstream call.

> **DELETE is not an autonomous verdict.** The owner has already overruled
> exactly this call once — `8e5481d` is titled *"reactivate 55 services deleted
> as 'dead code' — they were another session's work"*. A plan that lets an agent
> delete 312 modules on its own judgement re-enacts that incident at nine times
> the scale, and it breaches the standing hard limit against deleting files the
> user did not ask to be created. Autonomous verdicts are capped at
> `WIRE-NOW` / `WIRE-AFTER-TABLES` / `DO-NOT-WIRE` / `FIX-FIRST` / `JEST-INFRA`.
> Every DELETE waits for a named human approval, per batch, recorded in writing.

Two hard constraints on this pass:

1. **Staleness check — but only for the 11 modules it applies to.** The stale-copy
   risk comes from `backup/pre-wipe-2026-08-05`, which branched at `cd8fc21` on
   2026-05-16, so any main-line fix between then and the deletion is absent from
   the restored copy. Scoped by `git log`, **only 11 of the 59 reviewed modules
   went through that delete-then-restore cycle**; the other 48 have continuous
   main-line history and were never touched by the backup branch. Of the 11, two
   actually lost a fix — `accountability-partners-service.ts` and
   `commitment-device-service.ts`, both an IDOR check — and both are already
   repaired in `b1e993a`. So this constraint applies to 19% of the set, not all
   of it, and its known instances are closed. Still diff those 11 against their
   pre-deletion blobs rather than the backup.
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

```bash
./scripts/dogfood.sh /api/financial/budgets --port 3001
```

This is a committed script, not a checklist, because the checklist version was
not runnable — `$TOKEN`, `$APP` and `$SERVICE_KEY` were defined nowhere, step 1
returned a user object rather than an access token, and the cross-user probe
needed a second user that no step created. A recipe an engineer cannot paste is
a recipe that gets skipped, which is the exact failure mode it exists to prevent.

It creates **two real users**, mints **real ES256 access tokens** via the
password grant, and asserts:

| Step | Assertion |
|---|---|
| 0 | local Supabase up; app answering; **app's Supabase URL, anon key and service-role key all match the one minting tokens** |
| 1 | two users created; token `alg` printed |
| 2 | authenticated request 2xx — and warns when the body is an empty collection, the signature of the anon-client bug |
| 3 | unauthenticated request is 401/403/307 |
| 4 | user B's response does not contain user A's id |
| 5 | Postgres log carries no `42P01` / `42501` / permission-denied |

Verified end to end on `/api/financial/budgets`:

```
2. authenticated request as user A   HTTP 200 {"success":true,"data":[],"count":0}
3. unauthenticated request           HTTP 401
4. cross-user probe                  no leakage of user A's id
5. postgres errors                   none
=== PASS
```

The env checks in step 0 are not defensive padding — both were earned during
that run. Pointing `NEXT_PUBLIC_SUPABASE_URL` at a hosted project while minting
tokens locally 401s every request on an unknown JWKS `kid` and looks exactly
like a broken auth guard. Swapping only the URL and anon key, leaving a hosted
`SUPABASE_SERVICE_ROLE_KEY`, produces a 500 `No suitable key or wrong key type`
from inside the handler instead. Three restarts to find; one line to detect.

**Still owed by hand**, and the script says so on exit rather than implying
coverage it lacks: seed a row for user A and confirm it comes back, and click
the real screen with a screenshot to
`~/.claude/screenshots/Fynvita/current/web/`.

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
| **High impact** | R-001 rxjs · R-004 anon client · R-005 backup codes | R-002 vulns · R-003 table taxonomy | M1 triage of 312 · Gate A staging soak |
| **Medium** | Gate B CI wiring | M2 per-module wiring | `src/lib/trading` product decision |
| **Low** | doc drift in CLAUDE.md | — | — |

**Critical path:** `R-003a → M1 triage → R-003b → M2 wiring → Gate B → Gate A → cohort`.

### Sizing and owners

Deliberately coarse. Two things get numbers because getting them wrong changes
the plan; the rest do not, and inventing precision would be theatre.

| Item | Size | Owner | Date |
|---|---|---|---|
| M2 wiring | **38 modules × an 8-step loop.** Order of magnitude: tens of hours, not hours. This is the plan's top risk — "dogfooding skipped under time pressure" — and an unsized M2 is exactly how that happens. Batch it and re-scope after the first 5. | — | — |
| Hosted-schema reconciliation | one run of the local procedure against staging + prod | **unassigned** | **needs a date** |
| Trading product decision (72 → now 65 unreachable modules; is PCTT M1 scope?) | one decision, blocks triaging 65 modules individually | **owner only** | **needs a date** |
| FND-026 SEC sign-off | one sign-off | **owner only** | **needs a date** |
| Mobile reachability walker | new script; `audit-reachability.js` never walks `mobile-app/` | **unassigned** | Wave 9 |

Ownerless open items are how Gate C rotted — two of its five boxes sat unowned
for months. These stay listed as unassigned rather than being quietly assigned
to nobody.

An earlier revision put R-003 in M0 as "blocking, do first" while its own
acceptance criterion required M1 verdicts — a milestone depending on the
milestone it blocks. Splitting it removes the cycle: the 4 tables that can be
decided from schema alone are M0; the other 64 wait for their callers.

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Wiring a stale restored module silently reverts a security fix | **High** | M2 step 2 is mandatory; `accountability-partners-service.ts` already proved it |
| 68 migrations written for code that should be deleted | High | R-003 is gated on M1 verdicts, never run ahead of them |
| Service role + a forgotten `user_id` filter = cross-user data | **High** | `audit:idor` ratchet blocks new instances (mutation-tested, `6e049cf`) |
| Dogfooding skipped under time pressure | **High** | it is the only step that has ever caught anything; step 7 passing is not evidence for step 8 |
| Hosted schema differs from local | Medium | **unresolved.** Everything verified so far is a local Supabase |
| ~~`pctt_positions` is hit in production~~ | — | **Resolved.** Not a Next.js table: its three call sites are constructed only from `src/lib/trading/autonomous/`, a separate Fly.io deployment with its own `fly.toml` and Supabase project (`pctt-trading-service.ts:808-816`). No migration in this repo. Whether that service is deployed is an infrastructure question the repo cannot answer. |
| Reachability is measured per FILE, not per function | Medium | a module can be reachable while the method querying a phantom table is not. Class C is an upper bound, not a proven zero. |

---

## What this plan does not cover

- **Mobile.** 0% coverage, not built, not run, no reachability analysis. Wave 9 scope.
- **The hosted staging/production schema.** Never reconciled against migrations.
- **Whether the 280 pre-existing dark modules were ever intended to ship.** That is product archaeology and needs the owner, not the code.
- **Load, performance, accessibility.** Untouched.

---

## Revision History

| Date | Change |
|---|---|
| 2026-08-09 | Created at `6f3b93c`. Scope widened from the 55 restored modules to all 319 unreachable, after reachability measurement showed the restore was 17% of a pre-existing condition. |
