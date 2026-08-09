---
name: msw-fetch-mock-pattern
description: How to mock global.fetch in Fynvita web jest tests without hitting MSW-interceptor crashes (response.clone/headers.forEach/text errors)
metadata:
  type: project
---

`src/setupTests.ts` sets `global.fetch = jest.fn(fetch as any)` (wrapping node-fetch) and then imports an MSW server setup (`./__tests__/mocks/server`). If a test file does `const mockFetch = global.fetch as jest.Mock` and resolves it to a hand-rolled plain object (`{ ok, status, json: async () => body }`), any client component that actually calls `fetch(...)` during that test throws inside MSW's interceptor layer with a cascade of missing-method errors as you patch them one at a time: first `response.clone is not a function`, then (after adding `clone`) `Cannot read properties of undefined (reading 'forEach')` (missing `.headers`), then (after adding `headers: new Headers()`) `response.text is not a function`.

**Why:** MSW's fetch interceptor normalizes whatever `global.fetch` resolves and expects a real Fetch API `Response` — `.clone()`, `.headers` (with `.forEach`), `.text()`, `.json()`. A plain object satisfies none of that piecemeal.

**How to apply:** Don't cast the existing `global.fetch`; fully reassign it in the test file: `const mockFetch = jest.fn(); global.fetch = mockFetch as unknown as typeof fetch;` (this is the pattern already established in `src/app/credit/factors/__tests__/page.test.tsx`). Then resolve mocks with a real `Response` instance — `new Response(JSON.stringify(body), { status, headers: {"Content-Type":"application/json"} })` — rather than a hand-rolled object; `Response` is polyfilled onto `global` via node-fetch in `setupTests.ts`, so this "just works" and implements every method MSW touches natively. Confirmed working via a from-scratch debug session on `src/app/settings/billing/__tests__/page.test.tsx` (2026-07-24).

Separately: tests that mock a pending/never-resolving fetch promise to assert a loading state (`mockFetch.mockReturnValue(new Promise(() => {}))`) must `await waitFor(() => expect(mockFetch).toHaveBeenCalled())` before the test ends, or the effect's in-flight continuation (paused between `getSession()` resolving and the `fetch()` call) leaks into the NEXT test and gets recorded against that test's `mockFetch` call count — `jest.clearAllMocks()` in `beforeEach` clears call history but not a previously-set `mockReturnValue`/`mockResolvedValue` implementation, so the leaked call inherits whatever mock behavior was configured last. A `cancelled` flag in the effect's cleanup helps for real unmount races but does NOT fix this specific case, because the leaked continuation's microtask can resume before RTL's `afterEach(cleanup)` fires.
