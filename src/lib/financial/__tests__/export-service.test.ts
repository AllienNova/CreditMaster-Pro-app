/**
 * Financial Export Service Unit Tests
 *
 * Comprehensive tests for CSV/JSON export, file download,
 * financial report generation, and helper functions (formatCurrency,
 * formatDate, escapeCSV) exercised through the public API.
 */

import {
  FinancialExportService,
  ExportResult,
} from "../export-service";
import { Budget, BUDGET_CATEGORIES, CATEGORY_DISPLAY_NAMES, BudgetCategoryValue } from "../types/budget.types";
import { Bill, BillCategory, BillFrequency, BillStatus } from "../types/bill.types";

// ---------------------------------------------------------------------------
// Test Data Factories
// ---------------------------------------------------------------------------

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: "budget-1",
    userId: "user-1",
    name: "Groceries",
    category: BUDGET_CATEGORIES.GROCERIES,
    budgetedAmount: 500,
    spentAmount: 300,
    remainingAmount: 200,
    period: "monthly",
    periodStart: new Date("2026-01-01"),
    periodEnd: new Date("2026-01-31"),
    status: "on_track",
    percentUsed: 60,
    rolloverEnabled: false,
    rolloverAmount: 0,
    isActive: true,
    alertThreshold: 80,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-15"),
    ...overrides,
  };
}

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: "bill-1",
    userId: "user-1",
    merchantName: "Electric Company",
    category: "utilities" as BillCategory,
    amount: 120,
    frequency: "monthly" as BillFrequency,
    nextDueDate: new Date("2026-02-15"),
    status: "active" as BillStatus,
    isAutoPay: true,
    createdAt: new Date("2025-06-01"),
    updatedAt: new Date("2026-01-30"),
    ...overrides,
  };
}

function makeSpendingData(overrides: Record<string, unknown> = {}) {
  return {
    totalSpending: 4500,
    byCategory: [
      { category: "Groceries", amount: 800, percentage: 17.8, transactionCount: 25 },
      { category: "Dining Out", amount: 400, percentage: 8.9, transactionCount: 12 },
    ],
    byMonth: [
      { month: "January 2026", amount: 2200 },
      { month: "February 2026", amount: 2300 },
    ],
    topMerchants: [
      { name: "Whole Foods", amount: 450, transactionCount: 8 },
      { name: "Amazon", amount: 350, transactionCount: 5 },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Split CSV content into rows, ignoring a trailing empty row from final newline. */
function csvRows(content: string): string[] {
  return content.split("\n").filter((r) => r.length > 0);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FinancialExportService", () => {
  // =========================================================================
  // exportBudgetsToCSV
  // =========================================================================
  describe("exportBudgetsToCSV", () => {
    it("should return a valid ExportResult shape", () => {
      const result = FinancialExportService.exportBudgetsToCSV([]);
      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("filename");
      expect(result).toHaveProperty("mimeType");
      expect(result).toHaveProperty("size");
    });

    it("should have mimeType text/csv", () => {
      const result = FinancialExportService.exportBudgetsToCSV([]);
      expect(result.mimeType).toBe("text/csv");
    });

    it("should generate a default filename starting with 'budgets-export-'", () => {
      const result = FinancialExportService.exportBudgetsToCSV([]);
      expect(result.filename).toMatch(/^budgets-export-\d+\.csv$/);
    });

    it("should use a custom filename when provided", () => {
      const result = FinancialExportService.exportBudgetsToCSV([], {
        filename: "my-budgets.csv",
      });
      expect(result.filename).toBe("my-budgets.csv");
    });

    // -- empty array --
    it("should return only the header row for an empty budgets array", () => {
      const result = FinancialExportService.exportBudgetsToCSV([]);
      const rows = csvRows(result.content as string);
      expect(rows).toHaveLength(1); // just headers
      expect(rows[0]).toContain("Category");
      expect(rows[0]).toContain("Budgeted Amount");
    });

    it("should return empty content when headers disabled and array is empty", () => {
      const result = FinancialExportService.exportBudgetsToCSV([], {
        includeHeaders: false,
      });
      expect((result.content as string).trim()).toBe("");
    });

    // -- single budget --
    it("should export a single budget with correct number of rows", () => {
      const budget = makeBudget();
      const result = FinancialExportService.exportBudgetsToCSV([budget]);
      const rows = csvRows(result.content as string);
      // 1 header + 1 data row
      expect(rows).toHaveLength(2);
    });

    it("should map category value to display name", () => {
      const budget = makeBudget({ category: BUDGET_CATEGORIES.DINING_OUT });
      const result = FinancialExportService.exportBudgetsToCSV([budget]);
      const content = result.content as string;
      expect(content).toContain("Dining Out");
    });

    it("should fall back to raw category value when display name is not found", () => {
      const budget = makeBudget({ category: "unknown_category" as BudgetCategoryValue });
      const result = FinancialExportService.exportBudgetsToCSV([budget]);
      const content = result.content as string;
      expect(content).toContain("unknown_category");
    });

    it("should include all expected header columns", () => {
      const result = FinancialExportService.exportBudgetsToCSV([makeBudget()]);
      const headerRow = csvRows(result.content as string)[0];
      const expectedHeaders = [
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
      expectedHeaders.forEach((h) => {
        expect(headerRow).toContain(h);
      });
    });

    // -- multiple budgets --
    it("should export multiple budgets with the correct number of data rows", () => {
      const budgets = [
        makeBudget({ id: "b1", category: BUDGET_CATEGORIES.GROCERIES }),
        makeBudget({ id: "b2", category: BUDGET_CATEGORIES.ENTERTAINMENT }),
        makeBudget({ id: "b3", category: BUDGET_CATEGORIES.HOUSING }),
      ];
      const result = FinancialExportService.exportBudgetsToCSV(budgets);
      const rows = csvRows(result.content as string);
      expect(rows).toHaveLength(4); // 1 header + 3 data
    });

    // -- without headers --
    it("should omit headers when includeHeaders is false", () => {
      const budget = makeBudget();
      const result = FinancialExportService.exportBudgetsToCSV([budget], {
        includeHeaders: false,
      });
      const rows = csvRows(result.content as string);
      expect(rows).toHaveLength(1); // data only
      expect(rows[0]).not.toContain("Category,Budgeted Amount");
    });

    // -- formatCurrency via the output --
    it("should format budget amounts as USD currency", () => {
      const budget = makeBudget({ budgetedAmount: 1234.56, spentAmount: 789.12 });
      const result = FinancialExportService.exportBudgetsToCSV([budget]);
      const content = result.content as string;
      expect(content).toContain("$1,234.56");
      expect(content).toContain("$789.12");
    });

    // -- progress / remaining calculation --
    it("should calculate remaining and progress correctly", () => {
      const budget = makeBudget({ budgetedAmount: 1000, spentAmount: 750 });
      const result = FinancialExportService.exportBudgetsToCSV([budget]);
      const content = result.content as string;
      // remaining = 1000 - 750 = 250
      expect(content).toContain("$250.00");
      // progress = 75%
      expect(content).toContain("75%");
    });

    it("should handle zero budgetedAmount without dividing by zero", () => {
      const budget = makeBudget({ budgetedAmount: 0, spentAmount: 0 });
      const result = FinancialExportService.exportBudgetsToCSV([budget]);
      const content = result.content as string;
      // progress should be 0%
      expect(content).toContain("0%");
    });

    // -- rollover --
    it("should show Yes for rolloverEnabled=true", () => {
      const budget = makeBudget({ rolloverEnabled: true, rolloverAmount: 50 });
      const result = FinancialExportService.exportBudgetsToCSV([budget]);
      const content = result.content as string;
      expect(content).toContain("Yes");
      expect(content).toContain("$50.00");
    });

    it("should show No for rolloverEnabled=false", () => {
      const budget = makeBudget({ rolloverEnabled: false });
      const result = FinancialExportService.exportBudgetsToCSV([budget]);
      const content = result.content as string;
      // Data row should include "No"
      const dataRow = csvRows(content)[1];
      expect(dataRow).toContain("No");
    });

    // -- size --
    it("should return a numeric size > 0 for non-empty content", () => {
      const result = FinancialExportService.exportBudgetsToCSV([makeBudget()]);
      expect(typeof result.size).toBe("number");
      expect(result.size).toBeGreaterThan(0);
    });

    // -- escapeCSV via special chars --
    it("should escape budget names containing commas", () => {
      // formatCurrency produces "$1,000.00" which contains a comma.
      const budgetBig = makeBudget({ budgetedAmount: 1000 });
      const result = FinancialExportService.exportBudgetsToCSV([budgetBig]);
      const content = result.content as string;
      // "$1,000.00" contains a comma so escapeCSV wraps it in quotes
      expect(content).toContain('"$1,000.00"');
    });

    // -- formatDate via the output --
    it("should format dates in the expected locale format", () => {
      // Use noon times to avoid UTC-to-local timezone shift issues
      const budget = makeBudget({
        periodStart: new Date("2026-03-15T12:00:00"),
        periodEnd: new Date("2026-04-14T12:00:00"),
      });
      const result = FinancialExportService.exportBudgetsToCSV([budget]);
      const content = result.content as string;
      // toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })
      // produces something like "Mar 15, 2026"
      expect(content).toMatch(/Mar\s+15/);
    });

    // -- all CATEGORY_DISPLAY_NAMES should map --
    it("should correctly map every known category to its display name", () => {
      const categories = Object.values(BUDGET_CATEGORIES) as BudgetCategoryValue[];
      categories.forEach((cat) => {
        const budget = makeBudget({ category: cat });
        const result = FinancialExportService.exportBudgetsToCSV([budget], {
          includeHeaders: false,
        });
        const content = result.content as string;
        const expectedDisplay = CATEGORY_DISPLAY_NAMES[cat];
        expect(content).toContain(expectedDisplay);
      });
    });
  });

  // =========================================================================
  // exportBillsToCSV
  // =========================================================================
  describe("exportBillsToCSV", () => {
    it("should return a valid ExportResult with mimeType text/csv", () => {
      const result = FinancialExportService.exportBillsToCSV([]);
      expect(result.mimeType).toBe("text/csv");
    });

    it("should generate a default filename starting with 'bills-export-'", () => {
      const result = FinancialExportService.exportBillsToCSV([]);
      expect(result.filename).toMatch(/^bills-export-\d+\.csv$/);
    });

    it("should use a custom filename when provided", () => {
      const result = FinancialExportService.exportBillsToCSV([], {
        filename: "my-bills.csv",
      });
      expect(result.filename).toBe("my-bills.csv");
    });

    // -- empty array --
    it("should return only headers for an empty bills array", () => {
      const result = FinancialExportService.exportBillsToCSV([]);
      const rows = csvRows(result.content as string);
      expect(rows).toHaveLength(1);
    });

    it("should return empty content when headers disabled and array is empty", () => {
      const result = FinancialExportService.exportBillsToCSV([], {
        includeHeaders: false,
      });
      expect((result.content as string).trim()).toBe("");
    });

    // -- single bill --
    it("should export a single bill with correct row count", () => {
      const bill = makeBill();
      const result = FinancialExportService.exportBillsToCSV([bill]);
      const rows = csvRows(result.content as string);
      expect(rows).toHaveLength(2); // header + 1 data
    });

    it("should include all expected header columns for bills", () => {
      const result = FinancialExportService.exportBillsToCSV([makeBill()]);
      const headerRow = csvRows(result.content as string)[0];
      const expectedHeaders = [
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
      expectedHeaders.forEach((h) => {
        expect(headerRow).toContain(h);
      });
    });

    // -- multiple bills --
    it("should export multiple bills with the correct row count", () => {
      const bills = [
        makeBill({ id: "b1" }),
        makeBill({ id: "b2" }),
        makeBill({ id: "b3" }),
      ];
      const result = FinancialExportService.exportBillsToCSV(bills);
      const rows = csvRows(result.content as string);
      expect(rows).toHaveLength(4);
    });

    // -- optional fields null/undefined --
    it("should handle missing lastPaidDate gracefully", () => {
      const bill = makeBill({ lastPaidDate: undefined });
      const result = FinancialExportService.exportBillsToCSV([bill]);
      // Should not throw; last paid date cell should be empty
      const dataRow = csvRows(result.content as string)[1];
      expect(dataRow).toBeDefined();
    });

    it("should handle missing lastPaidAmount gracefully", () => {
      const bill = makeBill({ lastPaidAmount: undefined });
      const result = FinancialExportService.exportBillsToCSV([bill]);
      const dataRow = csvRows(result.content as string)[1];
      expect(dataRow).toBeDefined();
    });

    it("should handle missing notes gracefully", () => {
      const bill = makeBill({ notes: undefined });
      const result = FinancialExportService.exportBillsToCSV([bill]);
      const dataRow = csvRows(result.content as string)[1];
      expect(dataRow).toBeDefined();
    });

    it("should include lastPaidDate and lastPaidAmount when present", () => {
      const bill = makeBill({
        lastPaidDate: new Date("2026-01-15T12:00:00"),
        lastPaidAmount: 115,
      });
      const result = FinancialExportService.exportBillsToCSV([bill]);
      const content = result.content as string;
      expect(content).toContain("$115.00");
      expect(content).toMatch(/Jan\s+15/);
    });

    it("should display 'Yes' for auto-pay enabled and 'No' for disabled", () => {
      const billAuto = makeBill({ isAutoPay: true });
      const billManual = makeBill({ isAutoPay: false });
      const resultAuto = FinancialExportService.exportBillsToCSV([billAuto]);
      const resultManual = FinancialExportService.exportBillsToCSV([billManual]);
      expect(csvRows(resultAuto.content as string)[1]).toContain("Yes");
      expect(csvRows(resultManual.content as string)[1]).toContain("No");
    });

    it("should include notes when provided", () => {
      const bill = makeBill({ notes: "Pay before due" });
      const result = FinancialExportService.exportBillsToCSV([bill]);
      expect(result.content as string).toContain("Pay before due");
    });

    it("should format bill amount as USD currency", () => {
      const bill = makeBill({ amount: 2500.99 });
      const result = FinancialExportService.exportBillsToCSV([bill]);
      const content = result.content as string;
      expect(content).toContain("$2,500.99");
    });

    it("should return size > 0 for non-empty bills", () => {
      const result = FinancialExportService.exportBillsToCSV([makeBill()]);
      expect(result.size).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // exportSpendingToCSV
  // =========================================================================
  describe("exportSpendingToCSV", () => {
    it("should return a valid ExportResult with mimeType text/csv", () => {
      const result = FinancialExportService.exportSpendingToCSV(makeSpendingData());
      expect(result.mimeType).toBe("text/csv");
    });

    it("should generate a default filename starting with 'spending-report-'", () => {
      const result = FinancialExportService.exportSpendingToCSV(makeSpendingData());
      expect(result.filename).toMatch(/^spending-report-\d+\.csv$/);
    });

    it("should use a custom filename when provided", () => {
      const result = FinancialExportService.exportSpendingToCSV(makeSpendingData(), {
        filename: "my-spending.csv",
      });
      expect(result.filename).toBe("my-spending.csv");
    });

    // -- section headers --
    it("should include the SPENDING SUMMARY section header", () => {
      const result = FinancialExportService.exportSpendingToCSV(makeSpendingData());
      expect(result.content as string).toContain("SPENDING SUMMARY");
    });

    it("should include the SPENDING BY CATEGORY section header", () => {
      const result = FinancialExportService.exportSpendingToCSV(makeSpendingData());
      expect(result.content as string).toContain("SPENDING BY CATEGORY");
    });

    it("should include the SPENDING BY MONTH section header", () => {
      const result = FinancialExportService.exportSpendingToCSV(makeSpendingData());
      expect(result.content as string).toContain("SPENDING BY MONTH");
    });

    it("should include the TOP MERCHANTS section header", () => {
      const result = FinancialExportService.exportSpendingToCSV(makeSpendingData());
      expect(result.content as string).toContain("TOP MERCHANTS");
    });

    // -- summary data --
    it("should include formatted total spending in the summary", () => {
      const result = FinancialExportService.exportSpendingToCSV(
        makeSpendingData({ totalSpending: 4500 }),
      );
      const content = result.content as string;
      expect(content).toContain("$4,500.00");
    });

    it("should include income in the summary when provided", () => {
      const result = FinancialExportService.exportSpendingToCSV(
        makeSpendingData({ income: 6000 }),
      );
      const content = result.content as string;
      expect(content).toContain("Total Income");
      expect(content).toContain("$6,000.00");
    });

    it("should omit income line when income is not provided", () => {
      const data = makeSpendingData();
      delete (data as Record<string, unknown>).income;
      const result = FinancialExportService.exportSpendingToCSV(data);
      expect(result.content as string).not.toContain("Total Income");
    });

    it("should include net cash flow when cashFlow is provided", () => {
      const result = FinancialExportService.exportSpendingToCSV(
        makeSpendingData({ cashFlow: 1500 }),
      );
      const content = result.content as string;
      expect(content).toContain("Net Cash Flow");
      expect(content).toContain("$1,500.00");
    });

    it("should include net cash flow even when cashFlow is 0", () => {
      const result = FinancialExportService.exportSpendingToCSV(
        makeSpendingData({ cashFlow: 0 }),
      );
      const content = result.content as string;
      expect(content).toContain("Net Cash Flow");
      expect(content).toContain("$0.00");
    });

    // -- category data --
    it("should list each category with amount, percentage, and transaction count", () => {
      const result = FinancialExportService.exportSpendingToCSV(makeSpendingData());
      const content = result.content as string;
      expect(content).toContain("Groceries");
      expect(content).toContain("$800.00");
      expect(content).toContain("17.8%");
      expect(content).toContain("25");
      expect(content).toContain("Dining Out");
    });

    // -- month data --
    it("should list each month with its spending amount", () => {
      const result = FinancialExportService.exportSpendingToCSV(makeSpendingData());
      const content = result.content as string;
      expect(content).toContain("January 2026");
      expect(content).toContain("$2,200.00");
      expect(content).toContain("February 2026");
      expect(content).toContain("$2,300.00");
    });

    // -- merchants --
    it("should list top merchants with amount and transaction count", () => {
      const result = FinancialExportService.exportSpendingToCSV(makeSpendingData());
      const content = result.content as string;
      expect(content).toContain("Whole Foods");
      expect(content).toContain("$450.00");
      expect(content).toContain("Amazon");
    });

    it("should return size > 0", () => {
      const result = FinancialExportService.exportSpendingToCSV(makeSpendingData());
      expect(result.size).toBeGreaterThan(0);
    });

    // -- empty arrays --
    it("should handle empty byCategory, byMonth, topMerchants arrays", () => {
      const result = FinancialExportService.exportSpendingToCSV({
        totalSpending: 0,
        byCategory: [],
        byMonth: [],
        topMerchants: [],
      });
      const content = result.content as string;
      expect(content).toContain("SPENDING SUMMARY");
      expect(content).toContain("SPENDING BY CATEGORY");
      expect(content).toContain("SPENDING BY MONTH");
      expect(content).toContain("TOP MERCHANTS");
    });
  });

  // =========================================================================
  // exportToJSON
  // =========================================================================
  describe("exportToJSON", () => {
    it("should return mimeType application/json", () => {
      const result = FinancialExportService.exportToJSON({ key: "value" });
      expect(result.mimeType).toBe("application/json");
    });

    it("should generate a default filename starting with 'export-'", () => {
      const result = FinancialExportService.exportToJSON({ key: "value" });
      expect(result.filename).toMatch(/^export-\d+\.json$/);
    });

    it("should use a custom filename when provided", () => {
      const result = FinancialExportService.exportToJSON({ key: "value" }, {
        filename: "data.json",
      });
      expect(result.filename).toBe("data.json");
    });

    it("should produce valid JSON content with 2-space indentation", () => {
      const data = { a: 1, b: "two" };
      const result = FinancialExportService.exportToJSON(data);
      const parsed = JSON.parse(result.content as string);
      expect(parsed).toEqual(data);
      // Check indentation: second line should start with 2 spaces
      const lines = (result.content as string).split("\n");
      expect(lines[1]).toMatch(/^\s{2}"/);
    });

    it("should serialize an array", () => {
      const data = [1, 2, 3];
      const result = FinancialExportService.exportToJSON(data);
      const parsed = JSON.parse(result.content as string);
      expect(parsed).toEqual(data);
    });

    it("should serialize nested objects", () => {
      const data = { level1: { level2: { level3: "deep" } } };
      const result = FinancialExportService.exportToJSON(data);
      const parsed = JSON.parse(result.content as string);
      expect(parsed.level1.level2.level3).toBe("deep");
    });

    it("should handle a string as data", () => {
      const result = FinancialExportService.exportToJSON("hello");
      expect(JSON.parse(result.content as string)).toBe("hello");
    });

    it("should handle null as data", () => {
      const result = FinancialExportService.exportToJSON(null);
      expect(JSON.parse(result.content as string)).toBeNull();
    });

    it("should handle a number as data", () => {
      const result = FinancialExportService.exportToJSON(42);
      expect(JSON.parse(result.content as string)).toBe(42);
    });

    it("should return size > 0 for non-empty data", () => {
      const result = FinancialExportService.exportToJSON({ key: "value" });
      expect(result.size).toBeGreaterThan(0);
    });

    it("should serialize Budget objects", () => {
      const budget = makeBudget();
      const result = FinancialExportService.exportToJSON(budget);
      const parsed = JSON.parse(result.content as string);
      expect(parsed.id).toBe("budget-1");
      expect(parsed.budgetedAmount).toBe(500);
    });
  });

  // =========================================================================
  // downloadFile
  // =========================================================================
  describe("downloadFile", () => {
    let mockAnchor: {
      href: string;
      download: string;
      click: jest.Mock;
    };
    let createObjectURLMock: jest.Mock;
    let revokeObjectURLMock: jest.Mock;
    let appendChildSpy: jest.SpyInstance;
    let removeChildSpy: jest.SpyInstance;

    beforeEach(() => {
      mockAnchor = {
        href: "",
        download: "",
        click: jest.fn(),
      };

      jest.spyOn(document, "createElement").mockReturnValue(mockAnchor as unknown as HTMLElement);

      appendChildSpy = jest.spyOn(document.body, "appendChild").mockImplementation(
        (node) => node,
      );
      removeChildSpy = jest.spyOn(document.body, "removeChild").mockImplementation(
        (node) => node,
      );

      createObjectURLMock = jest.fn().mockReturnValue("blob:http://localhost/fake-url");
      revokeObjectURLMock = jest.fn();
      URL.createObjectURL = createObjectURLMock;
      URL.revokeObjectURL = revokeObjectURLMock;
    });

    it("should create an anchor element", () => {
      const exportResult: ExportResult = {
        content: "test,csv",
        filename: "test.csv",
        mimeType: "text/csv",
        size: 8,
      };
      FinancialExportService.downloadFile(exportResult);
      expect(document.createElement).toHaveBeenCalledWith("a");
    });

    it("should set href to a blob URL", () => {
      const exportResult: ExportResult = {
        content: "test,csv",
        filename: "test.csv",
        mimeType: "text/csv",
        size: 8,
      };
      FinancialExportService.downloadFile(exportResult);
      expect(mockAnchor.href).toBe("blob:http://localhost/fake-url");
    });

    it("should set the download attribute to the filename", () => {
      const exportResult: ExportResult = {
        content: "data",
        filename: "report.csv",
        mimeType: "text/csv",
        size: 4,
      };
      FinancialExportService.downloadFile(exportResult);
      expect(mockAnchor.download).toBe("report.csv");
    });

    it("should append and then remove the anchor from the DOM", () => {
      const exportResult: ExportResult = {
        content: "data",
        filename: "report.csv",
        mimeType: "text/csv",
        size: 4,
      };
      FinancialExportService.downloadFile(exportResult);
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });

    it("should click the anchor element to trigger download", () => {
      const exportResult: ExportResult = {
        content: "data",
        filename: "test.csv",
        mimeType: "text/csv",
        size: 4,
      };
      FinancialExportService.downloadFile(exportResult);
      expect(mockAnchor.click).toHaveBeenCalledTimes(1);
    });

    it("should call URL.createObjectURL with a Blob", () => {
      const exportResult: ExportResult = {
        content: "data",
        filename: "test.csv",
        mimeType: "text/csv",
        size: 4,
      };
      FinancialExportService.downloadFile(exportResult);
      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      const blobArg = createObjectURLMock.mock.calls[0][0];
      expect(blobArg).toBeInstanceOf(Blob);
    });

    it("should call URL.revokeObjectURL to clean up", () => {
      const exportResult: ExportResult = {
        content: "data",
        filename: "test.csv",
        mimeType: "text/csv",
        size: 4,
      };
      FinancialExportService.downloadFile(exportResult);
      expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:http://localhost/fake-url");
    });

    it("should handle Blob content directly without re-wrapping", () => {
      const blob = new Blob(["blob-data"], { type: "text/csv" });
      const exportResult: ExportResult = {
        content: blob,
        filename: "blob-test.csv",
        mimeType: "text/csv",
        size: 9,
      };
      FinancialExportService.downloadFile(exportResult);
      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      // When content is already a Blob, it should be passed directly
      const blobArg = createObjectURLMock.mock.calls[0][0];
      expect(blobArg).toBeInstanceOf(Blob);
    });
  });

  // =========================================================================
  // generateFinancialReport
  // =========================================================================
  describe("generateFinancialReport", () => {
    it("should return a valid ExportResult with mimeType text/csv", () => {
      const result = FinancialExportService.generateFinancialReport({});
      expect(result.mimeType).toBe("text/csv");
    });

    it("should generate a default filename starting with 'financial-report-'", () => {
      const result = FinancialExportService.generateFinancialReport({});
      expect(result.filename).toMatch(/^financial-report-\d+\.csv$/);
    });

    it("should use a custom filename when provided", () => {
      const result = FinancialExportService.generateFinancialReport({}, {
        filename: "my-report.csv",
      });
      expect(result.filename).toBe("my-report.csv");
    });

    // -- report header --
    it("should include the report title 'FYNVITA FINANCIAL REPORT'", () => {
      const result = FinancialExportService.generateFinancialReport({});
      expect(result.content as string).toContain("FYNVITA FINANCIAL REPORT");
    });

    it("should include a 'Generated:' date line", () => {
      const result = FinancialExportService.generateFinancialReport({});
      expect(result.content as string).toContain("Generated:");
    });

    it("should include date range when provided in options", () => {
      const result = FinancialExportService.generateFinancialReport({}, {
        dateRange: {
          startDate: new Date("2026-01-01T12:00:00"),
          endDate: new Date("2026-01-31T12:00:00"),
        },
      });
      const content = result.content as string;
      expect(content).toContain("Period:");
      expect(content).toMatch(/Jan\s+1/);
      expect(content).toMatch(/Jan\s+31/);
    });

    // -- budgets section --
    it("should include budgets section when budgets are provided", () => {
      const result = FinancialExportService.generateFinancialReport({
        budgets: [makeBudget()],
      });
      const content = result.content as string;
      expect(content).toContain("=== BUDGETS ===");
      expect(content).toContain("Groceries");
    });

    it("should omit budgets section when budgets array is empty", () => {
      const result = FinancialExportService.generateFinancialReport({
        budgets: [],
      });
      expect(result.content as string).not.toContain("=== BUDGETS ===");
    });

    it("should omit budgets section when budgets is undefined", () => {
      const result = FinancialExportService.generateFinancialReport({});
      expect(result.content as string).not.toContain("=== BUDGETS ===");
    });

    // -- bills section --
    it("should include bills section when bills are provided", () => {
      const result = FinancialExportService.generateFinancialReport({
        bills: [makeBill()],
      });
      const content = result.content as string;
      expect(content).toContain("=== BILLS & SUBSCRIPTIONS ===");
      expect(content).toContain("Electric Company");
    });

    it("should omit bills section when bills array is empty", () => {
      const result = FinancialExportService.generateFinancialReport({
        bills: [],
      });
      expect(result.content as string).not.toContain("=== BILLS & SUBSCRIPTIONS ===");
    });

    it("should omit bills section when bills is undefined", () => {
      const result = FinancialExportService.generateFinancialReport({});
      expect(result.content as string).not.toContain("=== BILLS & SUBSCRIPTIONS ===");
    });

    // -- spending section --
    it("should include spending section when spending data is provided", () => {
      const result = FinancialExportService.generateFinancialReport({
        spending: makeSpendingData() as Parameters<typeof FinancialExportService.generateFinancialReport>[0]["spending"],
      });
      const content = result.content as string;
      expect(content).toContain("=== SPENDING ANALYSIS ===");
      expect(content).toContain("SPENDING SUMMARY");
    });

    it("should omit spending section when spending is undefined", () => {
      const result = FinancialExportService.generateFinancialReport({});
      expect(result.content as string).not.toContain("=== SPENDING ANALYSIS ===");
    });

    // -- combined report --
    it("should include all three sections when all data is provided", () => {
      const result = FinancialExportService.generateFinancialReport({
        budgets: [makeBudget()],
        bills: [makeBill()],
        spending: makeSpendingData() as Parameters<typeof FinancialExportService.generateFinancialReport>[0]["spending"],
      });
      const content = result.content as string;
      expect(content).toContain("FYNVITA FINANCIAL REPORT");
      expect(content).toContain("=== BUDGETS ===");
      expect(content).toContain("=== BILLS & SUBSCRIPTIONS ===");
      expect(content).toContain("=== SPENDING ANALYSIS ===");
    });

    // -- with partial data (only budgets) --
    it("should work with only budgets data", () => {
      const result = FinancialExportService.generateFinancialReport({
        budgets: [
          makeBudget({ id: "b1", category: BUDGET_CATEGORIES.HOUSING }),
          makeBudget({ id: "b2", category: BUDGET_CATEGORIES.ENTERTAINMENT }),
        ],
      });
      const content = result.content as string;
      expect(content).toContain("=== BUDGETS ===");
      expect(content).toContain("Housing");
      expect(content).toContain("Entertainment");
      expect(content).not.toContain("=== BILLS");
      expect(content).not.toContain("=== SPENDING");
    });

    it("should return size > 0", () => {
      const result = FinancialExportService.generateFinancialReport({
        budgets: [makeBudget()],
      });
      expect(result.size).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // escapeCSV (tested through public methods)
  // =========================================================================
  describe("CSV escaping (via public methods)", () => {
    it("should wrap values containing commas in double quotes", () => {
      // formatCurrency produces comma-separated numbers like $1,000.00
      const budget = makeBudget({ budgetedAmount: 1500 });
      const result = FinancialExportService.exportBudgetsToCSV([budget], {
        includeHeaders: false,
      });
      const content = result.content as string;
      // "$1,500.00" should be wrapped in quotes
      expect(content).toContain('"$1,500.00"');
    });

    it("should wrap values containing double quotes and double them", () => {
      const bill = makeBill({ notes: 'He said "pay now"' });
      const result = FinancialExportService.exportBillsToCSV([bill], {
        includeHeaders: false,
      });
      const content = result.content as string;
      // The value should be wrapped in quotes with internal quotes doubled
      expect(content).toContain('"He said ""pay now"""');
    });

    it("should wrap values containing newlines in double quotes", () => {
      const bill = makeBill({ notes: "Line one\nLine two" });
      const result = FinancialExportService.exportBillsToCSV([bill], {
        includeHeaders: false,
      });
      const content = result.content as string;
      expect(content).toContain('"Line one\nLine two"');
    });

    it("should handle null/undefined values by producing empty string", () => {
      // A bill with no notes, no lastPaidDate, no lastPaidAmount
      const bill = makeBill({
        notes: undefined,
        lastPaidDate: undefined,
        lastPaidAmount: undefined,
      });
      const result = FinancialExportService.exportBillsToCSV([bill], {
        includeHeaders: false,
      });
      const content = result.content as string;
      // The row should still be valid CSV with trailing commas for empty fields
      expect(content).toBeDefined();
      // Should not contain "undefined" or "null" as text
      expect(content).not.toContain("undefined");
      expect(content).not.toContain("null");
    });

    it("should handle values with both commas and quotes", () => {
      const bill = makeBill({ notes: 'Amount is "$1,000"' });
      const result = FinancialExportService.exportBillsToCSV([bill], {
        includeHeaders: false,
      });
      const content = result.content as string;
      // Should be doubly quoted and internally escaped
      expect(content).toContain('"Amount is ""$1,000"""');
    });

    it("should leave simple values unquoted", () => {
      const bill = makeBill({ notes: "simple" });
      const result = FinancialExportService.exportBillsToCSV([bill], {
        includeHeaders: false,
      });
      const content = result.content as string;
      // "simple" at the end of the row should not be wrapped in quotes
      expect(content).toMatch(/simple\n/);
    });
  });

  // =========================================================================
  // formatCurrency (tested through public methods)
  // =========================================================================
  describe("formatCurrency (via public methods)", () => {
    it("should format whole numbers with .00", () => {
      const budget = makeBudget({ budgetedAmount: 500, spentAmount: 0 });
      const result = FinancialExportService.exportBudgetsToCSV([budget], {
        includeHeaders: false,
      });
      expect(result.content as string).toContain("$500.00");
    });

    it("should format decimal amounts correctly", () => {
      const budget = makeBudget({ budgetedAmount: 99.99, spentAmount: 0 });
      const result = FinancialExportService.exportBudgetsToCSV([budget], {
        includeHeaders: false,
      });
      expect(result.content as string).toContain("$99.99");
    });

    it("should format zero as $0.00", () => {
      const budget = makeBudget({ budgetedAmount: 0, spentAmount: 0, rolloverAmount: 0 });
      const result = FinancialExportService.exportBudgetsToCSV([budget], {
        includeHeaders: false,
      });
      expect(result.content as string).toContain("$0.00");
    });

    it("should add commas for thousands", () => {
      const budget = makeBudget({ budgetedAmount: 12345.67, spentAmount: 0 });
      const result = FinancialExportService.exportBudgetsToCSV([budget], {
        includeHeaders: false,
      });
      expect(result.content as string).toContain("$12,345.67");
    });

    it("should handle negative amounts", () => {
      // Negative remaining: spentAmount > budgetedAmount
      const budget = makeBudget({ budgetedAmount: 100, spentAmount: 250 });
      const result = FinancialExportService.exportBudgetsToCSV([budget], {
        includeHeaders: false,
      });
      const content = result.content as string;
      // remaining = 100 - 250 = -150 => "-$150.00"
      expect(content).toMatch(/-\$150\.00/);
    });
  });

  // =========================================================================
  // formatDate (tested through public methods)
  // =========================================================================
  describe("formatDate (via public methods)", () => {
    it("should format a Date object to a readable string", () => {
      // Use noon time to avoid UTC-to-local timezone shift
      const budget = makeBudget({ periodStart: new Date("2026-06-15T12:00:00") });
      const result = FinancialExportService.exportBudgetsToCSV([budget], {
        includeHeaders: false,
      });
      const content = result.content as string;
      // en-US short month format
      expect(content).toMatch(/Jun\s+15/);
    });

    it("should format a string date correctly", () => {
      const bill = makeBill({ nextDueDate: new Date("2026-12-25T12:00:00") });
      const result = FinancialExportService.exportBillsToCSV([bill], {
        includeHeaders: false,
      });
      const content = result.content as string;
      expect(content).toMatch(/Dec\s+25/);
    });

    it("should include the year in the formatted date", () => {
      // Use noon time to ensure the date stays in the expected year
      const budget = makeBudget({ periodStart: new Date("2027-01-15T12:00:00") });
      const result = FinancialExportService.exportBudgetsToCSV([budget], {
        includeHeaders: false,
      });
      expect(result.content as string).toContain("2027");
    });
  });

  // =========================================================================
  // Edge cases & integration
  // =========================================================================
  describe("edge cases", () => {
    it("should handle a budget with very large amounts", () => {
      const budget = makeBudget({
        budgetedAmount: 999999999.99,
        spentAmount: 500000000,
      });
      const result = FinancialExportService.exportBudgetsToCSV([budget]);
      expect(result.content as string).toContain("$999,999,999.99");
    });

    it("should handle a budget with all budget statuses", () => {
      const statuses: Array<"on_track" | "warning" | "over_budget" | "inactive"> = [
        "on_track",
        "warning",
        "over_budget",
        "inactive",
      ];
      statuses.forEach((status) => {
        const budget = makeBudget({ status });
        const result = FinancialExportService.exportBudgetsToCSV([budget], {
          includeHeaders: false,
        });
        expect(result.content as string).toContain(status);
      });
    });

    it("should handle all budget periods", () => {
      const periods: Array<"weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"> = [
        "weekly",
        "biweekly",
        "monthly",
        "quarterly",
        "yearly",
      ];
      periods.forEach((period) => {
        const budget = makeBudget({ period });
        const result = FinancialExportService.exportBudgetsToCSV([budget], {
          includeHeaders: false,
        });
        expect(result.content as string).toContain(period);
      });
    });

    it("should handle all bill statuses", () => {
      const statuses: BillStatus[] = ["active", "paused", "cancelled"];
      statuses.forEach((status) => {
        const bill = makeBill({ status });
        const result = FinancialExportService.exportBillsToCSV([bill], {
          includeHeaders: false,
        });
        expect(result.content as string).toContain(status);
      });
    });

    it("should handle all bill frequencies", () => {
      const frequencies: BillFrequency[] = [
        "weekly",
        "biweekly",
        "monthly",
        "quarterly",
        "yearly",
      ];
      frequencies.forEach((freq) => {
        const bill = makeBill({ frequency: freq });
        const result = FinancialExportService.exportBillsToCSV([bill], {
          includeHeaders: false,
        });
        expect(result.content as string).toContain(freq);
      });
    });

    it("should handle spending data with negative cash flow", () => {
      const result = FinancialExportService.exportSpendingToCSV(
        makeSpendingData({ cashFlow: -500 }),
      );
      const content = result.content as string;
      expect(content).toMatch(/-\$500\.00/);
    });

    it("should handle an empty financial report (no data at all)", () => {
      const result = FinancialExportService.generateFinancialReport({});
      const content = result.content as string;
      expect(content).toContain("FYNVITA FINANCIAL REPORT");
      expect(content).toContain("Generated:");
      // No sections
      expect(content).not.toContain("=== BUDGETS ===");
      expect(content).not.toContain("=== BILLS");
      expect(content).not.toContain("=== SPENDING");
    });
  });
});
