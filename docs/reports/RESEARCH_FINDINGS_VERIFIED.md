# Research Findings - Verified

Notes:
- Counts are from `rg` exact string matches in `src` unless noted.
- "/login" counts exclude "/auth/login" by matching `"/login"` exactly.

## 1) Canonical Auth Entrypoint: /login vs /auth/login

Status:
- `/auth/login` is the redirect target used by middleware on auth failure.
- `/login` still exists as a standalone page with inline Supabase auth.

Evidence:
- Middleware redirect: `src/middleware.ts` uses `/auth/login`.
- `/auth/login` page uses `LoginForm` with OAuth (`signInWithOAuth`).
- `/login` page is a legacy inline email/password implementation.

Usage counts (exact string matches in `src`):
- `/login`: 38 line matches.
- `/auth/login`: 8 line matches.

Recommendation:
- Make `/login` a redirect to `/auth/login`.
- Update remaining `/login` references to `/auth/login`.

## 2) Are AI Endpoints Intentionally Public?

Status:
- Mixed. Several AI endpoints enforce auth, but the chat routes do not.
- Chat routes explicitly mention TODOs and use `x-user-id` or `user_mock`.

Unauthenticated:
- `src/app/api/ai/chat/route.ts`
- `src/app/api/ai/chat/message/route.ts`
- `src/app/api/ai/chat/sessions/route.ts`
- `src/app/api/ai/chat/sessions/[id]/route.ts`

Authenticated examples:
- `src/app/api/ai/insights/route.ts` uses `supabase.auth.getUser()`.
- `src/app/api/ai/spending-analysis/route.ts` uses `supabase.auth.getUser()`.
- `src/app/api/ai/nudges/route.ts` uses `supabase.auth.getUser()`.
- `src/app/api/ai/recommend-strategy/route.ts` uses `jwtValidation`.
- `src/app/api/ai/predict-outcomes/route.ts` uses `jwtValidation`.
- `src/app/api/ai/orchestrate/route.ts` uses `jwtValidation`.
- `src/app/api/ai/financial-coach/*` uses `createServerClient(...).auth.getUser()`.

Verdict:
- Bug / inconsistency, not intentional.

## 3) Canonical User Table: profiles vs users

Status:
- `profiles` is defined in migrations and references `auth.users`.
- No migration creates a `users` table.

References to `users` (8 occurrences across 5 files):
- `src/app/auth/callback/page.tsx`
- `src/lib/auth/auth-service.ts`
- `src/lib/commerce/payments/payment-router.ts`
- `src/lib/commerce/payouts/payout-service.ts`

Verdict:
- `profiles` is canonical. `users` references are bugs.

## 4) CPFI / CreditMaster Branding

Status:
- Legacy CPFI/CreditMaster branding remains across the repo.

Counts:
- `src` files with CPFI/CreditMaster: 91
- CPFI/CreditMaster matches in `src`: 177
- Repo-wide files with CPFI/CreditMaster: 209
- Repo-wide matches: 2377

Evidence:
- CSS variables still use CPFI colors: `src/app/globals.css`.
- Terms page references CPFI throughout: `src/app/terms/page.tsx`.
- Migration headers use CPFI: `supabase/migrations/001_initial_schema.sql`.

Verdict:
- CPFI/CreditMaster is legacy; Fynvita is current branding.

## Summary

| Question | Verified Answer | Action |
|----------|------------------|--------|
| Canonical auth route | `/auth/login` (middleware redirects) | Redirect `/login` to `/auth/login`, update 38 refs |
| AI endpoints public | Inconsistent; chat routes are open | Add auth to `/api/ai/chat/*` |
| Canonical user table | `profiles` | Replace `.from('users')` in 5 files |
| CPFI branding | Legacy remnants remain | Plan a rebrand pass (91 files in `src`) |
