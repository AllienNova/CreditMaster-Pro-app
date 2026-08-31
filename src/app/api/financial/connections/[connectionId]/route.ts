/**
 * Revoke a bank connection.
 *
 * DELETE /api/financial/connections/[connectionId] -> { success: true }
 *
 * There was no disconnect path in this product at all. The mobile screen's
 * Disconnect button filtered a local array; accountStore.disconnectAccount
 * sent DELETE /financial/accounts/[id] to a route that exports only GET, so it
 * answered 405; and plaidService had no itemRemove call anywhere. A user who
 * wanted to cut a bank off could not, and was told they had.
 *
 * WHY THE ID IS A CONNECTION, NOT AN ACCOUNT. Plaid's /item/remove takes an
 * access_token and ends the whole Item — every account at that institution.
 * Accepting an account id would let the caller ask for something the provider
 * cannot do, and we would either silently do more than was asked or lie about
 * having done less.
 *
 * STATUS CODES.
 *   200  the consent is gone at Plaid and the rows are gone here
 *   400  the id is not a uuid
 *   404  no such connection, or not the caller's — the same answer either way,
 *        so ids cannot be probed for existence
 *   502  Plaid refused; nothing was deleted locally, and the connection is
 *        still live. Retrying is safe and is the correct next step
 *   500  the consent WAS revoked but local cleanup failed. Reported honestly
 *        rather than as success, because the two halves have diverged
 *
 * The 502 case is the one worth being strict about: answering 200 there would
 * hide a bank connection that is still running from a user who believes they
 * ended it.
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission, type AuthedUser } from "@/lib/auth/api-guard";
import { plaidService } from "@/lib/financial/plaid-service";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The connection id from the path.
 *
 * withPermission does not forward Next's route `params`, so it comes from the
 * pathname. Last segment: the path ends in the id.
 */
function connectionIdFrom(request: NextRequest): string {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}

export const DELETE = withPermission(
  "financial:write",
  async (request: NextRequest, user: AuthedUser) => {
    const connectionId = connectionIdFrom(request);

    if (!UUID.test(connectionId)) {
      return NextResponse.json(
        { error: "Invalid connection id" },
        { status: 400 },
      );
    }

    try {
      const result = await plaidService.removeConnection(connectionId, user.id);

      if (result.outcome === "not_found") {
        return NextResponse.json(
          { error: "Connection not found" },
          { status: 404 },
        );
      }

      if (result.outcome === "provider_error") {
        return NextResponse.json(
          {
            error:
              "The bank could not be disconnected right now. Nothing was changed — please try again.",
          },
          { status: 502 },
        );
      }

      if (result.outcome === "credential_error") {
        // Distinct from 502 on purpose. We hold no usable credential, so we
        // cannot ask Plaid to revoke — and unlike a provider refusal, this
        // will not resolve by trying again. Telling the user to retry would
        // send them round a loop that cannot terminate.
        return NextResponse.json(
          {
            error:
              "We could not disconnect this bank. Nothing was changed. Please contact support — this needs to be fixed on our side.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      // removeConnection only throws after Plaid has already accepted the
      // revocation, so this is the divergent state: consent gone, rows still
      // here. Say so instead of reporting success.
      console.error(
        `[financial/connections/:id] cleanup failed after revocation`,
        error,
      );
      return NextResponse.json(
        {
          error:
            "The bank was disconnected but its accounts could not be removed. Please try again.",
        },
        { status: 500 },
      );
    }
  },
);
