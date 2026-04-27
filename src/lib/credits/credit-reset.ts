import { supabaseAdmin } from "@/lib/supabase/server";
import { TIER_CREDITS } from "./credit-costs";
import { creditService } from "./credit-service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function resetCreditsForTier(
  userId: string,
  tier: string,
): Promise<void> {
  const baseTierCredits = TIER_CREDITS[tier] ?? TIER_CREDITS["free"];

  // Sum credits from active addon subscriptions
  const { data: addons } = await db
    .from("addon_subscriptions")
    .select("credits_per_period")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"]);

  const addonCredits = (addons ?? []).reduce(
    (sum: number, row: { credits_per_period: number }) =>
      sum + row.credits_per_period,
    0,
  );

  const totalCredits = baseTierCredits + addonCredits;

  await creditService.resetMonthlyAllowance(userId, totalCredits);
}
