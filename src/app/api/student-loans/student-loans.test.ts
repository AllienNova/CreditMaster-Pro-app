import { GET } from "./route";
import { FederalIntegrationService } from "@/lib/federal-integration-service";
import { NextRequest } from "next/server";
import { createRequest } from "node-mocks-http";

// Mock the FederalIntegrationService
jest.mock("@/lib/federal-integration-service");

// Mock authentication
jest.mock('@/lib/auth/jwt-validation', () => ({
  jwtValidation: {
    validateFromHeaders: jest.fn(),
  },
}));

jest.mock('@/lib/auth/rbac', () => ({
  rbac: {
    hasPermission: jest.fn(),
  },
}));

import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';

describe("/api/student-loans", () => {
  let req: ReturnType<typeof createRequest>;
  const mockUser = { id: 'user-123', email: 'test@example.com', name: 'Test User', role: 'user' };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authentication
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });

    // Mock authorization
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
  });

  describe("GET", () => {
    it("should return student loan data for authenticated user", async () => {
      req = createRequest({
        method: "GET",
        url: "/",
      });

      // Mock the service method
      const mockRetrieveNSLDSData = jest.fn().mockResolvedValue({
        success: true,
        loans: [
          {
            loan_id: 'loan-1',
            loan_type: 'Direct Subsidized',
            balance: 10000,
            interest_rate: 4.5,
          },
        ],
        total_debt: 10000,
      });

      // Mock the service instance method
      jest.spyOn(FederalIntegrationService.prototype, 'retrieveNSLDSData').mockImplementation(mockRetrieveNSLDSData);

      const response = await GET(req as NextRequest);
      const json = await response.json();

      // Should be called with the authenticated user's ID (from mockUser)
      expect(mockRetrieveNSLDSData).toHaveBeenCalledWith(mockUser.id);
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.loans).toHaveLength(1);
    });

    it("should return 401 if not authenticated", async () => {
      req = createRequest({
        method: "GET",
        url: "/",
      });

      // Mock authentication failure
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const response = await GET(req as NextRequest);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe("Unauthorized");
    });
  });
});
