---
name: supabase-mock-terminal-resolver
description: How to mock Supabase chainable query builder in Jest — the terminal method must mockResolvedValueOnce, not mockReturnValue(mockBuilder)
metadata:
  type: feedback
---

When mocking Supabase's fluent builder in Jest, awaiting a method that returns `mockBuilder` creates an infinite thenable loop (Jest calls `.then()` on the result, which returns `mockBuilder`, which also has `.then()`...) → test times out after 10 seconds.

**Rule:** The LAST method in a Supabase query chain must `mockResolvedValueOnce({ data, error })`, not `mockReturnValue(mockBuilder)`.

**Why:** JavaScript's `await` protocol calls `.then(resolve, reject)` on the awaited value. If `then` returns another thenable (mockBuilder), resolution never settles.

**How to apply:** For each query shape, identify the terminal method and give it `mockResolvedValueOnce`:

| Query chain | Terminal method | Fix |
|---|---|---|
| `.select("*")` (no filter) | `select` | `mockBuilder.select.mockResolvedValueOnce({data, error})` |
| `.select("*").gte(...).lte(...)` | `lte` | `select` → `mockReturnValueOnce(mockBuilder)`; `lte` → `mockResolvedValueOnce({data, error})` |
| `.select("*").eq(...)` | `eq` | `select` → `mockReturnValueOnce(mockBuilder)`; `eq` → `mockResolvedValueOnce({data, error})` |
| `.delete().not(...)` | `not` | `not` → `mockResolvedValueOnce({data: null, error: null})` |

**Critical:** A `beforeEach` that sets `mockBuilder.select.mockResolvedValue(...)` (persistent) breaks filter tests — `select()` returns a Promise, so calling `.gte()` on it fails with "not a function". Use `mockReturnValueOnce(mockBuilder)` in the specific test to override the persistent default.
