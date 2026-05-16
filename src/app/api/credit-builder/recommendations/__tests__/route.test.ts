/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/credit-builder/recommendations (TASK-AUTH-03c).
 * GET is wrapped in withAuth.
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
    getRecommendedActions: jest.fn().mockResolvedValue([]),
  },
}));

import { GET } from "../route";
import { NextRequest } from "next/server";

function makeRequest(): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/credit-builder/recommendations",
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Builder Recommendations API – /api/credit-builder/recommendations", () => {
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
