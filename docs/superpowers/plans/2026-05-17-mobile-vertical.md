# Mobile Vertical Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task — ONE task per subagent, hard stop, two-stage review between tasks. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Harden the Expo/React Native mobile app to launch quality — close 5 CRITICAL + 3 HIGH audit findings (a `__DEV__` auth bypass, dependency CVEs, a deprecated-store split-brain, a mock dispute screen, unencrypted biometric storage, `Linking.openURL` injection, unauthenticated `fetch()` calls) without dropping any mobile sub-feature.

**Architecture:** Security + de-mock + correctness vertical scoped entirely to `mobile-app/` (Expo SDK 52, React Native 0.76.9, expo-router file-based routing, Zustand stores). No web-side changes. Mobile has its own `jest` + `jest-expo` test runner (`mobile-app/package.json` `test` = `jest --coverage`) — the web `test:coverage:changed` gate does NOT cover `mobile-app/`; this vertical's gate uses the mobile jest runner directly.

**Tech Stack:** Expo SDK 52, React Native 0.76.9, TypeScript strict, expo-router 4.x, Zustand, `expo-secure-store`, Jest + `jest-expo`.

---

## Pre-state (verified against HEAD `785b789` — `remediation/wave-7-foundation`)

- Branch: `remediation/wave-7-foundation` (Foundation + Payments + Investments + Financial + Credit verticals merged & pushed).
- Mobile app at `mobile-app/` — its own `package.json`, jest config, ~30 test files. Mobile coverage is low (CLAUDE.md: "Mobile test coverage 0%" baseline — the 30 files exist but coverage is thin).
- **Findings re-verified against HEAD on 2026-05-17** (`gap_analysis.md` FND-064..071):

| Finding | Sev | Site (verified) | Task |
|---|---|---|---|
| FND-064 | CRITICAL | `mobile-app/src/store/authStore.ts` — `initialize()` has `if (__DEV__) { set({ isAuthenticated: true, user: seedUser, onboardingCompleted: true }); return; }` — one bad EAS build flag ships a fully-authenticated mock user | MOB-2 |
| FND-065 | CRITICAL | `mobile-app/` npm audit — `handlebars` JS-injection CVEs (transitive) + ~15 HIGH dep findings (`node-forge`, `lodash`, `tar`, `undici`) | MOB-5 |
| FND-066 | CRITICAL | `mobile-app/src/store/syncStore.ts:231` — offline sync writes to the deprecated `financialStore`; UI reads modular stores → diverged state after reconnect | MOB-6 |
| FND-067 | CRITICAL | `mobile-app/src/store/index.ts:220` — `useFinancialStore` is a deprecated alias; 5 screens still depend on it; ~20 stores exist (CLAUDE.md documents 8) | MOB-6 |
| FND-068 | CRITICAL | `mobile-app/app/dispute/[id].tsx` — uses `setTimeout` + mock data instead of the real `useDisputeStore`; **two duplicate route trees** — `app/dispute/` (8 files) AND `app/disputes/` (5 files) — both register | MOB-8 |
| FND-069 | HIGH | `mobile-app/src/services/biometrics/biometricService.ts:144,166,169` — biometric-enabled flag in unencrypted `AsyncStorage` → rooted-device bypass | MOB-3 |
| FND-070 | HIGH | 13 call sites of `Linking.openURL(url)` — URLs from API responses, no scheme allowlist → `javascript:` URI injection | MOB-4 |
| FND-071 | HIGH | `mobile-app/src/store/creditBalanceStore.ts:82,101,130` — bare `fetch()` with no `Authorization` header (RN has no cookie jar) | MOB-7 |

- Task cards: `MASTER-IMPLEMENTATION-PLAN.md` TASK-MOB-W7-01..07 + TASK-MOK-05. MOB-W7-05 (AsyncStorage key-prefix normalization — brand cleanup, no finding) is folded into MOB-3 (both touch storage keys).

## Scope

**In scope:** all of `mobile-app/` — the 8 findings above. **Out of scope:** the web app (`src/`); mobile *feature* build-out beyond closing the findings; raising overall mobile test coverage beyond the changed-code of this vertical (CLAUDE.md tracks mobile coverage as a separate long-tail item).

**Verification note:** every task runs the mobile suite from `mobile-app/` (`cd mobile-app && npx jest`). The web full-suite and web `test:coverage:changed` are NOT the gate for mobile code — do not expect web tooling to cover `mobile-app/`.

---

## File Structure

| File / area | Responsibility | Task |
|---|---|---|
| `docs/blueprint/mobile-subfeature-inventory.md` | CREATE — mobile sub-feature checklist + verify-pass | MOB-1 |
| `mobile-app/src/store/authStore.ts` | remove the `__DEV__` bypass; extract a `DevAuthProvider` excluded from prod bundles | MOB-2 |
| `mobile-app/src/services/biometrics/biometricService.ts` + storage-key helpers | `expo-secure-store` migration; `@fynvita/<domain>/<key>` prefix normalization | MOB-3 |
| a new `openExternalUrl()` wrapper + 13 `Linking.openURL` call sites | https-only scheme allowlist | MOB-4 |
| `mobile-app/package.json` + lockfile | `npm audit fix` for the CVE deps | MOB-5 |
| `mobile-app/src/store/{syncStore,index}.ts` + 5 screen callers | delete deprecated `financialStore`, migrate to modular stores | MOB-6 |
| `mobile-app/src/store/creditBalanceStore.ts` + other bare-`fetch` clients | route through the authed `client.ts` (`api.get/post`) | MOB-7 |
| `mobile-app/app/dispute/**` + `app/disputes/**` + the dispute screen | de-mock `dispute/[id].tsx`; collapse the duplicate route trees | MOB-8 |
| co-located `__tests__/` | tests per task | all |

---

### Task MOB-1: Mobile sub-feature inventory + verify-pass

**Files:** Create `docs/blueprint/mobile-subfeature-inventory.md`

- [ ] **Step 1: Enumerate.** All `mobile-app/app/**` routes (expo-router file-based — note duplicate/overlapping segments), all `mobile-app/src/store/*` Zustand stores (count them — CLAUDE.md says 8, gap_analysis says ~20; report the real number), `mobile-app/src/services/**`, screens/components.

- [ ] **Step 2: Verify-pass.** Group into sub-features (Auth/onboarding, Dashboard, Credit score/monitoring, Disputes, Investments, Documents, Notifications, Gamification, Settings/biometrics, …). For each, open a representative screen + store/service and judge: real data (real API client call / real store) vs mock/`setTimeout`/hardcoded. Mark the dispute screen `MOCK` (FND-068). Spot-check ≥12 screens.

- [ ] **Step 3: Write the inventory** — `docs/blueprint/mobile-subfeature-inventory.md`: Sub-feature | Key files | Status (`WORKING` / `DEGRADED — <finding>` / `MOCK`). Mark the FND-064..071 rows. Header explains the doc is the vertical's before/after evidence.

- [ ] **Step 4: Commit** — `docs: TASK-MOB-1 mobile sub-feature inventory + verify-pass`.

- [ ] **Step 5: Report** any `MOCK`/`DEGRADED` row beyond the 8 known findings.

---

### Task MOB-2: Remove the `__DEV__` auth bypass (FND-064, CRITICAL)

**Files:** Modify `mobile-app/src/store/authStore.ts`; new `mobile-app/src/dev/DevAuthProvider.tsx` (or similar); test.

`authStore.initialize()` short-circuits to `isAuthenticated: true` with a hardcoded `seedUser` whenever `__DEV__` is truthy. A misconfigured EAS build (`__DEV__` true in a store build) ships a fully-authenticated mock user.

- [ ] **Step 1: Write the failing test** — assert `authStore.initialize()` does NOT set `isAuthenticated: true` from a hardcoded user; with no real session it leaves the user unauthenticated. (Mock the Supabase client.)

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Fix.** Delete the `if (__DEV__) { … seedUser … }` block from `authStore.ts`. `initialize()` always runs the real Supabase-session path. If a dev convenience is still wanted, put it in a separate `DevAuthProvider` / dev-only screen that is NOT imported by `authStore` and is excluded from production bundles (gated behind an explicit, non-`__DEV__` opt-in — e.g. a dev-menu action, never automatic). The production auth path must have no hardcoded-user branch.

- [ ] **Step 4: Run — expect PASS.** `cd mobile-app && npx jest` — 0 failures. `cd mobile-app && npx tsc --noEmit` — 0 errors.

- [ ] **Step 5: Commit** — `fix: TASK-MOB-W7-06 remove __DEV__ auth bypass (FND-064)`.

---

### Task MOB-3: SecureStore migration + storage-key normalization (FND-069)

**Files:** Modify `mobile-app/src/services/biometrics/biometricService.ts`; a storage-key helper; any auth/push-token AsyncStorage writes; test.

The biometric-enabled flag (and possibly the push token / auth-related keys) live in unencrypted `AsyncStorage` — readable on a rooted device. And storage keys are un-prefixed (MOB-W7-05 brand cleanup).

- [ ] **Step 1: Audit AsyncStorage usage.** Grep `mobile-app/src/` for `AsyncStorage` reads/writes. Classify: security-sensitive (biometric flag, push token, anything auth/session/token-related) → must move to `expo-secure-store`; non-sensitive (UI prefs, cache) → may stay in AsyncStorage but get a normalized key.

- [ ] **Step 2: Write failing tests** — the biometric flag is read/written via `expo-secure-store`, not `AsyncStorage`; (if applicable) the push token likewise.

- [ ] **Step 3: Fix.** Migrate the sensitive keys to `expo-secure-store` (`getItemAsync`/`setItemAsync`). Provide a one-time read-fallback-then-migrate for an existing AsyncStorage value so current users aren't logged out. Normalize all storage keys to `@fynvita/<domain>/<key>`. (Optional, low-cost: an ESLint rule warning on bare `AsyncStorage` keys — only if the mobile lint setup makes it trivial; otherwise skip and note.)

- [ ] **Step 4: Run — expect PASS.** Mobile jest 0 failures; mobile tsc 0 errors.

- [ ] **Step 5: Commit** — `fix: TASK-MOB-W7-01 secure-store migration for sensitive keys (FND-069)`.

---

### Task MOB-4: `Linking.openURL` scheme allowlist (FND-070, HIGH)

**Files:** New `mobile-app/src/utils/openExternalUrl.ts`; modify the 13 `Linking.openURL` call sites; test.

13 call sites pass URLs (often from API responses) straight to `Linking.openURL` — a `javascript:` or other non-https scheme is an injection vector.

- [ ] **Step 1: Write the failing test** — `openExternalUrl()` rejects `javascript:`, `file:`, `data:`, and any non-`https:` scheme (returns false / does not call `Linking.openURL`); accepts a normal `https://` URL.

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Fix.** Write `openExternalUrl(url)` — parse the URL, allow only `https:` (and `mailto:`/`tel:` if the app legitimately uses them — grep the call sites to see). Reject everything else (log + no-op, or a user-facing "cannot open this link"). `grep -rn 'Linking.openURL' mobile-app/src mobile-app/app` — replace every one of the 13 with `openExternalUrl`. Confirm count after.

- [ ] **Step 4: Run — expect PASS.** Mobile jest 0 failures; mobile tsc 0 errors.

- [ ] **Step 5: Commit** — `fix: TASK-MOB-W7-02 Linking.openURL scheme allowlist (FND-070)`.

---

### Task MOB-5: Mobile dependency CVEs (FND-065, CRITICAL)

**Files:** `mobile-app/package.json`, `mobile-app/package-lock.json` (or yarn lock).

- [ ] **Step 1: Baseline.** `cd mobile-app && npm audit` — capture the HIGH/CRITICAL findings (`handlebars`, `node-forge`, `lodash`, `tar`, `undici`).

- [ ] **Step 2: Fix.** `npm audit fix`. For transitive deps not fixable that way, add `overrides` in `package.json` pinning the safe version (mirror the web app's `overrides` pattern). Do NOT `npm audit fix --force` blindly — a forced major bump can break the Expo build; if `--force` is the only path for a dep, evaluate per-dep and note it.

- [ ] **Step 3: Verify.** `cd mobile-app && npm audit` — 0 HIGH/CRITICAL remaining (or each remaining one documented as a non-fixable transitive with rationale). `cd mobile-app && npx tsc --noEmit` 0 errors. Mobile jest 0 failures. If a metro/expo build smoke-check is feasible (`npx expo export` or similar) run it — the dep bump must not break the bundle.

- [ ] **Step 4: Commit** — `fix: TASK-MOB-W7-03 resolve mobile dependency CVEs (FND-065)`.

---

### Task MOB-6: Delete the deprecated `financialStore` (FND-066, FND-067, CRITICAL)

**Files:** Modify `mobile-app/src/store/syncStore.ts`, `mobile-app/src/store/index.ts`; migrate the 5 screen callers of `useFinancialStore`; delete the deprecated store; test.

`syncStore` writes offline data to the deprecated `financialStore` while the UI reads the new modular stores → state diverges after reconnect. `useFinancialStore` is a deprecated alias 5 screens still import.

- [ ] **Step 1: Map it.** `grep -rn 'useFinancialStore\|financialStore' mobile-app/src mobile-app/app` — list every importer (the 5 screens + `syncStore`). Identify which modular store each piece of `financialStore` state now lives in.

- [ ] **Step 2: Write failing tests** — `syncStore`'s offline-write path writes to the modular store(s), not `financialStore`; a representative migrated screen reads the modular store.

- [ ] **Step 3: Run — expect FAIL.**

- [ ] **Step 4: Fix.** Repoint `syncStore:231` (and any other `financialStore` write) to the modular stores. Migrate the 5 screens to the modular stores. Once nothing imports `financialStore`/`useFinancialStore`, delete the deprecated store + its alias from `index.ts`. `grep` to confirm zero remaining imports.

- [ ] **Step 5: Run — expect PASS.** Mobile jest 0 failures; mobile tsc 0 errors.

- [ ] **Step 6: Commit** — `fix: TASK-MOB-W7-04 delete deprecated financialStore, migrate to modular stores (FND-066, FND-067)`.

---

### Task MOB-7: Authenticated mobile API calls (FND-071, HIGH)

**Files:** Modify `mobile-app/src/store/creditBalanceStore.ts` + any other bare-`fetch` client; test.

`creditBalanceStore.ts:82,101,130` use bare `fetch()` with no `Authorization` header — React Native has no cookie jar, so these requests are unauthenticated (they rely on a session cookie that does not exist). After AUTH-04's deny-by-default middleware these will 401 — or worse, were only working because a route was unguarded.

- [ ] **Step 1: Find the authed client.** Locate `mobile-app/src/**/client.ts` (or the API client module) that exposes `api.get/post` and auto-attaches the Supabase bearer token. Confirm how it sources the token.

- [ ] **Step 2: Grep all bare `fetch(`** in `mobile-app/src/` — `creditBalanceStore.ts` plus any other store/service hitting the Fynvita API directly. List them.

- [ ] **Step 3: Write the failing test** — `creditBalanceStore`'s fetch methods send an `Authorization: Bearer …` header (assert via a mocked client/fetch).

- [ ] **Step 4: Fix.** Replace each bare `fetch()` to a Fynvita API route with the authed `client.ts` `api.get/post()`. (Leave genuine third-party `fetch` calls — to non-Fynvita APIs — alone, but confirm each is genuinely third-party.)

- [ ] **Step 5: Run — expect PASS.** Mobile jest 0 failures; mobile tsc 0 errors.

- [ ] **Step 6: Commit** — `fix: TASK-MOB-W7-07 authenticated mobile API calls (FND-071)`.

---

### Task MOB-8: De-mock the dispute screen + collapse route segments (FND-068, CRITICAL)

**Files:** Modify `mobile-app/app/dispute/[id].tsx`; reconcile `mobile-app/app/dispute/**` (8 files) vs `mobile-app/app/disputes/**` (5 files); test.

`dispute/[id].tsx` renders mock data via `setTimeout` instead of the real `useDisputeStore`. And expo-router registers BOTH `app/dispute/` and `app/disputes/` — two route trees for the same feature, a navigation hazard and duplicate maintenance.

- [ ] **Step 1: Map the two route trees.** List every file under `app/dispute/` and `app/disputes/`. Determine which screens are duplicates (same purpose, different segment) and which are unique. Decide the canonical segment — pick ONE (`disputes/` reads more naturally and already has an `_layout.tsx`; confirm). For each `dispute/` file: does an equivalent exist under `disputes/`? If yes → it is a duplicate to remove; if no → it must MOVE to `disputes/`. Produce the move/delete map. **If the two trees have diverged (a screen exists in both with different behaviour) and reconciling is not mechanical — STOP and surface to the human.**

- [ ] **Step 2: Write the failing test** — `dispute/[id].tsx` (the detail screen) loads its dispute from `useDisputeStore` (real store), not `setTimeout`/mock data.

- [ ] **Step 3: Run — expect FAIL.**

- [ ] **Step 4: Fix.** De-mock the dispute detail screen: remove the `setTimeout`+mock block, wire it to `useDisputeStore` (the real store — confirm it exists and has a load-by-id selector; if not, the store needs the method). Then collapse the route trees onto the canonical segment per the Step-1 map — move unique screens, delete duplicates, update every `router.push`/`Link`/`href` that referenced the removed segment (`grep` for them). Keep one `_layout.tsx`.

- [ ] **Step 5: Run — expect PASS.** Mobile jest 0 failures; mobile tsc 0 errors. `grep` confirms only one dispute route segment remains and no dangling navigation references.

- [ ] **Step 6: Commit** — `fix: TASK-MOK-05 de-mock dispute screen + collapse route segments (FND-068)`.

---

## Vertical gate (Mobile "done" criteria)

- `cd mobile-app && npx jest` — full mobile suite 0 failures; the tasks' new tests included.
- `cd mobile-app && npx tsc --noEmit` — 0 errors.
- `cd mobile-app && npm audit` — 0 HIGH/CRITICAL (or each remaining one a documented non-fixable transitive).
- `grep -rn '__DEV__' mobile-app/src/store/authStore.ts` — no auth-bypass branch; production auth path has no hardcoded user.
- No security-sensitive value in plain `AsyncStorage` — biometric flag / push token / auth keys are in `expo-secure-store`.
- All 13 `Linking.openURL` call sites go through the `openExternalUrl` allowlist; `grep -rn 'Linking.openURL' mobile-app` shows only the wrapper's own internal call.
- No import of the deprecated `financialStore`/`useFinancialStore` remains (`grep` clean); `syncStore` writes to modular stores.
- No bare `fetch()` to a Fynvita API route remains in `mobile-app/src/` (third-party `fetch` allowed).
- One dispute route segment; `dispute/[id].tsx` reads `useDisputeStore`, no `setTimeout` mock.
- Changed-code coverage on the mobile files this vertical touched ≥85% (measured via `cd mobile-app && npx jest --coverage` scoped to the changed files — the web `test:coverage:changed` does NOT cover `mobile-app/`).
- FND-064/065/066/067/068/069/070/071 closed and evidenced.
- MOB-1 inventory shows every mobile sub-feature `WORKING`; no sub-feature removed (the duplicate dispute segment is consolidated, not a feature drop).

---

## Notes for the executor

- ONE task per subagent. Hard stop after each task's commit. Two-stage review between tasks. Do not batch.
- All commands run from `mobile-app/` — it has its own `package.json`, jest (`jest-expo`), and tsconfig. The web suite/tooling does not cover mobile code.
- `__DEV__` is a React Native global — removing the auth bypass means the production path has zero hardcoded-user branches. A dev convenience, if kept, must be opt-in and bundle-excluded.
- `expo-secure-store` has size limits and is async — migrate only genuinely-sensitive keys; provide a read-fallback so existing users are not logged out.
- The dispute route-tree collapse (MOB-8) can be genuinely ambiguous if the two trees diverged — its Step 1 has a STOP-and-surface valve. Use it; do not guess a merge that loses a screen.
- Every finding fix needs a test that would fail against the pre-fix code.
- Reviewers are advisory; challenge a review CRITICAL that would force a regression.
