/**
 * @jest-environment node
 *
 * Unit tests for DisputeServiceDB covering the changed lines on the
 * remediation/wave-7-foundation branch (TASK-CRD-3):
 *
 *  - createDispute: happy path + error
 *  - getDispute: not-found (PGRST116) + generic error
 *  - getUserDisputes: happy path + error
 *  - sendDispute: happy path + error
 *  - updateDisputeStatus: happy path (resolved transition) + error
 *  - resolveDispute: happy path + error
 *  - addNote: no existing notes branch + existing notes branch + error
 *  - addEvidence: delegates to addNote
 *  - getUserDisputeStats: full stat calculation paths
 *  - deleteDispute: happy path + error branch
 *
 * Supabase is mocked with the standard chainable mock used across this file
 * family. The IDOR-specific scenarios live in dispute-service-db.idor.test.ts
 * and are not duplicated here.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Supabase mock ─────────────────────────────────────────────────────────────

let queryResult: { data: any; error: any } = { data: null, error: null };
const singleResults: Array<{ data: any; error: any }> = [];

const mockSupabaseChain: Record<string, jest.Mock> = {};

const chainMethods = [
  "insert",
  "select",
  "eq",
  "order",
  "limit",
  "update",
  "delete",
];

for (const method of chainMethods) {
  mockSupabaseChain[method] = jest.fn(() => mockSupabaseChain);
}

mockSupabaseChain.single = jest.fn(() => {
  if (singleResults.length > 0) {
    return Promise.resolve(singleResults.shift());
  }
  return Promise.resolve(queryResult);
});

(mockSupabaseChain as any).then = function (
  resolve: (v: any) => any,
  reject: (e: any) => any,
) {
  return Promise.resolve(queryResult).then(resolve, reject);
};

jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: jest.fn(() => ({
    from: jest.fn(() => mockSupabaseChain),
  })),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { disputeServiceDB } from "../dispute-service-db";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const mockedGetSupabase = getServiceRoleClient as jest.MockedFunction<typeof getServiceRoleClient>;

// ── Helpers ───────────────────────────────────────────────────────────────────

import type { Database } from "../../supabase/types";

type DisputeRow = Database["public"]["Tables"]["disputes"]["Row"];

function makeDisputeRow(overrides: Partial<DisputeRow> = {}): DisputeRow {
  return {
    id: "dispute-1",
    user_id: "user-1",
    bureau: "experian",
    item_type: "late_payment",
    item_description: "30-day late on account",
    reason: "Bank error in their records",
    letter_content: "Dear Experian, I dispute this item...",
    status: "draft",
    outcome: null,
    notes: null,
    created_at: new Date().toISOString(),
    sent_at: null,
    resolved_at: null,
    ...overrides,
  };
}

// ── Reset mocks between tests ─────────────────────────────────────────────────

beforeEach(() => {
  for (const method of [...chainMethods, "single"]) {
    mockSupabaseChain[method].mockClear();
  }

  for (const method of chainMethods) {
    mockSupabaseChain[method].mockImplementation(() => mockSupabaseChain);
  }
  mockSupabaseChain.single.mockImplementation(() => {
    if (singleResults.length > 0) {
      return Promise.resolve(singleResults.shift());
    }
    return Promise.resolve(queryResult);
  });

  mockedGetSupabase.mockReturnValue({
    from: jest.fn(() => mockSupabaseChain),
  } as any);

  queryResult = { data: null, error: null };
  singleResults.length = 0;
});

// ═══════════════════════════════════════════════════════════════════════════════
// createDispute
// ═══════════════════════════════════════════════════════════════════════════════

describe("DisputeServiceDB.createDispute", () => {
  it("creates a dispute and returns mapped Dispute", async () => {
    const row = makeDisputeRow();
    singleResults.push({ data: row, error: null });

    const result = await disputeServiceDB.createDispute(
      "user-1",
      "experian",
      "late_payment",
      "30-day late on account",
      "Bank error in their records",
      "Dear Experian...",
    );

    expect(result.id).toBe(row.id);
    expect(result.userId).toBe(row.user_id);
    expect(result.bureau).toBe("experian");
    expect(result.status).toBe("draft");
    expect(result.notes).toBeNull();
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(mockSupabaseChain.insert).toHaveBeenCalled();
  });

  it("throws when Supabase insert fails", async () => {
    singleResults.push({
      data: null,
      error: { message: "insert failed" },
    });

    await expect(
      disputeServiceDB.createDispute(
        "user-1",
        "equifax",
        "collection",
        "Unknown collection",
        "Not my debt",
        "",
      ),
    ).rejects.toThrow("Failed to create dispute: insert failed");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getDispute
// ═══════════════════════════════════════════════════════════════════════════════

describe("DisputeServiceDB.getDispute", () => {
  it("returns null for PGRST116 (not found)", async () => {
    singleResults.push({
      data: null,
      error: { code: "PGRST116", message: "Not found" },
    });

    const result = await disputeServiceDB.getDispute("dispute-1", "user-1");
    expect(result).toBeNull();
  });

  it("throws on non-PGRST116 errors", async () => {
    singleResults.push({
      data: null,
      error: { code: "XXXXX", message: "db error" },
    });

    await expect(
      disputeServiceDB.getDispute("dispute-1", "user-1"),
    ).rejects.toThrow("Failed to fetch dispute: db error");
  });

  it("returns dispute with notes populated", async () => {
    const row = makeDisputeRow({ notes: "some note text" });
    singleResults.push({ data: row, error: null });

    const result = await disputeServiceDB.getDispute("dispute-1", "user-1");
    expect(result).not.toBeNull();
    expect(result!.notes).toBe("some note text");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getUserDisputes
// ═══════════════════════════════════════════════════════════════════════════════

describe("DisputeServiceDB.getUserDisputes", () => {
  it("returns all disputes for a user", async () => {
    queryResult = {
      data: [makeDisputeRow({ id: "d-1" }), makeDisputeRow({ id: "d-2" })],
      error: null,
    };

    const result = await disputeServiceDB.getUserDisputes("user-1");
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("d-1");
  });

  it("throws when Supabase returns an error", async () => {
    queryResult = { data: null, error: { message: "query failed" } };

    await expect(
      disputeServiceDB.getUserDisputes("user-1"),
    ).rejects.toThrow("Failed to fetch user disputes: query failed");
  });

  it("returns empty array when no disputes exist", async () => {
    queryResult = { data: [], error: null };

    const result = await disputeServiceDB.getUserDisputes("user-1");
    expect(result).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// sendDispute
// ═══════════════════════════════════════════════════════════════════════════════

describe("DisputeServiceDB.sendDispute", () => {
  it("sends a dispute and returns updated Dispute with status sent", async () => {
    const row = makeDisputeRow({
      status: "sent",
      sent_at: new Date().toISOString(),
    });
    singleResults.push({ data: row, error: null });

    const result = await disputeServiceDB.sendDispute("dispute-1", "user-1");

    expect(result.status).toBe("sent");
    expect(result.sentAt).toBeInstanceOf(Date);
    expect(mockSupabaseChain.update).toHaveBeenCalled();
  });

  it("throws when Supabase update fails", async () => {
    singleResults.push({
      data: null,
      error: { message: "update failed" },
    });

    await expect(
      disputeServiceDB.sendDispute("dispute-1", "user-1"),
    ).rejects.toThrow("Failed to send dispute: update failed");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// updateDisputeStatus
// ═══════════════════════════════════════════════════════════════════════════════

describe("DisputeServiceDB.updateDisputeStatus", () => {
  it("updates status to under_review", async () => {
    const row = makeDisputeRow({ status: "under_review" });
    singleResults.push({ data: row, error: null });

    const result = await disputeServiceDB.updateDisputeStatus(
      "dispute-1",
      "user-1",
      "under_review",
    );

    expect(result.status).toBe("under_review");
    expect(mockSupabaseChain.update).toHaveBeenCalled();
  });

  it("sets resolved_at when status is resolved", async () => {
    const row = makeDisputeRow({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    });
    singleResults.push({ data: row, error: null });

    const result = await disputeServiceDB.updateDisputeStatus(
      "dispute-1",
      "user-1",
      "resolved",
    );

    expect(result.resolvedAt).toBeInstanceOf(Date);
  });

  it("throws when Supabase update fails", async () => {
    singleResults.push({
      data: null,
      error: { message: "status update failed" },
    });

    await expect(
      disputeServiceDB.updateDisputeStatus("dispute-1", "user-1", "sent"),
    ).rejects.toThrow("Failed to update dispute status: status update failed");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// resolveDispute
// ═══════════════════════════════════════════════════════════════════════════════

describe("DisputeServiceDB.resolveDispute", () => {
  it("resolves a dispute with outcome and sets resolved_at", async () => {
    const row = makeDisputeRow({
      status: "resolved",
      outcome: "removed",
      resolved_at: new Date().toISOString(),
    });
    singleResults.push({ data: row, error: null });

    const result = await disputeServiceDB.resolveDispute(
      "dispute-1",
      "user-1",
      "removed",
    );

    expect(result.outcome).toBe("removed");
    expect(result.resolvedAt).toBeInstanceOf(Date);
    expect(mockSupabaseChain.update).toHaveBeenCalled();
  });

  it("throws when Supabase update fails", async () => {
    singleResults.push({
      data: null,
      error: { message: "resolve failed" },
    });

    await expect(
      disputeServiceDB.resolveDispute("dispute-1", "user-1", "updated"),
    ).rejects.toThrow("Failed to resolve dispute: resolve failed");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// addNote
// ═══════════════════════════════════════════════════════════════════════════════

describe("DisputeServiceDB.addNote", () => {
  it("appends note to empty notes field", async () => {
    // getDispute returns dispute with null notes
    singleResults.push({ data: makeDisputeRow({ notes: null }), error: null });
    // update returns dispute with the new note
    singleResults.push({
      data: makeDisputeRow({ notes: "first note" }),
      error: null,
    });

    const result = await disputeServiceDB.addNote(
      "dispute-1",
      "user-1",
      "first note",
    );

    expect(result.notes).toBe("first note");
    expect(mockSupabaseChain.update).toHaveBeenCalled();
  });

  it("appends note with double-newline separator when notes already exist", async () => {
    singleResults.push({
      data: makeDisputeRow({ notes: "existing note" }),
      error: null,
    });
    singleResults.push({
      data: makeDisputeRow({ notes: "existing note\n\nsecond note" }),
      error: null,
    });

    const result = await disputeServiceDB.addNote(
      "dispute-1",
      "user-1",
      "second note",
    );

    expect(result.notes).toBe("existing note\n\nsecond note");
  });

  it("throws when dispute is not found (IDOR: wrong user)", async () => {
    singleResults.push({
      data: null,
      error: { code: "PGRST116", message: "Not found" },
    });

    await expect(
      disputeServiceDB.addNote("dispute-1", "user-other", "note"),
    ).rejects.toThrow("Dispute not found");
  });

  it("throws when Supabase update fails after successful read", async () => {
    singleResults.push({ data: makeDisputeRow(), error: null });
    singleResults.push({ data: null, error: { message: "note update failed" } });

    await expect(
      disputeServiceDB.addNote("dispute-1", "user-1", "note"),
    ).rejects.toThrow("Failed to add note: note update failed");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// addEvidence
// ═══════════════════════════════════════════════════════════════════════════════

describe("DisputeServiceDB.addEvidence", () => {
  it("delegates to addNote with evidence prefix", async () => {
    const evidenceNote = "[evidence] https://example.com/proof.pdf";
    singleResults.push({ data: makeDisputeRow({ notes: null }), error: null });
    singleResults.push({
      data: makeDisputeRow({ notes: evidenceNote }),
      error: null,
    });

    const result = await disputeServiceDB.addEvidence(
      "dispute-1",
      "user-1",
      "https://example.com/proof.pdf",
    );

    expect(result.notes).toBe(evidenceNote);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getUserDisputeStats
// ═══════════════════════════════════════════════════════════════════════════════

describe("DisputeServiceDB.getUserDisputeStats", () => {
  it("returns zeroes when there are no disputes", async () => {
    queryResult = { data: [], error: null };

    const stats = await disputeServiceDB.getUserDisputeStats("user-1");

    expect(stats.total).toBe(0);
    expect(stats.active).toBe(0);
    expect(stats.resolved).toBe(0);
    expect(stats.successRate).toBe(0);
    expect(stats.averageResolutionDays).toBe(0);
  });

  it("calculates stats correctly with mixed disputes", async () => {
    const now = Date.now();
    queryResult = {
      data: [
        makeDisputeRow({ id: "d-1", status: "sent" }),
        makeDisputeRow({ id: "d-2", status: "under_review" }),
        makeDisputeRow({
          id: "d-3",
          status: "resolved",
          outcome: "removed",
          sent_at: new Date(now - 10 * 86400000).toISOString(),
          resolved_at: new Date(now).toISOString(),
        }),
        makeDisputeRow({
          id: "d-4",
          status: "resolved",
          outcome: "verified",
          sent_at: new Date(now - 5 * 86400000).toISOString(),
          resolved_at: new Date(now).toISOString(),
        }),
      ],
      error: null,
    };

    const stats = await disputeServiceDB.getUserDisputeStats("user-1");

    expect(stats.total).toBe(4);
    expect(stats.active).toBe(2); // sent + under_review
    expect(stats.resolved).toBe(2);
    expect(stats.successRate).toBe(50); // 1 of 2 resolved is successful (removed)
    expect(stats.averageResolutionDays).toBeGreaterThan(0);
  });

  it("handles resolved disputes without sentAt/resolvedAt (no resolution time)", async () => {
    queryResult = {
      data: [
        makeDisputeRow({
          id: "d-1",
          status: "resolved",
          outcome: "updated",
          sent_at: null,
          resolved_at: null,
        }),
      ],
      error: null,
    };

    const stats = await disputeServiceDB.getUserDisputeStats("user-1");
    expect(stats.resolved).toBe(1);
    expect(stats.averageResolutionDays).toBe(0); // no sentAt/resolvedAt means no calc
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// deleteDispute
// ═══════════════════════════════════════════════════════════════════════════════

describe("DisputeServiceDB.deleteDispute", () => {
  it("returns true when delete succeeds", async () => {
    // delete().eq().eq() resolves via thenable with no error
    queryResult = { data: null, error: null };

    const result = await disputeServiceDB.deleteDispute("dispute-1", "user-1");
    expect(result).toBe(true);
    expect(mockSupabaseChain.delete).toHaveBeenCalled();
  });

  it("returns false when Supabase returns an error", async () => {
    queryResult = { data: null, error: { message: "delete failed" } };

    const result = await disputeServiceDB.deleteDispute("dispute-1", "user-1");
    expect(result).toBe(false);
  });
});
