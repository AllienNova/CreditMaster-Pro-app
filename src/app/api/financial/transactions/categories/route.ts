/**
 * The distinct categories present on the caller's own transactions.
 *
 * mobile-app/src/services/api/financial.ts:749 has always called this and no
 * route existed, so the category picker had nothing to offer.
 *
 * These are the categories the USER actually has, not a fixed vocabulary. The
 * schema puts no CHECK constraint on transactions.category, so there is no
 * canonical list to serve — inventing one would show people categories they
 * have never used and omit ones they have.
 *
 * `category` is TEXT[]: Plaid stores a hierarchy such as
 * ["Food and Drink", "Restaurants", "Coffee Shop"]. The union of every level is
 * flattened, because the picker this feeds assigns ONE label (the PATCH route
 * next door writes a single-element array) and a user should be able to pick
 * "Food and Drink" as readily as "Coffee Shop".
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission, type AuthedUser } from "@/lib/auth/api-guard";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/** Enough to cover any real spread of categories without an unbounded scan. */
const MAX_ROWS = 5000;

export const GET = withPermission(
  "financial:read",
  async (_request: NextRequest, user: AuthedUser) => {
    try {
      // idor-audit: pk-owner-checked — filtered by the caller's own user_id;
      // this reads only the category column and only for their rows.
      const { data, error } = await getServiceRoleClient()
        .from("transactions")
        .select("category")
        .eq("user_id", user.id)
        .not("category", "is", null)
        .limit(MAX_ROWS);

      if (error) {
        console.error("Error listing transaction categories:", error);
        return NextResponse.json(
          { error: "Failed to load categories" },
          { status: 500 },
        );
      }

      const categories = [
        ...new Set(
          ((data ?? []) as { category: string[] | null }[])
            .flatMap((r) => r.category ?? [])
            .map((c) => (typeof c === "string" ? c.trim() : ""))
            .filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b));

      // An empty list is the honest answer for someone with no categorised
      // transactions yet — not a reason to fall back to a default vocabulary.
      return NextResponse.json({ categories });
    } catch (error) {
      console.error("Error listing transaction categories:", error);
      return NextResponse.json(
        { error: "Failed to load categories" },
        { status: 500 },
      );
    }
  },
);
