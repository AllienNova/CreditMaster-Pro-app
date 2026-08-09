import type { NextRequest } from "next/server";

// Route wrapped in withPermission("financial:read") (TASK-AUTH-03f); the guard
// resolves auth via jwtValidation.validateFromHeaders + resolveRoleFromDb, then
// checks rbac.hasPermission against the DB-resolved role.
jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: jest.fn(),
  },
}));

jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn(),
}));

jest.mock("@/lib/auth/rbac", () => ({
  rbac: {
    hasPermission: jest.fn(),
  },
}));

jest.mock("@/lib/affiliate/product-matcher", () => ({
  productMatcher: {
    matchProducts: jest.fn().mockReturnValue([]),
  },
}));

jest.mock("@/lib/affiliate/credit-card-matcher", () => ({
  creditCardMatcher: {
    getRecommendations: jest.fn().mockReturnValue([]),
  },
}));

jest.mock("@/lib/affiliate/insurance-matcher", () => ({
  insuranceMatcher: {
    getRecommendations: jest.fn().mockReturnValue([]),
  },
}));

jest.mock("@/lib/affiliate/loan-matcher", () => ({
  loanMatcher: {
    getRecommendations: jest.fn().mockReturnValue([]),
  },
}));

jest.mock("@/lib/affiliate/moneylion-client", () => ({
  moneyLionClient: {
    getProductCatalog: jest.fn().mockResolvedValue([]),
    trackClick: jest.fn().mockResolvedValue({ clickId: "click-123" }),
  },
}));

jest.mock("@/lib/affiliate/compliance-checker", () => ({
  complianceChecker: {
    getRequiredDisclosures: jest.fn().mockReturnValue([]),
  },
}));

import { GET, POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { resolveRoleFromDb } from "@/lib/auth/resolve-role";
import { rbac } from "@/lib/auth/rbac";
import { creditCardMatcher } from "@/lib/affiliate/credit-card-matcher";
import { insuranceMatcher } from "@/lib/affiliate/insurance-matcher";
import { loanMatcher } from "@/lib/affiliate/loan-matcher";
import { productMatcher } from "@/lib/affiliate/product-matcher";
import { moneyLionClient } from "@/lib/affiliate/moneylion-client";

const mockJwt = jwtValidation.validateFromHeaders as jest.Mock;
const mockResolveRole = resolveRoleFromDb as jest.Mock;
const mockRbac = rbac.hasPermission as jest.Mock;

function createMockRequest(
  url: string,
  options?: { method?: string; body?: unknown; headers?: Record<string, string> },
) {
  const parsedUrl = new URL(url);
  return {
    url,
    method: options?.method || "GET",
    json: jest.fn().mockResolvedValue(options?.body || {}),
    headers: new Headers(options?.headers || {}),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

const validUser = {
  valid: true,
  user: { id: "user-1", email: "test@example.com", role: "premium" },
};

describe("GET /api/affiliate/offers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJwt.mockResolvedValue(validUser);
    mockResolveRole.mockResolvedValue("premium");
    mockRbac.mockReturnValue(true);
  });

  describe("negative-auth", () => {
    it("returns 401 when not authenticated", async () => {
      mockJwt.mockResolvedValue({ valid: false, user: null });

      const req = createMockRequest(
        "http://localhost:3000/api/affiliate/offers",
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 403 when missing financial:read permission", async () => {
      mockRbac.mockReturnValue(false);

      const req = createMockRequest(
        "http://localhost:3000/api/affiliate/offers",
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe("Forbidden");
    });
  });

  it("returns all categories by default", async () => {
    const req = createMockRequest("http://localhost:3000/api/affiliate/offers");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty("creditCards");
    expect(json.data).toHaveProperty("loans");
    expect(json.data).toHaveProperty("insurance");
    expect(json.meta.category).toBe("all");
  });

  it("filters by credit_card category", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/affiliate/offers?category=credit_card",
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveProperty("creditCards");
    expect(json.data).not.toHaveProperty("loans");
    expect(json.data).not.toHaveProperty("insurance");
  });

  it("filters by loan category", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/affiliate/offers?category=loan",
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveProperty("loans");
    expect(json.data).not.toHaveProperty("creditCards");
  });

  it("filters by insurance category", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/affiliate/offers?category=insurance",
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveProperty("insurance");
    expect(json.data).not.toHaveProperty("creditCards");
  });

  it("passes limit parameter to matchers", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/affiliate/offers?category=credit_card&limit=5",
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(creditCardMatcher.getRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" }),
      expect.objectContaining({ limit: 5 }),
    );
    expect(json.meta.limit).toBe(5);
  });

  it("caps limit at 50", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/affiliate/offers?category=credit_card&limit=100",
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.meta.limit).toBe(50);
  });

  it("passes profile parameters from query string", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/affiliate/offers?category=loan&creditScore=720&annualIncome=75000&state=CA",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(loanMatcher.getRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        creditScore: 720,
        annualIncome: 75000,
        state: "CA",
      }),
      undefined,
      10,
    );
  });

  it("passes subType for loan filtering", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/affiliate/offers?category=loan&subType=personal",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(loanMatcher.getRecommendations).toHaveBeenCalledWith(
      expect.any(Object),
      "personal",
      10,
    );
  });

  it("passes subType for insurance filtering", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/affiliate/offers?category=insurance&subType=auto",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(insuranceMatcher.getRecommendations).toHaveBeenCalledWith(
      expect.any(Object),
      "auto",
      10,
    );
  });

  it("fetches general catalog when category is general", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/affiliate/offers?category=general",
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveProperty("general");
    expect(moneyLionClient.getProductCatalog).toHaveBeenCalled();
    expect(productMatcher.matchProducts).toHaveBeenCalled();
  });

  it("handles service errors gracefully", async () => {
    (creditCardMatcher.getRecommendations as jest.Mock).mockImplementation(
      () => {
        throw new Error("Service unavailable");
      },
    );

    const req = createMockRequest("http://localhost:3000/api/affiliate/offers");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Failed to fetch affiliate offers");
  });
});

describe("POST /api/affiliate/offers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJwt.mockResolvedValue(validUser);
    mockResolveRole.mockResolvedValue("premium");
    mockRbac.mockReturnValue(true);
    // resetMocks: true in jest.config clears mock implementations — re-set them
    (moneyLionClient.trackClick as jest.Mock).mockResolvedValue({ clickId: "click-123" });
    (moneyLionClient.getProductCatalog as jest.Mock).mockResolvedValue([]);
  });

  describe("negative-auth", () => {
    it("returns 401 when not authenticated", async () => {
      mockJwt.mockResolvedValue({ valid: false, user: null });

      const req = createMockRequest(
        "http://localhost:3000/api/affiliate/offers",
        {
          method: "POST",
          body: { productId: "p-1", partnerId: "partner-1" },
        },
      );
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 403 when missing permission", async () => {
      mockRbac.mockReturnValue(false);

      const req = createMockRequest(
        "http://localhost:3000/api/affiliate/offers",
        {
          method: "POST",
          body: { productId: "p-1", partnerId: "partner-1" },
        },
      );
      const res = await POST(req);

      expect(res.status).toBe(403);
    });
  });

  it("returns 400 when productId is missing", async () => {
    const req = createMockRequest("http://localhost:3000/api/affiliate/offers", {
      method: "POST",
      body: { partnerId: "partner-1" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("productId");
  });

  it("returns 400 when partnerId is missing", async () => {
    const req = createMockRequest("http://localhost:3000/api/affiliate/offers", {
      method: "POST",
      body: { productId: "p-1" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("partnerId");
  });

  it("tracks click and returns clickId", async () => {
    const req = createMockRequest("http://localhost:3000/api/affiliate/offers", {
      method: "POST",
      body: { productId: "p-1", partnerId: "partner-1", source: "dashboard" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.clickId).toBe("click-123");
    expect(moneyLionClient.trackClick).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        productId: "p-1",
        partnerId: "partner-1",
        source: "dashboard",
      }),
    );
  });

  it("includes disclosures when product is found in catalog", async () => {
    (moneyLionClient.getProductCatalog as jest.Mock).mockResolvedValue([
      { productId: "p-1", name: "Test Card" },
    ]);

    const req = createMockRequest("http://localhost:3000/api/affiliate/offers", {
      method: "POST",
      body: { productId: "p-1", partnerId: "partner-1" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveProperty("disclosures");
  });

  it("handles service errors gracefully", async () => {
    (moneyLionClient.trackClick as jest.Mock).mockRejectedValue(
      new Error("API down"),
    );

    const req = createMockRequest("http://localhost:3000/api/affiliate/offers", {
      method: "POST",
      body: { productId: "p-1", partnerId: "partner-1" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Failed to track affiliate click");
  });
});
