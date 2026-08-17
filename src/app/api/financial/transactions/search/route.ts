/**
 * Search the caller's transactions by name or merchant.
 *
 * mobile-app/src/services/api/financial.ts:766 has always called
 * `/financial/transactions/search?q=…` and no route existed, so the search box
 * returned nothing for every query.
 *
 * Searches `name` and `merchant_name`, which are the two human-readable columns
 * on the table. The query is passed to PostgREST's `ilike` through the client's
 * own parameter encoding, never concatenated into SQL.
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission, type AuthedUser } from "@/lib/auth/api-guard";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const MAX_RESULTS = 100;
const MAX_QUERY_CHARS = 100;

export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const q = (request.nextUrl.searchParams.get("q") ?? "").trim();

      if (!q) {
        return NextResponse.json(
          { error: "Search query 'q' is required" },
          { status: 400 },
        );
      }
      if (q.length > MAX_QUERY_CHARS) {
        return NextResponse.json(
          { error: `Search query must be ${MAX_QUERY_CHARS} characters or fewer` },
          { status: 400 },
        );
      }

      // `%` and `_` are ilike wildcards. Left unescaped, a query of "%" matches
      // every transaction the user has — which is not a security hole, since
      // the rows are theirs, but it is not a search either. Escaped so the
      // query means what the user typed.
      const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

      // idor-audit: pk-owner-checked — filtered by the caller's own user_id, so
      // the search can only ever match their own transactions.
      const { data, error } = await getServiceRoleClient()
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .or(`name.ilike.${pattern},merchant_name.ilike.${pattern}`)
        .order("date", { ascending: false })
        .limit(MAX_RESULTS);

      if (error) {
        console.error("Error searching transactions:", error);
        return NextResponse.json(
          { error: "Failed to search transactions" },
          { status: 500 },
        );
      }

      const transactions = data ?? [];

      // `hasMore` rather than a total: counting every match costs a second
      // query, and the caller only needs to know the list was truncated.
      return NextResponse.json({
        transactions,
        query: q,
        hasMore: transactions.length === MAX_RESULTS,
      });
    } catch (error) {
      console.error("Error searching transactions:", error);
      return NextResponse.json(
        { error: "Failed to search transactions" },
        { status: 500 },
      );
    }
  },
);
