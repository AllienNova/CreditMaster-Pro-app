/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/admin/users (TASK-AUTH-03a, FND-049).
 * Both GET and PATCH are wrapped in withRole("admin"); the guard resolves auth
 * via jwtValidation.validateFromHeaders + resolveRoleFromDb.
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

import { GET, PATCH } from "../route";
import { NextRequest } from "next/server";

function makeRequest(method = "GET"): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/users", {
    method,
  } as never);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Admin Users API – /api/admin/users", () => {
  describe("negative-auth", () => {
    it("GET should return 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });

      const res = await GET(makeRequest("GET"));
      expect(res.status).toBe(401);
    });

    it("GET should return 403 when the authenticated user is not an admin", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");

      const res = await GET(makeRequest("GET"));
      expect(res.status).toBe(403);
    });

    it("PATCH should return 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });

      const res = await PATCH(makeRequest("PATCH"));
      expect(res.status).toBe(401);
    });

    it("PATCH should return 403 when the authenticated user is not an admin", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");

      const res = await PATCH(makeRequest("PATCH"));
      expect(res.status).toBe(403);
    });
  });
});
