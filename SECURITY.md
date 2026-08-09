# Security Policy

Wave 7 (Security & Correctness Remediation) operational security reference — TASK-PRE-04.

## Reporting a vulnerability

Report suspected vulnerabilities privately to the security owner (see `.github/CODEOWNERS`).
Do not open a public issue or PR describing an exploitable flaw. Include: affected route/module,
reproduction, impact, and any PoC. Pre-launch there are no live users, so there is no external
disclosure obligation today — re-evaluate at public launch (GDPR Art. 33 / CCPA).

## Branch & review policy

- Remediation work lands on `remediation/wave-7-*` branches and merges via PR (never direct to
  `main`). Security-critical paths (`.github/CODEOWNERS`) require a security-owner review.
- `main` branch protection (require PR + 1 review + CODEOWNERS) is a GitHub repo setting and must
  be enabled by a maintainer — it is not enforceable from the codebase alone.

## Feature-flag kill switches

Backed by the `feature_flags` table (`supabase/migrations/*_feature_flags.sql`), read only via the
service-role client. A misconfigured `SUPABASE_SERVICE_ROLE_KEY` fails loudly at boot
(`src/lib/flags/assert-reachable.ts`) rather than silently defaulting flags off.

| Flag | Default | Effect |
|------|---------|--------|
| `auth.deny_by_default` | `false` | When `true`, `src/middleware.ts` denies any `/api/*` not in `PUBLIC_ROUTES` as a defense-in-depth backstop. **Per-route `withAuth`/`withRole` guards enforce regardless of this flag** — it is a safe-rollout switch for the middleware layer, not the sole enforcement. |
| `webhooks.enabled` | `true` | Kill switch for inbound webhook processing. |
| `payouts.enabled` | `true` | Kill switch for payout processing. |

## Deny-by-default rollout (AUTH-04-staging — hard sub-gate)

Before flipping `auth.deny_by_default` to `true` in production:
1. Deploy the branch to staging with the flag ON.
2. Run synthetic monitoring for 24h (green) across every webhook (Stripe, Plaid, Affiliate),
   plus signup, login, and OAuth callbacks.
3. Security-owner sign-off on `src/lib/auth/PUBLIC_ROUTES.ts` (a missing entry — e.g. a webhook —
   would be silently 401'd once the flag flips).
4. Flip the production flag. Kill switch: set the flag back to `false` to restore allow-through at
   the middleware layer (per-route guards remain active).

## Authorization model (AUTH-01)

Identity comes from the verified JWT (`user.id`); the **role is resolved fresh from the `profiles`
table on every request** (`src/lib/auth/resolve-role.ts`) — JWT/`user_metadata`/`app_metadata`
role claims are never trusted for authorization. A per-`userId` 15s cache bounds a role demotion's
propagation to ≤15s (strictly better than the prior ~1h token-expiry staleness). Accept this
tradeoff or shorten the TTL for higher-sensitivity deployments.

## Per-phase rollback playbook

- **Code**: `git revert <commit>` the offending remediation commit; each is independently
  revertable. Re-run the verification suite (`lint`, `type-check`, `test`, `build`, `audit:auth`,
  `test:auth-negative`, `test:coverage:changed`) before redeploying.
- **Auth backstop**: set `auth.deny_by_default` → `false` (immediate, no deploy).
- **Webhooks / payouts**: set `webhooks.enabled` / `payouts.enabled` → `false`.
- **Migrations**: forward-only; each has a documented down path or is backwards-compatible.
  Roll back the app first, then the schema, never the reverse.

## Large artifacts / chunked push

Do not commit large binaries (the 24MB trading zip was removed in TASK-PRE-06). If a large push is
unavoidable, chunk commits and push incrementally. A git-history purge of already-committed blobs
rewrites shared history and requires a separate maintainer decision — do not run `git filter-repo`
unprompted.
