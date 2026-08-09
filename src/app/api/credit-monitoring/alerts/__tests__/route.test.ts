/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/credit-monitoring/alerts (TASK-AUTH-03c).
 * GET and PATCH are wrapped in withPermission("credit:alerts") — a
 * premium-tier permission the base `user` role does not hold.
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
jest.mock("@/lib/credit-monitoring/credit-monitoring-service", () => ({
  creditMonitoringService: {
    getAlerts: jest.fn().mockResolvedValue([]),
    markAllAlertsAsRead: jest.fn().mockResolvedValue(true),
    markAlertAsRead: jest.fn().mockResolvedValue(true),
  },
}));

import { GET, PATCH } from "../route";
import { NextRequest } from "next/server";

function makeGet(): NextRequest {
  return new NextRequest("http://localhost:3000/api/credit-monitoring/alerts");
}
function makePatch(): NextRequest {
  return new NextRequest("http://localhost:3000/api/credit-monitoring/alerts", {
    method: "PATCH",
    body: JSON.stringify({}),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Monitoring Alerts API – /api/credit-monitoring/alerts", () => {
  describe("negative-auth", () => {
    it("GET returns 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });
      const res = await GET(makeGet());
      expect(res.status).toBe(401);
    });

    it("PATCH returns 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });
      const res = await PATCH(makePatch());
      expect(res.status).toBe(401);
    });

    it("GET returns 403 when the user lacks credit:alerts permission", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      const res = await GET(makeGet());
      expect(res.status).toBe(403);
    });

    it("PATCH returns 403 when the user lacks credit:alerts permission", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      const res = await PATCH(makePatch());
      expect(res.status).toBe(403);
    });

    it("GET admits a premium user holding credit:alerts", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("premium");
      const res = await GET(makeGet());
      expect(res.status).toBe(200);
    });
  });
});
