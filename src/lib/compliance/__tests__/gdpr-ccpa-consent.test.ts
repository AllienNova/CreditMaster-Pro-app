/**
 * CMP-1 — Durable, history-preserving consent persistence (FND-057)
 *
 * Tests for ConsentManagementService Supabase write-through.
 * Consent is APPEND-ONLY: every recordConsent call inserts a new row.
 * "Current consent" = the latest row per (user_id, consent_type) by timestamp.
 * A fresh service instance must be able to read history back (cold-start survival).
 */

import {
  ConsentManagementService,
  GDPRComplianceService,
  CCPAComplianceService,
  type ConsentRecord,
  type DbClient,
} from "../gdpr-ccpa";

// Prevent supabaseAdmin import from crashing at module load
jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: { admin: { deleteUser: jest.fn() } },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockBuilder = Record<string, jest.Mock>;

/**
 * Creates a Supabase-style chainable query builder mock.
 *
 * Two terminal patterns used by ConsentManagementService:
 *   1. ...order()                    → resolves { data: allRows, error }  (getUserConsents)
 *   2. ...order().limit().maybeSingle() → resolves { data: row|null, error }  (hasConsent)
 *
 * `order()` returns a thenable that is also the builder, so callers can either
 * await it directly (getUserConsents) or chain .limit().maybeSingle() (hasConsent).
 */
function createChainableMock(opts?: {
  allRows?: Array<Record<string, unknown>>;
  maybeSingleRow?: Record<string, unknown> | null;
  maybeSingleError?: string | null;
  insertError?: string | null;
}): MockBuilder {
  const allRows = opts?.allRows ?? [];
  // maybeSingleRow: explicit null means "no rows" (not a DB error)
  const maybeSingleRow =
    opts?.maybeSingleRow !== undefined ? opts.maybeSingleRow : null;
  const maybeSingleErr =
    opts?.maybeSingleError !== undefined ? opts.maybeSingleError : null;
  const insertErr = opts?.insertError !== undefined ? opts.insertError : null;

  const b: MockBuilder = {};
  b.insert = jest
    .fn()
    .mockResolvedValue({ error: insertErr ? { message: insertErr } : null });
  b.select = jest.fn().mockImplementation(() => b);
  b.delete = jest.fn().mockImplementation(() => b);
  b.update = jest.fn().mockImplementation(() => b);
  b.upsert = jest.fn().mockResolvedValue({ error: null });
  b.eq = jest.fn().mockImplementation(() => b);
  b.limit = jest.fn().mockImplementation(() => b);
  // .maybeSingle(): no rows → { data: null, error: null }; real error → { data: null, error }
  b.maybeSingle = jest.fn().mockResolvedValue({
    data: maybeSingleRow,
    error: maybeSingleErr ? { message: maybeSingleErr } : null,
  });
  // .single() kept for completeness but should not be called post-fix
  b.single = jest.fn().mockResolvedValue({ data: null, error: null });
  // .order() is the terminal for getUserConsents AND chainable for hasConsent.
  // Returns a thenable-builder hybrid.
  b.order = jest.fn().mockImplementation(() => {
    const resolved = Promise.resolve({ data: allRows, error: null });
    Object.assign(resolved, b);
    return resolved;
  });
  return b;
}

function buildMockDb(opts?: {
  allRows?: Array<Record<string, unknown>>;
  maybeSingleRow?: Record<string, unknown> | null;
  maybeSingleError?: string | null;
  insertError?: string | null;
}): DbClient {
  const chain = createChainableMock(opts);
  return {
    from: jest.fn().mockImplementation(() => chain),
    rpc: jest.fn().mockResolvedValue({ error: null }),
    auth: {
      admin: { deleteUser: jest.fn().mockResolvedValue({ error: null }) },
    },
  };
}

// ---------------------------------------------------------------------------
// ConsentManagementService — durable persistence (CMP-1)
// ---------------------------------------------------------------------------

describe("ConsentManagementService — durable DB persistence", () => {
  const userId = "user-abc-123";

  // -------------------------------------------------------------------------
  // recordConsent — append-only INSERT
  // -------------------------------------------------------------------------
  describe("recordConsent — appends a new row on every call", () => {
    it("inserts a row into consent_records when a consent event is recorded", async () => {
      const db = buildMockDb();
      const svc = new ConsentManagementService(db);

      await svc.recordConsent({
        userId,
        consentType: "marketing",
        granted: true,
        timestamp: new Date("2026-01-01T00:00:00Z"),
      });

      expect(db.from).toHaveBeenCalledWith("consent_records");
      const chain = (db.from as jest.Mock).mock.results[0].value as MockBuilder;
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          consent_type: "marketing",
          granted: true,
        }),
      );
    });

    it("inserts TWO separate rows when the same (user, type) is recorded twice — history preserved", async () => {
      const insertMock = jest.fn().mockResolvedValue({ error: null });
      const chain = createChainableMock();
      chain.insert = insertMock;

      const db: DbClient = {
        from: jest.fn().mockImplementation(() => chain),
        rpc: jest.fn().mockResolvedValue({ error: null }),
        auth: {
          admin: { deleteUser: jest.fn().mockResolvedValue({ error: null }) },
        },
      };

      const svc = new ConsentManagementService(db);

      await svc.recordConsent({
        userId,
        consentType: "analytics",
        granted: true,
        timestamp: new Date("2026-01-01T10:00:00Z"),
      });
      await svc.recordConsent({
        userId,
        consentType: "analytics",
        granted: false,
        timestamp: new Date("2026-01-02T10:00:00Z"),
      });

      // Two distinct INSERT calls — not an upsert/update
      expect(insertMock).toHaveBeenCalledTimes(2);
      expect(insertMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ granted: true }),
      );
      expect(insertMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ granted: false }),
      );
    });

    it("never calls upsert", async () => {
      const chain = createChainableMock();
      const db: DbClient = {
        from: jest.fn().mockImplementation(() => chain),
        rpc: jest.fn().mockResolvedValue({ error: null }),
        auth: {
          admin: { deleteUser: jest.fn().mockResolvedValue({ error: null }) },
        },
      };
      const svc = new ConsentManagementService(db);

      await svc.recordConsent({
        userId,
        consentType: "marketing",
        granted: true,
        timestamp: new Date(),
      });

      expect(chain.upsert).not.toHaveBeenCalled();
    });

    it("throws when the DB insert returns an error", async () => {
      const db = buildMockDb({ insertError: "unique violation" });
      const svc = new ConsentManagementService(db);

      await expect(
        svc.recordConsent({
          userId,
          consentType: "marketing",
          granted: true,
          timestamp: new Date(),
        }),
      ).rejects.toThrow("unique violation");
    });
  });

  // -------------------------------------------------------------------------
  // hasConsent — maybeSingle, latest-by-timestamp
  // -------------------------------------------------------------------------
  describe("hasConsent — returns latest granted value via maybeSingle", () => {
    it("returns true when the latest row has granted=true", async () => {
      const db = buildMockDb({ maybeSingleRow: { granted: true } });
      const svc = new ConsentManagementService(db);

      expect(await svc.hasConsent(userId, "marketing")).toBe(true);
    });

    it("returns false when the latest row has granted=false", async () => {
      const db = buildMockDb({ maybeSingleRow: { granted: false } });
      const svc = new ConsentManagementService(db);

      expect(await svc.hasConsent(userId, "ai_processing")).toBe(false);
    });

    it("returns false (not throws) when no rows exist", async () => {
      // maybeSingleRow: null with no error = zero rows — must return false, not throw
      const db = buildMockDb({ maybeSingleRow: null });
      const svc = new ConsentManagementService(db);

      expect(await svc.hasConsent(userId, "data_sharing")).toBe(false);
    });

    it("throws on a real DB error (not PGRST116 no-row)", async () => {
      const db = buildMockDb({ maybeSingleError: "connection refused" });
      const svc = new ConsentManagementService(db);

      await expect(svc.hasConsent(userId, "marketing")).rejects.toThrow(
        "connection refused",
      );
    });

    it("uses maybeSingle (not single) so zero-row is not an error", async () => {
      const chain = createChainableMock({ maybeSingleRow: null });
      const db: DbClient = {
        from: jest.fn().mockImplementation(() => chain),
        rpc: jest.fn().mockResolvedValue({ error: null }),
        auth: {
          admin: { deleteUser: jest.fn().mockResolvedValue({ error: null }) },
        },
      };
      const svc = new ConsentManagementService(db);

      await svc.hasConsent(userId, "marketing");

      expect(chain.maybeSingle).toHaveBeenCalled();
      expect(chain.single).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // withdrawConsent — appends granted:false
  // -------------------------------------------------------------------------
  describe("withdrawConsent — appends a granted:false row", () => {
    it("calls insert with granted=false for the given consentType", async () => {
      const insertMock = jest.fn().mockResolvedValue({ error: null });
      const chain = createChainableMock();
      chain.insert = insertMock;

      const db: DbClient = {
        from: jest.fn().mockImplementation(() => chain),
        rpc: jest.fn().mockResolvedValue({ error: null }),
        auth: {
          admin: { deleteUser: jest.fn().mockResolvedValue({ error: null }) },
        },
      };

      const svc = new ConsentManagementService(db);
      await svc.withdrawConsent(userId, "analytics");

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          consent_type: "analytics",
          granted: false,
        }),
      );
    });

    it("withdraw-then-regrant: hasConsent returns true after re-granting", async () => {
      // Sequence: grant → withdraw → re-grant.
      // After re-grant, hasConsent must return true (latest row wins).
      //
      // The mock DB accumulates inserted rows and serves the last-inserted
      // one back via maybeSingle to simulate ORDER BY timestamp DESC LIMIT 1.
      const insertedRows: Array<Record<string, unknown>> = [];
      const chain = createChainableMock();

      // Capture every insert into our local array
      chain.insert = jest.fn().mockImplementation((row: Record<string, unknown>) => {
        insertedRows.push({ ...row, timestamp: row.timestamp ?? new Date().toISOString() });
        return Promise.resolve({ error: null });
      });

      // maybeSingle returns the last-inserted row for this (user, type)
      // — simulates ORDER BY timestamp DESC LIMIT 1
      chain.maybeSingle = jest.fn().mockImplementation(() => {
        const matching = insertedRows
          .filter(
            (r) =>
              r.user_id === userId && r.consent_type === "analytics",
          )
          .sort((a, b) =>
            String(b.timestamp) > String(a.timestamp) ? 1 : -1,
          );
        const latest = matching[matching.length - 1] ?? null;
        return Promise.resolve({ data: latest, error: null });
      });

      // getUserConsents returns all rows (for exportConsentHistory coverage)
      chain.order = jest.fn().mockImplementation(() => {
        const resolved = Promise.resolve({
          data: insertedRows.filter(
            (r) => r.user_id === userId,
          ),
          error: null,
        });
        Object.assign(resolved, chain);
        return resolved;
      });

      const db: DbClient = {
        from: jest.fn().mockImplementation(() => chain),
        rpc: jest.fn().mockResolvedValue({ error: null }),
        auth: {
          admin: { deleteUser: jest.fn().mockResolvedValue({ error: null }) },
        },
      };

      const svc = new ConsentManagementService(db);

      // Step 1: grant
      await svc.recordConsent({
        userId,
        consentType: "analytics",
        granted: true,
        timestamp: new Date("2026-01-01T10:00:00Z"),
      });
      expect(await svc.hasConsent(userId, "analytics")).toBe(true);

      // Step 2: withdraw
      await svc.withdrawConsent(userId, "analytics");
      // Override maybeSingle to reflect the withdraw row
      const afterWithdraw = insertedRows
        .filter((r) => r.user_id === userId && r.consent_type === "analytics")
        .at(-1);
      chain.maybeSingle = jest.fn().mockResolvedValue({
        data: afterWithdraw ?? null,
        error: null,
      });
      expect(await svc.hasConsent(userId, "analytics")).toBe(false);

      // Step 3: re-grant
      await svc.recordConsent({
        userId,
        consentType: "analytics",
        granted: true,
        timestamp: new Date("2026-01-03T10:00:00Z"),
      });
      const afterRegrant = insertedRows
        .filter((r) => r.user_id === userId && r.consent_type === "analytics")
        .at(-1);
      chain.maybeSingle = jest.fn().mockResolvedValue({
        data: afterRegrant ?? null,
        error: null,
      });
      expect(await svc.hasConsent(userId, "analytics")).toBe(true);

      // All three rows present in the history (append-only)
      const consents = await svc.getUserConsents(userId);
      const analyticsRows = consents.filter((c) => c.consentType === "analytics");
      expect(analyticsRows).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // Cold-start survival — genuine proof (the Map implementation would FAIL)
  // -------------------------------------------------------------------------
  describe("cold-start survival — fresh instance reads from DB, no shared Map state", () => {
    it("instance B reads consent recorded by instance A via the shared DB mock", async () => {
      // The inserted rows are captured in the mock DB's shared state.
      // Instance A writes; instance B — constructed fresh with NO prior state —
      // reads back via getUserConsents. The Map implementation would return []
      // from B because B has no in-memory entries.
      const capturedInserts: Array<Record<string, unknown>> = [];
      const chain = createChainableMock();

      chain.insert = jest.fn().mockImplementation((row: Record<string, unknown>) => {
        capturedInserts.push(row);
        return Promise.resolve({ error: null });
      });

      // getUserConsents (order terminal) returns captured rows
      chain.order = jest.fn().mockImplementation(() => {
        const resolved = Promise.resolve({
          data: capturedInserts.filter((r) => r.user_id === userId),
          error: null,
        });
        Object.assign(resolved, chain);
        return resolved;
      });

      // hasConsent (maybeSingle terminal) returns last captured row
      chain.maybeSingle = jest.fn().mockImplementation(() => {
        const matching = capturedInserts.filter(
          (r) => r.user_id === userId,
        );
        return Promise.resolve({
          data: matching.at(-1) ?? null,
          error: null,
        });
      });

      const db: DbClient = {
        from: jest.fn().mockImplementation(() => chain),
        rpc: jest.fn().mockResolvedValue({ error: null }),
        auth: {
          admin: { deleteUser: jest.fn().mockResolvedValue({ error: null }) },
        },
      };

      // Instance A: record a consent event
      const instanceA = new ConsentManagementService(db);
      await instanceA.recordConsent({
        userId,
        consentType: "marketing",
        granted: true,
        timestamp: new Date("2026-03-01T09:00:00Z"),
      });

      // Instance B: entirely new object, no shared in-memory state
      const instanceB = new ConsentManagementService(db);

      // B reads via getUserConsents — Map implementation returns [] here
      const consents = await instanceB.getUserConsents(userId);
      expect(consents).toHaveLength(1);
      expect(consents[0].granted).toBe(true);

      // B reads via hasConsent — Map implementation returns false here
      const has = await instanceB.hasConsent(userId, "marketing");
      expect(has).toBe(true);

      // Confirm B called db.from (it read from the DB, not from memory)
      const fromCalls = (db.from as jest.Mock).mock.calls as string[][];
      // A called from() for the insert; B called from() for the reads
      expect(fromCalls.length).toBeGreaterThanOrEqual(2);
    });

    it("a fresh instance with no prior DB rows returns empty for getUserConsents", async () => {
      const db = buildMockDb({ allRows: [] });
      const freshSvc = new ConsentManagementService(db);

      expect(await freshSvc.getUserConsents(userId)).toEqual([]);
    });

    it("a fresh instance with no prior DB rows returns false for hasConsent", async () => {
      const db = buildMockDb({ maybeSingleRow: null });
      const freshSvc = new ConsentManagementService(db);

      expect(await freshSvc.hasConsent(userId, "marketing")).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // exportConsentHistory — all rows as JSON
  // -------------------------------------------------------------------------
  describe("exportConsentHistory — returns all rows for user", () => {
    it("returns JSON array of all consent events for user", async () => {
      const rows = [
        {
          user_id: userId,
          consent_type: "marketing",
          granted: true,
          timestamp: "2026-01-01T00:00:00Z",
          ip_address: null,
          user_agent: null,
        },
        {
          user_id: userId,
          consent_type: "marketing",
          granted: false,
          timestamp: "2026-02-01T00:00:00Z",
          ip_address: null,
          user_agent: null,
        },
        {
          user_id: userId,
          consent_type: "analytics",
          granted: true,
          timestamp: "2026-01-15T00:00:00Z",
          ip_address: null,
          user_agent: null,
        },
      ];

      const db = buildMockDb({ allRows: rows });
      const svc = new ConsentManagementService(db);

      const history = await svc.exportConsentHistory(userId);
      const parsed = JSON.parse(history) as ConsentRecord[];

      expect(parsed).toHaveLength(3);
      // Both marketing rows present (append-only history preserved)
      expect(parsed.filter((r) => r.consentType === "marketing")).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // getUserConsents — DB→ConsentRecord mapping
  // -------------------------------------------------------------------------
  describe("getUserConsents — maps DB rows to ConsentRecord objects", () => {
    it("maps all columns correctly including optional fields", async () => {
      const rows = [
        {
          user_id: userId,
          consent_type: "data_sharing",
          granted: false,
          timestamp: "2026-01-10T08:00:00Z",
          ip_address: "10.0.0.1",
          user_agent: "TestAgent/1.0",
        },
      ];

      const db = buildMockDb({ allRows: rows });
      const svc = new ConsentManagementService(db);

      const consents = await svc.getUserConsents(userId);
      expect(consents).toHaveLength(1);
      expect(consents[0].userId).toBe(userId);
      expect(consents[0].consentType).toBe("data_sharing");
      expect(consents[0].granted).toBe(false);
      expect(consents[0].timestamp).toBeInstanceOf(Date);
      expect(consents[0].ipAddress).toBe("10.0.0.1");
      expect(consents[0].userAgent).toBe("TestAgent/1.0");
    });

    it("returns empty array when DB returns no rows", async () => {
      const db = buildMockDb({ allRows: [] });
      const svc = new ConsentManagementService(db);

      expect(await svc.getUserConsents(userId)).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// GDPRComplianceService.objectToProcessing — upsert → insert (append)
// ---------------------------------------------------------------------------

describe("GDPRComplianceService.objectToProcessing — append-only insert", () => {
  const userId = "user-gdpr-456";

  it("calls insert (not upsert) when recording a processing objection", async () => {
    const chain = createChainableMock();
    const db: DbClient = {
      from: jest.fn().mockImplementation(() => chain),
      rpc: jest.fn().mockResolvedValue({ error: null }),
      auth: {
        admin: { deleteUser: jest.fn().mockResolvedValue({ error: null }) },
      },
    };

    const svc = new GDPRComplianceService(db);
    await svc.objectToProcessing(userId, "ai_processing");

    expect(chain.insert).toHaveBeenCalled();
    // Upsert must not have been called with consent data
    const upsertCalls = chain.upsert.mock.calls as Array<[Record<string, unknown>]>;
    expect(
      upsertCalls.find(([p]) => (p as Record<string, unknown>).consent_type !== undefined),
    ).toBeUndefined();
  });

  it("inserts a row with granted=false for the processing type", async () => {
    const chain = createChainableMock();
    const db: DbClient = {
      from: jest.fn().mockImplementation(() => chain),
      rpc: jest.fn().mockResolvedValue({ error: null }),
      auth: {
        admin: { deleteUser: jest.fn().mockResolvedValue({ error: null }) },
      },
    };

    const svc = new GDPRComplianceService(db);
    await svc.objectToProcessing(userId, "analytics");

    const insertCalls = chain.insert.mock.calls as Array<[Record<string, unknown>]>;
    const consentInsert = insertCalls.find(
      ([p]) => (p as Record<string, unknown>).consent_type !== undefined,
    );
    expect(consentInsert).toBeDefined();
    expect(consentInsert![0]).toMatchObject({
      user_id: userId,
      consent_type: "analytics",
      granted: false,
    });
  });
});

// ---------------------------------------------------------------------------
// CCPAComplianceService.optOutOfSale — upsert → insert (append)
// ---------------------------------------------------------------------------

describe("CCPAComplianceService.optOutOfSale — append-only insert", () => {
  const userId = "user-ccpa-789";

  it("calls insert (not upsert) when recording opt-out", async () => {
    const chain = createChainableMock();
    const db: DbClient = {
      from: jest.fn().mockImplementation(() => chain),
      rpc: jest.fn().mockResolvedValue({ error: null }),
      auth: {
        admin: { deleteUser: jest.fn().mockResolvedValue({ error: null }) },
      },
    };

    const gdpr = new GDPRComplianceService(db);
    const svc = new CCPAComplianceService(db, gdpr);
    await svc.optOutOfSale(userId);

    expect(chain.insert).toHaveBeenCalled();
    const upsertCalls = chain.upsert.mock.calls as Array<[Record<string, unknown>]>;
    expect(
      upsertCalls.find(
        ([p]) => (p as Record<string, unknown>).consent_type === "data_sharing",
      ),
    ).toBeUndefined();
  });

  it("inserts a row with consent_type=data_sharing and granted=false", async () => {
    const chain = createChainableMock();
    const db: DbClient = {
      from: jest.fn().mockImplementation(() => chain),
      rpc: jest.fn().mockResolvedValue({ error: null }),
      auth: {
        admin: { deleteUser: jest.fn().mockResolvedValue({ error: null }) },
      },
    };

    const gdpr = new GDPRComplianceService(db);
    const svc = new CCPAComplianceService(db, gdpr);
    await svc.optOutOfSale(userId);

    const insertCalls = chain.insert.mock.calls as Array<[Record<string, unknown>]>;
    const consentInsert = insertCalls.find(
      ([p]) => (p as Record<string, unknown>).consent_type === "data_sharing",
    );
    expect(consentInsert).toBeDefined();
    expect(consentInsert![0]).toMatchObject({
      user_id: userId,
      consent_type: "data_sharing",
      granted: false,
    });
  });
});
