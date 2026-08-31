/**
 * Non-throwing Stripe-price-ID -> plan lookup, for DISPLAY.
 *
 * `tierFromPriceId` (tier-mapping.ts) is the authority for anything that grants
 * entitlement: it throws on an unknown price ID so a provisioning gap fails
 * loud instead of silently downgrading someone to "free" (FND-018). That is the
 * right behaviour when the answer decides what a user may do.
 *
 * It is the wrong behaviour for an admin list. One legacy price ID must not 500
 * a page showing every subscription on the platform; the operator needs to SEE
 * the unrecognised row, which is precisely the thing a throw hides. So this
 * returns null and the caller renders the raw price ID.
 *
 * SERVER ONLY. It reads SUBSCRIPTION_PLANS, whose price IDs come from STRIPE_*
 * env vars. The client-side catalogue in `src/lib/pricing.ts` reads
 * NEXT_PUBLIC_STRIPE_* — a different set that can hold different values — so
 * resolving a plan in the browser risks labelling a row with a plan other than
 * the one billing assigned it. Resolve here, send the label down.
 */

import { SUBSCRIPTION_PLANS } from "./stripe-service";

export interface PlanLabel {
  tier: string;
  name: string;
  /** Dollars, e.g. 29.99 — SUBSCRIPTION_PLANS.price is not cents. */
  monthlyListPrice: number;
}

const PLAN_BY_PRICE_ID: ReadonlyMap<string, PlanLabel> = new Map(
  SUBSCRIPTION_PLANS.map((plan) => [
    plan.priceId,
    {
      tier: plan.id,
      name: plan.name,
      // Divided so monthly figures from mixed-interval plans stay addable.
      monthlyListPrice:
        plan.interval === "year"
          ? Number((plan.price / 12).toFixed(2))
          : plan.price,
    },
  ]),
);

/** The plan a price ID names, or null when the catalogue does not know it. */
export function lookupPlanByPriceId(
  priceId: string | null | undefined,
): PlanLabel | null {
  if (!priceId) return null;
  return PLAN_BY_PRICE_ID.get(priceId) ?? null;
}
