/** @jest-environment node */
import { SUBSCRIPTION_PLANS } from "../stripe-service";
import {
  tierFromPriceId,
  TierMappingError,
  type SubscriptionTier,
} from "../tier-mapping";

describe("tier-mapping", () => {
  describe("wbh-phase2: tier-map exhaustion", () => {
    it.each(SUBSCRIPTION_PLANS.map((p) => [p.priceId, p.id]))(
      "resolves price ID %s to plan id %s",
      (priceId, expectedTier) => {
        expect(tierFromPriceId(priceId)).toBe(expectedTier);
      },
    );
  });

  it("maps the free-tier price ID to 'free'", () => {
    expect(tierFromPriceId("price_free")).toBe<SubscriptionTier>("free");
  });

  it("throws TierMappingError on an unknown price ID and names the offender", () => {
    expect(() => tierFromPriceId("price_does_not_exist")).toThrow(
      TierMappingError,
    );
    expect(() => tierFromPriceId("price_does_not_exist")).toThrow(
      "price_does_not_exist",
    );
  });

  it("never silently returns 'free' for an unknown price ID", () => {
    let resolved: SubscriptionTier | undefined;
    try {
      resolved = tierFromPriceId("price_bogus");
    } catch {
      resolved = undefined;
    }
    expect(resolved).toBeUndefined();
  });
});
