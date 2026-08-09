/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/credit-bureau/dispute (TASK-AUTH-03c).
 * POST is wrapped in withPermission("disputes:create"). The base `user` role
 * holds disputes:create, so the meaningful negative case is the 401 anon path.
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
jest.mock("@/lib/credit-bureau/credit-bureau-service", () => ({
  CreditBureauService: { submitDispute: jest.fn() },
}));
jest.mock("@/lib/security/input-validation", () => ({
  validateInput: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
}));

import { POST } from "../route";
import { NextRequest } from "next/server";

function makePost(): NextRequest {
  return new NextRequest("http://localhost:3000/api/credit-bureau/dispute", {
    method: "POST",
    body: JSON.stringify({}),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Bureau Dispute API – /api/credit-bureau/dispute", () => {
  describe("negative-auth", () => {
    it("POST returns 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });
      const res = await POST(makePost());
      expect(res.status).toBe(401);
    });

    it("POST admits an authenticated user past the disputes:create gate", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      // Missing required fields -> 400, proving the request passed auth + perms.
      const res = await POST(makePost());
      expect(res.status).toBe(400);
    });
  });
});
