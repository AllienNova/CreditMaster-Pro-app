# Spec — MFA enforcement and backup-code recovery (R-006 / G-020)

- **Date:** 2026-08-10
- **Status:** Draft for build
- **Supersedes the framing of:** R-006 in `remediation-plan.md`, SF-01 in `security-findings.md`
- **Method:** every claim below was measured against a local Supabase, not recalled.

---

## The finding that reframes this work

I described R-006 to the owner as *"a live defect — a user who loses their TOTP
device is locked out permanently."* **Measurement does not support that**, and a
larger defect sits underneath it.

### 1. Nobody can enrol TOTP today

```toml
# supabase/config.toml:302-304
[auth.mfa.totp]
enroll_enabled = false
verify_enabled = false
```

With enrolment disabled, no user can hold a TOTP factor, so no user can be
locked out of one. The **management UI is genuinely broken and user-visible**
(`/settings/security` renders `BackupCodesManagement.tsx`, whose every call fails
— see §2), but the permanent-lockout scenario requires a factor nobody can
create. Corrected.

> The hosted project's MFA setting lives in the Supabase dashboard, not in this
> file, and cannot be read from the repo. If it is enabled hosted, §3 below is
> live in production today.

### 2. Every backup-code call fails, for two independent reasons

| Call | Fails because |
|---|---|
| `generateBackupCodes` → `INSERT backup_codes` | `backup_codes` has `ENABLE ROW LEVEL SECURITY` (`20260516000001:30`) and **zero `CREATE POLICY` statements anywhere in 103 migrations** |
| `getRemainingCodesCount`, `getBackupCodes` → `SELECT` | same |
| `verifyBackupCode` → `rpc("redeem_backup_code")` | `REVOKE EXECUTE … FROM PUBLIC; GRANT … TO service_role` (`:67-68`), and the caller is the **browser** client |

The migration's own comment says the RPC "is only invoked from server-side
service code" (`:66`). `backup-codes.ts:110` invokes it from the browser. Design
intent and implementation diverged; the grant is correct and the caller is wrong.

### 3. MFA is decorative — `withAuth` accepts a session that has not completed it

Measured end to end against local Supabase (TOTP temporarily enabled, then
reverted):

```
signInWithPassword (user HAS an enrolled TOTP factor)
  session returned : true
  JWT aal claim    : aal1
  getUser()        : succeeds
  currentLevel     : aal1   nextLevel: aal2
```

That `aal1` token was then presented to live routes:

```
/api/financial/budgets  -> HTTP 200
/api/notifications      -> HTTP 200
/api/privacy/export     -> HTTP 200   ← full GDPR data export
```

`grep -rn "\baal\b" src/lib/auth/*.ts src/middleware.ts` returns **nothing**. No
guard anywhere inspects assurance level.

**So a user who enrols TOTP gains no protection.** An attacker with only the
password reaches every authenticated route, including a complete export of the
user's financial data. This is filed as **G-020**.

### Why this ordering matters

Building backup-code recovery while `aal1` is universally accepted would be
building a fire escape for a building with no locked doors. **G-020 must land
with R-006, or R-006 has no purpose**: a "locked out" user could simply use their
password.

---

## Requirements (MoSCoW)

### MUST

| ID | Requirement |
|---|---|
| FR-001 | A session at `aal1` whose user has ≥1 verified MFA factor MUST be rejected by `withAuth`/`withRole` with **403** and a machine-readable `code: "mfa_required"`. |
| FR-002 | A session at `aal1` whose user has **no** verified factor MUST be accepted unchanged. Enforcement is conditional on enrolment, so enabling this cannot lock out users who never opted in. |
| FR-003 | The backup-code redemption endpoint MUST be reachable at `aal1` — it is the recovery path for exactly that state — and MUST be exempt from FR-001. |
| FR-004 | Backup codes MUST be generated **server-side** and returned to the client exactly once, at generation. |
| FR-005 | Codes MUST carry ≥128 bits of entropy. Current: `crypto.randomBytes(4)` = **32 bits** (`backup-codes.ts:59`). |
| FR-006 | Codes MUST be stored as a **salted, slow** hash. Current: unsalted single-round SHA-256 (`backup-codes.ts:204`), which is GPU-trivial against a 32-bit input if the table leaks. |
| FR-007 | Redemption MUST be single-use and atomic. The existing `redeem_backup_code` RPC already satisfies this via `FOR UPDATE` — keep it, keep it `service_role`-only. |
| FR-008 | Redemption MUST be rate limited per user with lockout. Reuse `authRateLimiter` (`redis-rate-limiting.ts:173`, 5 per 15 min). |
| FR-009 | Redemption MUST NOT distinguish "unknown code" from "already used" in its response — one message, one status, one timing class. |
| FR-010 | On successful redemption the server MUST unenrol the user's lost factor(s) so the user can re-enrol, and MUST NOT mint or elevate a session itself. |
| FR-011 | Generation MUST require `aal2` (or no enrolled factor). A user at `aal1` MUST NOT be able to mint themselves a fresh set of codes — that would convert password-only access into permanent MFA bypass. |

### SHOULD

| ID | Requirement |
|---|---|
| FR-012 | Remaining-code count SHOULD be visible to the user at `aal2`. |
| FR-013 | Redemption SHOULD write an audit-log entry (actor, timestamp, remaining count). |
| FR-014 | The UI SHOULD warn when ≤2 unused codes remain. |

### WON'T (this slice)

- Enabling TOTP in `config.toml` — a product decision, and hosted config is dashboard-side. Flagged, not taken.
- WebAuthn / phone factors.
- Admin-assisted recovery for a user who has lost both device and codes.

---

## EARS acceptance criteria

- **AC-1** — WHEN a request presents a valid token with `aal: "aal1"` AND the user has ≥1 verified factor, THE SYSTEM SHALL respond `403 {"error":"mfa_required"}`.
- **AC-2** — WHEN a request presents a valid token with `aal: "aal1"` AND the user has no verified factor, THE SYSTEM SHALL process the request normally.
- **AC-3** — WHEN a request presents a valid token with `aal: "aal2"`, THE SYSTEM SHALL process the request normally.
- **AC-4** — WHILE a user is at `aal1` with a verified factor, THE SYSTEM SHALL accept a request to the redemption endpoint.
- **AC-5** — WHEN a correct, unused backup code is redeemed, THE SYSTEM SHALL mark it used, unenrol the user's verified TOTP factors, and return success.
- **AC-6** — WHEN the same code is redeemed twice concurrently, THE SYSTEM SHALL succeed exactly once.
- **AC-7** — WHEN an incorrect code is submitted, THE SYSTEM SHALL return the same status and body as for an already-used code.
- **AC-8** — WHEN more than 5 redemption attempts occur for one user within 15 minutes, THE SYSTEM SHALL respond `429` and SHALL NOT evaluate the code.
- **AC-9** — WHEN codes are generated, THE SYSTEM SHALL return plaintext exactly once and SHALL persist only a salted slow hash.
- **AC-10** — WHEN a user at `aal1` requests code generation, THE SYSTEM SHALL respond `403`.
- **AC-11** — WHEN `EMAIL`-style enumeration is attempted by timing, THE SYSTEM SHALL perform hash verification even for an unknown code so the response time does not reveal existence. *(hypothesis: verified by test, not by clock measurement — timing equivalence under Jest is not a real-world guarantee)*

---

## Threat model

| Threat | Mitigation | AC |
|---|---|---|
| Password-only attacker reaches authenticated API | Conditional `aal2` enforcement | AC-1 |
| Attacker at `aal1` mints fresh backup codes to bypass MFA permanently | Generation requires `aal2` | AC-10 |
| Brute force of a 32-bit code | ≥128-bit codes + rate limit + lockout | AC-8, AC-9 |
| Offline cracking after table disclosure | Salted slow hash | AC-9 |
| Code replay under concurrency | Existing atomic `FOR UPDATE` RPC | AC-6 |
| Enumeration of valid codes | Uniform response and timing class | AC-7, AC-11 |
| Enforcement locks out users who never enrolled | Conditional on verified-factor presence | AC-2 |

**Residual, stated rather than hidden:** `RedisRateLimiter` falls back to an
in-process store when Upstash is unconfigured (`redis-cache-service.ts`), so on
serverless the limit is per-instance. AC-8 is only as strong as the Redis
deployment behind it. Recorded, not silently accepted.

---

## Out of scope / unverified

- Hosted MFA configuration — unreadable from the repo.
- Whether Supabase offers native backup codes, and whether the admin API can unenrol a factor server-side. Research was dispatched and did not return in time; **FR-010's mechanism must be confirmed against the official API before implementation** (rule 11). If no admin unenrol exists, FR-010 changes shape and this spec needs a revision, not a workaround.

---

## Revision History

| Date | Change |
|---|---|
| 2026-08-10 | Created. Corrects the R-006 framing (TOTP enrolment is disabled, so the lockout scenario is not currently reachable) and adds G-020, measured: `aal1` tokens are accepted by every guarded route including `/api/privacy/export`. |
