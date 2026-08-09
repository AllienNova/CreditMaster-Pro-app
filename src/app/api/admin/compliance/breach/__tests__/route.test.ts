/**
 * @jest-environment node
 *
 * Negative-auth coverage for POST /api/admin/compliance/breach (TASK-CMP-02, FND-056).
 * Route is wrapped in withRole("admin"); the guard resolves auth via
 * jwtValidation.validateFromHeaders + resolveRoleFromDb and rejects before the
 * handler body runs. Mirrors the canonical admin negative-auth pattern
 * (src/app/api/admin/metrics/__tests__/route.test.ts).
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

import { POST } from "../route";
import { NextRequest } from "next/server";

function makeRequest(): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/admin/compliance/breach",
    { method: "POST" },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Admin Breach Notification API – POST /api/admin/compliance/breach", () => {
  describe("negative-auth", () => {
    it("should return 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });

      const res = await POST(makeRequest());
      expect(res.status).toBe(401);
    });

    it("should return 403 when the authenticated user is not an admin", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");

      const res = await POST(makeRequest());
      expect(res.status).toBe(403);
    });
  });
});
