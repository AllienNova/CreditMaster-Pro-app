/**
 * Tests for Trading Strategy [id] API Routes
 *
 * Coverage:
 * - GET /api/trading/strategies/[id] (fetch single)
 * - PUT /api/trading/strategies/[id] (update owned)
 * - DELETE /api/trading/strategies/[id] (soft-delete owned)
 * - Authentication failures
 * - Authorization (ownership + system protection)
 * - Input validation
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

import { GET, PUT, DELETE } from "../[id]/route";

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
  config: {},
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
  is_system: true,
  is_public: true,
};

const mockOtherUserStrategy = {
  ...mockStrategy,
  id: "strat-other-001",
  user_id: "other-user-456",
  is_public: false,
  is_active: true,
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

// ============================================================================
// TESTS: GET /api/trading/strategies/[id]
// ============================================================================

describe("GET /api/trading/strategies/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    setupAuth(false);
    const req = createMockRequest("http://localhost/api/trading/strategies/strat-001");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns strategy when user owns it", async () => {
    setupAuth(true);

    // First call: select → eq → single (fetch strategy)
    const singleMock = jest.fn().mockResolvedValue({ data: mockStrategy, error: null });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

    // Second call: update usage_count
    const updateEqMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({ eq: updateEqMock });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return { select: selectMock };
      }
      return { update: updateMock };
    });

    const req = createMockRequest("http://localhost/api/trading/strategies/strat-001");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("Momentum Breakout");
  });

  it("returns system strategy for any authenticated user", async () => {
    setupAuth(true);

    const singleMock = jest.fn().mockResolvedValue({ data: mockSystemStrategy, error: null });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const updateEqMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({ eq: updateEqMock });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { select: selectMock };
      return { update: updateMock };
    });

    const req = createMockRequest("http://localhost/api/trading/strategies/strat-sys-001");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 404 for non-owned private strategy", async () => {
    setupAuth(true);

    const singleMock = jest.fn().mockResolvedValue({ data: mockOtherUserStrategy, error: null });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

    mockFrom.mockReturnValue({ select: selectMock });

    const req = createMockRequest("http://localhost/api/trading/strategies/strat-other-001");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("returns 404 when strategy does not exist", async () => {
    setupAuth(true);

    const singleMock = jest.fn().mockResolvedValue({ data: null, error: { message: "not found" } });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

    mockFrom.mockReturnValue({ select: selectMock });

    const req = createMockRequest("http://localhost/api/trading/strategies/nonexistent");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("increments usage count on successful fetch", async () => {
    setupAuth(true);

    const singleMock = jest.fn().mockResolvedValue({ data: mockStrategy, error: null });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const updateEqMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({ eq: updateEqMock });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { select: selectMock };
      return { update: updateMock };
    });

    const req = createMockRequest("http://localhost/api/trading/strategies/strat-001");
    await GET(req);

    expect(updateMock).toHaveBeenCalledWith({ usage_count: 6 });
  });
});

// ============================================================================
// TESTS: PUT /api/trading/strategies/[id]
// ============================================================================

describe("PUT /api/trading/strategies/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    setupAuth(false);
    const req = createMockRequest("http://localhost/api/trading/strategies/strat-001", {
      method: "PUT",
      body: { name: "Updated" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it("returns 404 when strategy does not exist", async () => {
    setupAuth(true);

    const singleMock = jest.fn().mockResolvedValue({ data: null, error: { message: "not found" } });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

    mockFrom.mockReturnValue({ select: selectMock });

    const req = createMockRequest("http://localhost/api/trading/strategies/nonexistent", {
      method: "PUT",
      body: { name: "Updated" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(404);
  });

  it("returns 403 when updating another user's strategy", async () => {
    setupAuth(true);

    const singleMock = jest.fn().mockResolvedValue({
      data: { id: "strat-other", user_id: "other-user-456", is_system: false },
      error: null,
    });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

    mockFrom.mockReturnValue({ select: selectMock });

    const req = createMockRequest("http://localhost/api/trading/strategies/strat-other", {
      method: "PUT",
      body: { name: "Stolen" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("your own");
  });

  it("returns 403 when updating a system strategy", async () => {
    setupAuth(true);

    const singleMock = jest.fn().mockResolvedValue({
      data: { id: "strat-sys", user_id: "user-123", is_system: true },
      error: null,
    });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

    mockFrom.mockReturnValue({ select: selectMock });

    const req = createMockRequest("http://localhost/api/trading/strategies/strat-sys", {
      method: "PUT",
      body: { name: "Hacked System" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("System strategies");
  });

  it("returns 400 when no fields to update", async () => {
    setupAuth(true);

    const singleMock = jest.fn().mockResolvedValue({
      data: { id: "strat-001", user_id: "user-123", is_system: false },
      error: null,
    });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

    mockFrom.mockReturnValue({ select: selectMock });

    const req = createMockRequest("http://localhost/api/trading/strategies/strat-001", {
      method: "PUT",
      body: {},
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("No fields");
  });

  it("updates strategy successfully", async () => {
    setupAuth(true);

    // First call: verify ownership
    const verifySingleMock = jest.fn().mockResolvedValue({
      data: { id: "strat-001", user_id: "user-123", is_system: false },
      error: null,
    });
    const verifyEqMock = jest.fn().mockReturnValue({ single: verifySingleMock });
    const verifySelectMock = jest.fn().mockReturnValue({ eq: verifyEqMock });

    // Second call: update
    const updatedStrategy = { ...mockStrategy, name: "Updated Name" };
    const updateSingleMock = jest.fn().mockResolvedValue({ data: updatedStrategy, error: null });
    const updateSelectMock = jest.fn().mockReturnValue({ single: updateSingleMock });
    const updateEqMock = jest.fn().mockReturnValue({ select: updateSelectMock });
    const updateMock = jest.fn().mockReturnValue({ eq: updateEqMock });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { select: verifySelectMock };
      return { update: updateMock };
    });

    const req = createMockRequest("http://localhost/api/trading/strategies/strat-001", {
      method: "PUT",
      body: { name: "Updated Name", description: "New desc" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Updated Name", description: "New desc" }),
    );
  });

  it("maps camelCase body to snake_case DB fields", async () => {
    setupAuth(true);

    const verifySingleMock = jest.fn().mockResolvedValue({
      data: { id: "strat-001", user_id: "user-123", is_system: false },
      error: null,
    });
    const verifyEqMock = jest.fn().mockReturnValue({ single: verifySingleMock });
    const verifySelectMock = jest.fn().mockReturnValue({ eq: verifyEqMock });

    const updateSingleMock = jest.fn().mockResolvedValue({ data: mockStrategy, error: null });
    const updateSelectMock = jest.fn().mockReturnValue({ single: updateSingleMock });
    const updateEqMock = jest.fn().mockReturnValue({ select: updateSelectMock });
    const updateMock = jest.fn().mockReturnValue({ eq: updateEqMock });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { select: verifySelectMock };
      return { update: updateMock };
    });

    const req = createMockRequest("http://localhost/api/trading/strategies/strat-001", {
      method: "PUT",
      body: { isPublic: true, riskParams: { maxLoss: 5 }, degradationFactor: 0.8 },
    });
    await PUT(req);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        is_public: true,
        risk_params: { maxLoss: 5 },
        degradation_factor: 0.8,
      }),
    );
  });
});

// ============================================================================
// TESTS: DELETE /api/trading/strategies/[id]
// ============================================================================

describe("DELETE /api/trading/strategies/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    setupAuth(false);
    const req = createMockRequest("http://localhost/api/trading/strategies/strat-001", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("returns 404 when strategy does not exist", async () => {
    setupAuth(true);

    const singleMock = jest.fn().mockResolvedValue({ data: null, error: { message: "not found" } });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

    mockFrom.mockReturnValue({ select: selectMock });

    const req = createMockRequest("http://localhost/api/trading/strategies/nonexistent", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });

  it("returns 403 when deleting another user's strategy", async () => {
    setupAuth(true);

    const singleMock = jest.fn().mockResolvedValue({
      data: { id: "strat-other", user_id: "other-user-456", is_system: false },
      error: null,
    });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

    mockFrom.mockReturnValue({ select: selectMock });

    const req = createMockRequest("http://localhost/api/trading/strategies/strat-other", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  it("returns 403 when deleting a system strategy", async () => {
    setupAuth(true);

    const singleMock = jest.fn().mockResolvedValue({
      data: { id: "strat-sys", user_id: "user-123", is_system: true },
      error: null,
    });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

    mockFrom.mockReturnValue({ select: selectMock });

    const req = createMockRequest("http://localhost/api/trading/strategies/strat-sys", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("System strategies");
  });

  it("soft-deletes strategy successfully", async () => {
    setupAuth(true);

    // Verify ownership
    const singleMock = jest.fn().mockResolvedValue({
      data: { id: "strat-001", user_id: "user-123", is_system: false },
      error: null,
    });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

    // Soft-delete
    const updateEqMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({ eq: updateEqMock });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { select: selectMock };
      return { update: updateMock };
    });

    const req = createMockRequest("http://localhost/api/trading/strategies/strat-001", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe("Strategy deleted");
    expect(updateMock).toHaveBeenCalledWith({ is_active: false });
  });
});
