/**
 * @jest-environment node
 */

/**
 * Tests for CreditReportsDbService
 *
 * Covers: credit report CRUD, score history, and compound stats.
 * Requires mocking: @/lib/supabase/client
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/service-role", () => {
  const _client = { from: jest.fn() };
  return { getServiceRoleClient: () => _client };
});

function sb() {
  return require("@/lib/supabase/service-role").getServiceRoleClient();
}

function chainMock(result: { data: unknown; error: unknown; count?: number }) {
  const obj: Record<string, unknown> = {};
  const methods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "neq",
    "is",
    "in",
    "not",
    "order",
    "limit",
    "range",
    "gte",
    "lte",
    "ilike",
    "single",
  ];
  for (const m of methods) {
    obj[m] = jest.fn().mockReturnValue(obj);
  }
  obj.single = jest.fn().mockResolvedValue(result);
  obj.then = (
    resolve: (v: unknown) => void,
    reject: (e: unknown) => void,
  ) =>
    Promise.resolve({ ...result, count: result.count ?? 0 }).then(
      resolve,
      reject,
    );
  return obj;
}

function mockFrom(result: { data: unknown; error: unknown; count?: number }) {
  const mock = chainMock(result);
  sb().from.mockReturnValue(mock);
  return mock;
}

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { creditReportsDbService } from "../credit-reports-db-service";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const now = new Date().toISOString();

const sampleReportRow = {
  id: "rpt-1",
  user_id: "u-1",
  report_data: { summary: "Good standing" },
  bureau: "experian" as const,
  report_date: "2026-02-15",
  score: 720,
  accounts: [{ name: "Chase", balance: 500 }],
  inquiries: [{ company: "Bank A" }],
  collections: null,
  public_records: null,
  created_at: now,
  updated_at: now,
};

const sampleReportRow2 = {
  ...sampleReportRow,
  id: "rpt-2",
  bureau: "equifax" as const,
  score: 710,
  report_date: "2026-02-10",
};

const sampleReportRow3 = {
  ...sampleReportRow,
  id: "rpt-3",
  bureau: "transunion" as const,
  score: 730,
  report_date: "2026-02-05",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CreditReportsDbService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // createCreditReport
  // --------------------------------------------------------------------------

  describe("createCreditReport", () => {
    it("should create a report and return mapped result", async () => {
      mockFrom({ data: sampleReportRow, error: null });

      const result = await creditReportsDbService.createCreditReport({
        userId: "u-1",
        reportData: { summary: "Good standing" },
        bureau: "experian",
        reportDate: new Date("2026-02-15T14:30:00Z"),
        score: 720,
      });

      expect(result.id).toBe("rpt-1");
      expect(result.userId).toBe("u-1");
      expect(result.bureau).toBe("experian");
      expect(result.score).toBe(720);
      expect(result.reportDate).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(sb().from).toHaveBeenCalledWith("credit_reports");
    });

    it("should convert reportDate to date-only string", async () => {
      const mock = mockFrom({ data: sampleReportRow, error: null });

      await creditReportsDbService.createCreditReport({
        userId: "u-1",
        reportData: {},
        bureau: "experian",
        reportDate: new Date("2026-02-15T14:30:00Z"),
      });

      expect(mock.insert).toHaveBeenCalledWith(
        expect.objectContaining({ report_date: "2026-02-15" }),
      );
    });

    it("should pass optional fields to insert", async () => {
      const mock = mockFrom({ data: sampleReportRow, error: null });

      await creditReportsDbService.createCreditReport({
        userId: "u-1",
        reportData: {},
        bureau: "experian",
        reportDate: new Date("2026-02-15"),
        accounts: [{ name: "Chase" }],
        inquiries: [{ company: "A" }],
        collections: [{ amount: 100 }],
        publicRecords: [{ type: "bankruptcy" }],
      });

      expect(mock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          accounts: [{ name: "Chase" }],
          inquiries: [{ company: "A" }],
          collections: [{ amount: 100 }],
          public_records: [{ type: "bankruptcy" }],
        }),
      );
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Insert failed" } });

      await expect(
        creditReportsDbService.createCreditReport({
          userId: "u-1",
          reportData: {},
          bureau: "experian",
          reportDate: new Date(),
        }),
      ).rejects.toThrow("Failed to create credit report");
    });
  });

  // --------------------------------------------------------------------------
  // getCreditReport
  // --------------------------------------------------------------------------

  describe("getCreditReport", () => {
    it("should return mapped report when found", async () => {
      mockFrom({ data: sampleReportRow, error: null });

      const result = await creditReportsDbService.getCreditReport(
        "rpt-1",
        "u-1",
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe("rpt-1");
      expect(result!.bureau).toBe("experian");
      expect(result!.accounts).toHaveLength(1);
    });

    it("should return null when not found (PGRST116)", async () => {
      mockFrom({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await creditReportsDbService.getCreditReport(
        "nope",
        "u-1",
      );
      expect(result).toBeNull();
    });

    it("should return null when data is null without error", async () => {
      mockFrom({ data: null, error: null });

      const result = await creditReportsDbService.getCreditReport(
        "rpt-1",
        "u-1",
      );
      expect(result).toBeNull();
    });

    it("should throw on general database error", async () => {
      mockFrom({ data: null, error: { message: "Connection lost" } });

      await expect(
        creditReportsDbService.getCreditReport("rpt-1", "u-1"),
      ).rejects.toThrow("Failed to get credit report");
    });

    it("should map null optional fields as undefined", async () => {
      const rowNulls = {
        ...sampleReportRow,
        score: null,
        accounts: null,
        inquiries: null,
        collections: null,
        public_records: null,
      };
      mockFrom({ data: rowNulls, error: null });

      const result = await creditReportsDbService.getCreditReport(
        "rpt-1",
        "u-1",
      );
      expect(result!.score).toBeUndefined();
      expect(result!.accounts).toBeUndefined();
      expect(result!.inquiries).toBeUndefined();
      expect(result!.collections).toBeUndefined();
      expect(result!.publicRecords).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // getCreditReportsByUser
  // --------------------------------------------------------------------------

  describe("getCreditReportsByUser", () => {
    it("should return reports array", async () => {
      mockFrom({
        data: [sampleReportRow, sampleReportRow2],
        error: null,
      });

      const result =
        await creditReportsDbService.getCreditReportsByUser("u-1");
      expect(result).toHaveLength(2);
    });

    it("should apply bureau filter", async () => {
      const mock = mockFrom({ data: [], error: null });

      await creditReportsDbService.getCreditReportsByUser("u-1", {
        bureau: "equifax",
      });
      expect(mock.eq).toHaveBeenCalledWith("bureau", "equifax");
    });

    it("should apply startDate filter with date-only format", async () => {
      const mock = mockFrom({ data: [], error: null });

      await creditReportsDbService.getCreditReportsByUser("u-1", {
        startDate: new Date("2026-01-01T00:00:00Z"),
      });
      expect(mock.gte).toHaveBeenCalledWith("report_date", "2026-01-01");
    });

    it("should apply endDate filter with date-only format", async () => {
      const mock = mockFrom({ data: [], error: null });

      await creditReportsDbService.getCreditReportsByUser("u-1", {
        endDate: new Date("2026-02-28T23:59:59Z"),
      });
      expect(mock.lte).toHaveBeenCalledWith("report_date", "2026-02-28");
    });

    it("should apply limit when provided", async () => {
      const mock = mockFrom({ data: [], error: null });

      await creditReportsDbService.getCreditReportsByUser("u-1", {
        limit: 5,
      });
      expect(mock.limit).toHaveBeenCalledWith(5);
    });

    it("should return empty array when data is null", async () => {
      mockFrom({ data: null, error: null });

      const result =
        await creditReportsDbService.getCreditReportsByUser("u-1");
      expect(result).toEqual([]);
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Query failed" } });

      await expect(
        creditReportsDbService.getCreditReportsByUser("u-1"),
      ).rejects.toThrow("Failed to get credit reports");
    });
  });

  // --------------------------------------------------------------------------
  // getLatestCreditReport
  // --------------------------------------------------------------------------

  describe("getLatestCreditReport", () => {
    it("should return the latest report for a bureau", async () => {
      mockFrom({ data: sampleReportRow, error: null });

      const result = await creditReportsDbService.getLatestCreditReport(
        "u-1",
        "experian",
      );
      expect(result).not.toBeNull();
      expect(result!.bureau).toBe("experian");
    });

    it("should return null when no report found (PGRST116)", async () => {
      mockFrom({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await creditReportsDbService.getLatestCreditReport(
        "u-1",
        "transunion",
      );
      expect(result).toBeNull();
    });

    it("should throw on general database error", async () => {
      mockFrom({ data: null, error: { message: "DB error" } });

      await expect(
        creditReportsDbService.getLatestCreditReport("u-1", "equifax"),
      ).rejects.toThrow("Failed to get latest credit report");
    });
  });

  // --------------------------------------------------------------------------
  // getCreditReportsByBureau
  // --------------------------------------------------------------------------

  describe("getCreditReportsByBureau", () => {
    it("should return reports for a specific bureau", async () => {
      mockFrom({ data: [sampleReportRow], error: null });

      const result = await creditReportsDbService.getCreditReportsByBureau(
        "u-1",
        "experian",
      );
      expect(result).toHaveLength(1);
      expect(result[0].bureau).toBe("experian");
    });

    it("should apply limit when provided", async () => {
      const mock = mockFrom({ data: [], error: null });

      await creditReportsDbService.getCreditReportsByBureau(
        "u-1",
        "experian",
        5,
      );
      expect(mock.limit).toHaveBeenCalledWith(5);
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Query failed" } });

      await expect(
        creditReportsDbService.getCreditReportsByBureau("u-1", "equifax"),
      ).rejects.toThrow("Failed to get credit reports by bureau");
    });
  });

  // --------------------------------------------------------------------------
  // updateCreditReport
  // --------------------------------------------------------------------------

  describe("updateCreditReport", () => {
    it("should update a report and return mapped result", async () => {
      const updatedRow = { ...sampleReportRow, score: 740 };
      mockFrom({ data: updatedRow, error: null });

      const result = await creditReportsDbService.updateCreditReport(
        "rpt-1",
        "u-1",
        { score: 740 },
      );
      expect(result.score).toBe(740);
    });

    it("should map all update fields correctly", async () => {
      const mock = mockFrom({ data: sampleReportRow, error: null });

      await creditReportsDbService.updateCreditReport("rpt-1", "u-1", {
        reportData: { updated: true },
        bureau: "equifax",
        reportDate: new Date("2026-03-01T00:00:00Z"),
        score: 750,
        accounts: [{ new: true }],
        inquiries: [{ new: true }],
        collections: [{ new: true }],
        publicRecords: [{ new: true }],
      });

      expect(mock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          report_data: { updated: true },
          bureau: "equifax",
          report_date: "2026-03-01",
          score: 750,
          accounts: [{ new: true }],
          inquiries: [{ new: true }],
          collections: [{ new: true }],
          public_records: [{ new: true }],
        }),
      );
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Update failed" } });

      await expect(
        creditReportsDbService.updateCreditReport("rpt-1", "u-1", {
          score: 750,
        }),
      ).rejects.toThrow("Failed to update credit report");
    });
  });

  // --------------------------------------------------------------------------
  // deleteCreditReport
  // --------------------------------------------------------------------------

  describe("deleteCreditReport", () => {
    it("should delete a report and return true", async () => {
      mockFrom({ data: null, error: null });

      const result = await creditReportsDbService.deleteCreditReport(
        "rpt-1",
        "u-1",
      );
      expect(result).toBe(true);
      expect(sb().from).toHaveBeenCalledWith("credit_reports");
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Delete failed" } });

      await expect(
        creditReportsDbService.deleteCreditReport("rpt-1", "u-1"),
      ).rejects.toThrow("Failed to delete credit report");
    });
  });

  // --------------------------------------------------------------------------
  // getCreditScoreHistory
  // --------------------------------------------------------------------------

  describe("getCreditScoreHistory", () => {
    it("should return score history with date mapping", async () => {
      const historyRows = [
        { report_date: "2026-01-15", score: 700, bureau: "experian" },
        { report_date: "2026-02-15", score: 720, bureau: "experian" },
      ];
      mockFrom({ data: historyRows, error: null });

      const result =
        await creditReportsDbService.getCreditScoreHistory("u-1");
      expect(result).toHaveLength(2);
      expect(result[0].date).toBeInstanceOf(Date);
      expect(result[0].score).toBe(700);
      expect(result[0].bureau).toBe("experian");
    });

    it("should filter null scores via not().is(null)", async () => {
      const mock = mockFrom({ data: [], error: null });

      await creditReportsDbService.getCreditScoreHistory("u-1");
      expect(mock.not).toHaveBeenCalledWith("score", "is", null);
    });

    it("should apply bureau filter when provided", async () => {
      const mock = mockFrom({ data: [], error: null });

      await creditReportsDbService.getCreditScoreHistory("u-1", "equifax");
      expect(mock.eq).toHaveBeenCalledWith("bureau", "equifax");
    });

    it("should apply limit when provided", async () => {
      const mock = mockFrom({ data: [], error: null });

      await creditReportsDbService.getCreditScoreHistory("u-1", undefined, 10);
      expect(mock.limit).toHaveBeenCalledWith(10);
    });

    it("should return empty array when data is null", async () => {
      mockFrom({ data: null, error: null });

      const result =
        await creditReportsDbService.getCreditScoreHistory("u-1");
      expect(result).toEqual([]);
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Query failed" } });

      await expect(
        creditReportsDbService.getCreditScoreHistory("u-1"),
      ).rejects.toThrow("Failed to get credit score history");
    });
  });

  // --------------------------------------------------------------------------
  // getCreditReportStats (compound)
  // --------------------------------------------------------------------------

  describe("getCreditReportStats", () => {
    it("should compute stats from multiple queries", async () => {
      // getCreditReportStats calls:
      // 1. getCreditReportsByUser(userId) — list query (thenable)
      // 2. getLatestCreditReport(userId, "experian") — single query
      // 3. getLatestCreditReport(userId, "equifax") — single query
      // 4. getLatestCreditReport(userId, "transunion") — single query
      // 5. getCreditReportsByUser(userId, { endDate, limit:3 }) — list query (thenable)

      const allReports = chainMock({
        data: [sampleReportRow, sampleReportRow2, sampleReportRow3],
        error: null,
      });
      const latestExperian = chainMock({
        data: sampleReportRow,
        error: null,
      });
      const latestEquifax = chainMock({
        data: sampleReportRow2,
        error: null,
      });
      const latestTransunion = chainMock({
        data: sampleReportRow3,
        error: null,
      });
      const oldReports = chainMock({
        data: [
          { ...sampleReportRow, score: 680 },
          { ...sampleReportRow2, score: 670 },
        ],
        error: null,
      });

      sb().from
        .mockReturnValueOnce(allReports)
        .mockReturnValueOnce(latestExperian)
        .mockReturnValueOnce(latestEquifax)
        .mockReturnValueOnce(latestTransunion)
        .mockReturnValueOnce(oldReports);

      const result =
        await creditReportsDbService.getCreditReportStats("u-1");

      expect(result.totalReports).toBe(3);
      expect(result.byBureau).toHaveProperty("experian", 1);
      expect(result.byBureau).toHaveProperty("equifax", 1);
      expect(result.byBureau).toHaveProperty("transunion", 1);
      expect(result.latestScores.experian).toBe(720);
      expect(result.latestScores.equifax).toBe(710);
      expect(result.latestScores.transunion).toBe(730);
      // averageScore = (720 + 710 + 730) / 3 = 720
      expect(result.averageScore).toBeCloseTo(720, 0);
      // oldAvg = (680 + 670) / 2 = 675
      // scoreChange = 720 - 675 = 45
      expect(result.scoreChange).toBeCloseTo(45, 0);
    });

    it("should handle empty reports", async () => {
      const emptyReports = chainMock({ data: [], error: null });
      const noExperian = chainMock({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });
      const noEquifax = chainMock({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });
      const noTransunion = chainMock({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });
      const noOldReports = chainMock({ data: [], error: null });

      sb().from
        .mockReturnValueOnce(emptyReports)
        .mockReturnValueOnce(noExperian)
        .mockReturnValueOnce(noEquifax)
        .mockReturnValueOnce(noTransunion)
        .mockReturnValueOnce(noOldReports);

      const result =
        await creditReportsDbService.getCreditReportStats("u-1");

      expect(result.totalReports).toBe(0);
      expect(result.averageScore).toBe(0);
      expect(result.scoreChange).toBe(0);
    });

    it("should handle partial bureau data", async () => {
      // Only experian has data
      const reportsWithOnebureau = chainMock({
        data: [sampleReportRow],
        error: null,
      });
      const latestExperian = chainMock({
        data: sampleReportRow,
        error: null,
      });
      const noEquifax = chainMock({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });
      const noTransunion = chainMock({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });
      const noOldReports = chainMock({ data: [], error: null });

      sb().from
        .mockReturnValueOnce(reportsWithOnebureau)
        .mockReturnValueOnce(latestExperian)
        .mockReturnValueOnce(noEquifax)
        .mockReturnValueOnce(noTransunion)
        .mockReturnValueOnce(noOldReports);

      const result =
        await creditReportsDbService.getCreditReportStats("u-1");

      expect(result.totalReports).toBe(1);
      expect(result.latestScores.experian).toBe(720);
      expect(result.latestScores.equifax).toBeNull();
      expect(result.latestScores.transunion).toBeNull();
      // averageScore = 720 / 1 = 720
      expect(result.averageScore).toBe(720);
    });

    it("should throw when underlying query fails", async () => {
      const failMock = chainMock({
        data: null,
        error: { message: "Connection lost" },
      });
      sb().from.mockReturnValue(failMock);

      await expect(
        creditReportsDbService.getCreditReportStats("u-1"),
      ).rejects.toThrow("Failed to get credit report stats");
    });
  });
});
