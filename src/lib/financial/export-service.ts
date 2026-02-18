/**
 * Financial Export Service
 * Handles CSV and PDF export for budgets, spending reports, and bills
 */

import {
  Budget,
  BudgetCategoryValue,
  CATEGORY_DISPLAY_NAMES,
} from "./types/budget.types";
import { Bill, BillStatus, BillFrequency } from "./types/bill.types";

export type ExportFormat = "csv" | "json" | "pdf";

export interface ExportOptions {
  format: ExportFormat;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  includeHeaders?: boolean;
  filename?: string;
}

export interface ExportResult {
  content: string | Blob;
  filename: string;
  mimeType: string;
  size: number;
}

// Helper to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

// Helper to format date
const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Helper to escape CSV values
const escapeCSV = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Financial Export Service Class
 */
export class FinancialExportService {
  /**
   * Export budgets to CSV
   */
  static exportBudgetsToCSV(
    budgets: Budget[],
    options?: Partial<ExportOptions>,
  ): ExportResult {
    const headers = [
      "Category",
      "Budgeted Amount",
      "Spent Amount",
      "Remaining",
      "Progress %",
      "Period",
      "Status",
      "Rollover Enabled",
      "Rollover Amount",
      "Start Date",
      "End Date",
    ];

    let csv = options?.includeHeaders !== false ? headers.join(",") + "\n" : "";

    budgets.forEach((budget) => {
      const remaining = budget.budgetedAmount - budget.spentAmount;
      const progress =
        budget.budgetedAmount > 0
          ? Math.round((budget.spentAmount / budget.budgetedAmount) * 100)
          : 0;

      const row = [
        escapeCSV(
          CATEGORY_DISPLAY_NAMES[budget.category as BudgetCategoryValue] ||
            budget.category,
        ),
        escapeCSV(formatCurrency(budget.budgetedAmount)),
        escapeCSV(formatCurrency(budget.spentAmount)),
        escapeCSV(formatCurrency(remaining)),
        escapeCSV(`${progress}%`),
        escapeCSV(budget.period),
        escapeCSV(budget.status),
        escapeCSV(budget.rolloverEnabled ? "Yes" : "No"),
        escapeCSV(formatCurrency(budget.rolloverAmount)),
        escapeCSV(formatDate(budget.periodStart)),
        escapeCSV(formatDate(budget.periodEnd)),
      ];
      csv += row.join(",") + "\n";
    });

    const filename = options?.filename || `budgets-export-${Date.now()}.csv`;

    return {
      content: csv,
      filename,
      mimeType: "text/csv",
      size: new Blob([csv]).size,
    };
  }

  /**
   * Export bills to CSV
   */
  static exportBillsToCSV(
    bills: Bill[],
    options?: Partial<ExportOptions>,
  ): ExportResult {
    const headers = [
      "Merchant",
      "Category",
      "Amount",
      "Frequency",
      "Next Due Date",
      "Status",
      "Auto Pay",
      "Last Paid Date",
      "Last Paid Amount",
      "Notes",
    ];

    let csv = options?.includeHeaders !== false ? headers.join(",") + "\n" : "";

    bills.forEach((bill) => {
      const row = [
        escapeCSV(bill.merchantName),
        escapeCSV(bill.category),
        escapeCSV(formatCurrency(bill.amount)),
        escapeCSV(bill.frequency),
        escapeCSV(bill.nextDueDate ? formatDate(bill.nextDueDate) : ""),
        escapeCSV(bill.status),
        escapeCSV(bill.isAutoPay ? "Yes" : "No"),
        escapeCSV(bill.lastPaidDate ? formatDate(bill.lastPaidDate) : ""),
        escapeCSV(
          bill.lastPaidAmount ? formatCurrency(bill.lastPaidAmount) : "",
        ),
        escapeCSV(bill.notes || ""),
      ];
      csv += row.join(",") + "\n";
    });

    const filename = options?.filename || `bills-export-${Date.now()}.csv`;

    return {
      content: csv,
      filename,
      mimeType: "text/csv",
      size: new Blob([csv]).size,
    };
  }

  /**
   * Export spending data to CSV
   */
  static exportSpendingToCSV(
    spendingData: {
      byCategory: Array<{
        category: string;
        amount: number;
        percentage: number;
        transactionCount: number;
      }>;
      byMonth: Array<{ month: string; amount: number }>;
      topMerchants: Array<{
        name: string;
        amount: number;
        transactionCount: number;
      }>;
      totalSpending: number;
      income?: number;
      cashFlow?: number;
    },
    options?: Partial<ExportOptions>,
  ): ExportResult {
    let csv = "";

    // Summary section
    csv += "SPENDING SUMMARY\n";
    csv += `Total Spending,${escapeCSV(formatCurrency(spendingData.totalSpending))}\n`;
    if (spendingData.income) {
      csv += `Total Income,${escapeCSV(formatCurrency(spendingData.income))}\n`;
    }
    if (spendingData.cashFlow !== undefined) {
      csv += `Net Cash Flow,${escapeCSV(formatCurrency(spendingData.cashFlow))}\n`;
    }
    csv += "\n";

    // Category breakdown
    csv += "SPENDING BY CATEGORY\n";
    csv += "Category,Amount,Percentage,Transactions\n";
    spendingData.byCategory.forEach((cat) => {
      csv += `${escapeCSV(cat.category)},${escapeCSV(formatCurrency(cat.amount))},${escapeCSV(cat.percentage.toFixed(1) + "%")},${cat.transactionCount}\n`;
    });
    csv += "\n";

    // Monthly breakdown
    csv += "SPENDING BY MONTH\n";
    csv += "Month,Amount\n";
    spendingData.byMonth.forEach((month) => {
      csv += `${escapeCSV(month.month)},${escapeCSV(formatCurrency(month.amount))}\n`;
    });
    csv += "\n";

    // Top merchants
    csv += "TOP MERCHANTS\n";
    csv += "Merchant,Amount,Transactions\n";
    spendingData.topMerchants.forEach((merchant) => {
      csv += `${escapeCSV(merchant.name)},${escapeCSV(formatCurrency(merchant.amount))},${merchant.transactionCount}\n`;
    });

    const filename = options?.filename || `spending-report-${Date.now()}.csv`;

    return {
      content: csv,
      filename,
      mimeType: "text/csv",
      size: new Blob([csv]).size,
    };
  }

  /**
   * Export to JSON format
   */
  static exportToJSON<T>(
    data: T,
    options?: Partial<ExportOptions>,
  ): ExportResult {
    const json = JSON.stringify(data, null, 2);
    const filename = options?.filename || `export-${Date.now()}.json`;

    return {
      content: json,
      filename,
      mimeType: "application/json",
      size: new Blob([json]).size,
    };
  }

  /**
   * Trigger browser download
   */
  static downloadFile(result: ExportResult): void {
    const blob =
      typeof result.content === "string"
        ? new Blob([result.content], { type: result.mimeType })
        : result.content;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate comprehensive financial report
   */
  static generateFinancialReport(
    data: {
      budgets?: Budget[];
      bills?: Bill[];
      spending?: {
        byCategory: Array<{
          category: string;
          amount: number;
          percentage: number;
          transactionCount: number;
        }>;
        byMonth: Array<{ month: string; amount: number }>;
        topMerchants: Array<{
          name: string;
          amount: number;
          transactionCount: number;
        }>;
        totalSpending: number;
        income?: number;
        cashFlow?: number;
      };
    },
    options?: Partial<ExportOptions>,
  ): ExportResult {
    let csv = "";
    const now = new Date();

    // Report header
    csv += "FYNVITA FINANCIAL REPORT\n";
    csv += `Generated: ${formatDate(now)}\n`;
    if (options?.dateRange) {
      csv += `Period: ${formatDate(options.dateRange.startDate)} - ${formatDate(options.dateRange.endDate)}\n`;
    }
    csv += "\n";

    // Budgets section
    if (data.budgets && data.budgets.length > 0) {
      csv += "=== BUDGETS ===\n";
      const budgetExport = this.exportBudgetsToCSV(data.budgets, {
        includeHeaders: true,
      });
      csv += budgetExport.content + "\n";
    }

    // Bills section
    if (data.bills && data.bills.length > 0) {
      csv += "=== BILLS & SUBSCRIPTIONS ===\n";
      const billsExport = this.exportBillsToCSV(data.bills, {
        includeHeaders: true,
      });
      csv += billsExport.content + "\n";
    }

    // Spending section
    if (data.spending) {
      csv += "=== SPENDING ANALYSIS ===\n";
      const spendingExport = this.exportSpendingToCSV(data.spending, {
        includeHeaders: false,
      });
      csv += spendingExport.content;
    }

    const filename = options?.filename || `financial-report-${Date.now()}.csv`;

    return {
      content: csv,
      filename,
      mimeType: "text/csv",
      size: new Blob([csv]).size,
    };
  }
}
