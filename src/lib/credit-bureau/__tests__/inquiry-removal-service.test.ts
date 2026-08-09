/**
 * Inquiry Removal Service — Unit Tests
 *
 * Comprehensive tests for InquiryRemovalService: inquiry analysis,
 * removable inquiry identification, dispute letter generation (all 5
 * template types), lifecycle management, and Supabase persistence.
 *
 * All Supabase interactions are mocked via the standard chainable mock pattern.
 */

// ---------------------------------------------------------------------------
// Mocks — declared before module imports
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/client", () => {
  let defaultResolution: { data: unknown; error: unknown } = { data: [], error: null };

  const mock: Record<string, jest.Mock | ((v: { data: unknown; error: unknown }) => void)> = {
    from: jest.fn(),
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(),
    order: jest.fn(),
    gte: jest.fn(),
    lte: jest.fn(),
    limit: jest.fn(),
    then: jest.fn((resolve: (v: unknown) => void) => resolve(defaultResolution)),
    __setDefaultResolution(val: { data: unknown; error: unknown }) {
      defaultResolution = val;
      (mock.then as jest.Mock).mockImplementation((resolve: (v: unknown) => void) => resolve(val));
    },
  };

  (mock.from as jest.Mock).mockReturnValue(mock);
  (mock.select as jest.Mock).mockReturnValue(mock);
  (mock.insert as jest.Mock).mockReturnValue(mock);
  (mock.update as jest.Mock).mockReturnValue(mock);
  (mock.delete as jest.Mock).mockReturnValue(mock);
  (mock.eq as jest.Mock).mockReturnValue(mock);
  (mock.order as jest.Mock).mockReturnValue(mock);
  (mock.gte as jest.Mock).mockReturnValue(mock);
  (mock.lte as jest.Mock).mockReturnValue(mock);
  (mock.limit as jest.Mock).mockReturnValue(mock);
  (mock.single as jest.Mock).mockResolvedValue({ data: null, error: null });

  return { getSupabase: () => mock };
});

import { getSupabase } from "@/lib/supabase/client";
import {
  InquiryRemovalService,
  inquiryRemovalService,
} from "../inquiry-removal-service";
import type {
  InquiryRemovalRecord,
  InquiryForRemoval,
} from "../inquiry-removal-service";
import type { ParsedCreditReport, Bureau } from "@/types/credit-bureau";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSupabase = getSupabase() as any;

// ---------------------------------------------------------------------------
// Helpers — build mock credit report data
// ---------------------------------------------------------------------------

function buildMockReport(overrides?: Partial<ParsedCreditReport>): ParsedCreditReport {
  return {
    personalInfo: {
      firstName: "Jane",
      lastName: "Doe",
      ssn: "6789",
      addresses: [
        {
          street: "123 Main St",
          city: "Springfield",
          state: "IL",
          zipCode: "62704",
          type: "current" as const,
        },
      ],
    },
    creditScore: 720,
    scoreFactors: ["Good payment history"],
    accounts: [
      {
        accountType: "credit_card",
        accountNumber: "****1234",
        creditorName: "Chase Bank",
        balance: 1500,
        paymentStatus: "current",
        openedDate: new Date("2020-01-15"),
        paymentHistory: [],
        isDisputed: false,
      },
    ],
    inquiries: [
      {
        inquiryType: "hard",
        creditorName: "Wells Fargo",
        inquiryDate: new Date("2025-06-15"),
        isDisputed: false,
      },
      {
        inquiryType: "soft",
        creditorName: "Credit Karma",
        inquiryDate: new Date("2025-12-01"),
        isDisputed: false,
      },
    ],
    publicRecords: [],
    ...overrides,
  };
}

/**
 * Helper to create inquiry dates relative to now.
 * A negative monthsAgo value would create future dates.
 */
function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

// ---------------------------------------------------------------------------
// Reset mocks between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();

  // Re-establish the chainable return values after clearAllMocks wipes them
  mockSupabase.from.mockReturnValue(mockSupabase);
  mockSupabase.select.mockReturnValue(mockSupabase);
  mockSupabase.insert.mockReturnValue(mockSupabase);
  mockSupabase.update.mockReturnValue(mockSupabase);
  mockSupabase.delete.mockReturnValue(mockSupabase);
  mockSupabase.eq.mockReturnValue(mockSupabase);
  mockSupabase.order.mockReturnValue(mockSupabase);
  mockSupabase.gte.mockReturnValue(mockSupabase);
  mockSupabase.lte.mockReturnValue(mockSupabase);
  mockSupabase.limit.mockReturnValue(mockSupabase);
  mockSupabase.single.mockResolvedValue({ data: null, error: null });

  mockSupabase.__setDefaultResolution({ data: [], error: null });
});

// ===========================================================================
// TESTS
// ===========================================================================

describe("InquiryRemovalService", () => {
  // -----------------------------------------------------------------------
  // Construction & Singleton
  // -----------------------------------------------------------------------

  describe("singleton and construction", () => {
    it("exports a singleton instance", () => {
      expect(inquiryRemovalService).toBeInstanceOf(InquiryRemovalService);
    });

    it("can be instantiated independently", () => {
      const svc = new InquiryRemovalService();
      expect(svc).toBeInstanceOf(InquiryRemovalService);
    });
  });

  // -----------------------------------------------------------------------
  // analyzeInquiries
  // -----------------------------------------------------------------------

  describe("analyzeInquiries", () => {
    it("correctly counts hard and soft inquiries", () => {
      const report = buildMockReport({
        inquiries: [
          { inquiryType: "hard", creditorName: "Bank A", inquiryDate: monthsAgo(3), isDisputed: false },
          { inquiryType: "hard", creditorName: "Bank B", inquiryDate: monthsAgo(8), isDisputed: false },
          { inquiryType: "soft", creditorName: "CK", inquiryDate: monthsAgo(1), isDisputed: false },
        ],
      });

      const summary = inquiryRemovalService.analyzeInquiries(report, "experian");
      expect(summary.totalInquiries).toBe(3);
      expect(summary.hardInquiries).toBe(2);
      expect(summary.softInquiries).toBe(1);
    });

    it("identifies expired hard inquiries", () => {
      const report = buildMockReport({
        inquiries: [
          { inquiryType: "hard", creditorName: "OldBank", inquiryDate: monthsAgo(25), isDisputed: false },
          { inquiryType: "hard", creditorName: "NewBank", inquiryDate: monthsAgo(6), isDisputed: false },
        ],
      });

      const summary = inquiryRemovalService.analyzeInquiries(report, "experian");
      expect(summary.expiredHardInquiries).toBe(1);
      expect(summary.eligibleForRemoval).toBe(1);
    });

    it("calculates average age in months", () => {
      const report = buildMockReport({
        inquiries: [
          { inquiryType: "hard", creditorName: "A", inquiryDate: monthsAgo(6), isDisputed: false },
          { inquiryType: "hard", creditorName: "B", inquiryDate: monthsAgo(12), isDisputed: false },
        ],
      });

      const summary = inquiryRemovalService.analyzeInquiries(report, "experian");
      expect(summary.averageAgeMonths).toBe(9);
    });

    it("correctly identifies oldest and newest inquiry ages", () => {
      const report = buildMockReport({
        inquiries: [
          { inquiryType: "hard", creditorName: "A", inquiryDate: monthsAgo(2), isDisputed: false },
          { inquiryType: "hard", creditorName: "B", inquiryDate: monthsAgo(18), isDisputed: false },
          { inquiryType: "soft", creditorName: "C", inquiryDate: monthsAgo(10), isDisputed: false },
        ],
      });

      const summary = inquiryRemovalService.analyzeInquiries(report, "experian");
      expect(summary.oldestInquiryMonths).toBe(18);
      expect(summary.newestInquiryMonths).toBe(2);
    });

    it("populates age distribution buckets correctly", () => {
      const report = buildMockReport({
        inquiries: [
          { inquiryType: "hard", creditorName: "A", inquiryDate: monthsAgo(2), isDisputed: false },     // under6
          { inquiryType: "hard", creditorName: "B", inquiryDate: monthsAgo(8), isDisputed: false },     // 6-12
          { inquiryType: "hard", creditorName: "C", inquiryDate: monthsAgo(14), isDisputed: false },    // 12-18
          { inquiryType: "hard", creditorName: "D", inquiryDate: monthsAgo(20), isDisputed: false },    // 18-24
          { inquiryType: "hard", creditorName: "E", inquiryDate: monthsAgo(30), isDisputed: false },    // over24
        ],
      });

      const summary = inquiryRemovalService.analyzeInquiries(report, "equifax");
      expect(summary.ageDistribution.under6Months).toBe(1);
      expect(summary.ageDistribution.sixTo12Months).toBe(1);
      expect(summary.ageDistribution.twelveToEighteenMonths).toBe(1);
      expect(summary.ageDistribution.eighteenTo24Months).toBe(1);
      expect(summary.ageDistribution.over24Months).toBe(1);
    });

    it("assigns all inquiries to the provided bureau", () => {
      const report = buildMockReport();
      const summary = inquiryRemovalService.analyzeInquiries(report, "transunion");
      expect(summary.inquiriesByBureau.transunion).toBe(report.inquiries.length);
      expect(summary.inquiriesByBureau.experian).toBe(0);
      expect(summary.inquiriesByBureau.equifax).toBe(0);
    });

    it("handles empty inquiries gracefully", () => {
      const report = buildMockReport({ inquiries: [] });
      const summary = inquiryRemovalService.analyzeInquiries(report, "experian");

      expect(summary.totalInquiries).toBe(0);
      expect(summary.hardInquiries).toBe(0);
      expect(summary.softInquiries).toBe(0);
      expect(summary.averageAgeMonths).toBe(0);
      expect(summary.oldestInquiryMonths).toBe(0);
      expect(summary.newestInquiryMonths).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // identifyRemovableInquiries
  // -----------------------------------------------------------------------

  describe("identifyRemovableInquiries", () => {
    it("identifies expired hard inquiries (>= 24 months)", () => {
      const report = buildMockReport({
        inquiries: [
          { inquiryType: "hard", creditorName: "OldBank", inquiryDate: monthsAgo(25), isDisputed: false },
          { inquiryType: "hard", creditorName: "RecentBank", inquiryDate: monthsAgo(6), isDisputed: false },
        ],
      });

      const removable = inquiryRemovalService.identifyRemovableInquiries(report, "experian");
      expect(removable).toHaveLength(1);
      expect(removable[0].creditorName).toBe("OldBank");
      expect(removable[0].reason).toBe("expired_over_24_months");
      expect(removable[0].isEligible).toBe(true);
    });

    it("identifies unauthorized inquiries", () => {
      const report = buildMockReport({
        inquiries: [
          { inquiryType: "hard", creditorName: "Unknown Lender", inquiryDate: monthsAgo(6), isDisputed: false },
          { inquiryType: "hard", creditorName: "Known Bank", inquiryDate: monthsAgo(3), isDisputed: false },
        ],
      });

      const removable = inquiryRemovalService.identifyRemovableInquiries(
        report,
        "experian",
        ["Unknown Lender"],
      );

      expect(removable).toHaveLength(1);
      expect(removable[0].creditorName).toBe("Unknown Lender");
      expect(removable[0].reason).toBe("unauthorized_inquiry");
    });

    it("skips soft inquiries", () => {
      const report = buildMockReport({
        inquiries: [
          { inquiryType: "soft", creditorName: "SoftCheck", inquiryDate: monthsAgo(30), isDisputed: false },
        ],
      });

      const removable = inquiryRemovalService.identifyRemovableInquiries(report, "experian");
      expect(removable).toHaveLength(0);
    });

    it("prefers expired reason over unauthorized for old inquiries", () => {
      const report = buildMockReport({
        inquiries: [
          { inquiryType: "hard", creditorName: "BadBank", inquiryDate: monthsAgo(26), isDisputed: false },
        ],
      });

      const removable = inquiryRemovalService.identifyRemovableInquiries(
        report,
        "experian",
        ["BadBank"],
      );

      // Should only have one entry with expired reason (early return in the code)
      expect(removable).toHaveLength(1);
      expect(removable[0].reason).toBe("expired_over_24_months");
    });

    it("includes inquiry age and index", () => {
      const report = buildMockReport({
        inquiries: [
          { inquiryType: "hard", creditorName: "OldBank", inquiryDate: monthsAgo(30), isDisputed: false },
        ],
      });

      const removable = inquiryRemovalService.identifyRemovableInquiries(report, "experian");
      expect(removable[0].inquiryIndex).toBe(0);
      expect(removable[0].ageInMonths).toBeGreaterThanOrEqual(30);
      expect(removable[0].bureau).toBe("experian");
    });

    it("returns empty array when no inquiries are removable", () => {
      const report = buildMockReport({
        inquiries: [
          { inquiryType: "hard", creditorName: "GoodBank", inquiryDate: monthsAgo(6), isDisputed: false },
        ],
      });

      const removable = inquiryRemovalService.identifyRemovableInquiries(report, "experian");
      expect(removable).toHaveLength(0);
    });

    it("handles case-insensitive unauthorized creditor matching", () => {
      const report = buildMockReport({
        inquiries: [
          { inquiryType: "hard", creditorName: "Unknown LENDER", inquiryDate: monthsAgo(6), isDisputed: false },
        ],
      });

      const removable = inquiryRemovalService.identifyRemovableInquiries(
        report,
        "experian",
        ["unknown lender"],
      );

      expect(removable).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // generateRemovalLetter
  // -----------------------------------------------------------------------

  describe("generateRemovalLetter", () => {
    const testDate = new Date("2025-01-15");

    it("generates an expired inquiry letter", () => {
      const letter = inquiryRemovalService.generateRemovalLetter(
        "OldBank",
        testDate,
        "experian",
        "expired_over_24_months",
        "Jane Doe",
      );

      expect(letter.bureau).toBe("experian");
      expect(letter.creditorName).toBe("OldBank");
      expect(letter.inquiryDate).toBe("2025-01-15");
      expect(letter.reason).toBe("expired_over_24_months");
      expect(letter.letterBody).toContain("Removal of Expired Hard Inquiry");
      expect(letter.letterBody).toContain("OldBank");
      expect(letter.letterBody).toContain("Jane Doe");
      expect(letter.letterBody).toContain("FCRA Section 605");
      expect(letter.letterBody).toContain("24-month reporting period");
      expect(letter.generatedAt).toBeInstanceOf(Date);
    });

    it("generates an unauthorized inquiry letter", () => {
      const letter = inquiryRemovalService.generateRemovalLetter(
        "BadBank",
        testDate,
        "equifax",
        "unauthorized_inquiry",
        "John Smith",
      );

      expect(letter.letterBody).toContain("Removal of Unauthorized Hard Inquiry");
      expect(letter.letterBody).toContain("BadBank");
      expect(letter.letterBody).toContain("John Smith");
      expect(letter.letterBody).toContain("without my knowledge or authorization");
      expect(letter.legalBasis).toContain("Section 604");
    });

    it("generates an identity theft inquiry letter", () => {
      const letter = inquiryRemovalService.generateRemovalLetter(
        "FraudBank",
        testDate,
        "transunion",
        "identity_theft",
      );

      expect(letter.letterBody).toContain("Identity Theft");
      expect(letter.letterBody).toContain("FraudBank");
      expect(letter.letterBody).toContain("4 business days");
      expect(letter.legalBasis).toContain("Section 605B");
    });

    it("generates a no permissible purpose letter", () => {
      const letter = inquiryRemovalService.generateRemovalLetter(
        "RandomBank",
        testDate,
        "experian",
        "no_permissible_purpose",
      );

      expect(letter.letterBody).toContain("Removal of Inquiry Without Permissible Purpose");
      expect(letter.letterBody).toContain("RandomBank");
      expect(letter.letterBody).toContain("permissible purpose");
      expect(letter.legalBasis).toContain("Section 604");
    });

    it("generates a duplicate inquiry letter", () => {
      const letter = inquiryRemovalService.generateRemovalLetter(
        "DupeBank",
        testDate,
        "equifax",
        "duplicate_inquiry",
      );

      expect(letter.letterBody).toContain("Removal of Duplicate Inquiry");
      expect(letter.letterBody).toContain("DupeBank");
      expect(letter.letterBody).toContain("duplicate");
      expect(letter.legalBasis).toContain("Section 611");
    });

    it("uses placeholder name when none provided", () => {
      const letter = inquiryRemovalService.generateRemovalLetter(
        "AnyBank",
        testDate,
        "experian",
      );

      expect(letter.letterBody).toContain("[Your Full Legal Name]");
    });

    it("includes correct bureau address for Experian", () => {
      const letter = inquiryRemovalService.generateRemovalLetter(
        "Bank",
        testDate,
        "experian",
      );
      expect(letter.bureauAddress).toContain("Experian");
      expect(letter.bureauAddress).toContain("Allen, TX");
    });

    it("includes correct bureau address for Equifax", () => {
      const letter = inquiryRemovalService.generateRemovalLetter(
        "Bank",
        testDate,
        "equifax",
      );
      expect(letter.bureauAddress).toContain("Equifax");
      expect(letter.bureauAddress).toContain("Atlanta, GA");
    });

    it("includes correct bureau address for TransUnion", () => {
      const letter = inquiryRemovalService.generateRemovalLetter(
        "Bank",
        testDate,
        "transunion",
      );
      expect(letter.bureauAddress).toContain("TransUnion");
      expect(letter.bureauAddress).toContain("Chester, PA");
    });

    it("includes the inquiry date in the letter body", () => {
      const letter = inquiryRemovalService.generateRemovalLetter(
        "Bank",
        new Date("2024-07-20"),
        "experian",
      );
      expect(letter.letterBody).toContain("2024-07-20");
    });
  });

  // -----------------------------------------------------------------------
  // generateBulkRemovalLetters
  // -----------------------------------------------------------------------

  describe("generateBulkRemovalLetters", () => {
    it("generates letters for all removable inquiries", () => {
      const report = buildMockReport({
        inquiries: [
          { inquiryType: "hard", creditorName: "OldBank1", inquiryDate: monthsAgo(25), isDisputed: false },
          { inquiryType: "hard", creditorName: "OldBank2", inquiryDate: monthsAgo(30), isDisputed: false },
          { inquiryType: "hard", creditorName: "NewBank", inquiryDate: monthsAgo(6), isDisputed: false },
        ],
      });

      const letters = inquiryRemovalService.generateBulkRemovalLetters(
        report,
        "experian",
        undefined,
        "Jane Doe",
      );

      expect(letters).toHaveLength(2);
      expect(letters[0].creditorName).toBe("OldBank1");
      expect(letters[1].creditorName).toBe("OldBank2");
    });

    it("includes unauthorized inquiries in bulk letters", () => {
      const report = buildMockReport({
        inquiries: [
          { inquiryType: "hard", creditorName: "Unknown", inquiryDate: monthsAgo(6), isDisputed: false },
          { inquiryType: "hard", creditorName: "Known", inquiryDate: monthsAgo(3), isDisputed: false },
        ],
      });

      const letters = inquiryRemovalService.generateBulkRemovalLetters(
        report,
        "experian",
        ["Unknown"],
      );

      expect(letters).toHaveLength(1);
      expect(letters[0].reason).toBe("unauthorized_inquiry");
    });

    it("returns empty array when no removable inquiries", () => {
      const report = buildMockReport({
        inquiries: [
          { inquiryType: "hard", creditorName: "GoodBank", inquiryDate: monthsAgo(6), isDisputed: false },
        ],
      });

      const letters = inquiryRemovalService.generateBulkRemovalLetters(report, "experian");
      expect(letters).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // Persistence — createRemovalRecord
  // -----------------------------------------------------------------------

  describe("createRemovalRecord", () => {
    const mockInquiry: InquiryForRemoval = {
      inquiryIndex: 0,
      creditorName: "OldBank",
      inquiryDate: new Date("2023-01-15"),
      inquiryType: "hard",
      ageInMonths: 26,
      bureau: "experian",
      reason: "expired_over_24_months",
      isEligible: true,
      eligibilityNote: "Over 24 months",
    };

    it("creates a record with letter_generated status when letter was generated", async () => {
      const expectedRecord: InquiryRemovalRecord = {
        id: "rec-1",
        user_id: "user-123",
        bureau: "experian",
        creditor_name: "OldBank",
        inquiry_date: "2023-01-15",
        reason: "expired_over_24_months",
        status: "letter_generated",
        letter_generated: true,
        submitted_at: null,
        response_received_at: null,
        outcome_notes: null,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      };

      mockSupabase.insert.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({ data: expectedRecord, error: null });

      const result = await inquiryRemovalService.createRemovalRecord(
        "user-123",
        mockInquiry,
        true,
      );

      expect(result.status).toBe("letter_generated");
      expect(result.letter_generated).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("inquiry_removal_requests");
    });

    it("creates a record with identified status when no letter generated", async () => {
      const expectedRecord: InquiryRemovalRecord = {
        id: "rec-2",
        user_id: "user-123",
        bureau: "experian",
        creditor_name: "OldBank",
        inquiry_date: "2023-01-15",
        reason: "expired_over_24_months",
        status: "identified",
        letter_generated: false,
        submitted_at: null,
        response_received_at: null,
        outcome_notes: null,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      };

      mockSupabase.insert.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({ data: expectedRecord, error: null });

      const result = await inquiryRemovalService.createRemovalRecord(
        "user-123",
        mockInquiry,
        false,
      );

      expect(result.status).toBe("identified");
      expect(result.letter_generated).toBe(false);
    });

    it("throws on database error", async () => {
      mockSupabase.insert.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: "Insert failed" },
      });

      await expect(
        inquiryRemovalService.createRemovalRecord("user-123", mockInquiry, true),
      ).rejects.toThrow("Failed to create removal record");
    });
  });

  // -----------------------------------------------------------------------
  // Persistence — updateRemovalStatus
  // -----------------------------------------------------------------------

  describe("updateRemovalStatus", () => {
    it("updates status to submitted with submitted_at timestamp", async () => {
      mockSupabase.update.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue({
        then: jest.fn((resolve: (v: unknown) => void) =>
          resolve({ error: null }),
        ),
      });

      await inquiryRemovalService.updateRemovalStatus("rec-1", "submitted");
      expect(mockSupabase.from).toHaveBeenCalledWith("inquiry_removal_requests");

      const updateArg = mockSupabase.update.mock.calls[0][0];
      expect(updateArg.status).toBe("submitted");
      expect(updateArg.submitted_at).toBeDefined();
    });

    it("sets response_received_at for resolved_removed status", async () => {
      mockSupabase.update.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue({
        then: jest.fn((resolve: (v: unknown) => void) =>
          resolve({ error: null }),
        ),
      });

      await inquiryRemovalService.updateRemovalStatus("rec-1", "resolved_removed");
      const updateArg = mockSupabase.update.mock.calls[0][0];
      expect(updateArg.response_received_at).toBeDefined();
    });

    it("sets response_received_at for resolved_verified status", async () => {
      mockSupabase.update.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue({
        then: jest.fn((resolve: (v: unknown) => void) =>
          resolve({ error: null }),
        ),
      });

      await inquiryRemovalService.updateRemovalStatus("rec-1", "resolved_verified");
      const updateArg = mockSupabase.update.mock.calls[0][0];
      expect(updateArg.response_received_at).toBeDefined();
    });

    it("sets response_received_at for rejected status", async () => {
      mockSupabase.update.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue({
        then: jest.fn((resolve: (v: unknown) => void) =>
          resolve({ error: null }),
        ),
      });

      await inquiryRemovalService.updateRemovalStatus("rec-1", "rejected");
      const updateArg = mockSupabase.update.mock.calls[0][0];
      expect(updateArg.response_received_at).toBeDefined();
    });

    it("includes outcome notes when provided", async () => {
      mockSupabase.update.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue({
        then: jest.fn((resolve: (v: unknown) => void) =>
          resolve({ error: null }),
        ),
      });

      await inquiryRemovalService.updateRemovalStatus(
        "rec-1",
        "resolved_removed",
        "Bureau confirmed removal",
      );

      const updateArg = mockSupabase.update.mock.calls[0][0];
      expect(updateArg.outcome_notes).toBe("Bureau confirmed removal");
    });

    it("throws on database error", async () => {
      mockSupabase.update.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue({
        then: jest.fn((resolve: (v: unknown) => void) =>
          resolve({ error: { message: "Update failed" } }),
        ),
      });

      await expect(
        inquiryRemovalService.updateRemovalStatus("rec-1", "submitted"),
      ).rejects.toThrow("Failed to update removal status");
    });
  });

  // -----------------------------------------------------------------------
  // Persistence — getRemovalRecords
  // -----------------------------------------------------------------------

  describe("getRemovalRecords", () => {
    it("retrieves all records for a user", async () => {
      const mockRecords: InquiryRemovalRecord[] = [
        {
          id: "rec-1",
          user_id: "user-123",
          bureau: "experian",
          creditor_name: "OldBank",
          inquiry_date: "2023-01-15",
          reason: "expired_over_24_months",
          status: "letter_generated",
          letter_generated: true,
          submitted_at: null,
          response_received_at: null,
          outcome_notes: null,
          created_at: "2025-12-01T00:00:00Z",
          updated_at: "2025-12-01T00:00:00Z",
        },
      ];

      mockSupabase.__setDefaultResolution({ data: mockRecords, error: null });

      const records = await inquiryRemovalService.getRemovalRecords("user-123");
      expect(records).toEqual(mockRecords);
      expect(mockSupabase.from).toHaveBeenCalledWith("inquiry_removal_requests");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");
    });

    it("filters by bureau when provided", async () => {
      mockSupabase.__setDefaultResolution({ data: [], error: null });

      await inquiryRemovalService.getRemovalRecords("user-123", "equifax");
      expect(mockSupabase.eq).toHaveBeenCalledWith("bureau", "equifax");
    });

    it("filters by status when provided", async () => {
      mockSupabase.__setDefaultResolution({ data: [], error: null });

      await inquiryRemovalService.getRemovalRecords("user-123", undefined, "submitted");
      expect(mockSupabase.eq).toHaveBeenCalledWith("status", "submitted");
    });

    it("throws on database error", async () => {
      mockSupabase.__setDefaultResolution({
        data: null,
        error: { message: "Query failed" },
      });

      await expect(
        inquiryRemovalService.getRemovalRecords("user-123"),
      ).rejects.toThrow("Failed to retrieve removal records");
    });
  });

  // -----------------------------------------------------------------------
  // Persistence — getRemovalOutcomeSummary
  // -----------------------------------------------------------------------

  describe("getRemovalOutcomeSummary", () => {
    it("calculates summary from records", async () => {
      const mockRecords: InquiryRemovalRecord[] = [
        {
          id: "r1",
          user_id: "user-1",
          bureau: "experian",
          creditor_name: "A",
          inquiry_date: "2023-01-01",
          reason: "expired_over_24_months",
          status: "resolved_removed",
          letter_generated: true,
          submitted_at: "2025-11-01",
          response_received_at: "2025-12-01",
          outcome_notes: null,
          created_at: "2025-10-01",
          updated_at: "2025-12-01",
        },
        {
          id: "r2",
          user_id: "user-1",
          bureau: "equifax",
          creditor_name: "B",
          inquiry_date: "2023-02-01",
          reason: "unauthorized_inquiry",
          status: "rejected",
          letter_generated: true,
          submitted_at: "2025-11-01",
          response_received_at: "2025-12-15",
          outcome_notes: "Bureau verified inquiry",
          created_at: "2025-10-01",
          updated_at: "2025-12-15",
        },
        {
          id: "r3",
          user_id: "user-1",
          bureau: "transunion",
          creditor_name: "C",
          inquiry_date: "2023-03-01",
          reason: "expired_over_24_months",
          status: "submitted",
          letter_generated: true,
          submitted_at: "2025-12-20",
          response_received_at: null,
          outcome_notes: null,
          created_at: "2025-12-15",
          updated_at: "2025-12-20",
        },
      ];

      mockSupabase.__setDefaultResolution({ data: mockRecords, error: null });

      const summary = await inquiryRemovalService.getRemovalOutcomeSummary("user-1");
      expect(summary.total).toBe(3);
      expect(summary.successful).toBe(1);
      expect(summary.rejected).toBe(1);
      expect(summary.pending).toBe(1);
      expect(summary.successRate).toBe(50);
    });

    it("returns 0 success rate when no resolved records", async () => {
      const mockRecords: InquiryRemovalRecord[] = [
        {
          id: "r1",
          user_id: "user-1",
          bureau: "experian",
          creditor_name: "A",
          inquiry_date: "2023-01-01",
          reason: "expired_over_24_months",
          status: "submitted",
          letter_generated: true,
          submitted_at: "2025-12-01",
          response_received_at: null,
          outcome_notes: null,
          created_at: "2025-10-01",
          updated_at: "2025-12-01",
        },
      ];

      mockSupabase.__setDefaultResolution({ data: mockRecords, error: null });

      const summary = await inquiryRemovalService.getRemovalOutcomeSummary("user-1");
      expect(summary.successRate).toBe(0);
      expect(summary.pending).toBe(1);
    });

    it("handles empty records", async () => {
      mockSupabase.__setDefaultResolution({ data: [], error: null });

      const summary = await inquiryRemovalService.getRemovalOutcomeSummary("user-1");
      expect(summary.total).toBe(0);
      expect(summary.pending).toBe(0);
      expect(summary.successful).toBe(0);
      expect(summary.rejected).toBe(0);
      expect(summary.successRate).toBe(0);
    });

    it("counts resolved_verified as successful", async () => {
      const mockRecords: InquiryRemovalRecord[] = [
        {
          id: "r1",
          user_id: "user-1",
          bureau: "experian",
          creditor_name: "A",
          inquiry_date: "2023-01-01",
          reason: "expired_over_24_months",
          status: "resolved_verified",
          letter_generated: true,
          submitted_at: "2025-11-01",
          response_received_at: "2025-12-01",
          outcome_notes: null,
          created_at: "2025-10-01",
          updated_at: "2025-12-01",
        },
      ];

      mockSupabase.__setDefaultResolution({ data: mockRecords, error: null });

      const summary = await inquiryRemovalService.getRemovalOutcomeSummary("user-1");
      expect(summary.successful).toBe(1);
      expect(summary.successRate).toBe(100);
    });
  });

  // -----------------------------------------------------------------------
  // processBulkRemoval
  // -----------------------------------------------------------------------

  describe("processBulkRemoval", () => {
    it("processes all removable inquiries", async () => {
      const report = buildMockReport({
        inquiries: [
          { inquiryType: "hard", creditorName: "OldBank", inquiryDate: monthsAgo(26), isDisputed: false },
        ],
      });

      // Mock the createRemovalRecord chain
      mockSupabase.insert.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "rec-1",
          user_id: "user-1",
          bureau: "experian",
          creditor_name: "OldBank",
          inquiry_date: "2023-01-15",
          reason: "expired_over_24_months",
          status: "letter_generated",
          letter_generated: true,
          submitted_at: null,
          response_received_at: null,
          outcome_notes: null,
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
        error: null,
      });

      const result = await inquiryRemovalService.processBulkRemoval(
        "user-1",
        report,
        "experian",
        undefined,
        "Jane Doe",
      );

      expect(result.total).toBe(1);
      expect(result.lettersGenerated).toBe(1);
      expect(result.recordsCreated).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("tracks errors when record creation fails", async () => {
      const report = buildMockReport({
        inquiries: [
          { inquiryType: "hard", creditorName: "OldBank", inquiryDate: monthsAgo(26), isDisputed: false },
        ],
      });

      mockSupabase.insert.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: "Insert failed" },
      });

      const result = await inquiryRemovalService.processBulkRemoval(
        "user-1",
        report,
        "experian",
      );

      expect(result.total).toBe(1);
      expect(result.lettersGenerated).toBe(1);
      expect(result.recordsCreated).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].creditorName).toBe("OldBank");
    });

    it("returns zero totals when no removable inquiries", async () => {
      const report = buildMockReport({
        inquiries: [
          { inquiryType: "hard", creditorName: "NewBank", inquiryDate: monthsAgo(6), isDisputed: false },
        ],
      });

      const result = await inquiryRemovalService.processBulkRemoval(
        "user-1",
        report,
        "experian",
      );

      expect(result.total).toBe(0);
      expect(result.lettersGenerated).toBe(0);
      expect(result.recordsCreated).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});
