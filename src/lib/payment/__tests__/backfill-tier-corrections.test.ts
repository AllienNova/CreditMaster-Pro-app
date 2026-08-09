/** @jest-environment node */
import {
  computeTierCorrections,
  type SubscriptionRow,
  type ProfileTierRow,
  type TierCorrection,
  type UnresolvableRow,
} from "../backfill-tier-corrections";

const row = (
  userId: string,
  priceId: string,
): SubscriptionRow => ({ user_id: userId, stripe_price_id: priceId });

const profile = (id: string, tier: string): ProfileTierRow => ({
  id,
  subscription_tier: tier,
});

describe("computeTierCorrections", () => {
  describe("drifted row produces a correction", () => {
    it("returns a correction when profile tier does not match the price ID's tier", () => {
      const subscriptions: SubscriptionRow[] = [row("user-1", "price_standard")];
      const profiles: ProfileTierRow[] = [profile("user-1", "free")];

      const { corrections, unresolvable } = computeTierCorrections(
        subscriptions,
        profiles,
      );

      expect(unresolvable).toHaveLength(0);
      expect(corrections).toHaveLength(1);
      const c = corrections[0] as TierCorrection;
      expect(c.userId).toBe("user-1");
      expect(c.oldTier).toBe("free");
      expect(c.newTier).toBe("standard");
    });
  });

  describe("idempotency — already-correct row produces no correction", () => {
    it("returns no correction when profile tier already matches the price ID's tier", () => {
      const subscriptions: SubscriptionRow[] = [row("user-2", "price_pro")];
      const profiles: ProfileTierRow[] = [profile("user-2", "pro")];

      const { corrections, unresolvable, alreadyCorrect } = computeTierCorrections(
        subscriptions,
        profiles,
      );

      expect(corrections).toHaveLength(0);
      expect(unresolvable).toHaveLength(0);
      expect(alreadyCorrect).toBe(1);
    });

    it("running on already-corrected data produces no further corrections", () => {
      const subscriptions: SubscriptionRow[] = [
        row("user-3", "price_standard"),
        row("user-4", "price_pro"),
      ];
      const profiles: ProfileTierRow[] = [
        profile("user-3", "standard"),
        profile("user-4", "pro"),
      ];

      const firstRun = computeTierCorrections(subscriptions, profiles);
      expect(firstRun.corrections).toHaveLength(0);
      expect(firstRun.alreadyCorrect).toBe(2);

      // Simulate applying the (empty) corrections and running again — still no-op.
      const secondRun = computeTierCorrections(subscriptions, profiles);
      expect(secondRun.corrections).toHaveLength(0);
      expect(secondRun.alreadyCorrect).toBe(2);
    });
  });

  describe("status filter — canceled rows must never produce corrections", () => {
    it("does not downgrade a Pro user when only the active row is passed (canceled standard row excluded by I/O shell)", () => {
      // The I/O shell filters to status IN ('active','trialing') before calling
      // computeTierCorrections. This test models that filtered input: only the
      // active pro row is passed; the canceled standard row is absent.
      const subscriptions: SubscriptionRow[] = [
        // canceled standard row is NOT passed — filtered out by the query
        row("user-20", "price_pro"), // active row
      ];
      const profiles: ProfileTierRow[] = [profile("user-20", "pro")];

      const { corrections, unresolvable, alreadyCorrect } = computeTierCorrections(
        subscriptions,
        profiles,
      );

      expect(corrections).toHaveLength(0);
      expect(unresolvable).toHaveLength(0);
      expect(alreadyCorrect).toBe(1);
    });

    it("would generate a spurious downgrade if a canceled row were passed (documents the bug fixed by the status filter)", () => {
      // If the I/O shell did NOT filter by status, both rows would be passed.
      // The canceled standard row would resolve to 'standard', which differs
      // from the profile's 'pro', producing a downgrade correction — wrong.
      // This test asserts that behavior to document why the filter is critical.
      const subscriptionsWithCanceled: SubscriptionRow[] = [
        row("user-21", "price_standard"), // canceled — must be excluded in real run
        row("user-21", "price_pro"),      // active
      ];
      const profiles: ProfileTierRow[] = [profile("user-21", "pro")];

      const { corrections } = computeTierCorrections(subscriptionsWithCanceled, profiles);

      // Without the status filter, the canceled row produces a spurious correction.
      expect(corrections).toHaveLength(1);
      expect((corrections[0] as TierCorrection).newTier).toBe("standard"); // downgrade — wrong
    });
  });

  describe("unresolvable price ID — recorded, not a crash", () => {
    it("records an unresolvable row and does not throw when priceId is unknown", () => {
      const subscriptions: SubscriptionRow[] = [
        row("user-5", "price_does_not_exist"),
      ];
      const profiles: ProfileTierRow[] = [profile("user-5", "free")];

      expect(() => {
        computeTierCorrections(subscriptions, profiles);
      }).not.toThrow();

      const { corrections, unresolvable } = computeTierCorrections(
        subscriptions,
        profiles,
      );

      expect(corrections).toHaveLength(0);
      expect(unresolvable).toHaveLength(1);
      const u = unresolvable[0] as UnresolvableRow;
      expect(u.userId).toBe("user-5");
      expect(u.priceId).toBe("price_does_not_exist");
      expect(u.reason).toMatch(/unknown/i);
    });
  });

  describe("mixed batch", () => {
    it("handles drifted, already-correct, and unresolvable rows in one call", () => {
      const subscriptions: SubscriptionRow[] = [
        row("user-10", "price_standard"),   // drifted
        row("user-11", "price_pro"),        // already correct
        row("user-12", "price_bogus"),      // unresolvable
      ];
      const profiles: ProfileTierRow[] = [
        profile("user-10", "free"),
        profile("user-11", "pro"),
        profile("user-12", "free"),
      ];

      const { corrections, unresolvable, alreadyCorrect } = computeTierCorrections(
        subscriptions,
        profiles,
      );

      expect(corrections).toHaveLength(1);
      expect((corrections[0] as TierCorrection).userId).toBe("user-10");

      expect(unresolvable).toHaveLength(1);
      expect((unresolvable[0] as UnresolvableRow).userId).toBe("user-12");

      expect(alreadyCorrect).toBe(1);
    });

    it("skips a user who has a subscription row but no profile row", () => {
      const subscriptions: SubscriptionRow[] = [
        row("user-99", "price_standard"),
      ];
      const profiles: ProfileTierRow[] = []; // no profile for user-99

      const { corrections, unresolvable } = computeTierCorrections(
        subscriptions,
        profiles,
      );

      // No profile to correct, no error — silently skipped.
      expect(corrections).toHaveLength(0);
      expect(unresolvable).toHaveLength(0);
    });
  });
});
