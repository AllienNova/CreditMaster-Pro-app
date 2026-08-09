/**
 * @jest-environment node
 *
 * Negative-auth tests for /api/disputes/[id] (TASK-AUTH-03f, TASK-CRD-3).
 *
 * IDOR defence is at the service layer. The route calls user-scoped DB service
 * methods. When a caller presents another user's dispute id:
 *   – GET: getDispute returns null → route returns 404
 *   – PATCH: service throws → route returns 500
 *   – DELETE: deleteDispute returns false → route returns 404
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockGetDispute = jest.fn();
const mockUpdateDisputeStatus = jest.fn();
const mockResolveDispute = jest.fn();
const mockDeleteDispute = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/disputes/dispute-service-db", () => ({
  disputeServiceDB: {
    getDispute: (...args: unknown[]) => mockGetDispute(...args),
    updateDisputeStatus: (...args: unknown[]) =>
      mockUpdateDisputeStatus(...args),
    resolveDispute: (...args: unknown[]) => mockResolveDispute(...args),
    deleteDispute: (...args: unknown[]) => mockDeleteDispute(...args),
  },
}));

import { GET, PATCH, DELETE } from "../route";

function makeRequest(method = "GET"): NextRequest {
  const url = "http://localhost:3000/api/disputes/dispute-123";
  return {
    url,
    method,
    headers: new Headers(),
    nextUrl: new URL(url),
    json: jest.fn().mockResolvedValue({}),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/disputes/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "attacker-1", email: "attacker@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("GET returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await GET(makeRequest("GET"))).status).toBe(401);
  });

  it("PATCH returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await PATCH(makeRequest("PATCH"))).status).toBe(401);
  });

  it("DELETE returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await DELETE(makeRequest("DELETE"))).status).toBe(401);
  });

  it("GET returns 404 (IDOR) when reading another user's dispute", async () => {
    // getDispute returns null for wrong owner — route cannot distinguish
    // "not found" from "belongs to other user" (intentional, no existence leak).
    mockGetDispute.mockResolvedValue(null);
    expect((await GET(makeRequest("GET"))).status).toBe(404);
  });

  it("PATCH returns non-2xx (IDOR) when updating another user's dispute", async () => {
    // Service throws for wrong owner.
    mockUpdateDisputeStatus.mockRejectedValue(new Error("Not found"));
    const res = await PATCH(makeRequest("PATCH"));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("DELETE returns 404 (IDOR) when deleting another user's dispute", async () => {
    // deleteDispute returns false for wrong owner.
    mockDeleteDispute.mockResolvedValue(false);
    expect((await DELETE(makeRequest("DELETE"))).status).toBe(404);
  });
});

const FAKE_DISPUTE = {
  id: "dispute-123",
  userId: "user-1",
  bureau: "experian",
  itemType: "late_payment",
  itemDescription: "30-day late",
  reason: "Bank error",
  status: "draft",
  letterContent: "Dear Experian...",
  notes: null,
  createdAt: new Date(),
};

describe("happy-path – /api/disputes/[id] GET", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("returns 200 with the dispute when found", async () => {
    mockGetDispute.mockResolvedValue(FAKE_DISPUTE);

    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("dispute-123");
  });

  it("returns 500 when service throws", async () => {
    mockGetDispute.mockRejectedValue(new Error("DB error"));

    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});

describe("happy-path – /api/disputes/[id] PATCH", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  function makeRequestWithBody(body: Record<string, unknown>): NextRequest {
    const url = "http://localhost:3000/api/disputes/dispute-123";
    return {
      url,
      method: "PATCH",
      headers: new Headers(),
      nextUrl: new URL(url),
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  }

  it("returns 200 when status field is provided (updateDisputeStatus branch)", async () => {
    mockUpdateDisputeStatus.mockResolvedValue({
      ...FAKE_DISPUTE,
      status: "sent",
    });

    const res = await PATCH(makeRequestWithBody({ status: "sent" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("sent");
  });

  it("returns 200 when outcome field is provided (resolveDispute branch)", async () => {
    mockResolveDispute.mockResolvedValue({
      ...FAKE_DISPUTE,
      status: "resolved",
      outcome: "accepted",
    });

    const res = await PATCH(makeRequestWithBody({ outcome: "accepted" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.outcome).toBe("accepted");
  });

  it("returns 200 with current dispute when neither status nor outcome provided (else branch)", async () => {
    mockGetDispute.mockResolvedValue(FAKE_DISPUTE);

    const res = await PATCH(makeRequestWithBody({ responseDetails: "some detail" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("dispute-123");
  });

  it("returns 404 when else branch and dispute not found", async () => {
    mockGetDispute.mockResolvedValue(null);

    const res = await PATCH(makeRequestWithBody({}));
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Dispute not found");
  });

  it("returns 500 when service throws", async () => {
    mockUpdateDisputeStatus.mockRejectedValue(new Error("DB error"));

    const res = await PATCH(makeRequestWithBody({ status: "sent" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});

describe("happy-path – /api/disputes/[id] DELETE", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("returns 200 when dispute is successfully deleted", async () => {
    mockDeleteDispute.mockResolvedValue(true);

    const res = await DELETE(makeRequest("DELETE"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe(true);
  });

  it("returns 500 when service throws", async () => {
    mockDeleteDispute.mockRejectedValue(new Error("DB error"));

    const res = await DELETE(makeRequest("DELETE"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
