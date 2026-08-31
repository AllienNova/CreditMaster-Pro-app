# Deleted-Feature Audit — did anything get dropped by accident?

- **Date:** 2026-08-09
- **Commit audited:** `61a4460` on `main`
- **Question asked:** after the "dead code" deletions and the subsequent restore, has any feature been left out accidentally?
- **Answer:** **No.** Every source file ever deleted in this repo's history is either present today, deliberately removed to close a numbered finding, or superseded by a live replacement. Each of the 15 exceptions is accounted for below with evidence.

---

## Method

Path-based greps miss deletions. This swept the **full commit history across all branches**:

```bash
git log --all --diff-filter=D --name-only --format="%H" \
  -- 'src/**/*.ts' 'src/**/*.tsx' 'mobile-app/**/*.ts' 'mobile-app/**/*.tsx' \
  | grep -E "^(src|mobile-app)/" | grep -vE "__tests__|\.test\.|\.spec\." | sort -u
```

- **51** distinct non-test source paths have been deleted at some point.
- **36** of those exist at HEAD today (deleted then restored, or re-created).
- **15** remain absent. Each was then traced to its deleting commit and checked for a live replacement.

Limitation, stated plainly: this covers files that were **deleted**. It does not detect a feature that was *gutted in place* — a file that still exists but had its behaviour removed. That class is covered by the code-quality and architecture reviews, not here.

---

## The 15 still-absent files

### Group A — deliberate security remediation (9 files). Restoring these would regress.

| File | Deleting commit | Finding closed | Why it must stay deleted |
|---|---|---|---|
| `mobile-app/app/disputes/[id].tsx` | `defd635` | FND-068 | Mock dispute data shown as real; route collapsed to one segment |
| `mobile-app/app/disputes/analytics.tsx` | `defd635` | FND-068 | as above |
| `mobile-app/app/disputes/index.tsx` | `defd635` | FND-068 | as above |
| `mobile-app/src/services/legacyApi.ts` | `a0dfd54` | FND-071 | Bare unauthenticated `fetch` calls |
| `mobile-app/src/store/financialStore.ts` | `4db2a8c` | FND-066, FND-067 | Deprecated store diverging from the live one |
| `src/lib/credit-builder/score-simulator-service.ts` | `96c5639` | DEFAB-2 | Shipped **fabricated** credit-score simulations |
| `src/lib/payment/billing-profile-store.ts` | `2a689f7` | FND-016, FND-017 | Served a fake Visa 4242 to every new user |
| `src/lib/rate-limit.ts` | `f165e91` | FND-013 | One of three parallel rate limiters |
| `src/lib/security/rate-limiter.ts` | `f165e91` | FND-013 | as above |
| `src/lib/security/rate-limiting.ts` | `f165e91` | FND-013 | as above |

> Nine files, ten rows — `f165e91` removed three of the rate-limiter set and `defd635` three dispute screens.

**Consequence for the wiring plan:** any restored module that imports a rate limiter, `billing-profile-store`, or the score simulator is **blocked** until it is repointed at the surviving implementation. The Security Auditor persona was tasked with naming these specifically.

### Group B — superseded by a live replacement (6 files). Nothing lost.

| File | Deleting commit | Live replacement today | Verified |
|---|---|---|---|
| `mobile-app/components/DisputeCard.tsx` | `cacf28a` | `mobile-app/app/credit-repair/disputes.tsx`, `mobile-app/app/analytics/disputes.tsx` | present |
| `mobile-app/components/ScoreGauge.tsx` | `cacf28a` | `mobile-app/app/analytics/credit-score.tsx`, `mobile-app/app/credit-builder/score-simulator.tsx` | present |
| `mobile-app/store/useStore.ts` | `902763d` | `mobile-app/src/store/` — 20 store modules | present |
| `src/app/(dashboard)/investments/page.tsx` | `902763d` | `src/app/investments/page.tsx` (+ `research/`, `signals/`) | present |
| `src/lib/supabase.ts` | `7116714` | `src/lib/supabase/{client,server,admin,service-role,types}.ts` | present; the split is documented in `CLAUDE.md` |

`cacf28a` and `902763d` predate Wave 7 — a feature consolidation and the Next.js 15 route-handler migration respectively.

---

## Cross-check against the restore

The restore (`8e5481d`) classified 126 backup-only files:

| Class | Count | Disposition |
|---|---|---|
| Deleted deliberately (finding-closing or phantom-table cluster) | 71 | left deleted |
| Never existed on the branch | 55 | restored |

Of the 55 restored, **0** are application source that duplicates something live — 44 were Claude/agent tooling and 11 build-config/docs. The 34 non-test modules now carrying zero importers came from the 71-file group, i.e. they were restored *after* the owner's correction.

Independent confirmation that the restore was complete: this full-history sweep finds **no** absent file outside the 15 above, and every one of those 15 has a documented reason.

---

## Residual risk

| Risk | Severity | Note |
|---|---|---|
| A feature gutted in place rather than deleted | Medium | Not detectable by this method. Covered by the code-quality review. |
| A deleted file restored with *stale* content (behind later fixes on the live path) | Medium | The restored modules came from `backup/pre-wipe-2026-08-05`, which branched at `cd8fc21` (2026-05-16). Any fix made to those files on the main line between May 16 and their deletion is **not** in the restored copy. Must be checked per module before wiring. |
| Mobile features dropped | Unknown | Mobile has 0% test coverage and was not smoke-tested. |

The second row is the one that matters most for the wiring plan and is **not** yet resolved — it is carried into the remediation plan as a required per-module check.

---

## Revision History

| Date | Change |
|---|---|
| 2026-08-09 | Created. Full-history deletion sweep at `61a4460`; 51 deletions traced, 15 still-absent files all accounted for. |
