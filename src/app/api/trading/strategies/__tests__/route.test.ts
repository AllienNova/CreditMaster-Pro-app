/**
 * Tests for Trading Strategies API Routes
 *
 * Coverage:
 * - GET /api/trading/strategies (list strategies)
 * - POST /api/trading/strategies (create custom strategy)
 * - Authentication failures
 * - Input validation
 * - Filtering and pagination
 * - Duplicate slug handling
 */

import { NextRequest } from "next/server";

// ============================================================================
// MOCKS
// ============================================================================

const mockValidateFromHeaders = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: { validateFromHeaders: (...args: unknown[]) => mockValidateFromHeaders(...args) },
  JWTUser: {},
}));

const mockFrom = jest.fn();
const mockSupabaseAdmin = { from: (...args: unknown[]) => mockFrom(...args) };

jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: mockSupabaseAdmin,
}));

jest.mock("@/lib/trading/strategies/strategy-validator", () => ({
  validateStrategyDefinition: jest.fn(),
  validateStrategy: jest.fn(),
}));

import { validateStrategyDefinition } from "@/lib/trading/strategies/strategy-validator";
import { GET, POST } from "../route";

// ============================================================================
// TEST DATA
// ============================================================================

const mockUser = { id: "user-123", email: "test@example.com", role: "user" };

const mockStrategy = {
  id: "strat-001",
  user_id: "user-123",
  name: "Momentum Breakout",
  slug: "momentum-breakout",
  description: "A momentum-based strategy",
  category: "momentum",
  config: { name: "Momentum Breakout", entryRules: [], exitRules: [], positionSizing: "percent" },
  risk_params: {},
  is_system: false,
  is_public: false,
  is_active: true,
  usage_count: 5,
  created_at: "2026-02-25T00:00:00.000Z",
};

const mockSystemStrategy = {
  ...mockStrategy,
  id: "strat-sys-001",
  user_id: null,
  name: "System RSI",
  slug: "system-rsi",
  is_system: true,
  is_public: true,
};

// ============================================================================
// HELPERS
// ============================================================================

function createMockRequest(
  url: string,
  options?: { method?: string; body?: unknown },
): NextRequest {
  const parsedUrl = new URL(url);
  return {
    url,
    method: options?.method || "GET",
    json: jest.fn().mockResolvedValue(options?.body || {}),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

function setupAuth(authenticated: boolean) {
  if (authenticated) {
    mockValidateFromHeaders.mockResolvedValue({ valid: true, user: mockUser, error: null });
  } else {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null, error: "Invalid token" });
  }
}

function setupSupabaseChain(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, jest.Mock> = {
    select: jest.fn(),
    insert: jest.fn(),
    eq: jest.fn(),
    or: jest.fn(),
    order: jest.fn(),
    range: jest.fn(),
  };

  // Each method returns the chain for chaining
  for (const key of Object.keys(chain)) {
    chain[key].mockReturnValue(chain);
  }

  // Final result
  const finalResult = {
    data: overrides.data ?? [mockStrategy],
    count: overrides.count ?? 1,
    error: overrides.error ?? null,
  };

  // select, range, and order are typical terminal calls
  chain.range.mockResolvedValue(finalResult);
  chain.select.mockReturnValue(chain);

  // For insert → select → single
  const singleMock = jest.fn().mockResolvedValue({
    data: overrides.insertData ?? mockStrategy,
    error: overrides.insertError ?? null,
  });
  chain.select.mockReturnValue({ ...chain, single: singleMock });

  mockFrom.mockReturnValue(chain);

  return { chain, singleMock };
}

// ============================================================================
// TESTS: GET /api/trading/strategies
// ============================================================================

describe("GET /api/trading/strategies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    setupAuth(false);
    const req = createMockRequest("http://localhost/api/trading/strategies");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns strategies for authenticated user", async () => {
    setupAuth(true);
    const { chain } = setupSupabaseChain({
      data: [mockStrategy, mockSystemStrategy],
      count: 2,
    });
    // Make range return the final result
    chain.range.mockResolvedValue({
      data: [mockStrategy, mockSystemStrategy],
      count: 2,
      error: null,
    });

    const req = createMockRequest("http://localhost/api/trading/strategies");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.count).toBe(2);
    expect(body.limit).toBe(50);
    expect(body.offset).toBe(0);
  });

  it("filters by category", async () => {
    setupAuth(true);
    const { chain } = setupSupabaseChain();

    const req = createMockRequest("http://localhost/api/trading/strategies?category=momentum");
    await GET(req);

    expect(chain.eq).toHaveBeenCalledWith("category", "momentum");
  });

  it("supports search parameter", async () => {
    setupAuth(true);
    const { chain } = setupSupabaseChain();

    const req = createMockRequest("http://localhost/api/trading/strategies?search=breakout");
    await GET(req);

    expect(chain.or).toHaveBeenCalledWith(
      expect.stringContaining("breakout"),
    );
  });

  it("filters system-only strategies", async () => {
    setupAuth(true);
    const { chain } = setupSupabaseChain();

    const req = createMockRequest("http://localhost/api/trading/strategies?system=true");
    await GET(req);

    expect(chain.eq).toHaveBeenCalledWith("is_system", true);
  });

  it("applies limit and offset", async () => {
    setupAuth(true);
    const { chain } = setupSupabaseChain();

    const req = createMockRequest("http://localhost/api/trading/strategies?limit=10&offset=20");
    await GET(req);

    expect(chain.range).toHaveBeenCalledWith(20, 29);
  });

  it("caps limit at 100", async () => {
    setupAuth(true);
    const { chain } = setupSupabaseChain();

    const req = createMockRequest("http://localhost/api/trading/strategies?limit=500");
    await GET(req);

    // limit = Math.min(500, 100) = 100, offset defaults to 0
    expect(chain.range).toHaveBeenCalledWith(0, 99);
  });

  it("returns 500 on Supabase error", async () => {
    setupAuth(true);
    setupSupabaseChain({
      data: null,
      error: { message: "DB error" },
    });

    // Override: make range return the error
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        or: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: null,
                  count: null,
                  error: { message: "DB error" },
                }),
              }),
            }),
          }),
        }),
      }),
    });

    const req = createMockRequest("http://localhost/api/trading/strategies");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch strategies");
  });
});

// ============================================================================
// TESTS: POST /api/trading/strategies
// ============================================================================

describe("POST /api/trading/strategies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    setupAuth(false);
    const req = createMockRequest("http://localhost/api/trading/strategies", {
      method: "POST",
      body: { name: "Test", category: "momentum", config: {} },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    setupAuth(true);
    const req = createMockRequest("http://localhost/api/trading/strategies", {
      method: "POST",
      body: { category: "momentum", config: {} },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("name is required");
  });

  it("returns 400 when category is missing", async () => {
    setupAuth(true);
    const req = createMockRequest("http://localhost/api/trading/strategies", {
      method: "POST",
      body: { name: "Test Strategy", config: {} },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("category is required");
  });

  it("returns 400 when config is missing", async () => {
    setupAuth(true);
    const req = createMockRequest("http://localhost/api/trading/strategies", {
      method: "POST",
      body: { name: "Test Strategy", category: "momentum" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("config is required and must be an object");
  });

  it("validates strategy when config has entryRules", async () => {
    setupAuth(true);
    (validateStrategyDefinition as jest.Mock).mockReturnValue({
      valid: false,
      errors: [{ field: "entryRules", message: "At least one entry rule required" }],
      warnings: [],
    });

    const req = createMockRequest("http://localhost/api/trading/strategies", {
      method: "POST",
      body: {
        name: "Bad Strategy",
        category: "momentum",
        config: { name: "Bad", entryRules: [] },
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Strategy validation failed");
    expect(body.details).toBeDefined();
  });

  it("creates strategy successfully", async () => {
    setupAuth(true);
    const insertedStrategy = {
      ...mockStrategy,
      name: "New Strategy",
      slug: expect.any(String),
    };

    const singleMock = jest.fn().mockResolvedValue({
      data: insertedStrategy,
      error: null,
    });
    const selectAfterInsert = jest.fn().mockReturnValue({ single: singleMock });
    const insertMock = jest.fn().mockReturnValue({ select: selectAfterInsert });

    mockFrom.mockReturnValue({ insert: insertMock });

    const req = createMockRequest("http://localhost/api/trading/strategies", {
      method: "POST",
      body: {
        name: "New Strategy",
        category: "momentum",
        config: { indicators: ["RSI"] },
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(insertMock).toHaveBeenCalled();
  });

  it("returns 409 on duplicate slug", async () => {
    setupAuth(true);

    const singleMock = jest.fn().mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate key" },
    });
    const selectAfterInsert = jest.fn().mockReturnValue({ single: singleMock });
    const insertMock = jest.fn().mockReturnValue({ select: selectAfterInsert });

    mockFrom.mockReturnValue({ insert: insertMock });

    const req = createMockRequest("http://localhost/api/trading/strategies", {
      method: "POST",
      body: {
        name: "Duplicate Strategy",
        category: "momentum",
        config: { indicators: ["RSI"] },
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("slug already exists");
  });

  it("returns 500 on non-duplicate DB error", async () => {
    setupAuth(true);

    const singleMock = jest.fn().mockResolvedValue({
      data: null,
      error: { code: "42P01", message: "table not found" },
    });
    const selectAfterInsert = jest.fn().mockReturnValue({ single: singleMock });
    const insertMock = jest.fn().mockReturnValue({ select: selectAfterInsert });

    mockFrom.mockReturnValue({ insert: insertMock });

    const req = createMockRequest("http://localhost/api/trading/strategies", {
      method: "POST",
      body: {
        name: "Test Strategy",
        category: "momentum",
        config: { indicators: ["RSI"] },
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("sets isPublic when provided", async () => {
    setupAuth(true);

    const insertMock = jest.fn();
    const singleMock = jest.fn().mockResolvedValue({ data: mockStrategy, error: null });
    insertMock.mockReturnValue({ select: jest.fn().mockReturnValue({ single: singleMock }) });
    mockFrom.mockReturnValue({ insert: insertMock });

    const req = createMockRequest("http://localhost/api/trading/strategies", {
      method: "POST",
      body: {
        name: "Public Strategy",
        category: "momentum",
        config: { indicators: ["RSI"] },
        isPublic: true,
      },
    });
    await POST(req);

    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.is_public).toBe(true);
  });
});

// ============================================================================
// TESTS: negative-auth (TASK-AUTH-03e)
// ============================================================================

describe("negative-auth – /api/trading/strategies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth(false);
  });

  it("GET returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await GET(
      createMockRequest("http://localhost/api/trading/strategies"),
    );
    expect(res.status).toBe(401);
  });

  it("POST returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await POST(
      createMockRequest("http://localhost/api/trading/strategies", {
        method: "POST",
        body: { name: "X", category: "momentum", config: {} },
      }),
    );
    expect(res.status).toBe(401);
  });
});
