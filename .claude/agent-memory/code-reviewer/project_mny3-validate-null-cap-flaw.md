---
name: project_mny3-validate-null-cap-flaw
description: validateReferralCode uses bare `if (data.max_uses && ...)` — falsy for null, so null-cap codes pass validate but the pattern is semantically wrong; not fixed by MNY-3
metadata:
  type: project
---

`validateReferralCode` at `src/lib/commerce/affiliate/affiliate-service.ts:278` uses:

```ts
if (data.max_uses && data.uses_count >= data.max_uses) {
```

This is a pre-existing line untouched by commit 37c7531. The `&&` short-circuits on null/0, so null-cap codes pass validation correctly (they slip through), but the check is semantically wrong for `max_uses = 0` (a zero cap would be treated as unlimited). In practice `max_uses = 0` is a degenerate input, but the pattern is inconsistent with the RPC which uses the correct `IS NOT NULL` guard.

MNY-3 was NOT required to fix this — it was not in scope. It is a LOW finding that should be tracked as a follow-up for consistency and defense-in-depth.

**Why:** The RPC is the authoritative atomicity layer. Even if `validateReferralCode` allowed a capped-out code through, the RPC would still reject it. The flaw is in the pre-flight fast-path only.

**How to apply:** When reviewing future changes to `validateReferralCode`, flag the bare `&&` and push for `data.max_uses !== null && data.uses_count >= data.max_uses`.
