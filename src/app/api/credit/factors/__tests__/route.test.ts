/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/credit/factors (TASK-AUTH-03c).
 * GET is wrapped in withAuth; the route previously had its auth check
 * commented out.
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

import { GET } from "../route";
import { NextRequest } from "next/server";

function makeGet(): NextRequest {
  return new NextRequest("http://localhost:3000/api/credit/factors");
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Factors API – /api/credit/factors", () => {
  describe("negative-auth", () => {
    it("GET returns 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });
      const res = await GET(makeGet());
      expect(res.status).toBe(401);
    });

    it("GET admits an authenticated user (no role gate)", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      const res = await GET(makeGet());
      expect(res.status).toBe(200);
    });
  });
});
