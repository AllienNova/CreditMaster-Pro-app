/**
 * Incident Manager — Unit Tests
 *
 * Tests:
 *  - raiseIncident: canonical code validation, idempotency, SEV1-4 responses
 *  - resolveIncident: status transitions, double-resolve guard
 *  - getActiveIncidents: ordering by severity
 *  - Supervisory signals: always ALERT_ONLY, never kill switch escalation
 */

import { IncidentManager } from "../incident-manager";

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

// Mock kill-switch to capture escalation calls
const mockActivateLevel = jest.fn().mockResolvedValue({ success: true });
jest.mock("@/lib/trading/risk/kill-switch", () => ({
  killSwitchManager: {
    activateLevel: mockActivateLevel,
  },
}));

import { supabaseAdmin } from "@/lib/supabase/server";
import { getPolicy } from "@/lib/trading/config";

const mockFrom = supabaseAdmin.from as jest.Mock;
const mockGetPolicy = getPolicy as jest.Mock;

// ============================================================================
// HELPERS
// ============================================================================

function makeSelectChain(returnData: unknown) {
  const chain: Record<string, jest.Mock> = {};
  ["select", "eq", "in", "order", "limit", "single"].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain["limit"] = jest.fn().mockResolvedValue(returnData);
  chain["single"] = jest.fn().mockResolvedValue(returnData);
  return chain;
}

function makeInsertChain(id: string) {
  return {
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { id }, error: null }),
      }),
    }),
  };
}

function makeUpdateChain(error: null | { message: string } = null) {
  return {
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error }),
    }),
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe("IncidentManager", () => {
  let manager: IncidentManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore mock implementations — resetMocks:true in jest.config clears implementations
    mockGetPolicy.mockResolvedValue({
      meta: { canonical_package_version: "2.5.0-rc1" },
      canonicalHash: "abc123def456",
    });
    mockActivateLevel.mockResolvedValue({ success: true });
    manager = IncidentManager.getInstance();
  });

  // --------------------------------------------------------------------------
  // raiseIncident — validation
  // --------------------------------------------------------------------------

  describe("raiseIncident — validation", () => {
    it("rejects unknown incident codes", async () => {
      const result = await manager.raiseIncident(
        "INC_TOTALLY_UNKNOWN",
        "user-a",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown incident code");
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("accepts a valid canonical incident code (INC_DATA_GAP)", async () => {
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
            single: jest.fn().mockResolvedValue({
              data: { id: "inc-data-gap" },
              error: null,
            }),
          }),
        }),
      }));

      const result = await manager.raiseIncident("INC_DATA_GAP", "user-a", {
        symbol: "AAPL",
      });

      expect(result.success).toBe(true);
      expect(result.incident_id).toBe("inc-data-gap");
    });
  });

  // --------------------------------------------------------------------------
  // raiseIncident — idempotency
  // --------------------------------------------------------------------------

  describe("raiseIncident — idempotency", () => {
    it("returns existing open incident ID without creating a duplicate", async () => {
      const existingIncident = [{ id: "inc-existing-001" }];

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: existingIncident,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await manager.raiseIncident("INC_DATA_STALE", "user-a");

      expect(result.success).toBe(true);
      expect(result.incident_id).toBe("inc-existing-001");
      expect(result.kill_switch_escalated).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // raiseIncident — SEV1 protocol
  // --------------------------------------------------------------------------

  describe("raiseIncident — SEV1", () => {
    it("triggers kill switch escalation for SEV1 incidents", async () => {
      let insertCallCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "incidents") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: "inc-sev1-001" },
                  error: null,
                }),
              }),
            }),
          };
        }
        // trading_audit_trail insert
        insertCallCount++;
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      });

      mockActivateLevel.mockResolvedValue({ success: true });

      // INC_BROKER_DISCONNECTED is SEV1
      const result = await manager.raiseIncident(
        "INC_BROKER_DISCONNECTED",
        "system",
      );

      expect(result.success).toBe(true);
      expect(result.kill_switch_escalated).toBe(true);
      expect(mockActivateLevel).toHaveBeenCalledWith(
        "LEVEL_2_CANCEL_WORKING",
        expect.stringContaining("INC_BROKER_DISCONNECTED"),
        "system",
      );
    });

    it("still succeeds even if kill switch escalation fails", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "incidents") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: "inc-sev1-002" },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { insert: jest.fn().mockResolvedValue({ error: null }) };
      });

      mockActivateLevel.mockRejectedValue(new Error("Kill switch unavailable"));

      const result = await manager.raiseIncident(
        "INC_BROKER_DISCONNECTED",
        "system",
      );

      // Incident persisted; escalation attempted but failed gracefully
      expect(result.success).toBe(true);
      expect(result.kill_switch_escalated).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // raiseIncident — SEV4 (log only)
  // --------------------------------------------------------------------------

  describe("raiseIncident — SEV4", () => {
    it("does not trigger kill switch or alerts for SEV4", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "incidents") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: "inc-sev4" },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { insert: jest.fn().mockResolvedValue({ error: null }) };
      });

      // INC_DATA_GAP is SEV4 (log only)
      const result = await manager.raiseIncident("INC_DATA_GAP", "system");

      expect(result.success).toBe(true);
      expect(result.kill_switch_escalated).toBe(false);
      expect(mockActivateLevel).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // raiseIncident — Supervisory signals
  // --------------------------------------------------------------------------

  describe("raiseIncident — supervisory signals", () => {
    it("never triggers kill switch for SIG_* codes", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "incidents") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: "inc-sig-001" },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { insert: jest.fn().mockResolvedValue({ error: null }) };
      });

      const result = await manager.raiseIncident(
        "SIG_REGIME_SHIFT",
        "regime-detector",
      );

      expect(result.success).toBe(true);
      expect(result.kill_switch_escalated).toBe(false);
      expect(mockActivateLevel).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // resolveIncident
  // --------------------------------------------------------------------------

  describe("resolveIncident", () => {
    it("resolves an open incident", async () => {
      const incident = { id: "inc-001", code: "INC_DATA_STALE", auto_recoverable: true, status: "OPEN" };

      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: incident, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }));

      const result = await manager.resolveIncident(
        "inc-001",
        "system",
        "Feed recovered",
      );

      expect(result.success).toBe(true);
      expect(result.incident_id).toBe("inc-001");
    });

    it("rejects resolving an already-resolved incident", async () => {
      const incident = {
        id: "inc-002",
        code: "INC_DATA_STALE",
        auto_recoverable: true,
        status: "RESOLVED",
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: incident, error: null }),
          }),
        }),
      });

      const result = await manager.resolveIncident(
        "inc-002",
        "system",
        "double resolve",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("already RESOLVED");
    });

    it("returns error when incident is not found", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "not found" },
            }),
          }),
        }),
      });

      const result = await manager.resolveIncident(
        "nonexistent",
        "system",
        "note",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Incident not found.");
    });
  });

  // --------------------------------------------------------------------------
  // getActiveIncidents
  // --------------------------------------------------------------------------

  describe("getActiveIncidents", () => {
    it("returns incidents sorted SEV1 first", async () => {
      const incidents = [
        { id: "i3", severity: "SEV3", raised_at: "2026-04-24T10:00:00Z", status: "OPEN" },
        { id: "i1", severity: "SEV1", raised_at: "2026-04-24T09:00:00Z", status: "OPEN" },
        { id: "i2", severity: "SEV2", raised_at: "2026-04-24T09:30:00Z", status: "OPEN" },
      ];

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: incidents, error: null }),
          }),
        }),
      });

      const result = await manager.getActiveIncidents();

      expect(result[0].severity).toBe("SEV1");
      expect(result[1].severity).toBe("SEV2");
      expect(result[2].severity).toBe("SEV3");
    });

    it("returns empty array when no active incidents", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      const result = await manager.getActiveIncidents();
      expect(result).toEqual([]);
    });

    it("returns empty array on database error", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "db error" },
            }),
          }),
        }),
      });

      const result = await manager.getActiveIncidents();
      expect(result).toEqual([]);
    });
  });
});
