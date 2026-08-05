---
name: feedback-supabase-rpc-mock-ordering
description: mockResolvedValueOnce is FIFO — set once-values in call order before any persistent mockResolvedValue fallback
metadata:
  type: feedback
---

When a test has multiple sequential `.single()` (or `.rpc()`) calls, Jest consumes `mockResolvedValueOnce` calls in FIFO order. If you call `mockResolvedValue` (persistent) first and then `mockResolvedValueOnce`, the once-value is consumed on the FIRST call, not the second — the persistent value becomes the fallback for all remaining calls.

**Why:** Discovered during MNY-3 affiliate-service tests. The null-cap test had `mockResolvedValue(codeRow)` set as persistent default, then `mockResolvedValueOnce(attributionRow)` for the attribution. Jest consumed the attribution row on the FIRST `.single()` call (validateReferralCode), causing it to fail `is_active` check.

**How to apply:** In tests with a sequence of async Supabase calls, always use `mockResolvedValueOnce` in call order for every expected call. Only use `mockResolvedValue` (persistent) as a catch-all fallback after the once-values are set, or not at all. Pattern:

```ts
mockBuilder.single.mockResolvedValueOnce({ data: codeRow, error: null });   // 1st call
mockBuilder.single.mockResolvedValueOnce({ data: attributionRow, error: null }); // 2nd call
mockSupabase.rpc.mockResolvedValue({ data: "applied", error: null }); // rpc can be persistent
```

Relates to: [[feedback-supabase-mock-terminal-resolver]]
