/**
 * backfill-tier-corrections.ts — pure logic for WBH-07.
 *
 * Computes which profiles have drifted from the tier their Stripe price ID
 * implies, and which subscriptions have an unresolvable price ID.
 *
 * This module is pure (no DB I/O) so it can be unit-tested in isolation.
 * The deploy-time script (`scripts/backfill-subscription-tiers.ts`) is the
 * thin I/O shell that fetches rows, calls this function, and writes updates.
 */

import { tierFromPriceId, TierMappingError } from "./tier-mapping";
import type { SubscriptionTier } from "./tier-mapping";

export type { SubscriptionTier };

/** A row from the `subscriptions` table (only the columns we need). */
export interface SubscriptionRow {
  user_id: string;
  stripe_price_id: string;
}

/** A row from the `profiles` table (only the columns we need). */
export interface ProfileTierRow {
  id: string;
  subscription_tier: string;
}

/** A profile whose tier has drifted and must be corrected. */
export interface TierCorrection {
  userId: string;
  oldTier: string;
  newTier: SubscriptionTier;
}

/** A subscription whose price ID could not be resolved. */
export interface UnresolvableRow {
  userId: string;
  priceId: string;
  reason: string;
}

export interface BackfillResult {
  corrections: TierCorrection[];
  unresolvable: UnresolvableRow[];
  /** Rows that were already correct — no write needed. */
  alreadyCorrect: number;
}

/**
 * Compute which profiles need their subscription_tier corrected.
 *
 * @param subscriptions - All active subscription rows (each must have a non-null stripe_price_id).
 * @param profiles - Current profile tiers, keyed by profile id (= user_id).
 * @returns corrections to apply and rows that could not be resolved.
 *
 * Idempotency: a row whose profile tier already matches the resolved tier
 * produces no correction. Calling this twice on the same already-corrected
 * data returns empty corrections both times.
 */
export function computeTierCorrections(
  subscriptions: SubscriptionRow[],
  profiles: ProfileTierRow[],
): BackfillResult {
  const profileTierById = new Map<string, string>(
    profiles.map((p) => [p.id, p.subscription_tier]),
  );

  const corrections: TierCorrection[] = [];
  const unresolvable: UnresolvableRow[] = [];
  let alreadyCorrect = 0;

  for (const sub of subscriptions) {
    let resolvedTier: SubscriptionTier;

    try {
      resolvedTier = tierFromPriceId(sub.stripe_price_id);
    } catch (err) {
      unresolvable.push({
        userId: sub.user_id,
        priceId: sub.stripe_price_id,
        reason:
          err instanceof TierMappingError
            ? `Unknown price ID — ${err.message}`
            : String(err),
      });
      continue;
    }

    const currentTier = profileTierById.get(sub.user_id);
    if (currentTier === undefined) {
      // No profile row for this user — skip silently (nothing to correct).
      continue;
    }

    if (currentTier !== resolvedTier) {
      corrections.push({
        userId: sub.user_id,
        oldTier: currentTier,
        newTier: resolvedTier,
      });
    } else {
      alreadyCorrect += 1;
    }
  }

  return { corrections, unresolvable, alreadyCorrect };
}
