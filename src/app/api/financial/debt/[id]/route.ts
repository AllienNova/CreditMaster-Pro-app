/**
 * Update or remove a single debt.
 *
 * mobile-app/src/services/api/financial.ts:1285 and :1291 have always called
 * `/financial/debt/${debtId}` with PATCH and DELETE, and no route existed — the
 * family had only the collection (GET, POST). So editing a debt's balance and
 * deleting a debt both did nothing.
 *
 * Thin over debtService, which owns both the validation and the ownership
 * check: updateDebt(debtId, userId, patch) runs debtPatchSchema and refuses
 * with "Debt not found" unless the row matches BOTH the id and the caller
 * (debt-service.ts:135-142); deleteDebt takes the same pair. Re-validating or
 * re-checking here would be a second copy of a rule that already exists, which
 * is how the two dispute-strategy catalogues drifted apart.
 *
 * DELETE is built here, unlike on /financial/accounts/[accountId]. A debt is a
 * row the user entered and can re-enter; nothing else references it. A linked
 * bank account has transactions hanging off it and an upstream Plaid item, so
 * removing one destroys history the user never asked to lose.
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { debtService } from "@/lib/financial/debt-service";

/** The guard does not forward Next's route params; the id is the last segment. */
function debtIdFrom(request: NextRequest): string {
  return request.nextUrl.pathname.split("/").pop() ?? "";
}

/**
 * The service signals "no such debt, or not yours" by throwing with this
 * message. Both cases answer 404 with the same body, so the response cannot be
 * used to discover whether a debt id belongs to somebody else.
 */
const NOT_FOUND = "Debt not found";

export const PATCH = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const debtId = debtIdFrom(request);
    if (!debtId) {
      return NextResponse.json({ error: "Debt id required" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Body must be valid JSON" },
        { status: 400 },
      );
    }

    const debt = await debtService.updateDebt(debtId, user.id, body as never);
    return NextResponse.json({ success: true, data: debt });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === NOT_FOUND) {
      return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
    }
    console.error("Error updating debt:", error);
    return NextResponse.json(
      { error: "Failed to update debt" },
      { status: 500 },
    );
  }
});

export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const debtId = debtIdFrom(request);
      if (!debtId) {
        return NextResponse.json({ error: "Debt id required" }, { status: 400 });
      }

      // deleteDebt cannot tell us whether it removed anything: deleting zero
      // rows is not a Postgres error, so a debt that does not exist — or is
      // somebody else's — resolves exactly like a successful delete. Reporting
      // that as {success: true} would tell the user their debt is gone when it
      // is not, so ownership is established first.
      const existing = await debtService.getDebt(debtId, user.id);
      if (!existing) {
        return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
      }

      await debtService.deleteDebt(debtId, user.id);
      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof Error && error.message === NOT_FOUND) {
        return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
      }
      console.error("Error deleting debt:", error);
      return NextResponse.json(
        { error: "Failed to delete debt" },
        { status: 500 },
      );
    }
  },
);
