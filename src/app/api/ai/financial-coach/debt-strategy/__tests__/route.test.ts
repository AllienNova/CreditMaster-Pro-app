/**
 * Debt Strategy API Route Tests
 *
 * Tests for POST /api/ai/financial-coach/debt-strategy endpoint.
 * Route wrapped in withAuth (TASK-AUTH-03f); auth resolves via
 * jwtValidation.validateFromHeaders + resolveRoleFromDb.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/supabase/client", () => ({
  getSupabase: jest.fn(() => ({})),
}));
jest.mock("@/lib/financial/financial-context-engine", () => ({
  financialContextEngine: {
    getFinancialContext: jest.fn(),
  },
}));
jest.mock("@/lib/financial/debt-strategy-optimizer", () => ({
  debtStrategyOptimizer: {
    compareStrategies: jest.fn(),
    calculateSnowball: jest.fn(),
    calculateAvalanche: jest.fn(),
  },
}));

import { POST } from "../route";

const mockDebts = [
  {
    id: "debt-1",
    name: "Credit Card",
    balance: 5000,
    interestRate: 18.5,
    minimumPayment: 150,
  },
  {
    id: "debt-2",
    name: "Personal Loan",
    balance: 10000,
    interestRate: 12.0,
    minimumPayment: 300,
  },
];

function createMockRequest(body: unknown): NextRequest {
  const url = "http://localhost:3000/api/ai/financial-coach/debt-strategy";
  return {
    url,
    method: "POST",
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("POST /api/ai/financial-coach/debt-strategy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-123", email: "test@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  describe("negative-auth", () => {
    it("returns 401 when the request is not authenticated", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });

      const response = await POST(
        createMockRequest({ debts: mockDebts, extraPayment: 200 }),
      );

      expect(response.status).toBe(401);
    });
  });

  describe("Request Validation", () => {
    it("should return 400 if debts array is empty", async () => {
      const response = await POST(
        createMockRequest({ debts: [], extraPayment: 200 }),
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("should return 400 if debt has negative balance", async () => {
      const invalidDebts = [{ ...mockDebts[0], balance: -1000 }];

      const response = await POST(
        createMockRequest({ debts: invalidDebts, extraPayment: 200 }),
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should return 400 if interest rate exceeds 100%", async () => {
      const invalidDebts = [{ ...mockDebts[0], interestRate: 150 }];

      const response = await POST(
        createMockRequest({ debts: invalidDebts, extraPayment: 200 }),
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
