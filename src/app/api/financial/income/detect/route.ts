/**
 * Income Detection API Route
 *
 * Auto-detects recurring income patterns from transactions
 */

import { NextRequest, NextResponse } from "next/server";
import {
  incomeTrackingService,
  Transaction,
} from "@/lib/financial/income-tracking-service";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * POST /api/financial/income/detect
 * Detect income patterns from provided transactions
 */
export const POST = withAuth(
  async (request: NextRequest, _user: AuthedUser) => {
  try {
    const body = await request.json();

    if (!body.transactions || !Array.isArray(body.transactions)) {
      return NextResponse.json(
        { error: "Missing or invalid transactions array" },
        { status: 400 },
      );
    }

    // Map and validate transactions
    const transactions: Transaction[] = body.transactions.map(
      (t: {
        id: string;
        date: string;
        amount: number;
        merchantName?: string;
        merchant_name?: string;
        category?: string;
        accountId?: string;
        account_id?: string;
      }) => ({
        id: t.id,
        date: new Date(t.date),
        amount: t.amount,
        merchantName: t.merchantName || t.merchant_name || "Unknown",
        category: t.category,
        accountId: t.accountId || t.account_id,
      }),
    );

    // Detect income patterns
    const patterns =
      await incomeTrackingService.detectIncomeFromTransactions(transactions);

    return NextResponse.json({
      patterns,
      count: patterns.length,
    });
  } catch (_error) {
    // IncomeDetectRoute error: Failed to detect income patterns
    void _error;
    return NextResponse.json(
      { error: "Failed to detect income patterns" },
      { status: 500 },
    );
  }
},
);

/**
 * GET /api/financial/income/detect
 * Detect income from user's connected accounts
 * (Uses stored transactions from Plaid or manual entries)
 */
export const GET = withAuth(
  async (_request: NextRequest, user: AuthedUser) => {
  try {
    const supabase = await createClient();

    // Fetch recent transactions from database
    const { data: transactionsData, error: txError } = await supabase
      .from("transactions")
      .select("id, date, amount, merchant_name, category, account_id")
      .eq("user_id", user.id)
      .gt("amount", 0) // Only credits (income)
      .gte(
        "date",
        new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      ) // Last 6 months
      .order("date", { ascending: false })
      .limit(500);

    if (txError) {
      // IncomeDetectRoute error: Failed to fetch transactions
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 },
      );
    }

    if (!transactionsData || transactionsData.length === 0) {
      return NextResponse.json({
        patterns: [],
        count: 0,
        message:
          "No transactions found. Connect a bank account to auto-detect income.",
      });
    }

    // Map database rows to Transaction type
    interface TransactionRow {
      id: string;
      date: string;
      amount: number;
      merchant_name: string | null;
      category: string | null;
      account_id: string | null;
    }
    const transactions: Transaction[] = (
      transactionsData as TransactionRow[]
    ).map((t) => ({
      id: t.id,
      date: new Date(t.date),
      amount: t.amount,
      merchantName: t.merchant_name || "Unknown",
      category: t.category || "",
      accountId: t.account_id || "",
    }));

    // Detect patterns
    const patterns =
      await incomeTrackingService.detectIncomeFromTransactions(transactions);

    return NextResponse.json({
      patterns,
      count: patterns.length,
      transactionsAnalyzed: transactions.length,
    });
  } catch (_error) {
    // IncomeDetectRoute error: Detection failed
    void _error;
    return NextResponse.json(
      { error: "Failed to detect income patterns" },
      { status: 500 },
    );
  }
},
);
