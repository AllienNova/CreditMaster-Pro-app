# Wave 1 Integration Verification (Gate C)

**Date:** 2026-04-16
**Branch:** feat/asset-system-regen
**Last commit:** 70316b8

## What shipped in Wave 1

- Phase 0 pipeline (deps, dirs, style-ref, generation CLI)
- Logo concepts generated + Gate B lock (v03 horizontal)
- Logo system v1 (7 PNG variants in assets/production/logo/ + SVG variants)
- App icon set (web + iOS + Android + PWA) in assets/production/app-icons/
- Expo mobile-app icon + splash refresh
- BrandMark React component (`src/components/brand/BrandMark.tsx`) + asset registry
- 5 replace-in-place logo swaps: Header, LoginForm, SignUpForm, ResetPasswordForm, layout.tsx metadata
- Brand assets deployed to `public/brand/` (fynvita-mark.png, horizontal variants)
- PWA manifest (`public/manifest.webmanifest`) with icons array
- favicon.ico (15KB) at `public/favicon.ico`

## Verification results

| Gate | Status | Notes |
|---|---|---|
| Type check | PASS | 0 errors (38 pre-existing Zod v4 errors fixed in same session — see fixes below) |
| Lint | PASS | 0 errors, 368 warnings (all pre-existing, no new warnings from Wave 1) |
| Tests | PASS | 13,629/13,648 passing, 19 skipped (baseline was 13,585 — +44 new tests from Wave 1 components) |
| Build | PASS | 438 routes, compiled successfully, 556 kB first load JS |
| Security audit | PASS | 0 high/critical vulnerabilities (4 low/moderate, all pre-existing: nodemailer/next-auth) |
| Proof of life | PASS | `/` HTTP 200 (394 KB), `/favicon.ico` HTTP 200 (15 KB), `/brand/fynvita-mark.png` HTTP 200 (810 KB), `/manifest.webmanifest` HTTP 200 (676 B) |
| Visual QA | PASS | 4 screenshots captured — see paths below |

## Visual QA observations

- **Homepage desktop (1280×720):** BrandMark renders in nav (green heart + Fynvita wordmark). Layout, typography, and brand color (#00B8A9 teal/green) consistent.
- **Homepage mobile (375×812):** BrandMark renders correctly at mobile breakpoint. Hamburger menu present.
- **Login page (1280×720):** BrandMark mark + wordmark centered above "Welcome Back" form. Visual weight appropriate.
- **Signup page (1280×720):** BrandMark mark + wordmark centered above "Start Your Journey" form. Identical treatment to login. Visual consistency confirmed.

Screenshots captured at:
- `/tmp/wave1-screens/homepage-desktop.png`
- `/tmp/wave1-screens/homepage-mobile.png`
- `/tmp/wave1-screens/login-desktop.png` (via `/auth/login` redirect)
- `/tmp/wave1-screens/signup-auth-desktop.png` (at `/auth/signup`)

## Fixes applied during Gate C verification

### Zod v4 migration (commit 70316b8)
31 files edited. All changes were mechanical renames — no logic changes:

1. `ZodError.errors` → `ZodError.issues` — 31 occurrences across 29 API route files
2. `z.record(Type)` → `z.record(z.string(), Type)` — 5 occurrences in 2 investment types files (Zod v4 requires explicit key schema)
3. `z.enum([...], { errorMap: ... })` → `z.enum([...], "message")` — 1 occurrence in financial/insights route (Zod v4 dropped `errorMap` option on enum)

## Known issues / Gate C flags

- **`/signup` route is 404.** Pre-existing — the signup page has always lived at `/auth/signup`. The `/login` redirect to `/auth/login` exists but no equivalent redirect for `/signup`. Not a Wave 1 regression (Wave 1 modified `SignUpForm.tsx` component, not routing). Low priority, but worth noting for SEO/UX.
- **mark PNG is 810 KB** (served from `/brand/fynvita-mark.png`). No image optimization applied since it's in `public/brand/` not `public/` root. Acceptable for current use (only used in OG/social meta), but should be optimized before launch.
- **MCP screenshot_web tool unavailable** — requires global `playwright` install which is missing. Worked around using project-local playwright. Screenshots are in `/tmp/wave1-screens/` (not committed — ephemeral).
- **4 low/moderate npm vulns** (nodemailer ≤8.0.4, next-auth): fixing requires `--force` (breaking change to nodemailer 8.0.5). Pre-existing, not Wave 1 regressions. Deferred to separate chore.
- **368 lint warnings** — all pre-existing (`no-explicit-any`, `no-unused-vars`, `display-name`). No new warnings introduced by Wave 1.

## Outstanding cleanup before Wave 2

- Add `/signup` → `/auth/signup` redirect in `next.config.ts` (low priority, not blocking)
- Compress `/public/brand/fynvita-mark.png` — 810 KB is oversized for a web asset (target <100 KB)
- Decide whether to persist Wave 1 screenshots to `docs/brand/screenshots/` or keep ephemeral
- `assets/production/logo/` SVG files are untracked (`git status` shows `??`) — stage them if they should be committed to the repo

## Recommendation

Gate C: APPROVED — proceed to Wave 2 (illustrations + empty states).

All quality gates pass. Type check is clean (0 errors). Build succeeds at 438 routes. Tests at 13,629 passing with no regressions. Brand assets serve correctly. BrandMark renders consistently across desktop nav, mobile nav, login, and signup. The noted issues are pre-existing or minor post-launch cleanup items, none of which block Wave 2 work.
