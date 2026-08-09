# Mobile Vertical Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development — ONE task per subagent, hard stop, two-stage review between tasks. Never batch tasks. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Harden the Expo/React Native mobile app to launch quality — close 5 CRITICAL + 3 HIGH audit findings (a `__DEV__` auth bypass, dependency CVEs, a deprecated-store split-brain, a mock dispute screen + triple route tree, unencrypted biometric storage, `Linking.openURL` injection, unauthenticated `fetch()` calls) without dropping any mobile sub-feature.

**Architecture:** Security + de-mock + correctness vertical scoped entirely to `mobile-app/` (Expo SDK 52, React Native 0.76.9, expo-router file-based routing, Zustand stores, TypeScript). No web-side changes. `mobile-app/` has its own `jest` + `jest-expo` runner — the web suite and web `test:coverage:changed` do NOT cover mobile code.

**Tech Stack:** Expo SDK 52, RN 0.76.9, TypeScript strict, expo-router 4.x, Zustand, `expo-secure-store`, Jest + `jest-expo`.

---

## Pre-state (verified against HEAD `785b789` — `remediation/wave-7-foundation`)

- Branch: `remediation/wave-7-foundation` (Foundation + Payments + Investments + Financial + Credit verticals merged & pushed).
- Mobile app at `mobile-app/` — own `package.json`, `jest.config.js` (`jest-expo`), tsconfig. **20 Zustand stores** in `mobile-app/src/store/` (CLAUDE.md's "8" is stale). The authed API client `mobile-app/src/services/api/client.ts` exposes `api.get/post` and auto-attaches the Supabase bearer token; **its base URL already includes the `/api` suffix** (`getDefaultApiUrl()` → `.../api`). `useDisputeStore` exists with `fetchDisputeById(id)` (`disputeStore.ts:144`).
- **Findings re-verified against HEAD on 2026-05-17** (`gap_analysis.md` FND-064..071) — line numbers and counts corrected from the register where the audit drifted:

| Finding | Sev | Site (verified at HEAD) | Task |
|---|---|---|---|
| FND-064 | CRITICAL | `mobile-app/src/store/authStore.ts:~44-53` — `initialize()` has `if (__DEV__) { set({ isAuthenticated:true, user: seedUser, onboardingCompleted:true }); return; }` | MOB-2 |
| FND-065 | CRITICAL | `mobile-app/` npm audit — `handlebars` JS-injection + ~15 HIGH transitive (`node-forge`, `lodash`, `tar`, `undici`) | MOB-5 |
| FND-066 | CRITICAL | `mobile-app/src/store/syncStore.ts` — offline sync writes to deprecated `financialStore` via `createBudget` (`:244`) / `createGoal` (`:251`); `:231` is the dynamic import | MOB-6 |
| FND-067 | CRITICAL | `mobile-app/src/store/index.ts:220` — `useFinancialStore` deprecated alias; **5 screens** import it | MOB-6 |
| FND-068 | CRITICAL | `mobile-app/app/dispute/[id].tsx` — `setTimeout` mock. **THREE dispute route surfaces** — `app/dispute/` (8 files), `app/disputes/` (5 files), `app/(tabs)/disputes.tsx` (the tab) | MOB-8 |
| FND-069 | HIGH | `mobile-app/src/services/biometrics/biometricService.ts:144,166,169` — biometric-enabled flag in plain `AsyncStorage` | MOB-3 |
| FND-070 | HIGH | **~28 production `Linking.openURL` call sites** (the register's "13" is stale — executor confirms the live count) — API-sourced URLs, no scheme allowlist | MOB-4 |
| FND-071 | HIGH | bare `fetch()` to Fynvita API with no `Authorization` header — **~10 files / 25+ sites** (the register cites only `creditBalanceStore.ts`; the real surface is far larger — see MOB-7) | MOB-7 |

- Task cards: `MASTER-IMPLEMENTATION-PLAN.md` TASK-MOB-W7-01..07 + TASK-MOK-05. MOB-W7-05 (AsyncStorage key normalization) folds into MOB-3.

## Scope

**In scope:** all of `mobile-app/` — the 8 findings above. **Out of scope:** the web app; mobile feature build-out beyond the findings; raising overall mobile coverage beyond this vertical's changed code.

**Deferred (flagged, not silently dropped):** `__DEV__` gates **mock seed-data** in ~6 non-auth stores too (`disputeStore`, `creditStore`, `taxStore`, `gamificationStore`, `notificationStore`, `financialStore` — 141 `__DEV__` occurrences across 24 files). FND-064 is specifically the **auth** bypass; the non-auth `__DEV__` seed paths are a related but separate risk. MOB-1 flags them; a tracked follow-up task owns them. MOB-2 fixes only the auth bypass (the finding). Note: `disputeStore.fetchDisputeById` has NO `__DEV__` short-circuit — so MOB-8's de-mock onto it is genuine.

---

## Task MOB-0: Mobile test/coverage baseline (do this FIRST)

**Files:** none (measurement only) — record results in the MOB-1 inventory doc.

The web `test:coverage:changed` does not cover `mobile-app/`. `mobile-app/jest.config.js` has a `coverageThreshold` (global lines 80, branches 60) plus per-file keys (`dashboardStore.ts` 90/90/90/90, `disputeStore.ts` 40/60/55/55, `syncStore.ts`, `creditStore.ts`, `notificationStore.ts`, `pushNotificationService.ts`). The true baseline is unknown (CLAUDE.md says "0%", the config asserts 80%).

- [ ] **Step 1:** `cd mobile-app && npx jest --coverage 2>&1 | tail -40` at HEAD. Record: pass/fail counts, whether `coverageThreshold` currently passes or fails, and which per-file keys (if any) currently fail. Save this verbatim into the MOB-1 inventory doc as the "Mobile baseline".
- [ ] **Step 2:** This baseline DEFINES the gate. Each task's gate is **"no NEW test failures vs the recorded baseline"** and **"no per-file `coverageThreshold` key regressed"** — not an absolute "0 failures" (if the baseline already fails the global threshold, that is inherited, not the task's regression). New test files added by a task must be green. There is no per-changed-line mobile diff-coverage tool; do not claim one.
- [ ] **Step 3:** No commit (measurement only) — the numbers land in MOB-1's doc.

---

### Task MOB-1: Mobile sub-feature inventory + verify-pass

**Files:** Create `docs/blueprint/mobile-subfeature-inventory.md`

- [ ] **Step 1: Enumerate.** All `mobile-app/app/**` routes (note overlapping segments — esp. the dispute trees); all 20 `mobile-app/src/store/*` stores; `mobile-app/src/services/**`; screens/components. Include the MOB-0 baseline numbers.
- [ ] **Step 2: Verify-pass.** Group into sub-features. For each, judge real-data vs mock. Mark the dispute screen `MOCK` (FND-068). **Also flag** every store with a `__DEV__` seed-data short-circuit as `DEGRADED — __DEV__ mock seed` (disputeStore/creditStore/taxStore/gamificationStore/notificationStore/financialStore). Spot-check ≥12 screens.
- [ ] **Step 3: Write the inventory** — `docs/blueprint/mobile-subfeature-inventory.md`: Sub-feature | Key files | Status. Header explains it is the vertical's before/after evidence; record the MOB-0 baseline; note the deferred non-auth `__DEV__` scope.
- [ ] **Step 4: Commit** — `docs: TASK-MOB-1 mobile inventory + verify-pass + test baseline`.
- [ ] **Step 5: Report** any `MOCK`/`DEGRADED` beyond the 8 findings — especially confirm the non-auth `__DEV__` seed-data list so a follow-up task can be filed.

---

### Task MOB-2: Remove the `__DEV__` auth bypass (FND-064, CRITICAL)

**Files:** Modify `mobile-app/src/store/authStore.ts`; optional `mobile-app/src/dev/DevAuthProvider.tsx`; test.

- [ ] **Step 1: Failing test** — `authStore.initialize()` does NOT set `isAuthenticated:true` from a hardcoded `seedUser`; with no real session the user stays unauthenticated. Mock the Supabase client. (`jest.config.js` sets `__DEV__: false`, so the test exercises the production path — assert the bypass block is simply gone.)
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Fix.** Delete the `if (__DEV__) { … seedUser … }` block. `initialize()` always runs the real Supabase-session path. A dev convenience, if kept, goes in a `DevAuthProvider` NOT imported by `authStore`, opt-in (a dev-menu action, never automatic on `__DEV__`), bundle-excluded from production. **Scope:** this task fixes ONLY the auth bypass; the non-auth `__DEV__` seed paths are the deferred follow-up (see Scope).
- [ ] **Step 4: Run — expect PASS.** `cd mobile-app && npx jest` — no new failures vs MOB-0 baseline. `cd mobile-app && npx tsc --noEmit` — 0 errors.
- [ ] **Step 5: Commit** — `fix: TASK-MOB-W7-06 remove __DEV__ auth bypass (FND-064)`.

---

### Task MOB-3: SecureStore migration + storage-key normalization (FND-069)

**Files:** `mobile-app/src/services/biometrics/biometricService.ts`; a storage-key helper; test.

`biometricService` already imports `SecureStore` and uses it for the auth token — so the plumbing exists; only `isBiometricEnabled`/`setBiometricEnabled` (lines 144/166/169, currently plain `AsyncStorage`, key `@fynvita_biometric_enabled`) need migrating.

- [ ] **Step 1: Audit.** Grep `mobile-app/src/` for `AsyncStorage`. Classify sensitive (biometric flag, push token, auth/session/token keys) vs non-sensitive (UI prefs/cache).
- [ ] **Step 2: Failing tests** — the biometric flag is read/written via `expo-secure-store`, not `AsyncStorage`.
- [ ] **Step 3: Fix.** Migrate sensitive keys to `expo-secure-store`. Provide a one-time AsyncStorage→SecureStore read-fallback so existing users aren't logged out / re-prompted. Normalize keys to `@fynvita/<domain>/<key>`.
- [ ] **Step 4: Run — expect PASS.** Mobile jest no new failures; mobile tsc 0 errors.
- [ ] **Step 5: Commit** — `fix: TASK-MOB-W7-01 secure-store migration for sensitive keys (FND-069)`.

---

### Task MOB-4: `Linking.openURL` scheme allowlist (FND-070, HIGH)

**Files:** New `mobile-app/src/utils/openExternalUrl.ts`; modify every `Linking.openURL` call site (~28 — confirm the live count); test.

- [ ] **Step 1: Failing test** — `openExternalUrl()` rejects `javascript:`, `file:`, `data:` and any scheme not in the allowlist; accepts `https:`, `mailto:`, `tel:` (the call sites legitimately use all three).
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Fix.** Write `openExternalUrl(url)` — parse scheme, allowlist `https:` + `mailto:` + `tel:` only, reject everything else (log + user-facing "cannot open this link"). `grep -rn 'Linking.openURL' mobile-app/src mobile-app/app` — replace EVERY production call site (~28; confirm the count, do not stop at 13). The only surviving raw `Linking.openURL` is the one inside `openExternalUrl` itself.
- [ ] **Step 4: Run — expect PASS.** Mobile jest no new failures; mobile tsc 0 errors.
- [ ] **Step 5: Commit** — `fix: TASK-MOB-W7-02 Linking.openURL scheme allowlist (FND-070)`.

---

### Task MOB-5: Mobile dependency CVEs (FND-065, CRITICAL)

**Files:** `mobile-app/package.json`, `mobile-app/package-lock.json`.

- [ ] **Step 1: Baseline** — `cd mobile-app && npm audit`; capture HIGH/CRITICAL.
- [ ] **Step 2: Fix** — `npm audit fix`; for unfixable transitives add `overrides` pinning the safe version (mirror the web `overrides` pattern). Do NOT `npm audit fix --force` blindly — a forced major can break the Expo build; evaluate per-dep, note any.
- [ ] **Step 3: Verify** — `npm audit` 0 HIGH/CRITICAL (or each remaining one documented). `npx tsc --noEmit` 0 errors. Mobile jest no new failures. Run a bundle smoke check (`npx expo export` or equivalent) — the dep bump must not break the build.
- [ ] **Step 4: Commit** — `fix: TASK-MOB-W7-03 resolve mobile dependency CVEs (FND-065)`.

---

### Task MOB-6: Delete the deprecated `financialStore` (FND-066, FND-067, CRITICAL)

**Files:** `mobile-app/src/store/syncStore.ts`, `mobile-app/src/store/index.ts`; the 5 screen callers; the modular target stores; delete `financialStore.ts`; test files (see Step 5).

- [ ] **Step 1: Map state AND methods.** `grep -rn 'useFinancialStore\|financialStore' mobile-app/src mobile-app/app` — list all importers (5 screens + `syncStore` + test files). For each piece of `financialStore` STATE, identify the modular store it now lives in. For each `financialStore` METHOD `syncStore` calls (`createBudget` at `syncStore.ts:244`, `createGoal` at `:251`) and that the tests use, identify the modular-store equivalent. **If a modular store lacks an equivalent method, MOB-6 adds it** — note that this makes the task larger than an `S`. Also grep `mobile-app/src/services/offline-sync.ts` — if it too writes `financialStore`, include it.
- [ ] **Step 2: Failing tests** — `syncStore`'s offline-write path writes to the modular store(s), not `financialStore`; a representative migrated screen reads the modular store.
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix.** Repoint the writes at `syncStore.ts:244` and `:251` (and any other `financialStore` write) to the modular stores; add modular methods if missing. Migrate the 5 screens. Delete `financialStore.ts` + the `useFinancialStore` alias from `index.ts` once nothing imports them (`grep` to confirm).
- [ ] **Step 5: Handle the test files.** Deleting `financialStore.ts` breaks `mobile-app/src/store/__tests__/financialStore.test.ts`, `mobile-app/src/__tests__/integration/dataSync.test.ts`, and `syncStore.test.ts`'s `jest.mock("../financialStore")`. Per the Test Integrity Rule: migrate still-relevant assertions onto the modular stores' suites; delete `financialStore.test.ts` WITH a documented rationale in the commit (the store it tested is intentionally removed); update `dataSync.test.ts` + the `syncStore.test.ts` mock to the modular stores.
- [ ] **Step 6: Run — expect PASS.** Mobile jest no new failures vs baseline; mobile tsc 0 errors. Per-file `coverageThreshold` keys (`dashboardStore.ts` 90, `syncStore.ts`) not regressed — add proportional tests if a migration adds executable lines to a thresholded file.
- [ ] **Step 7: Commit** — `fix: TASK-MOB-W7-04 delete deprecated financialStore, migrate to modular stores (FND-066, FND-067)`.

---

### Task MOB-7: Authenticated mobile API calls (FND-071, HIGH)

**Files:** ~10 files of bare `fetch()` to the Fynvita API — at minimum `src/store/creditBalanceStore.ts`, `src/hooks/{useCoaching,useOnboardingProgress,useNudges,useOrders,usePositions,useISE}.ts`, `src/components/trading/OrderEntrySheet.tsx`, `src/services/api/{user,credit}.ts`, `src/services/legacyApi.ts`; tests.

The register cites only `creditBalanceStore.ts`, but the real surface is ~10 files / 25+ sites. Leaving them unauthenticated breaks trading/coaching/nudges/onboarding once the deny-by-default web middleware is enforced.

- [ ] **Step 1: Enumerate.** `grep -rn 'fetch(' mobile-app/src/` — list every bare `fetch()` to a Fynvita API route (vs genuine third-party calls — leave those, but confirm each is genuinely third-party). Produce the file·line·endpoint list.
- [ ] **Step 2:** Confirm `client.ts` `api.get/post` and how it sources the bearer token. **`/api` prefix trap:** `client.ts`'s base URL already ends in `/api` — a migrated call `fetch(\`${BASE}/api/credits/balance\`)` becomes `api.get("/credits/balance")`, NOT `api.get("/api/credits/balance")` (that doubles to `/api/api/`). Every migrated endpoint drops the leading `/api`.
- [ ] **Step 3: Failing tests** — a representative client per area (`creditBalanceStore`, a trading hook, a coaching hook) sends `Authorization: Bearer …`.
- [ ] **Step 4: Fix.** Replace every bare `fetch()` to a Fynvita route with `client.ts` `api.get/post()`, dropping the `/api` prefix. `src/services/legacyApi.ts` — if it is dead code, delete it; if live, migrate it. After: `grep -rn 'fetch(' mobile-app/src` shows no bare `fetch` to a Fynvita route, and no `/api/api/`.
- [ ] **Step 5: Run — expect PASS.** Mobile jest no new failures; mobile tsc 0 errors.
- [ ] **Step 6: Commit** — `fix: TASK-MOB-W7-07 authenticated mobile API calls — full bare-fetch sweep (FND-071)`.

> If Step 1's enumeration shows the surface is too large for one clean task, STOP and report — split into MOB-7a (stores/services) and MOB-7b (hooks/trading) rather than rushing.

---

### Task MOB-8: De-mock the dispute screen + collapse the route trees (FND-068, CRITICAL)

**Files:** `mobile-app/app/dispute/**`, `mobile-app/app/disputes/**`, `mobile-app/app/(tabs)/disputes.tsx`, the navigation call sites; test.

**Canonical segment decided now: `app/dispute/` (singular).** Rationale: `app/(tabs)/disputes.tsx` (the navigation tab — the real entry point) and the home-screen quick actions all `router.push("/dispute/...")`; `app/dispute/` holds the 6 feature screens that exist nowhere else (`create`, `strategies`, `templates`, `use-strategy`, `use-template`, `wizard`). `app/disputes/` (plural) is the thinner tree. Collapsing onto `disputes/` would delete live features and break the tab — do NOT do that.

- [ ] **Step 1: Map all three surfaces.** List every file under `app/dispute/` (8), `app/disputes/` (5), and confirm `app/(tabs)/disputes.tsx`. For each `disputes/` (plural) file, is there an equivalent under `dispute/`? Produce the move/delete map: unique `disputes/` screens MOVE into `dispute/`; duplicates are deleted. `app/dispute/` has no `_layout.tsx` — create one (copy `disputes/_layout.tsx`). **If a screen exists in both trees with genuinely diverged behaviour that cannot be mechanically reconciled — STOP and surface to the human.**
- [ ] **Step 2: Failing test** — `app/dispute/[id].tsx` loads its dispute from `useDisputeStore.fetchDisputeById(id)` (real store — confirmed to exist, no `__DEV__` short-circuit), not `setTimeout`/mock data. Note `disputes/[id].tsx` (plural) is ALSO a hardcoded mock — it is deleted in the collapse, not de-mocked.
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix.** De-mock `dispute/[id].tsx` — remove the `setTimeout`+mock block, wire to `useDisputeStore.fetchDisputeById`. Create `dispute/_layout.tsx`. Move unique `disputes/` screens into `dispute/`; delete the `disputes/` tree. `grep -rn "'/disputes\|\"/disputes\|disputes/" mobile-app/app mobile-app/src` — rewrite every `router.push`/`Link`/`href` that pointed at the deleted `disputes/` segment. Confirm `app/(tabs)/disputes.tsx`'s `router.push` targets resolve post-collapse.
- [ ] **Step 5: Run — expect PASS.** Mobile jest no new failures; mobile tsc 0 errors. `grep` confirms one dispute route segment (`dispute/`), no dangling `/disputes/` navigation reference.
- [ ] **Step 6: Commit** — `fix: TASK-MOK-05 de-mock dispute screen + collapse to one route segment (FND-068)`.

---

## Vertical gate (Mobile "done" criteria)

- `cd mobile-app && npx jest` — **no new failures vs the MOB-0 baseline**; every new test file green; no per-file `coverageThreshold` key regressed.
- `cd mobile-app && npx tsc --noEmit` — 0 errors.
- `cd mobile-app && npm audit` — 0 HIGH/CRITICAL (or each remaining one a documented non-fixable transitive).
- `authStore.ts` has no `__DEV__` auth-bypass branch; production auth path has no hardcoded user.
- Sensitive values (biometric flag, push token, auth keys) are in `expo-secure-store`, not plain `AsyncStorage`.
- Every production `Linking.openURL` site goes through `openExternalUrl`; the only raw `Linking.openURL` is inside that wrapper; the wrapper allowlists `https:`/`mailto:`/`tel:` only.
- No import of `financialStore`/`useFinancialStore` remains; `syncStore` writes to modular stores; the deleted store's tests are migrated/removed with rationale.
- No bare `fetch()` to a Fynvita API route remains in `mobile-app/src/`; no `/api/api/` doubling.
- One dispute route segment (`app/dispute/`); `dispute/[id].tsx` reads `useDisputeStore`; no dangling `/disputes/` navigation reference; the disputes tab works.
- FND-064/065/066/067/068/069/070/071 closed and evidenced.
- MOB-1 inventory shows every mobile sub-feature `WORKING` except the explicitly-deferred non-auth `__DEV__` seed paths (tracked follow-up); no sub-feature removed.

---

## Notes for the executor

- ONE task per subagent. Hard stop after each commit. Two-stage review between tasks. Do NOT batch — a prior vertical's batched run skipped reviews and shipped defects.
- All commands run from `mobile-app/`. The web suite/tooling does not cover mobile code. There is no per-changed-line mobile diff-coverage tool — the gate is baseline-relative (MOB-0).
- The canonical dispute segment is `dispute/` (decided — see MOB-8). Do not re-litigate it at execution time.
- The `/api` double-prefix trap (MOB-7 Step 2) is the single most likely silent runtime break — tests mock the client and will not catch it.
- `__DEV__` gates mock seed-data in ~6 non-auth stores — explicitly deferred; MOB-2 fixes only the auth bypass; MOB-1 flags the rest for a follow-up task.
- Every finding fix needs a test that would fail against the pre-fix code.
- Reviewers are advisory; challenge a review CRITICAL that would force a regression.
