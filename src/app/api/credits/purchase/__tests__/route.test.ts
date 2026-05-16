/**
 * Negative-auth tests for /api/credits/purchase (TASK-AUTH-03f)
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
jest.mock("@/lib/supabase/server", () => ({ supabaseAdmin: {} }));
jest.mock("@/lib/payment/stripe-service", () => ({
  stripeService: {
    createCustomer: jest.fn(),
    createCreditPackCheckoutSession: jest.fn(),
  },
}));

import { POST } from "../route";

function createMockRequest(): NextRequest {
  const url = "http://localhost:3000/api/credits/purchase";
  return {
    url,
    method: "POST",
    json: jest.fn().mockResolvedValue({ packType: "starter" }),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/credits/purchase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("POST returns 401 when the request is not authenticated", async () => {
    const res = await POST(createMockRequest());
    expect(res.status).toBe(401);
  });
});
