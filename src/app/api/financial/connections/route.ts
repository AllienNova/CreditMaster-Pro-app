/**
 * The caller's bank connections, each with the accounts it granted.
 *
 * GET /api/financial/connections -> { connections: BankConnection[] }
 *
 * WHY THIS EXISTS ALONGSIDE /api/financial/accounts. That route returns a flat
 * list of accounts and nothing about the CONNECTION each one came from — no
 * institution, no consent state, no id you could revoke. The mobile Connected
 * Accounts screen needs exactly those things, and in their absence it had been
 * showing six hardcoded accounts (Experian/Equifax/TransUnion "connected",
 * Chase, Marcus, Fidelity) to every user, with a Disconnect button that only
 * filtered local state.
 *
 * The unit here is the connection, not the account, because that is the unit
 * the user actually granted and the only unit Plaid can revoke (/item/remove
 * takes an access_token and ends the whole Item). A per-account disconnect
 * would be describing an operation that does not exist.
 *
 * NOTHING IS INVENTED. status comes from what Plaid's webhooks actually told
 * us — bank_connections.error_code (ITEM_ERROR) or consent_expiration_time
 * (PENDING_EXPIRATION). Silence is reported as "active", not as a problem, and
 * an institution whose name could not be resolved comes back null rather than
 * as a plausible bank.
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission, type AuthedUser } from "@/lib/auth/api-guard";
import { plaidService } from "@/lib/financial/plaid-service";

export const GET = withPermission(
  "financial:read",
  async (_request: NextRequest, user: AuthedUser) => {
    try {
      const connections = await plaidService.listConnections(user.id);
      return NextResponse.json({ connections });
    } catch (error) {
      // No mock fallback: a screen that renders invented banks on a database
      // error is how this surface got into the state it was in.
      console.error("[financial/connections] failed to list", error);
      return NextResponse.json(
        { error: "Failed to fetch connections" },
        { status: 500 },
      );
    }
  },
);
