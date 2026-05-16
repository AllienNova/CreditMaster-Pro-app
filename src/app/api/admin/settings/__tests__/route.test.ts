/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/admin/settings (TASK-AUTH-03a, FND-049).
 * Both GET and POST are wrapped in withRole("admin"); the guard resolves auth
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

import { GET, POST } from "../route";
import { NextRequest } from "next/server";

function makeRequest(method = "GET"): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/settings", {
    method,
  } as never);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Admin Settings API – /api/admin/settings", () => {
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

    it("POST should return 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });

      const res = await POST(makeRequest("POST"));
      expect(res.status).toBe(401);
    });

    it("POST should return 403 when the authenticated user is not an admin", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");

      const res = await POST(makeRequest("POST"));
      expect(res.status).toBe(403);
    });
  });
});
