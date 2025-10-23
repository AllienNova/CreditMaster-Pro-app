import { POST, GET } from "./route";
import { FederalIntegrationService } from "@/lib/federal-integration-service";
import { NextRequest } from "next/server";
import { createRequest } from "node-mocks-http";

// Mock the FederalIntegrationService
jest.mock("@/lib/federal-integration-service");

describe("/api/federal-programs", () => {
  let req: any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST", () => {
    it("should call submitFreshStartApplication for fresh-start program type", async () => {
      const applicationData = { loan_id: "123", user_id: "456" };
      req = createRequest({
        method: "POST",
        json: () => Promise.resolve({ programType: "fresh-start", applicationData }),
      });

      await POST(req as NextRequest);

      expect(
        FederalIntegrationService.prototype.submitFreshStartApplication
      ).toHaveBeenCalledWith(applicationData);
    });

    it("should call submitRehabilitationApplication for rehabilitation program type", async () => {
      const applicationData = { loan_id: "123", user_id: "456" };
      req = createRequest({
        method: "POST",
        json: () =>
          Promise.resolve({ programType: "rehabilitation", applicationData }),
      });

      await POST(req as NextRequest);

      expect(
        FederalIntegrationService.prototype.submitRehabilitationApplication
      ).toHaveBeenCalledWith(applicationData);
    });

    it("should call submitConsolidationApplication for consolidation program type", async () => {
      const applicationData = { loan_id: "123", user_id: "456" };
      req = createRequest({
        method: "POST",
        json: () =>
          Promise.resolve({ programType: "consolidation", applicationData }),
      });

      await POST(req as NextRequest);

      expect(
        FederalIntegrationService.prototype.submitConsolidationApplication
      ).toHaveBeenCalledWith(applicationData);
    });

    it("should return a 400 error for an invalid program type", async () => {
      const applicationData = { loan_id: "123", user_id: "456" };
      req = createRequest({
        method: "POST",
        json: () =>
          Promise.resolve({ programType: "invalid-type", applicationData }),
      });

      const response = await POST(req as NextRequest);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe("Invalid program type");
    });
  });

  describe("GET", () => {
    it("should call trackApplicationStatus with the provided application ID", async () => {
      const applicationId = "test-app-id";
      req = createRequest({
        method: "GET",
        url: `/?applicationId=${applicationId}`,
      });

      await GET(req as NextRequest);

      expect(
        FederalIntegrationService.prototype.trackApplicationStatus
      ).toHaveBeenCalledWith(applicationId);
    });

    it("should return a 400 error if no application ID is provided", async () => {
      req = createRequest({
        method: "GET",
        url: "/",
      });

      const response = await GET(req as NextRequest);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe("Application ID is required");
    });
  });
});
