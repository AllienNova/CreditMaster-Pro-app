/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/admin/metrics (TASK-AUTH-03a, FND-049).
 * Route is wrapped in withRole("admin"); the guard resolves auth via
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
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({})),
}));

import { GET } from "../route";
import { NextRequest } from "next/server";

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/metrics");
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Admin Metrics API – GET /api/admin/metrics", () => {
  describe("negative-auth", () => {
    it("should return 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });

      const res = await GET(makeRequest());
      expect(res.status).toBe(401);
    });

    it("should return 403 when the authenticated user is not an admin", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");

      const res = await GET(makeRequest());
      expect(res.status).toBe(403);
    });
  });
});
