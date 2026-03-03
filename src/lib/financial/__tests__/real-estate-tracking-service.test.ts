/**
 * @jest-environment node
 */

/**
 * Real Estate Tracking Service Unit Tests
 *
 * Comprehensive tests for:
 * - Property CRUD operations
 * - Valuation tracking and history
 * - Mortgage management
 * - Amortization schedule generation
 * - Financial analytics (LTV, cap rate, cash-on-cash return, equity)
 * - Portfolio summary aggregation
 */

// ---------------------------------------------------------------------------
// Mock Setup — must come before imports
// ---------------------------------------------------------------------------

const mockFrom = jest.fn();

// Use a plain function (not jest.fn) so resetMocks cannot strip the implementation.
const mockCreateClient = (..._args: unknown[]) => ({
  from: (...fArgs: unknown[]) => mockFrom(...fArgs),
});

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import { RealEstateTrackingService } from "../real-estate-tracking-service";
import type {
  PropertyAddress,
  Mortgage,
  PropertyType,
  PropertyStatus,
  PropertyDetails,
  RentalInfo,
} from "../real-estate-tracking-service";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_URL = "https://test.supabase.co";
const TEST_KEY = "test-key";
const FIXED_UUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const NOW_ISO = "2026-02-23T12:00:00.000Z";

const SAMPLE_ADDRESS: PropertyAddress = {
  street: "123 Main St",
  city: "Austin",
  state: "TX",
  zipCode: "78701",
  country: "US",
};

const SAMPLE_DETAILS: PropertyDetails = {
  squareFeet: 2000,
  bedrooms: 3,
  bathrooms: 2,
  yearBuilt: 2015,
  stories: 2,
  garage: 2,
};

// ---------------------------------------------------------------------------
// Helpers — DB row builders
// ---------------------------------------------------------------------------

function makeDbProperty(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: FIXED_UUID,
    user_id: "user-1",
    name: "Main Residence",
    type: "primary_residence",
    status: "owned",
    address: SAMPLE_ADDRESS,
    purchase_price: 400000,
    purchase_date: "2022-06-15T00:00:00.000Z",
    current_value: 450000,
    last_value_update: NOW_ISO,
    value_source: "manual",
    details: SAMPLE_DETAILS,
    rental: null,
    annual_taxes: 6000,
    annual_insurance: 2400,
    annual_hoa: null,
    annual_maintenance: null,
    notes: null,
    documents: null,
    image_urls: null,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    ...overrides,
  };
}

function makeDbMortgage(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: FIXED_UUID,
    property_id: "prop-1",
    lender: "Wells Fargo",
    type: "fixed",
    original_amount: 320000,
    current_balance: 295000,
    interest_rate: 6.5,
    term_months: 360,
    start_date: "2022-06-15T00:00:00.000Z",
    maturity_date: "2052-06-15T00:00:00.000Z",
    monthly_payment: 2023,
    escrow_amount: null,
    pmi_amount: null,
    arm_details: null,
    is_active: true,
    ...overrides,
  };
}

function makeDbValuation(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: FIXED_UUID,
    property_id: "prop-1",
    value: 450000,
    source: "manual",
    date: NOW_ISO,
    notes: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Chain mock builder
// ---------------------------------------------------------------------------

function setupChain(opts: {
  selectResult?: { data: unknown; error: unknown };
  insertResult?: { data: unknown; error: unknown };
  updateResult?: { data: unknown; error: unknown };
  deleteResult?: { data: unknown; error: unknown };
}) {
  const singleResolve = (result: { data: unknown; error: unknown }) =>
    jest.fn().mockResolvedValue(result);

  const chain: Record<string, jest.Mock> = {};

  if (opts.selectResult) {
    const eqMock: jest.Mock = jest.fn().mockImplementation(() => ({
      eq: eqMock,
      single: singleResolve(opts.selectResult!),
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(opts.selectResult!),
        ...opts.selectResult!,
      }),
      ...opts.selectResult!,
    }));

    chain.select = jest.fn().mockReturnValue({
      eq: eqMock,
      single: singleResolve(opts.selectResult),
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(opts.selectResult),
        ...opts.selectResult,
      }),
    });
  }

  if (opts.insertResult) {
    chain.insert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: singleResolve(opts.insertResult),
      }),
    });
  }

  if (opts.updateResult) {
    const eqMock: jest.Mock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: singleResolve(opts.updateResult),
      }),
    });
    chain.update = jest.fn().mockReturnValue({
      eq: eqMock,
    });
  }

  if (opts.deleteResult) {
    chain.delete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue(opts.deleteResult),
    });
  }

  mockFrom.mockReturnValue(chain);
  return chain;
}

/** Set up different chain responses per table name. */
function setupMultiTableChain(
  tableChains: Record<string, Record<string, jest.Mock | ((...args: unknown[]) => unknown)>>,
) {
  mockFrom.mockImplementation((table: string) => {
    return tableChains[table] ?? {};
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RealEstateTrackingService", () => {
  let service: RealEstateTrackingService;

  beforeEach(() => {
    service = new RealEstateTrackingService(TEST_URL, TEST_KEY);
    jest.spyOn(crypto, "randomUUID").mockReturnValue(FIXED_UUID);
  });

  // =========================================================================
  // Constructor
  // =========================================================================

  describe("constructor", () => {
    it("creates a service with a working supabase client", () => {
      // Verify the service was constructed by calling a method
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });
      expect(() => service.getProperty("test-id")).not.toThrow();
    });
  });

  // =========================================================================
  // addProperty
  // =========================================================================

  describe("addProperty", () => {
    const propertyInput = {
      userId: "user-1",
      name: "Main Residence",
      type: "primary_residence" as PropertyType,
      status: "owned" as PropertyStatus,
      address: SAMPLE_ADDRESS,
      purchasePrice: 400000,
      purchaseDate: new Date("2022-06-15"),
      currentValue: 450000,
      lastValueUpdate: new Date(),
      valueSource: "manual" as const,
      details: SAMPLE_DETAILS,
      mortgages: [],
      annualTaxes: 6000,
      annualInsurance: 2400,
    };

    it("inserts a property and returns the mapped result", async () => {
      const dbRow = makeDbProperty();
      setupChain({ insertResult: { data: dbRow, error: null } });

      const result = await service.addProperty(propertyInput);

      expect(mockFrom).toHaveBeenCalledWith("properties");
      expect(result.id).toBe(FIXED_UUID);
      expect(result.userId).toBe("user-1");
      expect(result.name).toBe("Main Residence");
      expect(result.type).toBe("primary_residence");
      expect(result.status).toBe("owned");
      expect(result.purchasePrice).toBe(400000);
      expect(result.currentValue).toBe(450000);
    });

    it("throws on Supabase error", async () => {
      setupChain({
        insertResult: {
          data: null,
          error: { message: "Insert failed", code: "23505" },
        },
      });

      await expect(service.addProperty(propertyInput)).rejects.toEqual(
        expect.objectContaining({ message: "Insert failed" }),
      );
    });

    it("maps address correctly", async () => {
      const dbRow = makeDbProperty();
      setupChain({ insertResult: { data: dbRow, error: null } });

      const result = await service.addProperty(propertyInput);

      expect(result.address.street).toBe("123 Main St");
      expect(result.address.city).toBe("Austin");
      expect(result.address.state).toBe("TX");
      expect(result.address.zipCode).toBe("78701");
    });
  });

  // =========================================================================
  // updateProperty
  // =========================================================================

  describe("updateProperty", () => {
    it("updates a property and returns the mapped result", async () => {
      const dbRow = makeDbProperty({
        name: "Updated Name",
        current_value: 480000,
      });
      setupChain({ updateResult: { data: dbRow, error: null } });

      const result = await service.updateProperty("prop-1", {
        name: "Updated Name",
        currentValue: 480000,
      });

      expect(mockFrom).toHaveBeenCalledWith("properties");
      expect(result.name).toBe("Updated Name");
      expect(result.currentValue).toBe(480000);
    });

    it("throws on Supabase error", async () => {
      setupChain({
        updateResult: {
          data: null,
          error: { message: "Not found" },
        },
      });

      await expect(
        service.updateProperty("bad-id", { name: "X" }),
      ).rejects.toEqual(expect.objectContaining({ message: "Not found" }));
    });
  });

  // =========================================================================
  // getProperty
  // =========================================================================

  describe("getProperty", () => {
    it("returns property when found", async () => {
      const dbRow = makeDbProperty();
      setupChain({ selectResult: { data: dbRow, error: null } });

      const result = await service.getProperty("prop-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe(FIXED_UUID);
      expect(result!.purchasePrice).toBe(400000);
    });

    it("returns null when not found", async () => {
      setupChain({ selectResult: { data: null, error: null } });

      const result = await service.getProperty("nonexistent");
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // getUserProperties
  // =========================================================================

  describe("getUserProperties", () => {
    it("returns user properties filtered by 'owned' status", async () => {
      const dbRows = [
        makeDbProperty({ id: "p-1" }),
        makeDbProperty({ id: "p-2", name: "Rental Property" }),
      ];

      setupChain({ selectResult: { data: dbRows, error: null } });

      const result = await service.getUserProperties("user-1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("p-1");
      expect(result[1].id).toBe("p-2");
    });

    it("returns empty array when no properties", async () => {
      setupChain({ selectResult: { data: [], error: null } });

      const result = await service.getUserProperties("user-1");
      expect(result).toEqual([]);
    });

    it("returns empty array when data is null", async () => {
      setupChain({ selectResult: { data: null, error: null } });

      const result = await service.getUserProperties("user-1");
      expect(result).toEqual([]);
    });

    it("throws on Supabase error", async () => {
      setupChain({
        selectResult: {
          data: null,
          error: { message: "DB error" },
        },
      });

      await expect(service.getUserProperties("user-1")).rejects.toEqual(
        expect.objectContaining({ message: "DB error" }),
      );
    });
  });

  // =========================================================================
  // deleteProperty
  // =========================================================================

  describe("deleteProperty", () => {
    it("deletes property by id", async () => {
      const mockEq = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });
      mockFrom.mockReturnValue({
        delete: jest.fn().mockReturnValue({ eq: mockEq }),
      });

      await service.deleteProperty("prop-1");

      expect(mockFrom).toHaveBeenCalledWith("properties");
      expect(mockEq).toHaveBeenCalledWith("id", "prop-1");
    });

    it("throws on Supabase error", async () => {
      mockFrom.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest
            .fn()
            .mockResolvedValue({ error: { message: "Delete failed" } }),
        }),
      });

      await expect(service.deleteProperty("prop-1")).rejects.toEqual(
        expect.objectContaining({ message: "Delete failed" }),
      );
    });
  });

  // =========================================================================
  // updateValuation
  // =========================================================================

  describe("updateValuation", () => {
    it("inserts valuation history and updates property current value", async () => {
      const updatedPropertyDb = makeDbProperty({
        current_value: 500000,
        value_source: "appraisal",
      });

      setupMultiTableChain({
        property_valuations: {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        },
        properties: {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: updatedPropertyDb,
                  error: null,
                }),
              }),
            }),
          }),
        },
      });

      const result = await service.updateValuation(
        "prop-1",
        500000,
        "appraisal",
      );

      expect(result.currentValue).toBe(500000);
      expect(result.valueSource).toBe("appraisal");
    });
  });

  // =========================================================================
  // getValuationHistory
  // =========================================================================

  describe("getValuationHistory", () => {
    it("returns valuation history sorted by date", async () => {
      const dbRows = [
        makeDbValuation({ value: 450000, date: "2026-02-01T00:00:00.000Z" }),
        makeDbValuation({ value: 420000, date: "2025-08-01T00:00:00.000Z" }),
      ];

      setupChain({ selectResult: { data: dbRows, error: null } });

      const result = await service.getValuationHistory("prop-1");

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(450000);
      expect(result[0].date).toBeInstanceOf(Date);
      expect(result[1].value).toBe(420000);
    });

    it("returns empty array when no history", async () => {
      setupChain({ selectResult: { data: [], error: null } });

      const result = await service.getValuationHistory("prop-1");
      expect(result).toEqual([]);
    });

    it("throws on Supabase error", async () => {
      setupChain({
        selectResult: {
          data: null,
          error: { message: "Query failed" },
        },
      });

      await expect(service.getValuationHistory("prop-1")).rejects.toEqual(
        expect.objectContaining({ message: "Query failed" }),
      );
    });
  });

  // =========================================================================
  // estimateValue
  // =========================================================================

  describe("estimateValue", () => {
    it("returns mock estimate with range", async () => {
      const result = await service.estimateValue(SAMPLE_ADDRESS);

      expect(result.estimate).toBe(350000);
      expect(result.range.low).toBe(350000 * 0.9);
      expect(result.range.high).toBe(350000 * 1.1);
    });

    it("returns consistent range regardless of address", async () => {
      const result = await service.estimateValue({
        street: "999 Different St",
        city: "New York",
        state: "NY",
        zipCode: "10001",
        country: "US",
      });

      expect(result.estimate).toBe(350000);
      expect(result.range.high).toBeGreaterThan(result.range.low);
    });
  });

  // =========================================================================
  // addMortgage
  // =========================================================================

  describe("addMortgage", () => {
    const mortgageInput: Omit<Mortgage, "id"> = {
      propertyId: "prop-1",
      lender: "Wells Fargo",
      type: "fixed",
      originalAmount: 320000,
      currentBalance: 295000,
      interestRate: 6.5,
      termMonths: 360,
      startDate: new Date("2022-06-15"),
      maturityDate: new Date("2052-06-15"),
      monthlyPayment: 2023,
      isActive: true,
    };

    it("inserts a mortgage and returns mapped result", async () => {
      const dbRow = makeDbMortgage();
      setupChain({ insertResult: { data: dbRow, error: null } });

      const result = await service.addMortgage(mortgageInput);

      expect(mockFrom).toHaveBeenCalledWith("mortgages");
      expect(result.id).toBe(FIXED_UUID);
      expect(result.lender).toBe("Wells Fargo");
      expect(result.originalAmount).toBe(320000);
      expect(result.interestRate).toBe(6.5);
      expect(result.monthlyPayment).toBe(2023);
    });

    it("throws on Supabase error", async () => {
      setupChain({
        insertResult: {
          data: null,
          error: { message: "Insert mortgage failed" },
        },
      });

      await expect(service.addMortgage(mortgageInput)).rejects.toEqual(
        expect.objectContaining({ message: "Insert mortgage failed" }),
      );
    });

    it("maps ARM details when present", async () => {
      const armDetails = {
        initialFixedPeriod: 60,
        adjustmentPeriod: 12,
        rateCapPeriodic: 2,
        rateCapLifetime: 5,
        margin: 2.75,
        index: "SOFR",
      };
      const dbRow = makeDbMortgage({
        type: "arm",
        arm_details: armDetails,
      });
      setupChain({ insertResult: { data: dbRow, error: null } });

      const result = await service.addMortgage({
        ...mortgageInput,
        type: "arm",
        armDetails,
      });

      expect(result.type).toBe("arm");
      expect(result.armDetails).toBeDefined();
      expect(result.armDetails!.margin).toBe(2.75);
    });
  });

  // =========================================================================
  // updateMortgageBalance
  // =========================================================================

  describe("updateMortgageBalance", () => {
    it("updates the current balance", async () => {
      const mockEq = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnValue({ eq: mockEq }),
      });

      await service.updateMortgageBalance("mort-1", 290000);

      expect(mockFrom).toHaveBeenCalledWith("mortgages");
      expect(mockEq).toHaveBeenCalledWith("id", "mort-1");
    });
  });

  // =========================================================================
  // getPropertyMortgages
  // =========================================================================

  describe("getPropertyMortgages", () => {
    it("returns active mortgages for property", async () => {
      const dbRows = [
        makeDbMortgage({ id: "m-1" }),
        makeDbMortgage({ id: "m-2", lender: "Chase" }),
      ];

      setupChain({ selectResult: { data: dbRows, error: null } });

      const result = await service.getPropertyMortgages("prop-1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("m-1");
      expect(result[1].lender).toBe("Chase");
    });

    it("returns empty array when no mortgages", async () => {
      setupChain({ selectResult: { data: [], error: null } });

      const result = await service.getPropertyMortgages("prop-1");
      expect(result).toEqual([]);
    });

    it("throws on Supabase error", async () => {
      setupChain({
        selectResult: {
          data: null,
          error: { message: "Mortgage query failed" },
        },
      });

      await expect(service.getPropertyMortgages("prop-1")).rejects.toEqual(
        expect.objectContaining({ message: "Mortgage query failed" }),
      );
    });
  });

  // =========================================================================
  // generateAmortizationSchedule
  // =========================================================================

  describe("generateAmortizationSchedule", () => {
    const mortgage: Mortgage = {
      id: "mort-1",
      propertyId: "prop-1",
      lender: "Wells Fargo",
      type: "fixed",
      originalAmount: 300000,
      currentBalance: 295000,
      interestRate: 6.0,
      termMonths: 360,
      startDate: new Date("2022-01-01"),
      maturityDate: new Date("2052-01-01"),
      monthlyPayment: 1798.65,
      isActive: true,
    };

    it("generates schedule with correct number of entries", () => {
      const schedule = service.generateAmortizationSchedule(mortgage);
      expect(schedule).toHaveLength(360);
    });

    it("first payment has correct interest calculation", () => {
      const schedule = service.generateAmortizationSchedule(mortgage);
      const first = schedule[0];

      // Monthly rate = 6% / 12 = 0.5%
      // First month interest = 300000 * 0.005 = 1500
      expect(first.month).toBe(1);
      expect(first.payment).toBe(1798.65);
      expect(first.interest).toBeCloseTo(1500, 0);
      expect(first.principal).toBeCloseTo(1798.65 - 1500, 0);
    });

    it("balance converges to near zero by end of term", () => {
      const schedule = service.generateAmortizationSchedule(mortgage);
      const last = schedule[schedule.length - 1];

      // With a rounded monthly payment, the final balance will be a small
      // residual (typically < $5 on a $300k loan). Verify it's negligible
      // relative to the original principal.
      expect(last.balance).toBeLessThan(mortgage.originalAmount * 0.001);
      expect(last.balance).toBeGreaterThanOrEqual(0);
    });

    it("cumulative principal grows over time", () => {
      const schedule = service.generateAmortizationSchedule(mortgage);

      expect(schedule[11].cumulativePrincipal).toBeGreaterThan(
        schedule[0].cumulativePrincipal,
      );
      expect(schedule[59].cumulativePrincipal).toBeGreaterThan(
        schedule[11].cumulativePrincipal,
      );
    });

    it("cumulative interest grows over time", () => {
      const schedule = service.generateAmortizationSchedule(mortgage);

      expect(schedule[11].cumulativeInterest).toBeGreaterThan(
        schedule[0].cumulativeInterest,
      );
    });

    it("interest decreases and principal increases over the life", () => {
      const schedule = service.generateAmortizationSchedule(mortgage);

      // Early payments have more interest than principal
      expect(schedule[0].interest).toBeGreaterThan(schedule[0].principal);

      // Late payments have more principal than interest
      const lastIdx = schedule.length - 1;
      expect(schedule[lastIdx].principal).toBeGreaterThan(
        schedule[lastIdx].interest,
      );
    });

    it("each entry has a valid date", () => {
      const schedule = service.generateAmortizationSchedule(mortgage);

      for (const entry of schedule) {
        expect(entry.date).toBeInstanceOf(Date);
      }
      // First payment is one month after start. The source creates the date via
      // `new Date(startDate); paymentDate.setMonth(getMonth() + 1)`.
      // Since "2022-01-01" is parsed as UTC midnight, getMonth() in local tz
      // may be Dec (11) if behind UTC, yielding month 0 after +1. Just verify
      // it is one month after the start date rather than hardcoding a month index.
      const start = new Date("2022-01-01");
      const expectedMonth = (start.getMonth() + 1) % 12;
      expect(schedule[0].date.getMonth()).toBe(expectedMonth);
    });

    it("handles short-term mortgage correctly", () => {
      const shortMortgage: Mortgage = {
        ...mortgage,
        termMonths: 12,
        originalAmount: 12000,
        monthlyPayment: 1032.07,
        interestRate: 6.0,
      };

      const schedule =
        service.generateAmortizationSchedule(shortMortgage);

      expect(schedule).toHaveLength(12);
      // With a rounded payment, a small residual is expected.
      expect(schedule[11].balance).toBeLessThan(
        shortMortgage.originalAmount * 0.01,
      );
      expect(schedule[11].balance).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // getPropertyAnalytics
  // =========================================================================

  describe("getPropertyAnalytics", () => {
    it("throws when property not found", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "properties") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest
                  .fn()
                  .mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      await expect(service.getPropertyAnalytics("nonexistent")).rejects.toThrow(
        "Property not found",
      );
    });

    it("calculates equity correctly", async () => {
      const dbProperty = makeDbProperty({
        current_value: 500000,
        purchase_price: 400000,
        purchase_date: "2022-01-01T00:00:00.000Z",
        annual_taxes: 6000,
        annual_insurance: 2400,
        annual_hoa: 0,
        annual_maintenance: 0,
        rental: null,
      });
      const dbMortgage = makeDbMortgage({
        current_balance: 280000,
        monthly_payment: 2000,
        original_amount: 320000,
        interest_rate: 6.0,
        term_months: 360,
        start_date: "2022-01-01T00:00:00.000Z",
        maturity_date: "2052-01-01T00:00:00.000Z",
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "properties") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest
                  .fn()
                  .mockResolvedValue({ data: dbProperty, error: null }),
              }),
            }),
          };
        }
        if (table === "mortgages") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest
                  .fn()
                  .mockResolvedValue({ data: [dbMortgage], error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const analytics = await service.getPropertyAnalytics("prop-1");

      // equity = currentValue - totalDebt = 500000 - 280000 = 220000
      expect(analytics.equity).toBe(220000);
      // equityPercent = (220000 / 500000) * 100 = 44
      expect(analytics.equityPercent).toBe(44);
    });

    it("calculates LTV correctly", async () => {
      const dbProperty = makeDbProperty({
        current_value: 500000,
        purchase_price: 400000,
        purchase_date: "2022-01-01T00:00:00.000Z",
        annual_taxes: 6000,
        annual_insurance: 2400,
        annual_hoa: 0,
        annual_maintenance: 0,
        rental: null,
      });
      const dbMortgage = makeDbMortgage({
        current_balance: 350000,
        monthly_payment: 2000,
        original_amount: 320000,
        interest_rate: 6.0,
        term_months: 360,
        start_date: "2022-01-01T00:00:00.000Z",
        maturity_date: "2052-01-01T00:00:00.000Z",
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "properties") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest
                  .fn()
                  .mockResolvedValue({ data: dbProperty, error: null }),
              }),
            }),
          };
        }
        if (table === "mortgages") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest
                  .fn()
                  .mockResolvedValue({ data: [dbMortgage], error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const analytics = await service.getPropertyAnalytics("prop-1");

      // LTV = (350000 / 500000) * 100 = 70
      expect(analytics.ltv).toBe(70);
    });

    it("calculates cap rate for rental property", async () => {
      const rental: RentalInfo = {
        isRented: true,
        monthlyRent: 2500,
      };
      const dbProperty = makeDbProperty({
        current_value: 400000,
        purchase_price: 350000,
        purchase_date: "2022-01-01T00:00:00.000Z",
        rental,
        annual_taxes: 4800,
        annual_insurance: 1800,
        annual_hoa: 1200,
        annual_maintenance: 2400,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "properties") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest
                  .fn()
                  .mockResolvedValue({ data: dbProperty, error: null }),
              }),
            }),
          };
        }
        if (table === "mortgages") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest
                  .fn()
                  .mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const analytics = await service.getPropertyAnalytics("prop-1");

      // annualNOI = (2500*12) - (4800 + 1800 + 1200 + 2400) = 30000 - 10200 = 19800
      // capRate = (19800 / 400000) * 100 = 4.95
      expect(analytics.capRate).toBeCloseTo(4.95, 1);
    });

    it("calculates cash-on-cash return", async () => {
      const rental: RentalInfo = {
        isRented: true,
        monthlyRent: 3000,
      };
      const dbProperty = makeDbProperty({
        current_value: 500000,
        purchase_price: 400000,
        purchase_date: "2022-01-01T00:00:00.000Z",
        rental,
        annual_taxes: 6000,
        annual_insurance: 2400,
        annual_hoa: 0,
        annual_maintenance: 0,
      });
      const dbMortgage = makeDbMortgage({
        current_balance: 280000,
        monthly_payment: 2000,
        original_amount: 320000,
        interest_rate: 6.0,
        term_months: 360,
        start_date: "2022-01-01T00:00:00.000Z",
        maturity_date: "2052-01-01T00:00:00.000Z",
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "properties") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest
                  .fn()
                  .mockResolvedValue({ data: dbProperty, error: null }),
              }),
            }),
          };
        }
        if (table === "mortgages") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest
                  .fn()
                  .mockResolvedValue({ data: [dbMortgage], error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const analytics = await service.getPropertyAnalytics("prop-1");

      // monthlyExpenses = 2000 + 6000/12 + 2400/12 = 2000 + 500 + 200 = 2700
      // monthlyCashFlow = 3000 - 2700 = 300
      // annualCashFlow = 300 * 12 = 3600
      // initialInvestment = 400000 * 0.2 = 80000
      // cashOnCashReturn = (3600 / 80000) * 100 = 4.5
      expect(analytics.monthlyCashFlow).toBeCloseTo(300, 0);
      expect(analytics.annualCashFlow).toBeCloseTo(3600, 0);
      expect(analytics.cashOnCashReturn).toBeCloseTo(4.5, 1);
    });

    it("calculates appreciation correctly", async () => {
      const dbProperty = makeDbProperty({
        current_value: 500000,
        purchase_price: 400000,
        purchase_date: "2022-01-01T00:00:00.000Z",
        annual_taxes: 6000,
        annual_insurance: 2400,
        annual_hoa: 0,
        annual_maintenance: 0,
        rental: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "properties") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest
                  .fn()
                  .mockResolvedValue({ data: dbProperty, error: null }),
              }),
            }),
          };
        }
        if (table === "mortgages") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest
                  .fn()
                  .mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const analytics = await service.getPropertyAnalytics("prop-1");

      // appreciation = 500000 - 400000 = 100000
      // appreciationPercent = (100000 / 400000) * 100 = 25
      expect(analytics.appreciation).toBe(100000);
      expect(analytics.appreciationPercent).toBe(25);
    });

    it("generates amortization schedule for first mortgage", async () => {
      const dbProperty = makeDbProperty({
        current_value: 400000,
        purchase_price: 350000,
        purchase_date: "2022-01-01T00:00:00.000Z",
        annual_taxes: 4000,
        annual_insurance: 1200,
        annual_hoa: 0,
        annual_maintenance: 0,
        rental: null,
      });
      const dbMortgage = makeDbMortgage({
        original_amount: 280000,
        current_balance: 270000,
        interest_rate: 6.0,
        term_months: 360,
        monthly_payment: 1678.74,
        start_date: "2022-01-01T00:00:00.000Z",
        maturity_date: "2052-01-01T00:00:00.000Z",
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "properties") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest
                  .fn()
                  .mockResolvedValue({ data: dbProperty, error: null }),
              }),
            }),
          };
        }
        if (table === "mortgages") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest
                  .fn()
                  .mockResolvedValue({ data: [dbMortgage], error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const analytics = await service.getPropertyAnalytics("prop-1");

      expect(analytics.amortizationSchedule).toHaveLength(360);
      expect(analytics.amortizationSchedule[0].month).toBe(1);
    });

    it("returns empty amortization schedule when no mortgages", async () => {
      const dbProperty = makeDbProperty({
        current_value: 400000,
        purchase_price: 350000,
        purchase_date: "2022-01-01T00:00:00.000Z",
        annual_taxes: 4000,
        annual_insurance: 1200,
        annual_hoa: 0,
        annual_maintenance: 0,
        rental: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "properties") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest
                  .fn()
                  .mockResolvedValue({ data: dbProperty, error: null }),
              }),
            }),
          };
        }
        if (table === "mortgages") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest
                  .fn()
                  .mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const analytics = await service.getPropertyAnalytics("prop-1");

      expect(analytics.amortizationSchedule).toEqual([]);
    });

    it("calculates zero cap rate when currentValue is zero", async () => {
      const dbProperty = makeDbProperty({
        current_value: 0,
        purchase_price: 0,
        purchase_date: "2022-01-01T00:00:00.000Z",
        annual_taxes: 0,
        annual_insurance: 0,
        annual_hoa: 0,
        annual_maintenance: 0,
        rental: { isRented: true, monthlyRent: 1000 },
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "properties") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest
                  .fn()
                  .mockResolvedValue({ data: dbProperty, error: null }),
              }),
            }),
          };
        }
        if (table === "mortgages") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest
                  .fn()
                  .mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const analytics = await service.getPropertyAnalytics("prop-1");
      expect(analytics.capRate).toBe(0);
    });
  });

  // =========================================================================
  // getPortfolioSummary
  // =========================================================================

  describe("getPortfolioSummary", () => {
    it("calculates correct totals for multi-property portfolio", async () => {
      const rental1: RentalInfo = { isRented: true, monthlyRent: 2000 };
      const dbProperties = [
        makeDbProperty({
          id: "p-1",
          current_value: 500000,
          purchase_price: 400000,
          annual_taxes: 6000,
          annual_insurance: 2400,
          annual_hoa: 1200,
          annual_maintenance: 0,
          rental: rental1,
        }),
        makeDbProperty({
          id: "p-2",
          current_value: 300000,
          purchase_price: 250000,
          annual_taxes: 3600,
          annual_insurance: 1200,
          annual_hoa: 0,
          annual_maintenance: 0,
          rental: null,
        }),
      ];
      const mortgagesP1 = [
        makeDbMortgage({
          id: "m-1",
          property_id: "p-1",
          current_balance: 350000,
          monthly_payment: 2100,
        }),
      ];
      const mortgagesP2 = [
        makeDbMortgage({
          id: "m-2",
          property_id: "p-2",
          current_balance: 200000,
          monthly_payment: 1200,
        }),
      ];

      let mortgageCallIdx = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "properties") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest
                    .fn()
                    .mockResolvedValue({ data: dbProperties, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "mortgages") {
          const mortgageSets = [mortgagesP1, mortgagesP2];
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockImplementation(() => {
                  const idx = mortgageCallIdx++;
                  return Promise.resolve({
                    data: mortgageSets[idx] ?? [],
                    error: null,
                  });
                }),
              }),
            }),
          };
        }
        return {};
      });

      const summary = await service.getPortfolioSummary("user-1");

      expect(summary.totalProperties).toBe(2);
      expect(summary.totalValue).toBe(800000);
      expect(summary.totalDebt).toBe(550000);
      expect(summary.totalEquity).toBe(250000);
      expect(summary.totalMonthlyIncome).toBe(2000);
      expect(summary.totalAppreciation).toBe(800000 - 650000);
    });

    it("returns zeros for empty portfolio", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "properties") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest
                    .fn()
                    .mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const summary = await service.getPortfolioSummary("user-1");

      expect(summary.totalProperties).toBe(0);
      expect(summary.totalValue).toBe(0);
      expect(summary.totalEquity).toBe(0);
      expect(summary.totalDebt).toBe(0);
      expect(summary.totalMonthlyIncome).toBe(0);
      expect(summary.totalMonthlyExpenses).toBe(0);
      expect(summary.netMonthlyCashFlow).toBe(0);
      expect(summary.averageCapRate).toBe(0);
      expect(summary.totalAppreciation).toBe(0);
      expect(summary.appreciationPercent).toBe(0);
    });

    it("calculates net monthly cash flow", async () => {
      const rental: RentalInfo = { isRented: true, monthlyRent: 3000 };
      const dbProperties = [
        makeDbProperty({
          id: "p-1",
          current_value: 500000,
          purchase_price: 400000,
          annual_taxes: 6000,
          annual_insurance: 2400,
          annual_hoa: 0,
          annual_maintenance: 0,
          rental,
        }),
      ];
      const mortgages = [
        makeDbMortgage({
          current_balance: 300000,
          monthly_payment: 2000,
        }),
      ];

      mockFrom.mockImplementation((table: string) => {
        if (table === "properties") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest
                    .fn()
                    .mockResolvedValue({ data: dbProperties, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "mortgages") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest
                  .fn()
                  .mockResolvedValue({ data: mortgages, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const summary = await service.getPortfolioSummary("user-1");

      // Monthly expenses = 2000 + 6000/12 + 2400/12 = 2000 + 500 + 200 = 2700
      // Net cash flow = 3000 - 2700 = 300
      expect(summary.totalMonthlyIncome).toBe(3000);
      expect(summary.totalMonthlyExpenses).toBeCloseTo(2700, 0);
      expect(summary.netMonthlyCashFlow).toBeCloseTo(300, 0);
    });

    it("calculates average cap rate across rental properties", async () => {
      const rental: RentalInfo = { isRented: true, monthlyRent: 2000 };
      const dbProperties = [
        makeDbProperty({
          id: "p-1",
          current_value: 400000,
          purchase_price: 350000,
          annual_taxes: 4800,
          annual_insurance: 1800,
          annual_hoa: 1200,
          annual_maintenance: 0,
          rental,
        }),
      ];

      mockFrom.mockImplementation((table: string) => {
        if (table === "properties") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest
                    .fn()
                    .mockResolvedValue({ data: dbProperties, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "mortgages") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest
                  .fn()
                  .mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const summary = await service.getPortfolioSummary("user-1");

      // annualNOI = 24000 - (4800 + 1800 + 1200) = 24000 - 7800 = 16200
      // capRate = (16200 / 400000) * 100 = 4.05
      // averageCapRate = 4.05 / 1 = 4.05
      expect(summary.averageCapRate).toBeCloseTo(4.05, 1);
    });

    it("calculates appreciation percent", async () => {
      const dbProperties = [
        makeDbProperty({
          id: "p-1",
          current_value: 500000,
          purchase_price: 400000,
          annual_taxes: 6000,
          annual_insurance: 2400,
          annual_hoa: 0,
          annual_maintenance: 0,
          rental: null,
        }),
      ];

      mockFrom.mockImplementation((table: string) => {
        if (table === "properties") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest
                    .fn()
                    .mockResolvedValue({ data: dbProperties, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "mortgages") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest
                  .fn()
                  .mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const summary = await service.getPortfolioSummary("user-1");

      // appreciationPercent = ((500000 - 400000) / 400000) * 100 = 25
      expect(summary.appreciationPercent).toBe(25);
    });
  });

  // =========================================================================
  // Data mapping
  // =========================================================================

  describe("data mapping", () => {
    it("maps property DB row to domain object with all fields", async () => {
      const rental: RentalInfo = {
        isRented: true,
        monthlyRent: 2500,
        tenantName: "John Doe",
      };
      const dbRow = makeDbProperty({
        rental,
        annual_hoa: 300,
        annual_maintenance: 1200,
        notes: "Great property",
        image_urls: ["https://example.com/img1.jpg"],
      });
      setupChain({ insertResult: { data: dbRow, error: null } });

      const result = await service.addProperty({
        userId: "user-1",
        name: "Test",
        type: "rental",
        status: "owned",
        address: SAMPLE_ADDRESS,
        purchasePrice: 400000,
        purchaseDate: new Date(),
        currentValue: 450000,
        lastValueUpdate: new Date(),
        valueSource: "manual",
        details: SAMPLE_DETAILS,
        mortgages: [],
        annualTaxes: 6000,
        annualInsurance: 2400,
        annualHoa: 300,
        annualMaintenance: 1200,
        rental,
      });

      expect(result.rental).toBeDefined();
      expect(result.rental!.monthlyRent).toBe(2500);
      expect(result.annualHoa).toBe(300);
      expect(result.annualMaintenance).toBe(1200);
      expect(result.notes).toBe("Great property");
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it("maps mortgage DB row with escrow and PMI", async () => {
      const dbRow = makeDbMortgage({
        escrow_amount: 550,
        pmi_amount: 125,
      });
      setupChain({ insertResult: { data: dbRow, error: null } });

      const result = await service.addMortgage({
        propertyId: "prop-1",
        lender: "Wells Fargo",
        type: "fixed",
        originalAmount: 320000,
        currentBalance: 295000,
        interestRate: 6.5,
        termMonths: 360,
        startDate: new Date("2022-06-15"),
        maturityDate: new Date("2052-06-15"),
        monthlyPayment: 2023,
        escrowAmount: 550,
        pmiAmount: 125,
        isActive: true,
      });

      expect(result.escrowAmount).toBe(550);
      expect(result.pmiAmount).toBe(125);
      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.maturityDate).toBeInstanceOf(Date);
    });

    it("maps valuation history with notes", async () => {
      const dbRows = [
        makeDbValuation({
          value: 475000,
          source: "appraisal",
          notes: "Annual appraisal",
        }),
      ];
      setupChain({ selectResult: { data: dbRows, error: null } });

      const result = await service.getValuationHistory("prop-1");

      expect(result[0].source).toBe("appraisal");
      expect(result[0].notes).toBe("Annual appraisal");
    });
  });
});
