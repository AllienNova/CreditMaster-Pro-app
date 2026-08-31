/**
 * A single linked financial account.
 *
 * mobile-app/src/services/api/financial.ts:673 has always called
 * `/financial/accounts/${accountId}` and no route existed, so opening an
 * account from the list showed nothing. The `[accountId]` directory held only
 * the `sync` child; the detail route itself was never written.
 *
 * WHY NOT DELETE, which financial.ts:709 also calls. Unlinking a Plaid-linked
 * account is destructive and has no established pattern here:
 * manual-account-service.deleteAccount() operates on `manual_accounts`, a
 * different table, so it is not this. Removing a `financial_accounts` row
 * orphans its transactions and discards balance history, and the alternative —
 * marking it disconnected and revoking the Plaid item — needs a column that
 * does not exist. Shipping a DELETE that quietly destroys somebody's account
 * history, or one that returns 200 and leaves the account linked, are both
 * worse than the 404 the client gets today. It stays tracked in
 * mobile-app/scripts/api-calls-baseline.json with that reason.
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission, type AuthedUser } from "@/lib/auth/api-guard";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
    try {
      // withPermission does not forward Next's route params; the path ends in
      // /accounts/[accountId], so the id is the last segment.
      const accountId = request.nextUrl.pathname.split("/").pop() ?? "";
      if (!accountId) {
        return NextResponse.json(
          { error: "Account id required" },
          { status: 400 },
        );
      }

      // Service role for the same reason plaid-service.ts:294 documents:
      // financial_accounts has no `authenticated` grant (revoked by migration
      // 20260731000009), so an anon-keyed client gets 42501 rather than rows.
      //
      // idor-audit: pk-owner-checked — filtered by the caller's own user_id
      // alongside the id, so another user's account cannot be read even with a
      // guessed accountId. The 404 below does not distinguish "does not exist"
      // from "not yours", which is deliberate: it leaks nothing either way.
      const { data, error } = await getServiceRoleClient()
        .from("financial_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("id", accountId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching account:", error);
        return NextResponse.json(
          { error: "Failed to fetch account" },
          { status: 500 },
        );
      }

      if (!data) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error("Error fetching account:", error);
      return NextResponse.json(
        { error: "Failed to fetch account" },
        { status: 500 },
      );
    }
  },
);
