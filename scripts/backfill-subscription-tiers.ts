/**
 * backfill-subscription-tiers.ts — WBH-07 deploy-time script.
 *
 * For every `subscriptions` row that has a Stripe price ID, recompute the
 * canonical tier via `tierFromPriceId` and correct `profiles.subscription_tier`
 * wherever it has drifted.
 *
 * Usage:
 *   npx tsx scripts/backfill-subscription-tiers.ts            # live run
 *   npx tsx scripts/backfill-subscription-tiers.ts --dry-run  # dry run
 *   DRY_RUN=1 npx tsx scripts/backfill-subscription-tiers.ts  # dry run (env)
 *
 * Idempotent — running it twice produces no further changes the second time.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env.
 *
 * IMPORTANT: This is a deploy-time step. Do not run against the database
 * during development or CI. Execute only after the WBH-02 CHECK-constraint
 * migration has been applied to the target environment.
 */

import { createClient } from "@supabase/supabase-js";
import {
  computeTierCorrections,
  type SubscriptionRow,
  type ProfileTierRow,
} from "../src/lib/payment/backfill-tier-corrections";

// ---------------------------------------------------------------------------
// CLI / env flags
// ---------------------------------------------------------------------------

const isDryRun =
  process.env.DRY_RUN === "1" || process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Supabase service-role client (matches pattern in scripts/create-admin.ts)
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "backfill-subscription-tiers: NEXT_PUBLIC_SUPABASE_URL and " +
      "SUPABASE_SERVICE_ROLE_KEY must be set.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (isDryRun) {
    console.log("backfill-subscription-tiers: DRY RUN — no writes will occur.");
  }

  // Fetch only active/trialing subscriptions — canceled rows must not produce
  // corrections (a user with a canceled standard + active pro row would
  // otherwise be spuriously downgraded). This matches the canonical filter in
  // resolveActiveSubscriptionRow (billing-data.ts line 87).
  const { data: subscriptionData, error: subError } = await supabase
    .from("subscriptions")
    .select("user_id, stripe_price_id")
    .in("status", ["active", "trialing"]);

  if (subError) {
    console.error("backfill-subscription-tiers: failed to fetch subscriptions:", subError.message);
    process.exit(1);
  }

  const subscriptions: SubscriptionRow[] = (subscriptionData ?? []).filter(
    (r): r is SubscriptionRow =>
      typeof r.user_id === "string" && typeof r.stripe_price_id === "string",
  );

  if (subscriptions.length === 0) {
    console.log("backfill-subscription-tiers: no subscription rows found — nothing to do.");
    return;
  }

  // Fetch the current subscription_tier for every affected user.
  const userIds = [...new Set(subscriptions.map((s) => s.user_id))];

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, subscription_tier")
    .in("id", userIds);

  if (profileError) {
    console.error("backfill-subscription-tiers: failed to fetch profiles:", profileError.message);
    process.exit(1);
  }

  const profiles: ProfileTierRow[] = (profileData ?? []).filter(
    (r): r is ProfileTierRow =>
      typeof r.id === "string" && typeof r.subscription_tier === "string",
  );

  // Pure computation — no DB I/O.
  const { corrections, unresolvable, alreadyCorrect } = computeTierCorrections(
    subscriptions,
    profiles,
  );

  // Log unresolvable rows.
  for (const u of unresolvable) {
    console.warn(
      `backfill-subscription-tiers: SKIP userId=${u.userId} priceId=${u.priceId} reason="${u.reason}"`,
    );
  }

  // Log and apply corrections.
  for (const correction of corrections) {
    console.log(
      `backfill-subscription-tiers: CORRECT userId=${correction.userId} ` +
        `old=${correction.oldTier} → new=${correction.newTier}`,
    );

    if (!isDryRun) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ subscription_tier: correction.newTier, updated_at: new Date().toISOString() })
        .eq("id", correction.userId);

      if (updateError) {
        // Log and continue — a partial run is still idempotent on retry.
        console.error(
          `backfill-subscription-tiers: FAILED to update userId=${correction.userId}: ${updateError.message}`,
        );
      }
    }
  }

  // Summary — use the explicit alreadyCorrect count from computeTierCorrections,
  // not arithmetic on raw row counts (which was misleading when profile rows
  // were absent or a user appeared in multiple subscription rows).
  console.log(
    `backfill-subscription-tiers: DONE — ` +
      `${corrections.length} corrected, ` +
      `${unresolvable.length} unresolvable, ` +
      `${alreadyCorrect} already-correct` +
      (isDryRun ? " (DRY RUN — no writes made)" : ""),
  );
}

main().catch((err: unknown) => {
  console.error("backfill-subscription-tiers: unexpected error:", err);
  process.exit(1);
});
