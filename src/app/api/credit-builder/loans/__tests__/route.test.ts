/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/credit-builder/loans (TASK-AUTH-03c).
 * GET is wrapped in withAuth; the guard resolves auth via
 * jwtValidation.validateFromHeaders + resolveRoleFromDb.
 */

const mockValidate = jest.fn();
const mockResolveRole = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidate(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRole(...args),
}));
jest.mock("@/lib/credit-builder/credit-builder-service", () => ({
  creditBuilderService: {
    getCreditBuilderLoans: jest.fn().mockResolvedValue([]),
  },
}));

import { GET } from "../route";
import { NextRequest } from "next/server";

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/credit-builder/loans");
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Builder Loans API – /api/credit-builder/loans", () => {
  describe("negative-auth", () => {
    it("GET returns 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });

      const res = await GET(makeRequest());
      expect(res.status).toBe(401);
    });

    it("GET admits an authenticated user (no role gate)", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");

      const res = await GET(makeRequest());
      expect(res.status).toBe(200);
    });
  });
});
