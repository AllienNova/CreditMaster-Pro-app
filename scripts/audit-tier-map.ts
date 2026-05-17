/**
 * audit-tier-map.ts — WBH-02 audit gate (`npm run audit:tier-map`).
 *
 * Asserts that every Stripe price ID listed in SUBSCRIPTION_PLANS resolves to a
 * tier via tierFromPriceId without throwing. This is the launch-time guard for
 * FND-018: if a plan's price ID can no longer be resolved (env var renamed,
 * plan added without a mapping), the tier mapping would silently misprovision
 * subscriptions. The audit fails loud instead.
 *
 * Exits non-zero and prints every offender when the audit fails; exit 0 clean.
 */

import { SUBSCRIPTION_PLANS } from "../src/lib/payment/stripe-service";
import { tierFromPriceId } from "../src/lib/payment/tier-mapping";

interface Offender {
  planId: string;
  priceId: string;
  reason: string;
}

const offenders: Offender[] = [];

for (const plan of SUBSCRIPTION_PLANS) {
  try {
    const tier = tierFromPriceId(plan.priceId);
    if (tier !== plan.id) {
      offenders.push({
        planId: plan.id,
        priceId: plan.priceId,
        reason: `resolved to "${tier}", expected "${plan.id}"`,
      });
    }
  } catch (error) {
    offenders.push({
      planId: plan.id,
      priceId: plan.priceId,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

if (offenders.length > 0) {
  console.error(
    `audit:tier-map FAILED — ${offenders.length} plan(s) do not resolve:`,
  );
  for (const o of offenders) {
    console.error(`  - plan "${o.planId}" (priceId "${o.priceId}"): ${o.reason}`);
  }
  process.exit(1);
}

console.log(
  `audit:tier-map OK — all ${SUBSCRIPTION_PLANS.length} plan price IDs resolve via tierFromPriceId.`,
);
