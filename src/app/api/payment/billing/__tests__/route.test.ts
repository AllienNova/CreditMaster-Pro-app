/**
 * Negative-auth tests for /api/payment/billing (TASK-AUTH-03f)
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockHasPermission = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/auth/rbac", () => ({
  rbac: { hasPermission: (...args: unknown[]) => mockHasPermission(...args) },
}));
jest.mock("@/lib/payment/billing-data", () => ({ getBillingData: jest.fn() }));
jest.mock("@/lib/payment/stripe-service", () => ({ SUBSCRIPTION_PLANS: [] }));

import { GET } from "../route";

function createMockRequest(method = "GET"): NextRequest {
  const url = "http://localhost:3000/api/payment/billing";
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue({}),
    formData: jest.fn().mockResolvedValue(new Map()),
    headers: new Headers(),
    nextUrl: new URL(url),
    signal: { addEventListener: jest.fn() },
  } as unknown as NextRequest;
}

describe("negative-auth – /api/payment/billing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockHasPermission.mockReturnValue(true);
  });

  it("GET returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await GET(createMockRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("GET returns 403 when the role lacks the required permission", async () => {
    mockHasPermission.mockReturnValue(false);
    const res = await GET(createMockRequest("GET"));
    expect(res.status).toBe(403);
  });

  // WBH-03: GET handler sources from getBillingData (changed line coverage)

  it("GET returns billing data from getBillingData on success", async () => {
    const { getBillingData } = jest.requireMock("@/lib/payment/billing-data") as {
      getBillingData: jest.Mock;
    };
    const fakeBilling = {
      subscription: { planId: "pro", status: "active" },
      paymentMethods: [{ id: "pm_1", brand: "visa", last4: "4242" }],
      invoices: [{ id: "in_1", amount: 9999 }],
    };
    getBillingData.mockResolvedValue(fakeBilling);

    const res = await GET(createMockRequest("GET"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.subscription).toEqual(fakeBilling.subscription);
    expect(json.paymentMethods).toEqual(fakeBilling.paymentMethods);
    expect(json.invoices).toEqual(fakeBilling.invoices);
    expect(json.plans).toEqual([]);
  });

  it("GET returns 500 when getBillingData throws", async () => {
    const { getBillingData } = jest.requireMock("@/lib/payment/billing-data") as {
      getBillingData: jest.Mock;
    };
    getBillingData.mockRejectedValue(new Error("DB unavailable"));

    const res = await GET(createMockRequest("GET"));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toMatch(/failed to load billing profile/i);
  });

});
