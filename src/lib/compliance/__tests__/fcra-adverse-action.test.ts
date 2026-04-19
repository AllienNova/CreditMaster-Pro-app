import {
  FCRAAdverseActionService,
  CREDIT_BUREAUS,
  type AdverseActionNotice,
  type DbClient,
} from "../fcra-adverse-action";

// Build a chainable mock that mimics Supabase query builder
function createMockDb(): DbClient {
  const chainable: Record<string, jest.Mock> = {};
  chainable.insert = jest.fn().mockResolvedValue({ error: null });
  chainable.select = jest.fn().mockImplementation(() => chainable);
  chainable.delete = jest.fn().mockImplementation(() => chainable);
  chainable.update = jest.fn().mockImplementation(() => chainable);
  chainable.upsert = jest.fn().mockResolvedValue({ error: null });
  chainable.eq = jest.fn().mockImplementation(() => chainable);
  chainable.order = jest.fn().mockResolvedValue({ data: [] });
  chainable.single = jest.fn().mockResolvedValue({ data: null, error: null });

  return {
    from: jest.fn().mockImplementation(() => chainable),
  };
}

// Prevent supabaseAdmin import from crashing at module load
jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: { from: jest.fn() },
}));

describe("FCRAAdverseActionService", () => {
  const userId = "user-123";
  let mockDb: DbClient;
  let service: FCRAAdverseActionService;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new FCRAAdverseActionService(mockDb);
  });

  describe("createNotice", () => {
    it("creates a valid adverse action notice with all required FCRA fields", async () => {
      const notice = await service.createNotice({
        userId,
        action: "Denied upgrade to Pro tier",
        reasons: ["low_credit_score", "delinquent_accounts"],
        creditScoreUsed: 580,
        creditScoreRange: { min: 300, max: 850 },
        bureauUsed: "equifax",
      });

      expect(notice.id).toMatch(/^aan_/);
      expect(notice.userId).toBe(userId);
      expect(notice.action).toBe("Denied upgrade to Pro tier");
      expect(notice.reasons).toHaveLength(2);
      expect(notice.creditScoreUsed).toBe(580);
      expect(notice.bureauInfo.name).toBe("Equifax Information Services LLC");
      expect(notice.bureauInfo.phone).toBeTruthy();
      expect(notice.bureauInfo.address).toBeTruthy();
      expect(notice.noticeDate).toBeInstanceOf(Date);
      expect(notice.freeReportDeadline).toBeInstanceOf(Date);
    });

    it("persists notice to database", async () => {
      await service.createNotice({
        userId,
        action: "Denied",
        reasons: ["low_credit_score"],
        bureauUsed: "equifax",
      });

      expect(mockDb.from).toHaveBeenCalledWith("adverse_action_notices");
      expect(mockDb.from).toHaveBeenCalledWith("audit_logs");
    });

    it("sets free report deadline to 60 days after notice date", async () => {
      const notice = await service.createNotice({
        userId,
        action: "Denied",
        reasons: ["low_credit_score"],
        bureauUsed: "experian",
      });

      const daysDiff = Math.round(
        (notice.freeReportDeadline.getTime() - notice.noticeDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      expect(daysDiff).toBe(60);
    });

    it("throws for unknown credit bureau", async () => {
      await expect(
        service.createNotice({
          userId,
          action: "Denied",
          reasons: ["low_credit_score"],
          bureauUsed: "unknown_bureau" as keyof typeof CREDIT_BUREAUS,
        }),
      ).rejects.toThrow("Unknown credit bureau");
    });

    it("supports all three credit bureaus", async () => {
      for (const bureau of ["equifax", "experian", "transunion"] as const) {
        const notice = await service.createNotice({
          userId,
          action: "Denied",
          reasons: ["insufficient_credit_history"],
          bureauUsed: bureau,
        });

        expect(notice.bureauInfo).toEqual(CREDIT_BUREAUS[bureau]);
      }
    });
  });

  describe("formatNotice", () => {
    let notice: AdverseActionNotice;

    beforeEach(async () => {
      notice = await service.createNotice({
        userId,
        action: "Denied upgrade to Pro tier",
        reasons: ["low_credit_score", "collections_on_record"],
        creditScoreUsed: 580,
        creditScoreRange: { min: 300, max: 850 },
        bureauUsed: "equifax",
      });
    });

    it("includes ADVERSE ACTION NOTICE header", () => {
      const formatted = service.formatNotice(notice);
      expect(formatted).toContain("ADVERSE ACTION NOTICE");
    });

    it("includes the action taken", () => {
      const formatted = service.formatNotice(notice);
      expect(formatted).toContain("Denied upgrade to Pro tier");
    });

    it("includes human-readable reasons", () => {
      const formatted = service.formatNotice(notice);
      expect(formatted).toContain(
        "Credit score did not meet minimum requirements",
      );
      expect(formatted).toContain("Collection accounts on credit report");
    });

    it("includes credit score information", () => {
      const formatted = service.formatNotice(notice);
      expect(formatted).toContain("580");
      expect(formatted).toContain("300 - 850");
    });

    it("includes bureau contact information", () => {
      const formatted = service.formatNotice(notice);
      expect(formatted).toContain("Equifax Information Services LLC");
      expect(formatted).toContain("1-800-685-1111");
      expect(formatted).toContain("P.O. Box 740256");
    });

    it("includes FCRA rights disclosure", () => {
      const formatted = service.formatNotice(notice);
      expect(formatted).toContain("FAIR CREDIT REPORTING ACT");
      expect(formatted).toContain("did not make this decision");
      expect(formatted).toContain("free copy of your credit report");
      expect(formatted).toContain("60 days");
      expect(formatted).toContain("dispute the accuracy");
      expect(formatted).toContain("30 days");
    });

    it("includes FTC contact information", () => {
      const formatted = service.formatNotice(notice);
      expect(formatted).toContain("Federal Trade Commission");
      expect(formatted).toContain("www.ftc.gov");
    });
  });

  describe("getNoticesForUser", () => {
    it("returns empty array when no notices exist", async () => {
      const notices = await service.getNoticesForUser(userId);
      expect(notices).toEqual([]);
    });
  });

  describe("CREDIT_BUREAUS", () => {
    it("has all three major bureaus", () => {
      expect(CREDIT_BUREAUS).toHaveProperty("equifax");
      expect(CREDIT_BUREAUS).toHaveProperty("experian");
      expect(CREDIT_BUREAUS).toHaveProperty("transunion");
    });

    it("each bureau has required contact fields", () => {
      for (const bureau of Object.values(CREDIT_BUREAUS)) {
        expect(bureau.name).toBeTruthy();
        expect(bureau.address).toBeTruthy();
        expect(bureau.phone).toMatch(/^\d-\d{3}-\d{3}-\d{4}$/);
        expect(bureau.website).toBeTruthy();
      }
    });
  });
});
