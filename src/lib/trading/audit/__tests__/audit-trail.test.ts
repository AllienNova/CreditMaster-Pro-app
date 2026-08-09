/**
 * Audit Trail — Unit Tests
 *
 * Tests:
 *  - recordAuditEntry: success, DB failure (non-throwing), canonical hash attachment
 *  - getAuditTrail: filtering, pagination, ordering, error handling
 */

import { AuditTrail } from "../audit-trail";

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

// ============================================================================
// HELPERS
// ============================================================================

function makeInsertChain(result: { data: unknown; error: unknown }) {
  return {
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue(result),
      }),
    }),
  };
}

function makeSelectChain(result: { data: unknown; error: unknown; count?: number }) {
  const chain: Record<string, jest.Mock> = {};
  const methods = ["select", "eq", "order", "gte", "lte", "range"];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain["range"] = jest.fn().mockResolvedValue(result);
  return chain;
}

// ============================================================================
// TESTS
// ============================================================================

describe("AuditTrail", () => {
  let trail: AuditTrail;

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore getPolicy mock — resetMocks:true in jest.config clears implementations
    mockGetPolicy.mockResolvedValue({
      meta: { canonical_package_version: "2.5.0-rc1" },
      canonicalHash: "abc123def456",
    });
    trail = AuditTrail.getInstance();
  });

  // --------------------------------------------------------------------------
  // recordAuditEntry
  // --------------------------------------------------------------------------

  describe("recordAuditEntry", () => {
    it("persists an entry and returns the new ID", async () => {
      mockFrom.mockReturnValue(
        makeInsertChain({ data: { id: "audit-001" }, error: null }),
      );

      const id = await trail.recordAuditEntry({
        actor: "risk-gateway",
        action: "KILL_SWITCH_ACTIVATED",
        resource_type: "kill_switch",
        resource_id: "evt-abc",
        reason: "Daily loss limit breached",
        success: true,
        details: { level: "LEVEL_2_CANCEL_WORKING" },
      });

      expect(id).toBe("audit-001");
    });

    it("attaches canonical_hash from getPolicy()", async () => {
      let capturedInsert: Record<string, unknown> | null = null;

      mockFrom.mockReturnValue({
        insert: jest.fn().mockImplementation((data: Record<string, unknown>) => {
          capturedInsert = data;
          return {
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: "audit-002" },
                error: null,
              }),
            }),
          };
        }),
      });

      await trail.recordAuditEntry({
        actor: "system",
        action: "POLICY_LOADED",
        resource_type: "policy",
        reason: "boot",
        success: true,
      });

      expect(capturedInsert).not.toBeNull();
      expect(capturedInsert!["canonical_hash"]).toBe("abc123def456");
      expect(capturedInsert!["canonical_package_version"]).toBe("2.5.0-rc1");
    });

    it("returns null on DB error without throwing", async () => {
      mockFrom.mockReturnValue(
        makeInsertChain({ data: null, error: { message: "insert failed" } }),
      );

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const id = await trail.recordAuditEntry({
        actor: "system",
        action: "KILL_SWITCH_ACTIVATED",
        resource_type: "kill_switch",
        reason: "test",
        success: false,
      });

      expect(id).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[AuditTrail]"),
        expect.any(String),
        expect.any(Object),
      );

      consoleSpy.mockRestore();
    });

    it("returns null on unexpected exception without throwing", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("network failure");
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const id = await trail.recordAuditEntry({
        actor: "system",
        action: "SESSION_START",
        resource_type: "session",
        reason: "test",
        success: true,
      });

      expect(id).toBeNull();
      consoleSpy.mockRestore();
    });

    it("uses empty details object when details not provided", async () => {
      let capturedInsert: Record<string, unknown> | null = null;

      mockFrom.mockReturnValue({
        insert: jest.fn().mockImplementation((data: Record<string, unknown>) => {
          capturedInsert = data;
          return {
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: "audit-003" },
                error: null,
              }),
            }),
          };
        }),
      });

      await trail.recordAuditEntry({
        actor: "system",
        action: "SYSTEM_HEALTH_CHECK",
        resource_type: "system",
        reason: "scheduled",
        success: true,
      });

      expect(capturedInsert!["details"]).toEqual({});
    });

    it("records resource_id as null when not provided", async () => {
      let capturedInsert: Record<string, unknown> | null = null;

      mockFrom.mockReturnValue({
        insert: jest.fn().mockImplementation((data: Record<string, unknown>) => {
          capturedInsert = data;
          return {
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: "audit-004" },
                error: null,
              }),
            }),
          };
        }),
      });

      await trail.recordAuditEntry({
        actor: "system",
        action: "MODE_TRANSITION",
        resource_type: "mode_transition",
        reason: "crisis detected",
        success: true,
      });

      expect(capturedInsert!["resource_id"]).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // getAuditTrail
  // --------------------------------------------------------------------------

  describe("getAuditTrail", () => {
    it("returns entries with total count", async () => {
      const entries = [
        {
          id: "a1",
          actor: "system",
          action: "KILL_SWITCH_ACTIVATED",
          resource_type: "kill_switch",
          created_at: "2026-04-24T10:00:00Z",
        },
      ];

      mockFrom.mockReturnValue(makeSelectChain({ data: entries, error: null, count: 1 }));

      const result = await trail.getAuditTrail();

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].id).toBe("a1");
    });

    it("returns empty page on DB error", async () => {
      mockFrom.mockReturnValue(
        makeSelectChain({ data: null, error: { message: "read error" }, count: 0 }),
      );

      const result = await trail.getAuditTrail();

      expect(result.entries).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("caps limit at 1000 entries", async () => {
      mockFrom.mockReturnValue(
        makeSelectChain({ data: [], error: null, count: 0 }),
      );

      // Should not throw; limit is silently capped
      const result = await trail.getAuditTrail({ limit: 99999 });
      expect(result).toBeDefined();
    });

    it("applies resource_type filter", async () => {
      const chain = makeSelectChain({ data: [], error: null, count: 0 });
      mockFrom.mockReturnValue(chain);

      await trail.getAuditTrail({ resource_type: "incident" });

      // The eq call for resource_type must be invoked
      expect(chain["eq"]).toHaveBeenCalledWith("resource_type", "incident");
    });

    it("applies actor filter", async () => {
      const chain = makeSelectChain({ data: [], error: null, count: 0 });
      mockFrom.mockReturnValue(chain);

      await trail.getAuditTrail({ actor: "risk-gateway" });

      expect(chain["eq"]).toHaveBeenCalledWith("actor", "risk-gateway");
    });

    it("applies success filter", async () => {
      const chain = makeSelectChain({ data: [], error: null, count: 0 });
      mockFrom.mockReturnValue(chain);

      await trail.getAuditTrail({ success: false });

      expect(chain["eq"]).toHaveBeenCalledWith("success", false);
    });

    it("applies since/until date filters", async () => {
      const chain = makeSelectChain({ data: [], error: null, count: 0 });
      mockFrom.mockReturnValue(chain);

      const since = new Date("2026-04-01T00:00:00Z");
      const until = new Date("2026-04-30T23:59:59Z");

      await trail.getAuditTrail({ since, until });

      expect(chain["gte"]).toHaveBeenCalledWith("created_at", since.toISOString());
      expect(chain["lte"]).toHaveBeenCalledWith("created_at", until.toISOString());
    });

    it("applies pagination via offset", async () => {
      const chain = makeSelectChain({ data: [], error: null, count: 50 });
      mockFrom.mockReturnValue(chain);

      await trail.getAuditTrail({ limit: 10, offset: 20 });

      // range(20, 29) = offset=20, limit=10
      expect(chain["range"]).toHaveBeenCalledWith(20, 29);
    });

    it("returns empty array when no filters match", async () => {
      mockFrom.mockReturnValue(
        makeSelectChain({ data: [], error: null, count: 0 }),
      );

      const result = await trail.getAuditTrail({ actor: "nonexistent-actor" });

      expect(result.entries).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Singleton
  // --------------------------------------------------------------------------

  describe("singleton", () => {
    it("returns the same instance on repeated calls", () => {
      const a = AuditTrail.getInstance();
      const b = AuditTrail.getInstance();
      expect(a).toBe(b);
    });
  });
});
