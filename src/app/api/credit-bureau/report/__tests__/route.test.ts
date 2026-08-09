/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/credit-bureau/report (TASK-AUTH-03c).
 * GET and POST are wrapped in withPermission("credit:read"). The base `user`
 * role holds credit:read, so the meaningful negative case is the 401 anon path.
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
  CreditBureauService: {
    getCreditReport: jest.fn().mockResolvedValue({ success: true }),
    getAllCreditReports: jest.fn().mockResolvedValue([]),
  },
}));

import { GET, POST } from "../route";
import { NextRequest } from "next/server";

function makeGet(): NextRequest {
  return new NextRequest("http://localhost:3000/api/credit-bureau/report");
}
function makePost(): NextRequest {
  return new NextRequest("http://localhost:3000/api/credit-bureau/report", {
    method: "POST",
    body: JSON.stringify({}),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Bureau Report API – /api/credit-bureau/report", () => {
  describe("negative-auth", () => {
    it("GET returns 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });
      const res = await GET(makeGet());
      expect(res.status).toBe(401);
    });

    it("POST returns 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });
      const res = await POST(makePost());
      expect(res.status).toBe(401);
    });

    it("GET admits an authenticated user past the credit:read gate", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      const res = await GET(makeGet());
      expect(res.status).toBe(200);
    });

    it("POST admits an authenticated user past the credit:read gate", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      // Missing bureau -> 400, proving the request passed auth + perms.
      const res = await POST(makePost());
      expect(res.status).toBe(400);
    });
  });
});
