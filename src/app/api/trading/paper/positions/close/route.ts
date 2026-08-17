/**
 * Close a Paper Trading Position
 *
 * POST /api/trading/paper/positions/close
 * Body: { positionId: string }
 * Returns: { success: true, realizedPL: number, order: Order }
 *
 * The route did not exist, so the mobile "close position" control posted into
 * a 404 and the position stayed open while the screen moved on.
 *
 * Flattening goes through the ordinary order pipeline rather than writing the
 * position away directly: that is what produces the fill record, the balance
 * update and the paper_trades row, and it is the only path whose realized P&L
 * is computed by the engine rather than by this handler.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getPaperTradingEngine } from "@/lib/trading/paper/PaperTradingEngine";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  let positionId: unknown;
  try {
    ({ positionId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Reject a malformed id before it reaches the database: Postgres raises a
  // type error on a non-uuid, which surfaces as a 500 and tells a prober their
  // input reached the query layer.
  if (typeof positionId !== "string" || !UUID.test(positionId)) {
    return NextResponse.json({ error: "Invalid positionId" }, { status: 400 });
  }

  try {
    const engine = getPaperTradingEngine();

    // The account is looked up from the AUTHENTICATED user, never from the
    // body, so a positionId belonging to someone else resolves against this
    // caller's account and finds nothing.
    const account = await engine.getAccount(user.id);
    if (!account) {
      return NextResponse.json(
        { error: "No paper trading account found" },
        { status: 404 },
      );
    }

    const result = await engine.closePosition(account.id, positionId);

    if (!result) {
      // 404 covers "no such position", "already flat" and "not yours" alike.
      // Distinguishing them would confirm the existence of another user's
      // position to anyone probing uuids.
      return NextResponse.json(
        { error: "Position not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      realizedPL: result.realizedPL,
      order: result.order,
    });
  } catch (error) {
    // Order validation failures are the caller's problem, not the server's:
    // reporting them as 500 would send the app into a retry on a request that
    // can never succeed.
    const message =
      error instanceof Error ? error.message : "Failed to close position";
    if (message.startsWith("Order validation failed")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Never a false success: a swallowed failure here leaves the position open
    // while the screen reports it closed and shows a realized P&L that no
    // trade produced.
    console.error("Failed to close paper position:", error);
    return NextResponse.json(
      { error: "Failed to close position" },
      { status: 500 },
    );
  }
});
