/**
 * Tests for /api/financial/openapi
 */

jest.mock("@/lib/api/generated-openapi-spec", () => ({
  generatedOpenAPISpec: {
    openapi: "3.0.0",
    info: {
      title: "Financial API",
      version: "1.0.0",
    },
    paths: {
      "/api/financial/dashboard": {
        get: { summary: "Get financial dashboard" },
      },
    },
  },
}));

import { GET } from "../route";

describe("GET /api/financial/openapi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return OpenAPI spec without authentication", async () => {
    const response = await GET();
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.openapi).toBe("3.0.0");
    expect(data.info.title).toBe("Financial API");
    expect(data.paths).toBeDefined();
  });

  it("should set correct Content-Type header", async () => {
    const response = await GET();
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it("should set Cache-Control header", async () => {
    const response = await GET();
    expect(response.headers.get("Cache-Control")).toContain("max-age=3600");
  });
});
