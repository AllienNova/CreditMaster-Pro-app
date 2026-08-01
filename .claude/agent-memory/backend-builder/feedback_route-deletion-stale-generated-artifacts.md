---
name: route-deletion-stale-generated-artifacts
description: Deleting an API route leaves two categories of stale generated artifacts that need opposite handling — regenerate .next locally, but do NOT wholesale-regenerate a checked-in generated file in a shared worktree
metadata:
  type: feedback
---

Deleting a Next.js API route file (`src/app/api/.../route.ts`) leaves stale references in two different generated artifacts, and they need opposite treatment:

1. **`.next/types/**`** — gitignored, not tracked, purely a local build cache. `tsconfig.json`'s `include` covers `.next/types/**/*.ts`, so a stale route-validator file referencing the now-deleted route makes `npx tsc --noEmit` fail with `TS2307: Cannot find module`. Fix: `rm -rf .next` and run `npm run build` (or `next dev` briefly) to regenerate it fresh, then re-run `tsc --noEmit`. Completely safe — it's a cache, not source, and isn't committed regardless.

2. **A checked-in generated file** (e.g. `src/lib/api/generated-openapi-spec.ts`, header says "Auto-generated... DO NOT EDIT — regenerate with: npx tsx scripts/generate-openapi.ts") — this one IS tracked and versioned. In a shared worktree with other agents concurrently adding/editing routes, running the full regeneration script pulls in every route change made by everyone else too, not just your deletion. Confirmed 2026-07-31: regenerating after deleting one route produced a 2,944-line diff (2,799 insertions) because the spec had last been committed months earlier and other agents had added dozens of routes since. That diff has nothing to do with the task and would bundle unrelated concurrent work into a "delete dead code" commit.

**Why:** The two artifacts have different scopes — `.next` is process-local and disposable, the generated spec is a shared, versioned snapshot that only makes sense to regenerate once, after all concurrent route changes in a wave/PR have landed.

**How to apply:** After deleting a route, always clear + rebuild `.next` before trusting `tsc --noEmit`. For a checked-in generated file, check the diff size before committing a regeneration (`git diff --stat <file>` right after running the generator) — if it's much larger than "my one route," `git checkout -- <file>` to revert it, leave the staleness as a known, explicitly-flagged follow-up, and let whoever does the next full regeneration (after concurrent work settles) pick it up in one clean pass.
