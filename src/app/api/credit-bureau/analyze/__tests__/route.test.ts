/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/credit-bureau/analyze (TASK-AUTH-03c).
 * POST is wrapped in withPermission("credit:analyze"). The base `user` role
 * holds credit:analyze, so the meaningful negative case is the 401 anon path;
 * an authenticated user is admitted past the permission gate.
 */

const mockValidate = jest.fn();
const mockResolveRole = jest.fn();
const mockSingle = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidate(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRole(...args),
}));
jest.mock("@/lib/credit-bureau/credit-bureau-service", () => ({
  CreditBureauService: { analyzeCreditReport: jest.fn() },
}));
jest.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ single: () => mockSingle() }),
        }),
      }),
    }),
  }),
}));

import { POST } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: object = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/credit-bureau/analyze", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Bureau Analyze API – /api/credit-bureau/analyze", () => {
  describe("negative-auth", () => {
    it("POST returns 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });

      const res = await POST(makeRequest());
      expect(res.status).toBe(401);
    });

    it("POST admits an authenticated user past the credit:analyze gate", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      mockSingle.mockResolvedValue({ data: null, error: null });

      // Body missing reportId -> 400, proving the request passed auth + perms.
      const res = await POST(makeRequest());
      expect(res.status).toBe(400);
    });
  });
});
