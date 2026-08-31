/**
 * Recategorise a single transaction.
 *
 * mobile-app/src/services/api/financial.ts:757 has always PATCHed { category }
 * here and no route existed, so changing a transaction's category did nothing.
 *
 * Written against the table directly rather than through plaidService, which
 * has getTransactions / getTransactionsForAccounts / syncTransactions and no
 * single-row update — there was nothing to reuse. The write is scoped by id AND
 * user_id, which is the whole of the access control: transactions carries no
 * `authenticated` grant, so this runs with the service role.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withPermission, type AuthedUser } from "@/lib/auth/api-guard";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * `category` is TEXT[], not text.
 *
 * Plaid stores a hierarchy — ["Food and Drink", "Restaurants", "Coffee Shop"] —
 * and the column kept that shape. The client sends ONE string
 * (financial.ts:757), so a user-chosen category replaces the whole hierarchy
 * with a single-element array. That is what "recategorise" means here: the
 * user's label wins over the provider's guess.
 *
 * I wrote this route against `category: text` first. Every unit test passed,
 * because a mocked Supabase client cannot enforce a column type; Postgres
 * rejected the seed row with `malformed array literal: "Coffee"` the moment it
 * was exercised for real. There is no CHECK constraint, so the bound is length,
 * not membership. Trimmed, because " " would otherwise become its own entry in
 * the categories list next door.
 */
const PatchSchema = z.object({
  category: z.string().trim().min(1).max(64),
});

export const PATCH = withPermission(
  "financial:write",
  async (request: NextRequest, user: AuthedUser) => {
    try {
      // The guard does not forward Next's route params; id is the last segment.
      const transactionId = request.nextUrl.pathname.split("/").pop() ?? "";
      if (!transactionId) {
        return NextResponse.json(
          { error: "Transaction id required" },
          { status: 400 },
        );
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

      const parsed = PatchSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "category is required and must be a non-empty string" },
          { status: 400 },
        );
      }

      // idor-audit: pk-owner-checked — filtered by the caller's own user_id
      // alongside the id. `.select()` after the update returns the row only if
      // one matched, so a transaction belonging to someone else yields nothing
      // and is reported as not found rather than as a successful edit.
      const { data, error } = await getServiceRoleClient()
        .from("transactions")
        .update({ category: [parsed.data.category] })
        .eq("id", transactionId)
        .eq("user_id", user.id)
        .select()
        .maybeSingle();

      if (error) {
        console.error("Error updating transaction:", error);
        return NextResponse.json(
          { error: "Failed to update transaction" },
          { status: 500 },
        );
      }

      // Updating zero rows is not an error in Postgres, so the absence of a
      // returned row is the only signal that nothing was changed. Answering 200
      // here would tell the user their transaction was recategorised when it
      // was not — including when the id was never theirs.
      if (!data) {
        return NextResponse.json(
          { error: "Transaction not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error("Error updating transaction:", error);
      return NextResponse.json(
        { error: "Failed to update transaction" },
        { status: 500 },
      );
    }
  },
);
