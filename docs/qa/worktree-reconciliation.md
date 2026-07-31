# Worktree / Branch Reconciliation

> 2026-07-31. Measured, not assumed — every claim below is a `git` command anyone can re-run.

## Landscape

| Worktree | Branch | HEAD |
|---|---|---|
| `Fynvita/` (main checkout) | `feat/asset-system-regen` | `a6331ed` |
| `Fynvita/.worktrees/wave-7-foundation` | `remediation/wave-7-foundation` | active |

| Branch | vs `main` | Last commit |
|---|---|---|
| `remediation/wave-7-foundation` | **+463 / −0** | 2026-07-31 (active) |
| `feat/asset-system-regen` | +106 / −0 | 2026-05-16 (2.5 months stale) |
| `fix/review-blockers-2026-04` | +1 / −0 | 2026-04-16 (stranded) |

None is *behind* `main`, so `main` contains nothing the others lack.

## The question that mattered

`git merge-base --is-ancestor feat/asset-system-regen remediation/wave-7-foundation` → **false**. By commit ancestry, `remediation` does NOT contain the asset branch's 106 commits. That looks like 106 commits of stranded work.

**It isn't.** By *content* it is already there:

```
git diff --name-only main...feat/asset-system-regen   -> 1076 files
git diff --name-only main...remediation/...           -> 2141 files
overlap                                                -> 1041 files
files ONLY in asset-system-regen                       ->   35
```

Those 35 break down as **34 × `.claude/**` (agent definitions + agent memory — local dev tooling)** and **1 × `strativion-autonomous-trading-package.zip`** (a build artifact).

```
# product code present only on the asset branch:
comm -23 <asset-files> <remediation-files> | grep -E '^(src|mobile-app|supabase|scripts)/'
-> (empty)
```

**Zero product code exists only on `feat/asset-system-regen`.** Spot-check on the branch's own subject matter: `assets/production` contains **67 files on both** branches.

## Conclusion

`remediation/wave-7-foundation` is a **content superset** of `feat/asset-system-regen` for all shipping code (`src/`, `mobile-app/`, `supabase/`, `scripts/`, `assets/`). The asset work was carried forward; only the commit ancestry diverged.

**Therefore: no merge is required, and attempting one would be actively harmful** — 1041 files overlap and `remediation` carries 463 newer commits on top, so a merge would generate mass conflicts whose correct resolution is, in every product case, "take `remediation`".

### Recommended disposition (owner decision — nothing has been deleted)
- `feat/asset-system-regen` → **retire** once its 34 `.claude/**` tooling files are cherry-picked if wanted. They are dev tooling, not product; losing them costs nothing shipping-facing.
- `fix/review-blockers-2026-04` → **inspect the single commit and retire**; 3.5 months stale.
- `remediation/wave-7-foundation` → the trunk of record; merge to `main` when Wave 7 closes.

No branch was deleted, merged, or force-pushed as part of this review.
