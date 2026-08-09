/**
 * IDOR regression tests for DisputeServiceDB (TASK-CRD-3)
 *
 * Confirms that all resource-keyed methods are scoped to the requesting
 * user. User B presenting User A's dispute id must not read or mutate
 * User A's data.
 *
 * DisputeServiceDB uses getServiceRoleClient() (service-role bypass not confirmed,
 * but RLS alone is not sufficient defence — we enforce explicit user_id
 * scoping on every resource-keyed query).
 */

jest.mock("@/lib/supabase/service-role", () => {
  const USER_A_MOCK = "user-a-id";
  const DISPUTE_ID_MOCK = "dispute-a-id";

  const _row = {
    id: DISPUTE_ID_MOCK,
    user_id: USER_A_MOCK,
    bureau: "experian",
    item_type: "late_payment",
    item_description: "30-day late",
    reason: "Bank error",
    letter_content: "Dear Experian...",
    status: "draft",
    outcome: null,
    created_at: "2024-01-01T00:00:00.000Z",
    sent_at: null,
    resolved_at: null,
  };

  function makeChain(ownerUserId: string, resourceId: string) {
    const filters: Record<string, unknown> = {};
    let _pendingUpdate: Record<string, unknown> | null = null;
    let _isDelete = false;

    const chain: Record<string, jest.Mock> = {} as Record<string, jest.Mock>;

    chain.select = jest.fn().mockReturnValue(chain);
    chain.insert = jest.fn().mockReturnValue(chain);
    chain.update = jest.fn((data: Record<string, unknown>) => {
      _pendingUpdate = data;
      return chain;
    });
    chain.delete = jest.fn(() => {
      _isDelete = true;
      return chain;
    });
    chain.order = jest.fn().mockReturnValue(chain);

    chain.eq = jest.fn((col: string, val: unknown) => {
      filters[col] = val;
      // For delete operations, resolve as thenable after second eq()
      if (_isDelete && Object.keys(filters).length >= 2) {
        const owned =
          filters["id"] === resourceId && filters["user_id"] === ownerUserId;
        // Return a thenable so `await disputes().delete().eq().eq()` resolves
        return {
          then: (resolve: (v: unknown) => void) =>
            resolve({ data: null, error: owned ? null : { message: "Not found" } }),
          eq: chain.eq,
        };
      }
      return chain;
    });

    chain.single = jest.fn(() => {
      const owned =
        filters["id"] === resourceId && filters["user_id"] === ownerUserId;
      if (owned) {
        const merged = { ..._row, ...(_pendingUpdate ?? {}) };
        return Promise.resolve({ data: merged, error: null });
      }
      return Promise.resolve({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });
    });

    return chain;
  }

  // Plain functions (not jest.fn) so resetMocks:true does not wipe their implementations.
  function mockGetSupabase() {
    return {
      from(_table: string) {
        return makeChain("user-a-id", "dispute-a-id");
      },
    };
  }

  return { getServiceRoleClient: mockGetSupabase };
});

import { disputeServiceDB } from "../dispute-service-db";

const DISPUTE_ID = "dispute-a-id";
const USER_A = "user-a-id";
const USER_B = "user-b-id";

describe("idor — DisputeServiceDB user-scoping (TASK-CRD-3)", () => {
  // --------------------------------------------------------------------------
  // getDispute
  // --------------------------------------------------------------------------

  describe("getDispute", () => {
    it("idor: user B cannot read user A's dispute — returns null", async () => {
      const result = await disputeServiceDB.getDispute(DISPUTE_ID, USER_B);
      expect(result).toBeNull();
    });

    it("user A can read their own dispute", async () => {
      const result = await disputeServiceDB.getDispute(DISPUTE_ID, USER_A);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(DISPUTE_ID);
    });
  });

  // --------------------------------------------------------------------------
  // sendDispute
  // --------------------------------------------------------------------------

  describe("sendDispute", () => {
    it("idor: user B cannot send user A's dispute — throws not-found error", async () => {
      await expect(
        disputeServiceDB.sendDispute(DISPUTE_ID, USER_B),
      ).rejects.toThrow();
    });

    it("user A can send their own dispute", async () => {
      await expect(
        disputeServiceDB.sendDispute(DISPUTE_ID, USER_A),
      ).resolves.toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // updateDisputeStatus
  // --------------------------------------------------------------------------

  describe("updateDisputeStatus", () => {
    it("idor: user B cannot update status of user A's dispute — throws", async () => {
      await expect(
        disputeServiceDB.updateDisputeStatus(DISPUTE_ID, USER_B, "under_review"),
      ).rejects.toThrow();
    });

    it("user A can update status of their own dispute", async () => {
      await expect(
        disputeServiceDB.updateDisputeStatus(DISPUTE_ID, USER_A, "under_review"),
      ).resolves.toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // resolveDispute
  // --------------------------------------------------------------------------

  describe("resolveDispute", () => {
    it("idor: user B cannot resolve user A's dispute — throws", async () => {
      await expect(
        disputeServiceDB.resolveDispute(DISPUTE_ID, USER_B, "removed"),
      ).rejects.toThrow();
    });

    it("user A can resolve their own dispute", async () => {
      await expect(
        disputeServiceDB.resolveDispute(DISPUTE_ID, USER_A, "removed"),
      ).resolves.toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // deleteDispute
  // --------------------------------------------------------------------------

  describe("deleteDispute", () => {
    it("idor: user B cannot delete user A's dispute — returns false", async () => {
      const result = await disputeServiceDB.deleteDispute(DISPUTE_ID, USER_B);
      expect(result).toBe(false);
    });

    it("user A can delete their own dispute", async () => {
      const result = await disputeServiceDB.deleteDispute(DISPUTE_ID, USER_A);
      expect(result).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // addNote
  // --------------------------------------------------------------------------

  describe("addNote", () => {
    it("idor: user B cannot add note to user A's dispute — throws", async () => {
      await expect(
        disputeServiceDB.addNote(DISPUTE_ID, USER_B, "note text"),
      ).rejects.toThrow();
    });

    it("user A can add note to their own dispute", async () => {
      await expect(
        disputeServiceDB.addNote(DISPUTE_ID, USER_A, "note text"),
      ).resolves.toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // addEvidence
  // --------------------------------------------------------------------------

  describe("addEvidence", () => {
    it("idor: user B cannot add evidence to user A's dispute — throws", async () => {
      await expect(
        disputeServiceDB.addEvidence(DISPUTE_ID, USER_B, "https://example.com/doc.pdf"),
      ).rejects.toThrow();
    });

    it("user A can add evidence to their own dispute", async () => {
      await expect(
        disputeServiceDB.addEvidence(DISPUTE_ID, USER_A, "https://example.com/doc.pdf"),
      ).resolves.toBeDefined();
    });
  });
});
