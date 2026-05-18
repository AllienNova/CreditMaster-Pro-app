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
 * The builder supports two terminal patterns used by ConsentManagementService:
 *   1. .order()            → resolves { data: allRows, error: null }  (getUserConsents)
 *   2. .order().limit().single() → resolves with first row or null    (hasConsent)
 *
 * `allRows` is the full result set; `singleRow` is what `.single()` returns.
 */
function createChainableMock(opts?: {
  allRows?: Array<Record<string, unknown>>;
  singleRow?: Record<string, unknown> | null;
  insertError?: string | null;
}): MockBuilder {
  const allRows = opts?.allRows ?? [];
  const singleRow = opts?.singleRow !== undefined ? opts.singleRow : null;
  const insertErr = opts?.insertError !== undefined ? opts.insertError : null;

  const b: MockBuilder = {};
  b.insert = jest.fn().mockResolvedValue({
    error: insertErr ? { message: insertErr } : null,
  });
  b.select = jest.fn().mockImplementation(() => b);
  b.delete = jest.fn().mockImplementation(() => b);
  b.update = jest.fn().mockImplementation(() => b);
  b.upsert = jest.fn().mockResolvedValue({ error: null });
  b.eq = jest.fn().mockImplementation(() => b);
  b.limit = jest.fn().mockImplementation(() => b);
  // .single() is the terminal for hasConsent
  b.single = jest.fn().mockResolvedValue({
    data: singleRow,
    error: singleRow === null ? { message: "no rows" } : null,
  });
  // .order() is the terminal for getUserConsents; also chainable for hasConsent
  // We need it to resolve when awaited (getUserConsents path) AND return the
  // builder when chained (hasConsent path).  We do this by returning an object
  // that is BOTH the builder AND a Promise (a thenable).
  b.order = jest.fn().mockImplementation(() => {
    const resolved = Promise.resolve({ data: allRows, error: null });
    // Attach builder methods to the promise so callers can chain .limit().single()
    Object.assign(resolved, b);
    return resolved;
  });
  return b;
}

function buildMockDb(opts?: {
  allRows?: Array<Record<string, unknown>>;
  singleRow?: Record<string, unknown> | null;
  insertError?: string | null;
}): DbClient {
  const chain = createChainableMock(opts);
  return {
    from: jest.fn().mockImplementation(() => chain),
    rpc: jest.fn().mockResolvedValue({ error: null }),
    auth: {
      admin: {
        deleteUser: jest.fn().mockResolvedValue({ error: null }),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// ConsentManagementService — durable persistence (CMP-1)
// ---------------------------------------------------------------------------

describe("ConsentManagementService — durable DB persistence", () => {
  const userId = "user-abc-123";

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
      const insertMock = jest
        .fn()
        .mockResolvedValue({ error: null });
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
  });

  describe("hasConsent — returns latest granted value by timestamp", () => {
    it("returns true when the latest row has granted=true", async () => {
      const db = buildMockDb({
        singleRow: {
          granted: true,
        },
      });
      const svc = new ConsentManagementService(db);

      const result = await svc.hasConsent(userId, "marketing");
      expect(result).toBe(true);
    });

    it("returns false when the latest row has granted=false", async () => {
      const db = buildMockDb({
        singleRow: {
          granted: false,
        },
      });
      const svc = new ConsentManagementService(db);

      const result = await svc.hasConsent(userId, "ai_processing");
      expect(result).toBe(false);
    });

    it("returns false when no consent records exist for user", async () => {
      const db = buildMockDb({ singleRow: null });
      const svc = new ConsentManagementService(db);

      const result = await svc.hasConsent(userId, "data_sharing");
      expect(result).toBe(false);
    });
  });

  describe("cold-start survival — fresh instance reads history from DB", () => {
    it("a newly constructed instance reads consent state back from DB", async () => {
      // Simulate a previously-inserted row retrieved from Supabase
      const db = buildMockDb({
        singleRow: { granted: true },
      });

      // Construct a FRESH instance — no in-memory state
      const freshSvc = new ConsentManagementService(db);

      const hasIt = await freshSvc.hasConsent(userId, "analytics");
      expect(hasIt).toBe(true);
    });

    it("a fresh instance with no prior DB rows returns false for hasConsent", async () => {
      const db = buildMockDb({ singleRow: null });
      const freshSvc = new ConsentManagementService(db);

      const hasIt = await freshSvc.hasConsent(userId, "marketing");
      expect(hasIt).toBe(false);
    });
  });

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
      // Both marketing rows must be present (history preserved)
      const marketingRows = parsed.filter((r) => r.consentType === "marketing");
      expect(marketingRows).toHaveLength(2);
    });
  });

  describe("getUserConsents — maps DB rows to ConsentRecord objects", () => {
    it("maps DB rows to ConsentRecord objects correctly", async () => {
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

      const consents = await svc.getUserConsents(userId);
      expect(consents).toEqual([]);
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

    // Must use insert for consent_records, never upsert
    const fromCalls = (db.from as jest.Mock).mock.calls as string[][];
    const consentRecordsCall = fromCalls.findIndex(
      ([table]) => table === "consent_records",
    );
    expect(consentRecordsCall).toBeGreaterThanOrEqual(0);
    expect(chain.insert).toHaveBeenCalled();
    // Verify upsert was NOT called with consent data
    const upsertCalls = chain.upsert.mock
      .calls as Array<[Record<string, unknown>]>;
    const consentUpsert = upsertCalls.find(
      ([payload]) =>
        (payload as Record<string, unknown>).consent_type !== undefined,
    );
    expect(consentUpsert).toBeUndefined();
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

    const insertCalls = chain.insert.mock
      .calls as Array<[Record<string, unknown>]>;
    const consentInsert = insertCalls.find(
      ([payload]) =>
        (payload as Record<string, unknown>).consent_type !== undefined,
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
    const upsertCalls = chain.upsert.mock
      .calls as Array<[Record<string, unknown>]>;
    const consentUpsert = upsertCalls.find(
      ([payload]) =>
        (payload as Record<string, unknown>).consent_type === "data_sharing",
    );
    expect(consentUpsert).toBeUndefined();
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

    const insertCalls = chain.insert.mock
      .calls as Array<[Record<string, unknown>]>;
    const consentInsert = insertCalls.find(
      ([payload]) =>
        (payload as Record<string, unknown>).consent_type === "data_sharing",
    );
    expect(consentInsert).toBeDefined();
    expect(consentInsert![0]).toMatchObject({
      user_id: userId,
      consent_type: "data_sharing",
      granted: false,
    });
  });
});
