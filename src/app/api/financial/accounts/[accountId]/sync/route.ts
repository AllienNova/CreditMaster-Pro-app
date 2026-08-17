/**
 * POST /api/financial/accounts/[accountId]/sync — refresh one linked account.
 *
 * AccountDetailsModal.tsx:57 calls this when the user presses Sync. The route
 * did not exist, so it 404'd — and the component then ran a "simulated sync":
 * a two-second setTimeout, after which the UI behaved as though the refresh had
 * happened. Nothing was fetched and nothing was written. That fallback is
 * removed in the same commit.
 *
 * The caller identifies an ACCOUNT; plaidService.syncAccounts takes an ITEM (a
 * bank connection, which may hold several accounts). financial_accounts carries
 * both, so the item is resolved from the account — scoped to the caller's own
 * user_id, so one user cannot trigger a sync on another's connection by
 * guessing an account id.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { plaidService } from "@/lib/financial/plaid-service";

const supabase = getServiceRoleClient();

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  // withAuth does not forward Next's route params. The path is
  // /api/financial/accounts/<accountId>/sync, so the id is the second-to-last
  // segment.
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const accountId = decodeURIComponent(segments[segments.length - 2] ?? "");

  if (!accountId) {
    return NextResponse.json({ error: "Missing account id" }, { status: 400 });
  }

  try {
    // idor-audit: user-scoped — the account must belong to the caller, so a
    // guessed id syncs nothing.
    const { data: account, error } = await supabase
      .from("financial_accounts")
      .select("item_id, provider")
      .eq("user_id", user.id)
      .eq("account_id", accountId)
      .maybeSingle();

    if (error) throw error;

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (!account.item_id) {
      /*
       * UNREACHABLE TODAY, and kept deliberately. financial_accounts.item_id is
       * NOT NULL, so an account with no upstream connection cannot be stored —
       * I tried to insert one to exercise this branch and Postgres refused it.
       *
       * It stays because the alternative, if that constraint is ever relaxed to
       * allow manually-added accounts, is a sync that reports success having
       * refreshed nothing — precisely the simulated-sync behaviour this commit
       * removes. Labelled rather than left to look like a tested path.
       */
      return NextResponse.json(
        {
          error: "This account is not linked to a provider and cannot be synced",
          reason: "not_linked",
        },
        { status: 422 },
      );
    }

    const accounts = await plaidService.syncAccounts(account.item_id, user.id);

    return NextResponse.json({
      success: true,
      syncedAccounts: accounts.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Account sync failed for ${accountId}:`, error);
    // The upstream provider failed, not this app.
    return NextResponse.json({ error: "Failed to sync account" }, { status: 502 });
  }
});
