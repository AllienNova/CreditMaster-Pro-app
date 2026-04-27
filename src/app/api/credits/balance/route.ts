import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { creditService } from "@/lib/credits/credit-service";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const balance = await creditService.getBalance(user.id);
    const thisMonth = await creditService.getUsageThisPeriod(user.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: totalData } = await (supabaseAdmin as any)
      .from("credit_transactions")
      .select("credits_consumed")
      .eq("user_id", user.id)
      .gt("credits_consumed", 0);

    const total = (totalData ?? []).reduce(
      (sum: number, row: { credits_consumed: number }) =>
        sum + row.credits_consumed,
      0,
    );

    return NextResponse.json({
      balance,
      usage: { thisMonth, total },
    });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch credit balance" },
      { status: 500 },
    );
  }
}
