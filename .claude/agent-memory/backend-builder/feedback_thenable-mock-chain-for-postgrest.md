---
name: thenable-mock-chain-for-postgrest
description: Build one Supabase query-builder mock whose object itself is thenable, so it correctly models every call shape (ending in .single(), .in(), .order(), or awaited straight after .eq()) without special-casing "the last method in the chain"
metadata:
  type: feedback
---

When a file makes several different Supabase query shapes against the same or different tables — some terminated by `.single()`, some by `.in()`/`.order()`, some just `await`ed directly after `.eq()` with no terminal call at all — a mock built the usual way (`select: jest.fn().mockReturnThis()`, ..., `single: jest.fn().mockResolvedValue(result)`) only works for chains that actually end in `.single()`. Any chain awaited at an earlier point (e.g. `await this.supabase.from(x).select("*").eq("user_id", id)` with no `.single()`) resolves to the mock chain **object itself** (since a non-thenable object awaited just resolves to itself), so `{data, error}` destructures as `{undefined, undefined}` — silently wrong, not a test failure you'd immediately notice.

The fix: make the chain object itself thenable, matching postgrest-js's real contract (confirmed via `node_modules/@supabase/postgrest-js/src/PostgrestBuilder.ts` — resolution comes from the builder's own `.then()`, not from any specific terminal method):

```ts
function makeThenableChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    single: jest.fn(() => Promise.resolve(result)),
    then: (onResolve: (v: typeof result) => unknown, onReject?: (r: unknown) => unknown) =>
      Promise.resolve(result).then(onResolve, onReject),
  };
  return chain;
}
```

One chain instance now correctly resolves `result` regardless of how many/which intermediate methods were called, or whether `.single()` was called at all.

**Why:** Found 2026-07-31 fixing the `financial-chat-engine.ts` fabrication bugs ([[project-fabricated-advice-financial-chat-engine]]). The file's methods use every one of these shapes in different places (`analyzeInvestment`/`getTradingSignal` end in `.single()`; `getPortfolioData`/`assessRisk`'s holdings query is awaited right after `.eq()`; `optimizeDebt`'s pre-fix code ended in `.in()`; the real `debtService.listDebts()` it now calls ends in `.order()`). A single `makeThenableChain` helper handled all of them in the same test file without needing a different mock shape per test.

**How to apply:** Reach for this whenever a test needs to mock a Supabase-shaped client for code with more than one distinct call-chain shape (or when reusing a real internal service like `debtService` that has its own different chain shape than the code under test). For a single, uniformly `.single()`-terminated chain, the simpler `mockReturnThis()`-per-method pattern in the existing test files is still fine — don't over-engineer where it isn't needed.
