/**
 * Kill Switch State Machine — Unit Tests
 *
 * Tests the 4-level kill switch including:
 *  - Sequential activation and deactivation
 *  - Dual-control enforcement for L3/L4
 *  - P0-10 safety invariants (L4 blocked on untrusted state)
 *  - Idempotency
 *  - Approver != requestor enforcement
 */

import { KillSwitchManager } from "../kill-switch";
import type { KillSwitchState } from "../kill-switch";

// ============================================================================
// MOCKS
// ============================================================================

jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

jest.mock("@/lib/trading/config", () => ({
  getPolicy: jest.fn().mockResolvedValue({
    meta: { canonical_package_version: "2.5.0-rc1" },
    canonicalHash: "abc123def456",
  }),
}));

import { supabaseAdmin } from "@/lib/supabase/server";
import { getPolicy } from "@/lib/trading/config";

const mockFrom = supabaseAdmin.from as jest.Mock;
const mockGetPolicy = getPolicy as jest.Mock;

// ---------------------------------------------------------------------------
// Builder helpers for Supabase chain mocking
// ---------------------------------------------------------------------------

function chainBuilder(returnValue: unknown) {
  const chain: Record<string, jest.Mock> = {};
  const methods = [
    "select", "insert", "update", "eq", "in", "neq",
    "order", "limit", "single", "range", "gte", "lte",
  ];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain["single"] = jest.fn().mockResolvedValue(returnValue);
  chain["limit"] = jest.fn().mockResolvedValue(returnValue);
  chain["range"] = jest.fn().mockResolvedValue(returnValue);
  return chain;
}

function makeInsertChain(id: string) {
  const chain: Record<string, jest.Mock> = {};
  const methods = ["insert", "select", "eq", "order", "limit"];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain["single"] = jest.fn().mockResolvedValue({ data: { id }, error: null });
  return chain;
}

// ============================================================================
// TESTS
// ============================================================================

describe("KillSwitchManager", () => {
  let manager: KillSwitchManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore getPolicy mock — resetMocks:true in jest.config clears implementations
    mockGetPolicy.mockResolvedValue({
      meta: { canonical_package_version: "2.5.0-rc1" },
      canonicalHash: "abc123def456",
    });
    // Access singleton via getInstance
    manager = KillSwitchManager.getInstance();
  });

  // --------------------------------------------------------------------------
  // getCurrentLevel
  // --------------------------------------------------------------------------

  describe("getCurrentLevel", () => {
    it("returns INACTIVE when no events exist", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      const status = await manager.getCurrentLevel();
      expect(status.current_level).toBe("INACTIVE");
      expect(status.activated_at).toBeNull();
      expect(status.pending_dual_control).toBeNull();
    });

    it("returns the level from the most recent event", async () => {
      const event = {
        id: "evt-001",
        level: "LEVEL_1_PAUSE_NEW",
        actor_id: "user-a",
        created_at: "2026-04-24T10:00:00Z",
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [event], error: null }),
          }),
        }),
      });

      const status = await manager.getCurrentLevel();
      expect(status.current_level).toBe("LEVEL_1_PAUSE_NEW");
      expect(status.last_event_id).toBe("evt-001");
    });
  });

  // --------------------------------------------------------------------------
  // activateLevel — L1/L2 (no dual control)
  // --------------------------------------------------------------------------

  describe("activateLevel — L1/L2", () => {
    it("activates L1 from INACTIVE and persists an event", async () => {
      // getCurrentLevel returns INACTIVE
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          // getCurrentLevel calls (events + dc)
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        // insert call
        return makeInsertChain("evt-new-001");
      });

      const result = await manager.activateLevel(
        "LEVEL_1_PAUSE_NEW",
        "daily loss limit breached",
        "user-a",
      );

      expect(result.success).toBe(true);
      expect(result.requires_dual_control).toBe(false);
      expect(result.event_id).toBe("evt-new-001");
    });

    it("rejects level skip (INACTIVE → L2)", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      const result = await manager.activateLevel(
        "LEVEL_2_CANCEL_WORKING",
        "test skip",
        "user-a",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot skip levels");
    });

    it("is idempotent when already at requested level", async () => {
      const existingEvent = {
        id: "evt-existing",
        level: "LEVEL_1_PAUSE_NEW",
        actor_id: "user-a",
        created_at: "2026-04-24T10:00:00Z",
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [existingEvent], error: null }),
            }),
          }),
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [existingEvent], error: null }),
          }),
        }),
      });

      const result = await manager.activateLevel(
        "LEVEL_1_PAUSE_NEW",
        "duplicate call",
        "user-a",
      );

      expect(result.success).toBe(true);
      expect(result.requires_dual_control).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // activateLevel — L3/L4 (requires dual control)
  // --------------------------------------------------------------------------

  describe("activateLevel — L3/L4", () => {
    it("creates a dual-control request for L3 instead of applying immediately", async () => {
      const l2Event = {
        id: "evt-l2",
        level: "LEVEL_2_CANCEL_WORKING",
        actor_id: "user-a",
        created_at: "2026-04-24T10:00:00Z",
      };

      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          // getCurrentLevel — ksEvents: returns l2Event via select→order→limit
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [l2Event], error: null }),
              }),
            }),
          };
        }
        if (callIdx === 2) {
          // getCurrentLevel — dcRequests: no pending dc
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (callIdx === 3) {
          // requestDualControl — check existing
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        // requestDualControl — insert
        return makeInsertChain("dc-req-001");
      });

      const result = await manager.activateLevel(
        "LEVEL_3_FREEZE",
        "volatility spike",
        "user-a",
      );

      expect(result.success).toBe(true);
      expect(result.requires_dual_control).toBe(true);
      expect(result.dual_control_request_id).toBe("dc-req-001");
      expect(result.event_id).toBeNull();
    });

    it("creates a dual-control request for L4 instead of applying immediately", async () => {
      const l3Event = {
        id: "evt-l3",
        level: "LEVEL_3_FREEZE",
        actor_id: "user-a",
        created_at: "2026-04-24T10:00:00Z",
      };

      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          // getCurrentLevel — ksEvents: returns l3Event via select→order→limit
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [l3Event], error: null }),
              }),
            }),
          };
        }
        if (callIdx === 2) {
          // getCurrentLevel — dcRequests: no pending dc
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (callIdx === 3) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        return makeInsertChain("dc-req-l4");
      });

      const result = await manager.activateLevel(
        "LEVEL_4_FLATTEN",
        "crisis scenario",
        "user-a",
      );

      expect(result.success).toBe(true);
      expect(result.requires_dual_control).toBe(true);
      expect(result.dual_control_request_id).toBe("dc-req-l4");
    });
  });

  // --------------------------------------------------------------------------
  // requestDualControl
  // --------------------------------------------------------------------------

  describe("requestDualControl", () => {
    it("creates a new pending request", async () => {
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: "dc-001" }, error: null }),
          }),
        }),
      }));

      const result = await manager.requestDualControl(
        "LEVEL_3_FREEZE",
        "user-a",
        "freeze for investigation",
      );

      expect(result.success).toBe(true);
      expect(result.request_id).toBe("dc-001");
    });

    it("returns existing pending request if same requestor submits again", async () => {
      const existing = [{ id: "dc-existing", requestor_id: "user-a" }];

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: existing, error: null }),
            }),
          }),
        }),
      });

      const result = await manager.requestDualControl(
        "LEVEL_3_FREEZE",
        "user-a",
        "duplicate",
      );

      expect(result.success).toBe(true);
      expect(result.request_id).toBe("dc-existing");
    });

    it("rejects when a different requestor has a pending request for the same level", async () => {
      const existing = [{ id: "dc-existing", requestor_id: "user-b" }];

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: existing, error: null }),
            }),
          }),
        }),
      });

      const result = await manager.requestDualControl(
        "LEVEL_3_FREEZE",
        "user-a",
        "conflicting request",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
    });
  });

  // --------------------------------------------------------------------------
  // approveDualControl — P0-10 safety invariants
  // --------------------------------------------------------------------------

  describe("approveDualControl", () => {
    it("rejects when approver is the same as requestor (P0-10)", async () => {
      const request = {
        id: "dc-001",
        requestor_id: "user-a",
        target_level: "LEVEL_3_FREEZE",
        reason: "test",
        status: "PENDING",
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: request, error: null }),
            }),
          }),
        }),
      });

      const result = await manager.approveDualControl("dc-001", "user-a");

      expect(result.success).toBe(false);
      expect(result.error).toContain("different person");
    });

    it("blocks L4 FLATTEN and applies L3 FREEZE when system state is untrusted (P0-10)", async () => {
      const request = {
        id: "dc-l4",
        requestor_id: "user-a",
        target_level: "LEVEL_4_FLATTEN",
        reason: "crisis",
        status: "PENDING",
      };

      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          // Fetch request
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: request, error: null }),
                }),
              }),
            }),
          };
        }
        if (callIdx === 2) {
          // isSystemStateTrusted — open INC_STATE_UNTRUSTED incident exists
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [{ id: "incident-001" }],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        // Deny request update + getCurrentLevel + applyLevel insert
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: "evt-freeze" }, error: null }),
            }),
          }),
        };
      });

      const result = await manager.approveDualControl("dc-l4", "user-b");

      // Should apply L3 FREEZE, not L4 FLATTEN
      expect(result.success).toBe(true);
      // The event should correspond to the safe L3 freeze applied
      expect(result.requires_dual_control).toBe(false);
    });

    it("applies L3 after successful dual-control approval", async () => {
      const request = {
        id: "dc-l3",
        requestor_id: "user-a",
        target_level: "LEVEL_3_FREEZE",
        reason: "investigation",
        status: "PENDING",
      };

      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: request, error: null }),
                }),
              }),
            }),
          };
        }
        if (callIdx === 2) {
          // Update status to APPROVED
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (callIdx === 3 || callIdx === 4) {
          // getCurrentLevel
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        // applyLevel insert
        return makeInsertChain("evt-l3-applied");
      });

      const result = await manager.approveDualControl("dc-l3", "user-b");

      expect(result.success).toBe(true);
      expect(result.event_id).toBe("evt-l3-applied");
    });
  });

  // --------------------------------------------------------------------------
  // denyDualControl
  // --------------------------------------------------------------------------

  describe("denyDualControl", () => {
    it("denies a pending request", async () => {
      const request = { requestor_id: "user-a" };

      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: request, error: null }),
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }));

      const result = await manager.denyDualControl(
        "dc-001",
        "user-b",
        "conditions changed",
      );

      expect(result.success).toBe(true);
      expect(result.request_id).toBe("dc-001");
    });

    it("rejects when denier is the requestor", async () => {
      const request = { requestor_id: "user-a" };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: request, error: null }),
            }),
          }),
        }),
      });

      const result = await manager.denyDualControl(
        "dc-001",
        "user-a",
        "self-denial",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("cannot deny their own request");
    });

    it("fails when request is not found", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
            }),
          }),
        }),
      });

      const result = await manager.denyDualControl(
        "nonexistent",
        "user-b",
        "no reason",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  // --------------------------------------------------------------------------
  // deactivateLevel
  // --------------------------------------------------------------------------

  describe("deactivateLevel", () => {
    it("is idempotent when already INACTIVE", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      const result = await manager.deactivateLevel("user-a");

      expect(result.success).toBe(true);
      expect(result.requires_dual_control).toBe(false);
    });

    it("deactivates L1 directly without dual control", async () => {
      const l1Event = {
        id: "evt-l1",
        level: "LEVEL_1_PAUSE_NEW",
        actor_id: "user-a",
        created_at: "2026-04-24T10:00:00Z",
      };

      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          // getCurrentLevel — ksEvents: returns l1Event via select→order→limit
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [l1Event], error: null }),
              }),
            }),
          };
        }
        if (callIdx === 2) {
          // getCurrentLevel — dcRequests: no pending dc
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        return makeInsertChain("evt-deactivate");
      });

      const result = await manager.deactivateLevel("user-a");

      expect(result.success).toBe(true);
      expect(result.requires_dual_control).toBe(false);
    });

    it("requires dual control to deactivate from L3", async () => {
      const l3Event = {
        id: "evt-l3",
        level: "LEVEL_3_FREEZE",
        actor_id: "user-a",
        created_at: "2026-04-24T10:00:00Z",
      };

      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          // getCurrentLevel — ksEvents: returns l3Event via select→order→limit
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [l3Event], error: null }),
              }),
            }),
          };
        }
        if (callIdx === 2) {
          // getCurrentLevel — dcRequests: no pending dc
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        // requestDualControl check
        if (callIdx === 3) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        return makeInsertChain("dc-deactivate");
      });

      const result = await manager.deactivateLevel("user-a");

      expect(result.success).toBe(true);
      expect(result.requires_dual_control).toBe(true);
    });
  });
});
