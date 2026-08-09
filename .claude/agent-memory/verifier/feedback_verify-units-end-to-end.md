---
name: verify-units-end-to-end-not-just-at-boundary
description: When verifying a money-precision (dollars vs cents) fix, trace the unit convention from the true data source through every intermediate function to the final sink — a fix at the boundary can leave the calculation upstream broken
metadata:
  type: feedback
---

On Fynvita's payout system (2026-07-23 verification), the audited bug (FND-024: dollars sent to Stripe where cents were expected) was fixed correctly at the transmission boundary (`toStripeAmount(fromDollars(payout.netAmount))`), and every dedicated test for that boundary passed. But the function that *computes* `netAmount` (`calculateFees()`) was never touched by the fix and mixes units internally — cent-scaled flat-fee literals subtracted from a dollar-scaled amount — producing a wrong (sometimes negative) `netAmount` that then flows correctly-but-uselessly through the now-fixed boundary conversion.

**Why the existing test suite missed it:** the dedicated fix tests bypassed `calculateFees()` entirely by injecting a canned `net_amount` straight into the mocked DB row, and the pre-existing `calculateFees` tests used a single large round amount ($10,000) where the flat-fee distortion looked proportionally plausible. Nothing tested the full chain (request amount → fee calc → net amount → Stripe conversion) at a realistic dollar scale.

**How to apply:** when verifying any dollars/cents (or other unit-conversion) fix, don't stop at confirming the boundary conversion is correct. (1) `git log`/`git show` the actual fix commit and check its diff scope — if a function that feeds the fixed boundary wasn't in the diff, treat it as unverified, not verified-by-association. (2) Find the true source of the value (e.g., `git grep` for where the field is first written) and confirm its unit there. (3) Run the arithmetic yourself end-to-end with a realistic (not round-number) value through every intermediate function, not just the final call — a quick inline `node -e` script transcribing the exact source lines is enough; don't trust that "tests pass" implies "the chain is unit-consistent." See [[payout-dual-codepath-and-missing-migrations]] for the concrete instance this caught.
