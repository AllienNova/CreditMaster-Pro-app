/**
 * @jest-environment node
 *
 * Disputes API route tests. Includes data-shape checks plus negative-auth
 * and IDOR coverage for the withAuth-wrapped handlers (TASK-AUTH-03f).
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockGetDispute = jest.fn();
const mockGetUserDisputes = jest.fn();
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
jest.mock("@/lib/disputes/dispute-service", () => ({
  disputeService: {
    getUserDisputes: (...args: unknown[]) => mockGetUserDisputes(...args),
    getDispute: (...args: unknown[]) => mockGetDispute(...args),
    deleteDispute: (...args: unknown[]) => mockDeleteDispute(...args),
    createDispute: jest.fn(),
    sendDispute: jest.fn(),
    updateDisputeStatus: jest.fn(),
    resolveDispute: jest.fn(),
    addNote: jest.fn(),
    addEvidence: jest.fn(),
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
    mockGetUserDisputes.mockReturnValue([]);
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

  it("PATCH returns 403 (IDOR) when mutating another user's dispute", async () => {
    mockGetDispute.mockReturnValue({ id: "d-1", userId: "victim-1" });
    const res = await PATCH(
      makeRequest("PATCH", "", { disputeId: "d-1", action: "send" }),
    );
    expect(res.status).toBe(403);
  });

  it("DELETE returns 403 (IDOR) when deleting another user's dispute", async () => {
    mockGetDispute.mockReturnValue({ id: "d-1", userId: "victim-1" });
    const res = await DELETE(makeRequest("DELETE", "?disputeId=d-1"));
    expect(res.status).toBe(403);
    expect(mockDeleteDispute).not.toHaveBeenCalled();
  });
});
