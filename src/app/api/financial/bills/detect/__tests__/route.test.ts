/**
 * Tests for /api/financial/bills/detect
 *
 * Coverage:
 * - POST endpoint (detect recurring bills)
 * - Authentication, Authorization, Validation, Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/bill-detection-service");

import { POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { billDetectionService } from "@/lib/financial/bill-detection-service";

const mockUser = { id: "user-123", email: "test@example.com", role: "premium" };

function createMockRequest(url: string, options?: { method?: string; body?: unknown }) {
  const parsedUrl = new URL(url);
  return {
    url,
    method: options?.method || "POST",
    json: jest.fn().mockResolvedValue(options?.body || {}),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

const mockDetectedBills = [
  {
    id: "detected-1",
    merchantName: "Spotify",
    amount: 9.99,
    frequency: "monthly",
    confidence: 95,
  },
];

describe("POST /api/financial/bills/detect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (billDetectionService.detectBills as jest.Mock).mockResolvedValue(mockDetectedBills);
  });

  it("should detect bills successfully with no options", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/detect", {
      method: "POST",
      body: {},
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.detectedBills).toHaveLength(1);
    expect(billDetectionService.detectBills).toHaveBeenCalledWith("user-123", {});
  });

  it("should pass date filters to detection service", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/detect", {
      method: "POST",
      body: { startDate: "2026-01-01", endDate: "2026-02-28" },
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(billDetectionService.detectBills).toHaveBeenCalledWith("user-123", {
      startDate: expect.any(Date),
      endDate: expect.any(Date),
    });
  });

  it("should pass minOccurrences and confidenceThreshold", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/detect", {
      method: "POST",
      body: { minOccurrences: "3", confidenceThreshold: "80" },
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(billDetectionService.detectBills).toHaveBeenCalledWith("user-123", {
      minOccurrences: 3,
      confidenceThreshold: 80,
    });
  });

  it("should return 400 for invalid start date", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/detect", {
      method: "POST",
      body: { startDate: "not-a-date" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid start date");
  });

  it("should return 400 for invalid end date", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/detect", {
      method: "POST",
      body: { endDate: "not-a-date" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid end date");
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/bills/detect", {
      method: "POST",
      body: {},
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const req = createMockRequest("http://localhost:3000/api/financial/bills/detect", {
      method: "POST",
      body: {},
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("should return 500 on service error", async () => {
    (billDetectionService.detectBills as jest.Mock).mockRejectedValue(new Error("DB error"));
    const req = createMockRequest("http://localhost:3000/api/financial/bills/detect", {
      method: "POST",
      body: {},
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to detect bills");
  });
});
