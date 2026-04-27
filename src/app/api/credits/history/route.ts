import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { creditService } from "@/lib/credits/credit-service";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10), 1),
      100,
    );
    const offset = Math.max(
      parseInt(searchParams.get("offset") || "0", 10),
      0,
    );

    const transactions = await creditService.getTransactionHistory(
      user.id,
      limit,
      offset,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabaseAdmin as any)
      .from("credit_transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    return NextResponse.json({
      transactions,
      total: count ?? 0,
    });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch credit history" },
      { status: 500 },
    );
  }
}
