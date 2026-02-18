/**
 * Financial Export API
 * Generates CSV exports for budgets, bills, and spending data
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { budgetService } from "@/lib/financial/budget-service";
import { billDetectionService } from "@/lib/financial/bill-detection-service";
import { spendingAnalysisService } from "@/lib/financial/spending-analysis-service";
import { FinancialExportService } from "@/lib/financial/export-service";

export async function GET(request: NextRequest) {
  try {
    // Validate JWT
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = validation.user.id;
    const { searchParams } = new URL(request.url);

    // Get export type
    const exportType = searchParams.get("type") || "all"; // budgets, bills, spending, all
    const format = searchParams.get("format") || "csv"; // csv, json

    // Get date range
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const dateRange =
      startDateStr && endDateStr
        ? {
            startDate: new Date(startDateStr),
            endDate: new Date(endDateStr),
          }
        : undefined;

    let exportResult;

    if (exportType === "budgets") {
      const budgets = await budgetService.getBudgetsByUser(userId);
      exportResult =
        format === "json"
          ? FinancialExportService.exportToJSON(budgets, {
              filename: "budgets.json",
            })
          : FinancialExportService.exportBudgetsToCSV(budgets);
    } else if (exportType === "bills") {
      const bills = await billDetectionService.getBillsByUser(userId);
      exportResult =
        format === "json"
          ? FinancialExportService.exportToJSON(bills, {
              filename: "bills.json",
            })
          : FinancialExportService.exportBillsToCSV(bills);
    } else if (exportType === "spending") {
      const days = parseInt(searchParams.get("days") || "90");
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const spending = await spendingAnalysisService.analyzeSpending(userId, {
        startDate,
        endDate,
      });
      // Transform to export format
      const exportData = {
        byCategory: spending.byCategory.map((c) => ({
          category: c.displayName,
          amount: c.amount,
          percentage: c.percentage,
          transactionCount: c.transactionCount,
        })),
        byMonth: [], // Would need monthly breakdown
        topMerchants: spending.byMerchant.slice(0, 10).map((m) => ({
          name: m.merchant,
          amount: m.amount,
          transactionCount: m.transactionCount,
        })),
        totalSpending: spending.totalSpending,
        income: spending.totalIncome,
        cashFlow: spending.netCashFlow,
      };
      exportResult =
        format === "json"
          ? FinancialExportService.exportToJSON(spending, {
              filename: "spending.json",
            })
          : FinancialExportService.exportSpendingToCSV(exportData);
    } else {
      // Export all - just budgets and bills for now
      const [budgets, bills] = await Promise.all([
        budgetService.getBudgetsByUser(userId),
        billDetectionService.getBillsByUser(userId),
      ]);

      if (format === "json") {
        exportResult = FinancialExportService.exportToJSON(
          { budgets, bills },
          { filename: "financial-report.json" },
        );
      } else {
        exportResult = FinancialExportService.generateFinancialReport(
          { budgets, bills },
          { dateRange },
        );
      }
    }

    // Return file as download
    const headers = new Headers();
    headers.set("Content-Type", exportResult.mimeType);
    headers.set(
      "Content-Disposition",
      `attachment; filename="${exportResult.filename}"`,
    );
    headers.set("Content-Length", String(exportResult.size));

    return new NextResponse(exportResult.content as string, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to generate export" },
      { status: 500 },
    );
  }
}
