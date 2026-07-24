# npm audit assessment (2026-07-24) — DEFER to a planned dependency upgrade (M2)

Assessed as part of the M1 hardening pass. Conclusion: **the vulnerabilities cannot be safely
remediated at M1** with `npm audit fix` or targeted removals — they require a planned, per-package
dependency-upgrade effort with regression testing. This is the roadmap's M2 gate item; do NOT
force it before beta. Findings below with the evidence for the deferral.

## Web (`/package.json`) — 32 vulns (4 low, 11 moderate, 16 high, 1–2 critical)

- **`npm audit fix` (non-breaking) changes nothing** — every fixable advisory requires a
  major-version (`--force`) bump. Applying `--force` on a financial app at M1 is out of scope
  (breaking changes to auth/image/build deps).
- **Critical: `next-auth <= 5.0.0-beta.31`** (3 Auth.js advisories: getToken crash on malformed
  Bearer, homoglyph email bypass, OAuth state/nonce/PKCE cookies not provider-bound). `next-auth`
  has **0 references anywhere in `src`** (the app uses Supabase Auth) — it is an unused leftover
  dependency. BUT removing it fails: `npm install` errors with **ERESOLVE** (peer-dependency
  conflict in the tree), so it can't be dropped cleanly without resolving the wider dep graph.
  → Real risk is low (unused), but the removal is a scoped dependency-graph task, not a one-liner.
- **Critical: `sharp` → libvips** (CVE-2026-33327/33328/35590/35591). `sharp` is a build/image dep;
  the fix is a major `sharp` bump — verify the asset pipeline (`scripts/assets/*`) after.

## Mobile (`mobile-app/package.json`) — 32 vulns (1 low, 21 moderate, 8 high, 2 critical)

- `npm audit fix` (non-breaking) DOES reduce these to **20 moderate** (both criticals + all 8 highs
  cleared) and `tsc` stays 0 — but it **breaks 32 mobile tests** (`src/components/__tests__/components.test.tsx`).
  So the fix is not shippable as-is; the bumped dep changes behavior the tests rely on.
  → Needs a per-package upgrade + test reconciliation, not a blanket `audit fix`.

## Recommendation (M2 dependency-upgrade task)

1. Web: resolve the ERESOLVE tree so the unused `next-auth` (+ its `nodemailer` transitive) can be
   dropped; bump `sharp` and re-verify the asset pipeline; assess the remaining 16 highs per-package.
2. Mobile: apply `npm audit fix`, then triage the 32 `components.test.tsx` failures (fix the tests
   or the code the bump changed) before committing the lockfile.
3. Do NOT `npm audit fix --force` blindly on either app.

No lockfile changes were shipped from this pass (both reverted; repo state clean, gates green).
