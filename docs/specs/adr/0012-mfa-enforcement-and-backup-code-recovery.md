# ADR-0012 — Conditional AAL2 enforcement and server-authoritative backup codes

- **Status:** Accepted
- **Date:** 2026-08-10
- **Spec:** `docs/specs/r006-mfa-recovery.spec.md`
- **Closes:** G-020 (MFA not enforced), R-006 / SF-01 (backup-code recovery non-functional)

## Context

Measured against a local Supabase, not recalled:

1. `withAuth` accepts an `aal1` token from a user who has a verified TOTP factor.
   `/api/financial/budgets`, `/api/notifications` and `/api/privacy/export` all
   returned **200** to such a token. No guard inspects assurance level anywhere
   (`grep -rn "\baal\b" src/lib/auth/*.ts src/middleware.ts` → nothing).
2. `backup_codes` has RLS enabled with **zero policies**, and
   `redeem_backup_code` is `service_role`-only — while `backup-codes.ts` calls
   both from the **browser**. Every backup-code operation fails.
3. TOTP enrolment is disabled in `supabase/config.toml:302-304`, so (1) is
   latent locally. Hosted configuration is dashboard-side and unreadable here.

## Decisions

### D1 — Enforcement is conditional on enrolment, not global

Reject `aal1` **only** when the user has ≥1 verified factor. A user who never
enrolled is unaffected.

Rejected: enforcing `aal2` globally. It would lock out every existing user the
moment it shipped, and MFA is opt-in. Rejected: enforcing per-route via an
allowlist — the same `PUBLIC_ROUTES.ts` drift that produced FND-001, in a second
place.

### D2 — The has-a-factor check is a `SECURITY DEFINER` RPC, not an admin API call

`auth.mfa_factors` lives in the `auth` schema, which PostgREST does not expose.
`admin.mfa.listFactors()` would work but costs an HTTP round-trip to GoTrue on
**every guarded request**.

So: `public.user_has_verified_mfa(uuid) RETURNS boolean`, `SECURITY DEFINER`,
`search_path` pinned, `REVOKE FROM PUBLIC` / `GRANT TO service_role`. `api-guard`
already performs a per-request DB read (`resolveRoleFromDb`), so this adds one
cheap indexed lookup rather than a new class of cost.

Rejected: denormalising `mfa_enabled` onto `profiles`. It is a second source of
truth for a security decision, and it goes stale exactly when it matters — the
FND-005 lesson about trusting a mirrored claim.

### D3 — `backup_codes` keeps zero RLS policies

The instinct on finding "RLS on, no policies" is to add policies. That is the
wrong fix here. Once generation and redemption are server-side, the only reader
is `service_role`, which bypasses RLS. **Deny-all is the correct posture** and
adding `authenticated` policies would re-open browser access to a credential
table.

The defect was never the missing policy. It was the browser being the caller.

### D4 — Codes are generated server-side, ≥128-bit, salted-and-slow hashed

`crypto.randomBytes(4)` (32 bits) → `randomBytes(16)` (128 bits), base32-encoded
in grouped form for transcription. Unsalted single-round SHA-256 →
`scrypt` with a per-code random salt, stored `scrypt$N$r$p$salt$hash`.

Rejected: bcrypt/argon2 — both are already-absent dependencies, and `scrypt` is
in Node core (`crypto.scrypt`), so this adds no supply-chain surface to an auth
path. Given ≥128-bit codes the KDF is defence in depth against table disclosure
rather than the primary control.

### D5 — Redemption unenrols the factor; it never mints or elevates a session

On success the server calls `auth.admin.mfa.deleteFactor({ id, userId })` for
each verified factor. Per the installed typings
(`@supabase/auth-js/lib/types.d.ts:1087-1094`) this *"will log the user out of
all active sessions if the deleted factor was verified"*. The user then signs in
with their password; having no factor, D1's enforcement does not apply, and they
are prompted to re-enrol.

Rejected: server-side session elevation to `aal2`. There is no supported API for
it, and forging one would mean minting tokens outside GoTrue.

**Risk, recorded:** `deleteFactor` is marked `@experimental` in the installed
typings. If its signature changes, recovery breaks. Pinned by an integration test
against a real local Supabase rather than a mock, so an upgrade fails loudly.

### D6 — Generation requires `aal2`; redemption is the sole `aal1` exemption

Otherwise a password-only attacker mints a fresh set of codes and converts
temporary access into permanent MFA bypass. The redemption endpoint is the one
exemption, because it exists precisely to serve `aal1`.

## Consequences

- One extra indexed DB read per guarded request for users with factors.
- Existing stored codes become unverifiable (hash format change). Acceptable: no
  code has ever been successfully generated — every write path has been failing
  since the table was created.
- `backup-codes.ts` stops being browser-callable. `BackupCodesManagement.tsx`
  moves to `fetch` against the new routes.
- Enabling TOTP in config remains a **product decision** and is not taken here.
  Until it is, D1 is dormant for all users.

## Revisit triggers

- Supabase ships native backup/recovery codes → delete this and adopt them.
- `deleteFactor` leaves `@experimental`, or its signature changes.
- MFA becomes mandatory rather than opt-in → D1's conditional becomes global and
  needs a migration plan for un-enrolled users.
