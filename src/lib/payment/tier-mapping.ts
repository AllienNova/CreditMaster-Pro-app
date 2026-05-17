/**
 * Canonical Stripe-price-ID → subscription-tier mapping (WBH-02 / FND-018).
 *
 * The previous private `getTierFromPriceId` in subscription-service.ts referenced
 * nonexistent env vars (STRIPE_BASIC/PREMIUM/ENTERPRISE_PRICE_ID) and defaulted to
 * "free" on a miss — so every paid subscription silently landed on the free tier.
 *
 * This module builds its lookup directly from SUBSCRIPTION_PLANS — the single
 * source of truth for plan ids and Stripe price ids — and THROWS on an unknown
 * price ID. It never silently returns "free": a price ID that does not resolve
 * is a provisioning bug that must fail loud, not a downgrade.
 */

import { SUBSCRIPTION_PLANS } from "./stripe-service";

export type SubscriptionTier =
  | "free"
  | "standard"
  | "pro"
  | "family-duo"
  | "family"
  | "family-plus";

const VALID_TIERS: ReadonlySet<string> = new Set<SubscriptionTier>([
  "free",
  "standard",
  "pro",
  "family-duo",
  "family",
  "family-plus",
]);

export class TierMappingError extends Error {
  constructor(priceId: string) {
    super(
      `Unknown Stripe price ID "${priceId}" — no matching plan in SUBSCRIPTION_PLANS`,
    );
    this.name = "TierMappingError";
  }
}

// Built once from SUBSCRIPTION_PLANS: priceId → plan id (the canonical tier).
// Each plan id is validated against the SubscriptionTier union — a plan whose
// id falls outside the six tiers is a provisioning bug and fails loud at load,
// not a silent `as`-cast that corrupts the map's type guarantee.
const PRICE_ID_TO_TIER: ReadonlyMap<string, SubscriptionTier> = new Map(
  SUBSCRIPTION_PLANS.map((plan) => {
    if (!VALID_TIERS.has(plan.id)) {
      throw new Error(
        `Invalid plan id "${plan.id}" in SUBSCRIPTION_PLANS — not a SubscriptionTier`,
      );
    }
    return [plan.priceId, plan.id as SubscriptionTier];
  }),
);

/**
 * Resolve a Stripe price ID to its canonical subscription tier.
 * @throws {TierMappingError} when the price ID matches no plan.
 */
export function tierFromPriceId(priceId: string): SubscriptionTier {
  const tier = PRICE_ID_TO_TIER.get(priceId);
  if (tier === undefined) {
    throw new TierMappingError(priceId);
  }
  return tier;
}
