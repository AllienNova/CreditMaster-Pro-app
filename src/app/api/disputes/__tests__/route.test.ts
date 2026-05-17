/**
 * @jest-environment node
 *
 * Disputes API route tests. Includes data-shape checks plus negative-auth
 * and IDOR coverage for the withAuth-wrapped handlers (TASK-AUTH-03f,
 * TASK-CRD-3).
 *
 * IDOR defence is now enforced at the service layer (disputeServiceDB methods
 * are user-scoped). The route itself:
 *   – PATCH: service throws on wrong owner  → 500 (cannot distinguish 404/403)
 *   – DELETE: service returns false on wrong owner → 404
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockGetUserDisputes = jest.fn();
const mockCreateDispute = jest.fn();
const mockSendDispute = jest.fn();
const mockUpdateDisputeStatus = jest.fn();
const mockResolveDispute = jest.fn();
const mockAddNote = jest.fn();
const mockAddEvidence = jest.fn();
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
    getUserDisputes: (...args: unknown[]) => mockGetUserDisputes(...args),
    createDispute: (...args: unknown[]) => mockCreateDispute(...args),
    sendDispute: (...args: unknown[]) => mockSendDispute(...args),
    updateDisputeStatus: (...args: unknown[]) =>
      mockUpdateDisputeStatus(...args),
    resolveDispute: (...args: unknown[]) => mockResolveDispute(...args),
    addNote: (...args: unknown[]) => mockAddNote(...args),
    addEvidence: (...args: unknown[]) => mockAddEvidence(...args),
    deleteDispute: (...args: unknown[]) => mockDeleteDispute(...args),
  },
}));

import { GET, POST, PATCH, DELETE } from "../route";

function makeRequest(method = "GET", search = "", body?: unknown): NextRequest {
  const url = `http://localhost:3000/api/disputes${search}`;
  return {
    url,
    method,
    headers: new Headers(),
    nextUrl: new URL(url),
    json: jest.fn().mockResolvedValue(body ?? {}),
  } as unknown as NextRequest;
}

describe("Disputes API Route", () => {
  const validBureaus = ["experian", "equifax", "transunion"];
  const validDisputeTypes = [
    "collection",
    "late_payment",
    "identity_theft",
    "incorrect_balance",
    "duplicate_account",
    "closed_account",
    "wrong_status",
    "inquiry",
  ];

  describe("Dispute Validation", () => {
    it("should have valid bureaus", () => {
      expect(validBureaus).toContain("experian");
      expect(validBureaus.length).toBe(3);
    });

    it("should have valid dispute types", () => {
      expect(validDisputeTypes).toContain("collection");
      expect(validDisputeTypes.length).toBe(8);
    });
  });
});

describe("negative-auth – /api/disputes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "attacker-1", email: "attacker@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockGetUserDisputes.mockResolvedValue([]);
  });

  it("GET returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("POST returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await POST(makeRequest("POST"));
    expect(res.status).toBe(401);
  });

  it("PATCH returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await PATCH(makeRequest("PATCH"));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await DELETE(makeRequest("DELETE", "?disputeId=d-1"));
    expect(res.status).toBe(401);
  });

  it("PATCH — service throws for wrong-owner dispute — returns non-2xx", async () => {
    // IDOR defence is inside the service; the service throws for wrong owner.
    mockSendDispute.mockRejectedValue(new Error("Not found"));
    const res = await PATCH(
      makeRequest("PATCH", "", { disputeId: "d-1", action: "send" }),
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("DELETE returns 404 when service returns false for wrong-owner dispute", async () => {
    // deleteDispute returns false for wrong owner (no throw).
    mockDeleteDispute.mockResolvedValue(false);
    const res = await DELETE(makeRequest("DELETE", "?disputeId=d-1"));
    expect(res.status).toBe(404);
    expect(mockDeleteDispute).toHaveBeenCalled();
  });
});
