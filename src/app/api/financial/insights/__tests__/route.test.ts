/**
 * Tests for /api/financial/insights
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/smart-insights-engine");

import { GET, POST, PATCH } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { smartInsightsEngine } from "@/lib/financial/smart-insights-engine";

const mockUser = { id: "user-123", email: "test@example.com", role: "premium" };

function createMockRequest(
  url: string,
  method = "GET",
  body?: Record<string, unknown>,
) {
  const parsedUrl = new URL(url);
  return {
    url,
    method,
    headers: new Headers(),
    nextUrl: parsedUrl,
    json: jest.fn().mockResolvedValue(body || {}),
  } as unknown as NextRequest;
}

const mockInsights = [
  {
    id: "ins-1",
    title: "Reduce dining spending",
    type: "savings_opportunity",
    priority: "high",
    dismissed: false,
    createdAt: "2026-01-15T00:00:00Z",
    actionUrl: "/budgets",
    actionLabel: "View Budgets",
  },
  {
    id: "ins-2",
    title: "Emergency fund low",
    type: "warning",
    priority: "critical",
    dismissed: false,
    createdAt: "2026-01-14T00:00:00Z",
  },
];

const mockGenerateResult = {
  insights: mockInsights,
  generatedAt: "2026-01-15T10:00:00Z",
  processingTimeMs: 250,
  aiModelUsed: "smart-insights-v2",
  dataSourcesUsed: ["transactions", "budgets"],
};

describe("GET /api/financial/insights", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (smartInsightsEngine.generateInsights as jest.Mock).mockResolvedValue(
      mockGenerateResult,
    );
    (smartInsightsEngine.getStoredInsights as jest.Mock).mockResolvedValue(
      mockInsights,
    );
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const request = createMockRequest(
        "http://localhost:3000/api/financial/insights",
      );
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 for user without financial:read permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);
      const request = createMockRequest(
        "http://localhost:3000/api/financial/insights",
      );
      const response = await GET(request);
      expect(response.status).toBe(403);
    });
  });

  it("should generate and return insights successfully", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/insights",
    );
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
    expect(data._meta.source).toBe("generated");
    expect(smartInsightsEngine.generateInsights).toHaveBeenCalledWith(
      "user-123",
      expect.any(Object),
    );
  });

  it("should return stored insights when stored=true", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/insights?stored=true",
    );
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data._meta.source).toBe("stored");
    expect(smartInsightsEngine.getStoredInsights).toHaveBeenCalledWith(
      "user-123",
      expect.any(Object),
    );
  });

  it("should return 500 on service error", async () => {
    (smartInsightsEngine.generateInsights as jest.Mock).mockRejectedValue(
      new Error("AI service error"),
    );
    const request = createMockRequest(
      "http://localhost:3000/api/financial/insights",
    );
    const response = await GET(request);
    expect(response.status).toBe(500);
  });
});

describe("POST /api/financial/insights", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (smartInsightsEngine.dismissInsight as jest.Mock).mockResolvedValue(true);
    (smartInsightsEngine.recordAction as jest.Mock).mockResolvedValue(true);
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const request = createMockRequest(
        "http://localhost:3000/api/financial/insights",
        "POST",
        { insightId: "ins-1", action: "dismiss" },
      );
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 for user without financial:write permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);
      const request = createMockRequest(
        "http://localhost:3000/api/financial/insights",
        "POST",
        { insightId: "ins-1", action: "dismiss" },
      );
      const response = await POST(request);
      expect(response.status).toBe(403);
    });
  });

  it("should return 400 if insightId is missing", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/insights",
      "POST",
      { action: "dismiss" },
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should dismiss an insight successfully", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/insights",
      "POST",
      { insightId: "ins-1", action: "dismiss" },
    );
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(smartInsightsEngine.dismissInsight).toHaveBeenCalledWith(
      "ins-1",
      "user-123",
    );
  });

  it("should record a custom action on insight", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/insights",
      "POST",
      { insightId: "ins-1", action: "viewed" },
    );
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(smartInsightsEngine.recordAction).toHaveBeenCalledWith(
      "ins-1",
      "user-123",
      "viewed",
    );
  });

  it("should return 400 if action is missing", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/insights",
      "POST",
      { insightId: "ins-1" },
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

describe("PATCH /api/financial/insights", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (smartInsightsEngine.dismissInsight as jest.Mock).mockResolvedValue(true);
    (smartInsightsEngine.recordAction as jest.Mock).mockResolvedValue(true);
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const request = createMockRequest(
        "http://localhost:3000/api/financial/insights",
        "PATCH",
        { insightIds: ["ins-1"], action: "dismiss" },
      );
      const response = await PATCH(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 for user without financial:write permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);
      const request = createMockRequest(
        "http://localhost:3000/api/financial/insights",
        "PATCH",
        { insightIds: ["ins-1"], action: "dismiss" },
      );
      const response = await PATCH(request);
      expect(response.status).toBe(403);
    });
  });

  it("should return 400 for invalid bulk operation schema", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/insights",
      "PATCH",
      { insightIds: [], action: "dismiss" },
    );
    const response = await PATCH(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Validation failed");
  });

  it("should process bulk dismiss successfully", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/insights",
      "PATCH",
      { insightIds: ["ins-1", "ins-2"], action: "dismiss" },
    );
    const response = await PATCH(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.processed).toBe(2);
    expect(data.data.successful).toBe(2);
  });

  it("should process bulk mark_read successfully", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/insights",
      "PATCH",
      { insightIds: ["ins-1"], action: "mark_read" },
    );
    const response = await PATCH(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(smartInsightsEngine.recordAction).toHaveBeenCalledWith(
      "ins-1",
      "user-123",
      "viewed",
    );
  });
});
