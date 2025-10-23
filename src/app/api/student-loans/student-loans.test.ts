import { GET } from "./route";
import { FederalIntegrationService } from "@/lib/federal-integration-service";
import { NextRequest } from "next/server";
import { createRequest } from "node-mocks-http";

// Mock the FederalIntegrationService
jest.mock("@/lib/federal-integration-service");

describe("/api/student-loans", () => {
  let req: any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should call retrieveNSLDSData with the provided user ID", async () => {
      const userId = "test-user-id";
      req = createRequest({
        method: "GET",
        url: `/?userId=${userId}`,
      });

      await GET(req as NextRequest);

      expect(
        FederalIntegrationService.prototype.retrieveNSLDSData
      ).toHaveBeenCalledWith(userId);
    });

    it("should return a 400 error if no user ID is provided", async () => {
      req = createRequest({
        method: "GET",
        url: "/",
      });

      const response = await GET(req as NextRequest);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe("User ID is required");
    });
  });
});
