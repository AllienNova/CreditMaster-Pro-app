/**
 * Tests for /api/financial/export
 */

import { NextRequest } from "next/server";

// Mock NextResponse to support both constructor and static .json() calls
const mockNextResponseInstance = {
  status: 200,
  headers: new Headers(),
};

// We need to mock next/server because the route uses `new NextResponse(...)` constructor
// AND `NextResponse.json(...)` static method. The mock must survive resetMocks.
const mockJsonStatic = jest.fn().mockImplementation((data: unknown, init?: { status?: number }) => ({
  status: init?.status || 200,
  headers: new Headers(),
  json: jest.fn().mockResolvedValue(data),
}));

jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server");

  function MockNextResponse(
    body?: string | null,
    init?: { status?: number; headers?: Headers },
  ) {
    const headers = new Headers(init?.headers);
    return {
      status: init?.status || 200,
      headers,
      text: jest.fn().mockResolvedValue(body || ""),
      json: jest.fn().mockResolvedValue({}),
    };
  }

  MockNextResponse.json = mockJsonStatic;

  return {
    ...actual,
    NextResponse: MockNextResponse,
  };
});

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/financial/budget-service");
jest.mock("@/lib/financial/bill-detection-service");
jest.mock("@/lib/financial/spending-analysis-service");
jest.mock("@/lib/financial/export-service");

import { GET } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { budgetService } from "@/lib/financial/budget-service";
import { billDetectionService } from "@/lib/financial/bill-detection-service";
import { spendingAnalysisService } from "@/lib/financial/spending-analysis-service";
import { FinancialExportService } from "@/lib/financial/export-service";

const mockUser = { id: "user-123", email: "test@example.com", role: "premium" };

function createMockRequest(url: string) {
  const parsedUrl = new URL(url);
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

const mockBudgets = [
  { id: "b1", name: "Groceries", limit: 500, spent: 350 },
];
const mockBills = [{ id: "bill1", name: "Electricity", amount: 120 }];
const mockExportResult = {
  content: "col1,col2\nval1,val2",
  filename: "budgets.csv",
  mimeType: "text/csv",
  size: 25,
};

describe("GET /api/financial/export", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-setup NextResponse.json since clearAllMocks strips it
    mockJsonStatic.mockImplementation((data: unknown, init?: { status?: number }) => ({
      status: init?.status || 200,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue(data),
    }));
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (budgetService.getBudgetsByUser as jest.Mock).mockResolvedValue(
      mockBudgets,
    );
    (billDetectionService.getBillsByUser as jest.Mock).mockResolvedValue(
      mockBills,
    );
    (
      FinancialExportService.exportBudgetsToCSV as jest.Mock
    ).mockReturnValue(mockExportResult);
    (
      FinancialExportService.exportBillsToCSV as jest.Mock
    ).mockReturnValue({ ...mockExportResult, filename: "bills.csv" });
    (
      FinancialExportService.generateFinancialReport as jest.Mock
    ).mockReturnValue({
      ...mockExportResult,
      filename: "financial-report.csv",
    });
    (FinancialExportService.exportToJSON as jest.Mock).mockReturnValue({
      content: "{}",
      filename: "budgets.json",
      mimeType: "application/json",
      size: 2,
    });
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });
    const request = createMockRequest(
      "http://localhost:3000/api/financial/export",
    );
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should export budgets as CSV", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/export?type=budgets",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain("budgets.csv");
    expect(budgetService.getBudgetsByUser).toHaveBeenCalledWith("user-123");
  });

  it("should export bills as CSV", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/export?type=bills",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(billDetectionService.getBillsByUser).toHaveBeenCalledWith(
      "user-123",
    );
  });

  it("should export all data when type=all", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/export?type=all",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(budgetService.getBudgetsByUser).toHaveBeenCalledWith("user-123");
    expect(billDetectionService.getBillsByUser).toHaveBeenCalledWith(
      "user-123",
    );
  });

  it("should export as JSON when format=json", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/export?type=budgets&format=json",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(FinancialExportService.exportToJSON).toHaveBeenCalled();
  });

  it("should return 500 on service error", async () => {
    (budgetService.getBudgetsByUser as jest.Mock).mockRejectedValue(
      new Error("Database error"),
    );
    const request = createMockRequest(
      "http://localhost:3000/api/financial/export?type=budgets",
    );
    const response = await GET(request);
    expect(response.status).toBe(500);
  });
});
