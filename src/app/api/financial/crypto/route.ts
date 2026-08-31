/**
 * Crypto wallets API.
 *
 * GET /api/financial/crypto — the caller's own wallets and portfolio summary.
 *
 * WHY THIS ROUTE IS NEW. The feature was already built and unreachable.
 * `crypto_wallets` and its holdings tables have existed since migration
 * 20260731000082_crypto_wallet_tracking.sql, and
 * `src/lib/financial/crypto-wallet-service.ts` queries them in earnest — 33
 * database calls, including `getUserWallets` and `getPortfolioSummary`. But
 * nothing imported that service except `src/lib/financial/index.ts` (a barrel)
 * and its own test file: no route, no page. Meanwhile /financial/crypto
 * rendered a hardcoded Coinbase wallet worth $45,230 to every visitor.
 *
 * So this is not new functionality. It is the missing link between a service
 * that works and a screen that had nothing to call.
 *
 * IDOR: both service methods take a userId, and this route passes `user.id`
 * from the auth guard — never a client-supplied id from the query or body.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getCryptoWalletService } from "@/lib/financial/crypto-wallet-service";

export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const service = getCryptoWalletService();

    // user.id comes from the auth guard, never from the request (route-contract §2).
    const [wallets, summary] = await Promise.all([
      service.getUserWallets(user.id),
      service.getPortfolioSummary(user.id),
    ]);

    return NextResponse.json({
      success: true,
      data: { wallets, summary },
    });
  } catch (error) {
    // Honest infra failure. No fabricated wallet on any path — a caller with
    // no wallets gets an empty array, and a broken backend gets a 500, so the
    // two are never confused (route-contract §3).
    console.error("Crypto wallets GET failed", {
      userId: user.id,
      route: "/api/financial/crypto",
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { success: false, error: "Failed to load crypto wallets" },
      { status: 500 },
    );
  }
});
