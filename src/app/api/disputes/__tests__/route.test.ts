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

// ─────────────────────────────────────────────────────────────────────────────
// Happy-path and branch coverage for GET, POST, PATCH, DELETE
// ─────────────────────────────────────────────────────────────────────────────

const FAKE_DISPUTE = {
  id: "d-1",
  userId: "user-1",
  bureau: "experian",
  itemType: "late_payment",
  itemDescription: "desc",
  reason: "error",
  status: "draft",
  letterContent: "",
  notes: null,
  createdAt: new Date(),
};

describe("GET /api/disputes — authenticated paths", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("returns 200 with paginated disputes", async () => {
    mockGetUserDisputes.mockResolvedValue([FAKE_DISPUTE]);
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.total).toBe(1);
  });

  it("filters by bureau when query param is set", async () => {
    const transunionDispute = { ...FAKE_DISPUTE, bureau: "transunion" };
    mockGetUserDisputes.mockResolvedValue([FAKE_DISPUTE, transunionDispute]);

    const res = await GET(makeRequest("GET", "?bureau=transunion"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].bureau).toBe("transunion");
  });

  it("returns 500 when service throws", async () => {
    mockGetUserDisputes.mockRejectedValue(new Error("db down"));
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(500);
  });
});

describe("POST /api/disputes — authenticated paths", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("returns 201/200 and created dispute on success", async () => {
    mockCreateDispute.mockResolvedValue(FAKE_DISPUTE);
    const res = await POST(
      makeRequest("POST", "", {
        bureau: "experian",
        itemDescription: "late payment desc",
        reason: "bank error",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("d-1");
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(
      makeRequest("POST", "", { bureau: "experian" }),
    );
    expect(res.status).toBe(400);
  });

  it("falls back to creditorName when itemDescription is absent", async () => {
    mockCreateDispute.mockResolvedValue(FAKE_DISPUTE);
    const res = await POST(
      makeRequest("POST", "", {
        bureau: "equifax",
        creditorName: "Big Bank",
        reason: "not mine",
      }),
    );
    expect(res.status).toBe(200);
    expect(mockCreateDispute).toHaveBeenCalledWith(
      "user-1",
      "equifax",
      "general",
      "Big Bank",
      "not mine",
      "",
    );
  });

  it("falls back to disputeReason when reason is absent", async () => {
    mockCreateDispute.mockResolvedValue(FAKE_DISPUTE);
    await POST(
      makeRequest("POST", "", {
        bureau: "transunion",
        itemDescription: "desc",
        disputeReason: "reason via alias",
      }),
    );
    expect(mockCreateDispute).toHaveBeenCalledWith(
      "user-1",
      "transunion",
      "general",
      "desc",
      "reason via alias",
      "",
    );
  });

  it("returns 500 when service throws", async () => {
    mockCreateDispute.mockRejectedValue(new Error("db error"));
    const res = await POST(
      makeRequest("POST", "", {
        bureau: "experian",
        itemDescription: "desc",
        reason: "reason",
      }),
    );
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/disputes — action branches", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("returns 400 when disputeId or action is missing", async () => {
    const res = await PATCH(makeRequest("PATCH", "", { disputeId: "d-1" }));
    expect(res.status).toBe(400);
  });

  it("action=send returns 200", async () => {
    mockSendDispute.mockResolvedValue(FAKE_DISPUTE);
    const res = await PATCH(
      makeRequest("PATCH", "", { disputeId: "d-1", action: "send" }),
    );
    expect(res.status).toBe(200);
    expect(mockSendDispute).toHaveBeenCalledWith("d-1", "user-1");
  });

  it("action=update_status returns 400 when status is missing", async () => {
    const res = await PATCH(
      makeRequest("PATCH", "", { disputeId: "d-1", action: "update_status" }),
    );
    expect(res.status).toBe(400);
  });

  it("action=update_status returns 200 with status", async () => {
    mockUpdateDisputeStatus.mockResolvedValue(FAKE_DISPUTE);
    const res = await PATCH(
      makeRequest("PATCH", "", {
        disputeId: "d-1",
        action: "update_status",
        status: "under_review",
      }),
    );
    expect(res.status).toBe(200);
    expect(mockUpdateDisputeStatus).toHaveBeenCalledWith("d-1", "user-1", "under_review");
  });

  it("action=resolve returns 400 when outcome is missing", async () => {
    const res = await PATCH(
      makeRequest("PATCH", "", { disputeId: "d-1", action: "resolve" }),
    );
    expect(res.status).toBe(400);
  });

  it("action=resolve returns 200 with outcome", async () => {
    mockResolveDispute.mockResolvedValue(FAKE_DISPUTE);
    const res = await PATCH(
      makeRequest("PATCH", "", {
        disputeId: "d-1",
        action: "resolve",
        outcome: "removed",
      }),
    );
    expect(res.status).toBe(200);
    expect(mockResolveDispute).toHaveBeenCalledWith("d-1", "user-1", "removed");
  });

  it("action=add_note returns 400 when note is missing", async () => {
    const res = await PATCH(
      makeRequest("PATCH", "", { disputeId: "d-1", action: "add_note" }),
    );
    expect(res.status).toBe(400);
  });

  it("action=add_note returns 200 with note", async () => {
    mockAddNote.mockResolvedValue(FAKE_DISPUTE);
    const res = await PATCH(
      makeRequest("PATCH", "", {
        disputeId: "d-1",
        action: "add_note",
        note: "my note",
      }),
    );
    expect(res.status).toBe(200);
    expect(mockAddNote).toHaveBeenCalledWith("d-1", "user-1", "my note");
  });

  it("action=add_evidence returns 400 when evidenceUrl is missing", async () => {
    const res = await PATCH(
      makeRequest("PATCH", "", { disputeId: "d-1", action: "add_evidence" }),
    );
    expect(res.status).toBe(400);
  });

  it("action=add_evidence returns 200 with evidenceUrl", async () => {
    mockAddEvidence.mockResolvedValue(FAKE_DISPUTE);
    const res = await PATCH(
      makeRequest("PATCH", "", {
        disputeId: "d-1",
        action: "add_evidence",
        evidenceUrl: "https://example.com/doc.pdf",
      }),
    );
    expect(res.status).toBe(200);
    expect(mockAddEvidence).toHaveBeenCalledWith(
      "d-1",
      "user-1",
      "https://example.com/doc.pdf",
    );
  });

  it("invalid action returns 400", async () => {
    const res = await PATCH(
      makeRequest("PATCH", "", { disputeId: "d-1", action: "unknown_action" }),
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/disputes — authenticated paths", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("returns 400 when disputeId is missing", async () => {
    const res = await DELETE(makeRequest("DELETE"));
    expect(res.status).toBe(400);
  });

  it("returns 200 when delete succeeds", async () => {
    mockDeleteDispute.mockResolvedValue(true);
    const res = await DELETE(makeRequest("DELETE", "?disputeId=d-1"));
    expect(res.status).toBe(200);
    expect(mockDeleteDispute).toHaveBeenCalledWith("d-1", "user-1");
  });
});
